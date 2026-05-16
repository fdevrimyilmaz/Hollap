#!/usr/bin/env node
/**
 * Post-deploy smoke test for CreatorHub.
 *
 * Usage:
 *   APP_BASE_URL=https://your-domain node scripts/smoke.mjs
 *   APP_BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 *
 * Exits with code 0 on success, 1 on any failure.
 * Does NOT mutate persistent state beyond a uniquely-suffixed signup that
 * lands in an unverified state (cleanable via your retention policy).
 */

const BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const SMOKE_TIMEOUT_MS = 15_000;

const results = [];

function logStep(name, status, detail = "") {
  const icon = status === "pass" ? "PASS" : status === "skip" ? "SKIP" : "FAIL";
  results.push({ name, status, detail });
  const detailSuffix = detail ? ` — ${detail}` : "";
  // eslint-disable-next-line no-console
  console.log(`[${icon}] ${name}${detailSuffix}`);
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SMOKE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkHealth() {
  const url = `${BASE_URL}/api/health`;
  let response;
  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    logStep("GET /api/health reachable", "fail", error.message);
    return null;
  }

  if (response.status !== 200 && response.status !== 503) {
    logStep("GET /api/health status", "fail", `unexpected status ${response.status}`);
    return null;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    logStep("GET /api/health json", "fail", error.message);
    return null;
  }

  logStep(
    "GET /api/health status",
    response.status === 200 ? "pass" : "fail",
    `HTTP ${response.status}, ok=${payload?.ok}`
  );

  if (payload?.db === "ok") {
    logStep("Health: db=ok", "pass");
  } else {
    logStep("Health: db=ok", "fail", `db=${payload?.db}`);
  }

  const integrations = payload?.integrations || {};
  const partial = Object.entries(integrations)
    .filter(([, value]) => value === "missing")
    .map(([k]) => k);
  if (partial.length === 0) {
    logStep("Health: integrations not partial", "pass");
  } else {
    logStep("Health: integrations not partial", "fail", `partial: ${partial.join(", ")}`);
  }

  return payload;
}

async function checkSecurityHeaders() {
  const url = `${BASE_URL}/`;
  let response;
  try {
    response = await fetchWithTimeout(url, { method: "GET", redirect: "manual" });
  } catch (error) {
    logStep("GET / reachable", "fail", error.message);
    return;
  }

  const headers = response.headers;
  const required = [
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "strict-transport-security",
    "content-security-policy",
  ];

  const missing = required.filter((name) => !headers.get(name));
  if (missing.length === 0) {
    logStep("Security headers present", "pass");
  } else {
    logStep("Security headers present", "fail", `missing: ${missing.join(", ")}`);
  }
}

async function checkSignupCsrf() {
  const url = `${BASE_URL}/api/auth/signup`;
  let response;
  try {
    // No Origin/Referer header — should be rejected by assertCsrf with 403.
    response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "noop@example.invalid", password: "irrelevant", name: "X" }),
    });
  } catch (error) {
    logStep("Signup CSRF guard reachable", "fail", error.message);
    return;
  }

  if (response.status === 403) {
    logStep("Signup CSRF guard rejects cross-origin", "pass", `HTTP 403`);
  } else {
    logStep(
      "Signup CSRF guard rejects cross-origin",
      "fail",
      `expected 403, got HTTP ${response.status}`
    );
  }
}

async function checkSignupHappyPath() {
  const url = `${BASE_URL}/api/auth/signup`;
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `smoke-${uniqueSuffix}@example.invalid`;
  const password = `Smoke!${uniqueSuffix}`;

  let response;
  try {
    response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        email,
        password,
        name: `Smoke ${uniqueSuffix.slice(0, 8)}`,
        role: "subscriber",
      }),
    });
  } catch (error) {
    logStep("Signup happy path reachable", "fail", error.message);
    return;
  }

  // 201 (created), 409 (already exists — replay safe), 429 (rate limited)
  // are all valid pass states for a smoke probe.
  if (response.status === 201) {
    logStep("Signup happy path", "pass", "HTTP 201 (created)");
  } else if (response.status === 409) {
    logStep("Signup happy path", "pass", "HTTP 409 (already exists, replay)");
  } else if (response.status === 429) {
    logStep("Signup happy path", "skip", "HTTP 429 (rate limited)");
  } else {
    logStep("Signup happy path", "fail", `HTTP ${response.status}`);
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`CreatorHub smoke test against ${BASE_URL}\n`);

  const health = await checkHealth();
  if (!health) {
    // eslint-disable-next-line no-console
    console.error("\nAborting: health check failed");
    process.exit(1);
  }

  await checkSecurityHeaders();
  await checkSignupCsrf();
  await checkSignupHappyPath();

  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const passed = results.filter((r) => r.status === "pass").length;

  // eslint-disable-next-line no-console
  console.log(`\nResult: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Smoke run crashed:", error);
  process.exit(1);
});
