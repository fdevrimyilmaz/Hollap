import { AsyncLocalStorage } from "node:async_hooks";
import { promises as fsAsync } from "node:fs";
import path from "node:path";
import {
  Pool,
  type PoolClient,
  type QueryResultRow,
  types as pgTypes,
} from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "server", "migrations");
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/hollap";
const SERVERLESS_LOCAL_STORAGE_DIR = "/tmp/hollap/storage/private";
let hasWarnedEphemeralLocalStorage = false;

// Parse bigint (COUNT(*), etc.) as number to preserve previous SQLite behavior.
pgTypes.setTypeParser(20, (value) => Number(value));

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.CLOUDFLARE_WORKER
  );
}

function shouldUseServerlessLocalStorage(): boolean {
  const driver = (process.env.OBJECT_STORAGE_DRIVER ?? "local").trim().toLowerCase();
  return driver === "local" && isServerlessRuntime();
}

function resolveStorageDir(): string {
  if (shouldUseServerlessLocalStorage()) {
    if (process.env.NODE_ENV === "production" && !hasWarnedEphemeralLocalStorage) {
      hasWarnedEphemeralLocalStorage = true;
      console.warn(
        "[storage] OBJECT_STORAGE_DRIVER=local on a serverless runtime. Using ephemeral /tmp storage; files are not persistent across invocations."
      );
    }
    return SERVERLESS_LOCAL_STORAGE_DIR;
  }

  return path.join(process.cwd(), "storage", "private");
}

const STORAGE_DIR = resolveStorageDir();

declare global {
  var __creatorhubDbPool: Pool | undefined;
  var __creatorhubDbInitPromise: Promise<void> | undefined;
}

function resolveDeployTarget(): "development" | "preview" | "production" {
  const netlifyContext = process.env.CONTEXT?.trim().toLowerCase();
  if (netlifyContext === "production") {
    return "production";
  }
  if (netlifyContext === "deploy-preview" || netlifyContext === "branch-deploy") {
    return "preview";
  }

  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "production") {
    return "production";
  }
  if (vercelEnv === "preview") {
    return "preview";
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function resolveDatabaseUrl(): string {
  const defaultUrl = process.env.DATABASE_URL?.trim();
  if (defaultUrl) {
    return defaultUrl;
  }

  const deployTarget = resolveDeployTarget();

  if (deployTarget === "production") {
    const productionUrl = process.env.DATABASE_URL_PRODUCTION?.trim();
    if (productionUrl) {
      return productionUrl;
    }

    throw new Error(
      "DATABASE_URL or DATABASE_URL_PRODUCTION is required in production. Set one in your deploy environment."
    );
  }

  if (deployTarget === "preview") {
    const previewUrl = process.env.DATABASE_URL_PREVIEW?.trim();
    if (previewUrl) {
      return previewUrl;
    }

    throw new Error(
      "DATABASE_URL or DATABASE_URL_PREVIEW is required in preview deploys. Set one in your deploy environment."
    );
  }

  return DEFAULT_DATABASE_URL;
}

function resolvePoolSize(): number {
  const explicit = process.env.DATABASE_POOL_MAX;
  if (explicit) {
    const parsed = Number(explicit);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.floor(parsed);
    }
  }

  // Each serverless instance gets its own pool. Default low so concurrent
  // function invocations don't exhaust the managed Postgres connection limit.
  // Override via DATABASE_POOL_MAX for long-lived servers.
  return isServerlessRuntime() ? 2 : 5;
}

function shouldAutoRunMigrations(): boolean {
  const configured = process.env.DB_AUTO_MIGRATE?.trim().toLowerCase();
  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function resolveSslConfig(): false | { rejectUnauthorized: boolean; ca?: string } {
  const sslEnabled = process.env.DATABASE_SSL === "true";
  const caCert = process.env.DATABASE_CA_CERT?.trim();
  const rejectOverride = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();

  if (!sslEnabled && !caCert) {
    return false;
  }

  // Explicit opt-out for legacy providers without a CA chain. Logged loudly so
  // operators see it in production logs and can plan to fix it.
  if (rejectOverride === "false") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[db] DATABASE_SSL_REJECT_UNAUTHORIZED=false in production: TLS certificate validation disabled. This permits MITM. Provide DATABASE_CA_CERT instead."
      );
    }
    return { rejectUnauthorized: false };
  }

  return {
    rejectUnauthorized: true,
    ...(caCert ? { ca: caCert } : {}),
  };
}

function getPool(): Pool {
  if (global.__creatorhubDbPool) {
    return global.__creatorhubDbPool;
  }

  const ssl = resolveSslConfig();
  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    max: resolvePoolSize(),
    ssl: ssl === false ? undefined : ssl,
  });

  global.__creatorhubDbPool = pool;
  return pool;
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

// Stable per-app advisory lock key. Any 64-bit int works; this one is derived
// from "creatorhub.schema_migrations" so it never collides with user code that
// also uses advisory locks. Stored as a string so pg passes it as bigint
// without losing precision (and so we don't depend on BigInt literal syntax).
const MIGRATION_ADVISORY_LOCK_KEY = "7427183623510918";

async function runMigrations(): Promise<void> {
  const pool = getPool();

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
    // Serialize concurrent boots across function instances. Released on COMMIT/ROLLBACK.
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_ADVISORY_LOCK_KEY]);

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
  const pool = getPool();
  await pool.query("SELECT 1");
  if (shouldAutoRunMigrations()) {
    await runMigrations();
  }
  await pool.query("SELECT 1");
}

async function ensureDbInitialized(): Promise<void> {
  if (!global.__creatorhubDbInitPromise) {
    global.__creatorhubDbInitPromise = initializeDb().catch((error) => {
      global.__creatorhubDbInitPromise = undefined;
      throw error;
    });
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
  const pool = getPool();

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

    const client = await getPool().connect();

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
    const pool = global.__creatorhubDbPool;
    if (pool) {
      await pool.end();
    }
    global.__creatorhubDbPool = undefined;
    global.__creatorhubDbInitPromise = undefined;
  },
};

async function checkDatabaseConnection(): Promise<void> {
  await executeQuery("SELECT 1 AS ok");
}

export { db, STORAGE_DIR, nowIso, createId, checkDatabaseConnection };
