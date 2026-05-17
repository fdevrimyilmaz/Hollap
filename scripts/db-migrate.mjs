import { existsSync, promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { Pool } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "server", "migrations");
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/hollap";
const OPTIONAL_LOCAL_MODE = process.argv.includes("--optional-local");

function parseDotEnv(content) {
  const parsed = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function readEnvFromFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const content = readFileSync(absolutePath, "utf8");
  return { parsed: parseDotEnv(content), absolutePath };
}

function applyEnvFileFallback() {
  const candidates = [".env.local", ".env"];

  for (const candidate of candidates) {
    const envFile = readEnvFromFile(candidate);
    if (!envFile) {
      continue;
    }

    for (const [key, value] of Object.entries(envFile.parsed)) {
      if (!process.env[key]?.trim()) {
        process.env[key] = value;
      }
    }

    if (!process.env.CI) {
      console.log(`Loaded environment fallback from ${envFile.absolutePath}`);
    }
    return;
  }
}

applyEnvFileFallback();

function resolveDeployTarget() {
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

function resolveDatabaseUrl() {
  const deployTarget = resolveDeployTarget();
  const defaultUrl = process.env.DATABASE_URL?.trim();
  if (defaultUrl) {
    return {
      deployTarget,
      connectionString: defaultUrl,
    };
  }

  if (deployTarget === "production") {
    const productionUrl = process.env.DATABASE_URL_PRODUCTION?.trim();
    if (productionUrl) {
      return {
        deployTarget,
        connectionString: productionUrl,
      };
    }

    throw new Error(
      "DATABASE_URL or DATABASE_URL_PRODUCTION is required for production migrations"
    );
  }

  if (deployTarget === "preview") {
    const previewUrl = process.env.DATABASE_URL_PREVIEW?.trim();
    if (previewUrl) {
      return {
        deployTarget,
        connectionString: previewUrl,
      };
    }

    throw new Error("DATABASE_URL or DATABASE_URL_PREVIEW is required for preview migrations");
  }

  return {
    deployTarget,
    connectionString: DEFAULT_DATABASE_URL,
  };
}

function resolvePoolSize() {
  const value = Number(process.env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isFinite(value) || value < 1) {
    return 5;
  }
  return Math.floor(value);
}

function nowIso() {
  return new Date().toISOString();
}

function isDbConnectionError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = error.code;
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT" || code === "EHOSTUNREACH") {
    return true;
  }

  return error.message.includes("connect ECONNREFUSED");
}

function shouldSkipLocalError(error, deployTarget) {
  if (!OPTIONAL_LOCAL_MODE) {
    return false;
  }

  if (deployTarget !== "development") {
    return false;
  }

  return isDbConnectionError(error);
}

async function run() {
  const { deployTarget, connectionString } = resolveDatabaseUrl();
  const pool = new Pool({
    connectionString,
    max: resolvePoolSize(),
    ssl:
      process.env.DATABASE_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });

  try {
    await pool.query(
      `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        )
      `
    );

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (!files.length) {
      console.log("No migration files found.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const appliedRows = await client.query("SELECT version FROM schema_migrations");
      const applied = new Set(appliedRows.rows.map((row) => String(row.version)));

      let appliedCount = 0;
      for (const fileName of files) {
        if (applied.has(fileName)) {
          continue;
        }

        const migrationPath = path.join(MIGRATIONS_DIR, fileName);
        const sql = (await fs.readFile(migrationPath, "utf8")).trim();
        if (sql.length > 0) {
          await client.query(sql);
        }

        await client.query(
          "INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)",
          [fileName, nowIso()]
        );

        appliedCount += 1;
        console.log(`Applied migration: ${fileName}`);
      }

      await client.query("COMMIT");
      console.log(`Migration complete. Applied: ${appliedCount}, total files: ${files.length}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  const deployTarget = resolveDeployTarget();

  if (shouldSkipLocalError(error, deployTarget)) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Local migration skipped: ${message}`);
    console.warn(
      "Start local PostgreSQL with `docker compose up -d` or set DATABASE_URL to a reachable database."
    );
    process.exitCode = 0;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
