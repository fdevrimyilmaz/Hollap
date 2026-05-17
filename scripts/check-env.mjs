import fs from "node:fs";
import path from "node:path";

function resolveDefaultMode() {
  const netlifyContext = (process.env.CONTEXT || "").trim().toLowerCase();
  if (netlifyContext === "production") return "production";
  if (netlifyContext === "deploy-preview" || netlifyContext === "branch-deploy") {
    return "preview";
  }
  const vercelEnv = (process.env.VERCEL_ENV || "").trim().toLowerCase();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return process.env.NODE_ENV || "development";
}

function parseArgs(argv) {
  const args = { file: ".env.local", mode: resolveDefaultMode() };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      args.file = argv[index + 1] || args.file;
      index += 1;
      continue;
    }
    if (arg === "--mode") {
      args.mode = (argv[index + 1] || args.mode).toLowerCase();
      index += 1;
      continue;
    }
    if (arg === "--no-file") {
      args.file = null;
      continue;
    }
  }

  return args;
}

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
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  return parseDotEnv(content);
}

function readFallbackEnvFiles() {
  const candidates = [".env.local", ".env"];

  for (const candidate of candidates) {
    const env = readEnvFromFile(candidate);
    if (env) {
      return { env, sourceLabel: path.resolve(candidate) };
    }
  }

  return null;
}

function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const exactPlaceholders = new Set([
    "change-me",
    "change-me-refresh",
    "change-me-reset",
    "change-me-email-verify",
    "change-me-too",
    "sk_test_xxx",
    "whsec_xxx",
    "__replace__",
    "__replace_with_strong_secret__",
    "__replace_with_strong_secret_2__",
    "__replace_with_strong_secret_3__",
    "__replace_with_strong_secret_4__",
    "__replace_with_strong_secret_5__",
    "<replace>",
  ]);

  if (exactPlaceholders.has(normalized)) {
    return true;
  }

  if (normalized.includes("replace_with")) {
    return true;
  }

  return false;
}

function ensurePresent(env, key, errors, label) {
  const value = env[key];
  if (isPlaceholder(value)) {
    errors.push(`${label}: ${key} is missing or placeholder`);
  }
}

function hasAny(env, keys) {
  return keys.some((key) => {
    const value = env[key];
    return value !== undefined && value !== null && String(value).trim().length > 0;
  });
}

function main() {
  const { file, mode } = parseArgs(process.argv);
  const envFromFile = file ? readEnvFromFile(file) : null;
  const fallback = !file ? readFallbackEnvFiles() : null;
  const source = envFromFile ?? (fallback ? { ...fallback.env, ...process.env } : process.env);
  const sourceLabel = envFromFile
    ? path.resolve(file)
    : fallback
      ? `process.env (+ fallback ${fallback.sourceLabel})`
      : "process.env";

  const errors = [];
  const warnings = [];

  if (!hasAny(source, ["DATABASE_URL", "DATABASE_URL_PREVIEW", "DATABASE_URL_PRODUCTION"])) {
    errors.push("Database: set DATABASE_URL or DATABASE_URL_PREVIEW / DATABASE_URL_PRODUCTION");
  }

  ensurePresent(source, "APP_JWT_SECRET", errors, "Auth");
  ensurePresent(source, "REFRESH_TOKEN_SECRET", errors, "Auth");
  ensurePresent(source, "PASSWORD_RESET_TOKEN_SECRET", errors, "Auth");
  ensurePresent(source, "EMAIL_VERIFICATION_TOKEN_SECRET", errors, "Auth");
  ensurePresent(source, "FILE_TOKEN_SECRET", errors, "Files");
  ensurePresent(source, "APP_BASE_URL", errors, "App");
  ensurePresent(source, "APP_ALLOWED_ORIGINS", errors, "App");
  ensurePresent(source, "OBJECT_STORAGE_DRIVER", errors, "Storage");

  const objectStorageDriver = (source.OBJECT_STORAGE_DRIVER || "").toLowerCase();
  if (objectStorageDriver === "s3") {
    ensurePresent(source, "OBJECT_STORAGE_BUCKET", errors, "Storage");
    ensurePresent(source, "OBJECT_STORAGE_REGION", errors, "Storage");
    ensurePresent(source, "OBJECT_STORAGE_ACCESS_KEY_ID", errors, "Storage");
    ensurePresent(source, "OBJECT_STORAGE_SECRET_ACCESS_KEY", errors, "Storage");
  }

  const hasStripeSecret = !!source.STRIPE_SECRET_KEY?.trim();
  const hasStripeWebhook = !!source.STRIPE_WEBHOOK_SECRET?.trim();
  if (hasStripeSecret || hasStripeWebhook) {
    ensurePresent(source, "STRIPE_SECRET_KEY", errors, "Stripe");
    ensurePresent(source, "STRIPE_WEBHOOK_SECRET", errors, "Stripe");
  } else {
    warnings.push("Stripe: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are not set");
  }

  const hasSmtpHost = !!source.SMTP_HOST?.trim();
  if (hasSmtpHost) {
    ensurePresent(source, "SMTP_USER", errors, "SMTP");
    ensurePresent(source, "SMTP_PASS", errors, "SMTP");
    ensurePresent(source, "SMTP_FROM", errors, "SMTP");
  } else {
    warnings.push("SMTP: SMTP_HOST is not set (email delivery may fallback)");
  }

  const hasWebPushPublic = !!source.WEB_PUSH_PUBLIC_KEY?.trim();
  const hasWebPushPrivate = !!source.WEB_PUSH_PRIVATE_KEY?.trim();
  if (hasWebPushPublic || hasWebPushPrivate) {
    ensurePresent(source, "WEB_PUSH_PUBLIC_KEY", errors, "WebPush");
    ensurePresent(source, "WEB_PUSH_PRIVATE_KEY", errors, "WebPush");
    ensurePresent(source, "WEB_PUSH_SUBJECT", errors, "WebPush");
  } else {
    warnings.push("WebPush: WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY are not set");
  }

  const isProduction = mode === "production" || mode === "prod";
  if (isProduction) {
    const baseUrl = source.APP_BASE_URL || "";
    const origins = source.APP_ALLOWED_ORIGINS || "";
    const authCookieSecure = (source.AUTH_COOKIE_SECURE || "").toLowerCase();
    const dbAutoMigrate = (source.DB_AUTO_MIGRATE || "").toLowerCase();

    if (baseUrl.includes("localhost")) {
      errors.push("Production: APP_BASE_URL must not point to localhost");
    }

    if (origins.includes("localhost")) {
      errors.push("Production: APP_ALLOWED_ORIGINS must not point to localhost");
    }

    if (authCookieSecure !== "true") {
      errors.push("Production: AUTH_COOKIE_SECURE must be true");
    }

    if (dbAutoMigrate === "true") {
      warnings.push("Production: DB_AUTO_MIGRATE=true is risky; prefer explicit migration step");
    }

    if (!source.INTERNAL_CRON_KEY?.trim()) {
      warnings.push("Production: INTERNAL_CRON_KEY is missing (retry cron cannot authenticate)");
    }

    if (!source.INTERNAL_HEALTH_KEY?.trim()) {
      warnings.push("Production: INTERNAL_HEALTH_KEY is missing (detailed health metrics locked)");
    }
  }

  console.log(`Environment check source: ${sourceLabel}`);
  console.log(`Mode: ${mode}`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length) {
    console.error("\nErrors:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nOK: required environment checks passed.");
}

main();
