#!/usr/bin/env node
// Precheck for `npm run test:ci`. Runs before vitest in CI to fail fast
// with a clear message if the workflow forgot to wire DATABASE_URL into
// the job env. Without this, DB-backed describe() blocks silently switch
// to describe.skip and CI passes a green build that ran ~14 fewer tests
// than dev intended.

const inCi = process.env.CI === "true";
if (!inCi) {
  process.exit(0);
}

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_PREVIEW ||
  process.env.DATABASE_URL_PRODUCTION;

if (!dbUrl) {
  console.error(
    [
      "[test:ci] FATAL: no DATABASE_URL in CI environment.",
      "",
      "DB-backed test suites (auth-security, checkout-fulfillment,",
      "dm-flow, notification-retry, refresh-token-replay, webhook-retry)",
      "would silently skip and produce a false-green build.",
      "",
      "Fix: set one of DATABASE_URL / DATABASE_URL_PREVIEW /",
      "DATABASE_URL_PRODUCTION on the CI job env. See",
      ".github/workflows/ci.yml for the canonical wiring.",
    ].join("\n")
  );
  process.exit(1);
}

console.log(`[test:ci] DATABASE_URL is set; DB-backed suites will run.`);
