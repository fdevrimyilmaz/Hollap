/**
 * Next.js instrumentation hook. Runs once when the Node runtime boots.
 * Used here to fail fast on missing/insecure production configuration so
 * functions never serve traffic with broken secrets or unsafe defaults.
 *
 * Edge runtime is skipped; secret validation runs in Node only.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    return;
  }

  const required = [
    "APP_JWT_SECRET",
    "REFRESH_TOKEN_SECRET",
    "PASSWORD_RESET_TOKEN_SECRET",
    "EMAIL_VERIFICATION_TOKEN_SECRET",
    "FILE_TOKEN_SECRET",
    "APP_BASE_URL",
    "APP_ALLOWED_ORIGINS",
    "OBJECT_STORAGE_DRIVER",
  ];

  const missing: string[] = [];
  for (const key of required) {
    const value = process.env[key]?.trim();
    if (!value || value.includes("REPLACE_WITH")) {
      missing.push(key);
    }
  }

  const hasDbUrl =
    !!process.env.DATABASE_URL?.trim() ||
    !!process.env.DATABASE_URL_PRODUCTION?.trim() ||
    !!process.env.DATABASE_URL_PREVIEW?.trim();
  if (!hasDbUrl) {
    missing.push("DATABASE_URL or DATABASE_URL_PRODUCTION");
  }

  const cookieSecure = (process.env.AUTH_COOKIE_SECURE || "").toLowerCase();
  const insecureCookieInProd = cookieSecure !== "true";

  const baseUrl = process.env.APP_BASE_URL || "";
  const allowedOrigins = process.env.APP_ALLOWED_ORIGINS || "";
  const localhostInProd =
    baseUrl.includes("localhost") || allowedOrigins.includes("localhost");

  const sslDisabled = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false";

  const storageDriver = (process.env.OBJECT_STORAGE_DRIVER || "").toLowerCase().trim();
  const localStorageInProd = storageDriver === "local" || storageDriver === "";

  const failures: string[] = [];
  if (missing.length) {
    failures.push(`Missing required env vars: ${missing.join(", ")}`);
  }
  if (insecureCookieInProd) {
    failures.push("AUTH_COOKIE_SECURE must be 'true' in production");
  }
  if (localhostInProd) {
    failures.push("APP_BASE_URL / APP_ALLOWED_ORIGINS must not reference localhost in production");
  }
  if (localStorageInProd) {
    // Serverless function instances have ephemeral, isolated /tmp; the
    // local-disk storage driver loses uploads as soon as the function
    // recycles, and never replicates across cold starts. Refuse to boot.
    failures.push(
      "OBJECT_STORAGE_DRIVER must be set to a durable backend (e.g. 's3') in production — local disk is not persistent on Netlify Functions"
    );
  }

  if (sslDisabled) {
    console.warn(
      "[boot] WARNING: DATABASE_SSL_REJECT_UNAUTHORIZED=false. Postgres TLS validation is OFF. MITM is possible. Provide DATABASE_CA_CERT and remove the override."
    );
  }

  if (failures.length) {
    const message = [
      "[boot] FATAL: production environment validation failed.",
      ...failures.map((line) => `  - ${line}`),
    ].join("\n");

    // Throw rather than process.exit: surfaces in logs and stops the function
    // from serving requests with a broken config.
    throw new Error(message);
  }
}
