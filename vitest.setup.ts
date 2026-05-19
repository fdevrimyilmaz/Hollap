// Loads .env.local then .env into process.env before tests start, mirroring
// what scripts/db-migrate.mjs does so vitest picks up the same DATABASE_URL
// developers already use locally. Variables already present in process.env
// win, so CI workflow-level env (e.g. the job's `env:` block) is never
// overridden by a stale .env file checked out from the runner cache.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseDotEnv(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

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

function loadEnvFile(filename: string): void {
  const filepath = path.join(process.cwd(), filename);
  if (!existsSync(filepath)) return;

  const content = readFileSync(filepath, "utf8");
  const parsed = parseDotEnv(content);

  for (const [key, value] of Object.entries(parsed)) {
    // Never clobber values already in the environment.
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

// Higher-priority file first; loader skips keys already set.
loadEnvFile(".env.local");
loadEnvFile(".env");
