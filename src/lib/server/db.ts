import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import { promises as fsAsync } from "node:fs";
import path from "node:path";
import {
  Pool,
  type PoolClient,
  type QueryResultRow,
  types as pgTypes,
} from "pg";

const STORAGE_DIR = path.join(process.cwd(), "storage", "private");
const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "server", "migrations");
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/hollap";

// Parse bigint (COUNT(*), etc.) as number to preserve previous SQLite behavior.
pgTypes.setTypeParser(20, (value) => Number(value));

fs.mkdirSync(STORAGE_DIR, { recursive: true });

declare global {
  var __creatorhubDbPool: Pool | undefined;
  var __creatorhubDbInitPromise: Promise<void> | undefined;
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }

  return DEFAULT_DATABASE_URL;
}

function resolvePoolSize(): number {
  const raw = Number(process.env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isFinite(raw) || raw < 1) {
    return 5;
  }
  return Math.floor(raw);
}

const pool =
  global.__creatorhubDbPool ??
  new Pool({
    connectionString: resolveDatabaseUrl(),
    max: resolvePoolSize(),
    ssl:
      process.env.DATABASE_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });

if (!global.__creatorhubDbPool) {
  global.__creatorhubDbPool = pool;
}

const transactionStore = new AsyncLocalStorage<PoolClient>();

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${id}`;
}

function isNamedParams(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compileStatement(sql: string, args: unknown[]): { text: string; values: unknown[] } {
  if (args.length === 1 && isNamedParams(args[0]) && /@[a-zA-Z_]/.test(sql)) {
    const namedParams = args[0];
    const values: unknown[] = [];
    const text = sql.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_full, key: string) => {
      if (!Object.prototype.hasOwnProperty.call(namedParams, key)) {
        throw new Error(`Missing SQL parameter: @${key}`);
      }

      values.push(namedParams[key]);
      return `$${values.length}`;
    });

    return { text, values };
  }

  let placeholderIndex = 0;
  const text = sql.replace(/\?/g, () => {
    placeholderIndex += 1;
    return `$${placeholderIndex}`;
  });

  if (placeholderIndex !== args.length) {
    throw new Error(
      `SQL parameter mismatch. Found ${placeholderIndex} placeholders but received ${args.length} values.`
    );
  }

  return { text, values: args };
}

async function runMigrations(): Promise<void> {
  await fsAsync.mkdir(MIGRATIONS_DIR, { recursive: true });

  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `
  );

  const files = (await fsAsync.readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (!files.length) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const appliedRows = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations"
    );
    const applied = new Set(appliedRows.rows.map((row) => row.version));

    for (const fileName of files) {
      if (applied.has(fileName)) {
        continue;
      }

      const migrationPath = path.join(MIGRATIONS_DIR, fileName);
      const migrationSql = (await fsAsync.readFile(migrationPath, "utf8")).trim();

      if (migrationSql.length > 0) {
        await client.query(migrationSql);
      }

      await client.query(
        "INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)",
        [fileName, nowIso()]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDb(): Promise<void> {
  await pool.query("SELECT 1");
  await runMigrations();
  await pool.query("SELECT 1");
}

async function ensureDbInitialized(): Promise<void> {
  if (!global.__creatorhubDbInitPromise) {
    global.__creatorhubDbInitPromise = initializeDb();
  }

  await global.__creatorhubDbInitPromise;
}

async function executeQuery<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  args: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  await ensureDbInitialized();

  const statement = compileStatement(sql, args);
  const txClient = transactionStore.getStore();

  const result = txClient
    ? await txClient.query<T>(statement.text, statement.values)
    : await pool.query<T>(statement.text, statement.values);

  return {
    rows: result.rows,
    rowCount: result.rowCount ?? 0,
  };
}

class PreparedStatement {
  #sql: string;

  constructor(sql: string) {
    this.#sql = sql;
  }

  async get<T extends QueryResultRow = QueryResultRow>(...args: unknown[]): Promise<T | undefined> {
    const result = await executeQuery<T>(this.#sql, args);
    return result.rows[0];
  }

  async all<T extends QueryResultRow = QueryResultRow>(...args: unknown[]): Promise<T[]> {
    const result = await executeQuery<T>(this.#sql, args);
    return result.rows;
  }

  async run(...args: unknown[]): Promise<{ changes: number }> {
    const result = await executeQuery(this.#sql, args);
    return { changes: result.rowCount };
  }
}

const db = {
  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(sql);
  },

  async exec(sql: string): Promise<void> {
    await executeQuery(sql);
  },

  async transaction<T>(fn: () => Promise<T> | T): Promise<T> {
    await ensureDbInitialized();

    const existingClient = transactionStore.getStore();
    if (existingClient) {
      return await fn();
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await transactionStore.run(client, async () => await fn());
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async close(): Promise<void> {
    await pool.end();
    global.__creatorhubDbPool = undefined;
    global.__creatorhubDbInitPromise = undefined;
  },
};

async function checkDatabaseConnection(): Promise<void> {
  await executeQuery("SELECT 1 AS ok");
}

export { db, STORAGE_DIR, nowIso, createId, checkDatabaseConnection };
