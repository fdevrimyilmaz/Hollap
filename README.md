# CreatorHub

Next.js 15 application with a hardened backend for creator workflows
(PostgreSQL, auth with refresh-token replay detection, payments, notifications,
and delivery retries).

> **Going to production?** Follow [DEPLOYMENT.md](DEPLOYMENT.md) end-to-end.

## Requirements

- Node.js 20+
- npm 10+
- Docker (optional, for local Postgres)

## Environment Setup

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

Minimum required for local backend flow:
- `DATABASE_URL`
- `APP_JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `PASSWORD_RESET_TOKEN_SECRET`
- `EMAIL_VERIFICATION_TOKEN_SECRET`
- `FILE_TOKEN_SECRET`
- `OBJECT_STORAGE_DRIVER` (`local` or `s3`)

Generate secure local secrets quickly:

```bash
npm run env:secrets
```

Validate env values before deploy:

```bash
# Local file mode
npm run env:check -- --file .env.local --mode production

# Deploy mode (reads process.env, autodetects Netlify CONTEXT / Vercel
# VERCEL_ENV). Wired into netlify.toml build, so a deploy with missing or
# placeholder secrets fails build before publishing.
npm run env:check:deploy
```

A second-line defense runs at runtime: [src/instrumentation.ts](src/instrumentation.ts)
throws fatally on cold start in production if cookie security is off, URLs
point at localhost, or any required secret is missing. Functions never serve
traffic with a broken environment.

Deploy-only alternative (if you do not set `DATABASE_URL` globally):
- `DATABASE_URL_PREVIEW`
- `DATABASE_URL_PRODUCTION`

For real Stripe payments/webhooks:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Local Postgres (Recommended)

Convenience npm scripts wrap docker-compose:

```bash
npm run db:up      # start postgres in background
npm run db:down    # stop containers
npm run db:reset   # wipe volume and recreate (destructive)
```

Or directly: `docker compose up -d`.

This starts `postgres:16` on `127.0.0.1:5432` with:
- DB: `hollap`
- User: `postgres`
- Password: `postgres`

Default `DATABASE_URL` in `.env.example` already matches this local setup.

### Database security

- Production must set `DATABASE_SSL=true`. TLS certificate verification is
  ON by default (`rejectUnauthorized=true`).
- For strict CA pinning, provide PEM via `DATABASE_CA_CERT`.
- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` exists as a documented opt-out
  for legacy providers; it disables MITM protection and logs a loud
  production warning. Avoid.
- Migration runner takes a `pg_advisory_xact_lock` to serialize concurrent
  cold starts across serverless function instances.
- DB pool size defaults to 2 on serverless (Netlify/Vercel/Lambda/CF
  Workers) and 5 elsewhere. Override with `DATABASE_POOL_MAX`.

## Stripe Webhook Local Test (PR-4)

1. Start app:

```bash
npm run dev
```

2. In another terminal, start Stripe CLI forwarding:

```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhook
```

3. Copy the printed `whsec_...` and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

4. Trigger subscription checkout completion (creates/updates subscription mapping).
Use real user IDs from your DB for `creatorId` and `subscriberId`:

```bash
stripe trigger checkout.session.completed \
  --override checkout_session:mode=subscription \
  --override checkout_session:subscription=sub_harden_1 \
  --override checkout_session:customer=cus_harden_1 \
  --override checkout_session:metadata.creatorId=usr_creator_real \
  --override checkout_session:metadata.subscriberId=usr_subscriber_real \
  --override checkout_session:metadata.tier=vip
```

5. Trigger key follow-up events:

```bash
stripe trigger invoice.payment_failed --override invoice:subscription=sub_harden_1
stripe trigger invoice.paid --override invoice:subscription=sub_harden_1
stripe trigger customer.subscription.updated --override subscription:id=sub_harden_1
stripe trigger customer.subscription.deleted --override subscription:id=sub_harden_1
```

6. Idempotency check (same event ID resend): copy `evt_...` from Stripe CLI output, then resend:

```bash
stripe events resend evt_xxx --forward-to http://localhost:3000/api/payments/webhook
```

Expected:
- Invalid/missing signature returns `400`.
- Re-sent identical event is treated as duplicate.
- Subscription access state follows Stripe status (`active`/`trialing` grant access; failed/deleted revoke).

For S3-compatible object storage (AWS S3, Cloudflare R2, MinIO):
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_ACCESS_KEY_ID`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`
- `OBJECT_STORAGE_ENDPOINT` (required for R2/MinIO)
- Bucket CORS must allow browser `PUT`/`GET` from your app origin with `Content-Type` header.

## Local Commands

Install dependencies (deterministic):

```bash
npm ci
```

Run development server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Build note:
- `npm run build` does not require a live DB connection.
- `DATABASE_URL` is still required at runtime for DB-backed endpoints.

Start production server:

```bash
npm run start
```

Lint:

```bash
npm run lint
```

Typecheck:

```bash
npm run typecheck
```

Test:

```bash
npm run test
```

Note:
- DB integration tests run only when `DATABASE_URL` is explicitly set.
- Without `DATABASE_URL`, unit/mock-based tests still run.

CI check (lint + typecheck + test):

```bash
npm run ci
```

Environment check (recommended before deploy):

```bash
npm run env:check -- --file .env.local --mode production
```

## Database Migrations

Migrations are SQL files in `src/lib/server/migrations`.

Available migration command:

```bash
npm run db:migrate
```

Migration strategy:
- Explicit release step (recommended): run `npm run db:migrate` before serving traffic.
- Runtime fallback: app also applies pending migrations automatically on first DB access.

Migration flow:
1. Ensure `DATABASE_URL` is set, or provide `DATABASE_URL_PREVIEW` / `DATABASE_URL_PRODUCTION` for target deploy contexts.
2. Run `npm run db:migrate` during deploy, or start app (`npm run dev`) / call any API endpoint.
3. The app creates `schema_migrations` and applies pending migrations in filename order.
4. Verify DB connectivity and migration success via `GET /api/health` (`db: "ok"`).

Seed policy:
- Migrations do not insert demo users or starter commerce records.
- Create users and products through the app flow (`/signup`, dashboard product APIs) or your own seed script.

Migrating from previous local SQLite:
1. Backup old SQLite data if needed.
2. Provision Postgres and set `DATABASE_URL`.
3. Start app to apply migrations.
4. Recreate/import any legacy SQLite-only data you still need.

## Netlify Deploy

This repo is configured for Next.js on Netlify with `@netlify/plugin-nextjs` in `netlify.toml`.

- Build command: `npm ci && npm run ci && npm run build`
- Node version: `20`
- Plugin: `@netlify/plugin-nextjs`

Set the same environment variables from `.env.local` in Netlify Site Settings before deploying.

Environment strategy:
- Use separate `DATABASE_URL_PREVIEW` and `DATABASE_URL_PRODUCTION` values (or context-scoped `DATABASE_URL`).
- Deploy pipeline now includes `npm run ci` (lint + typecheck + migration + tests).
- Pipeline migration step requires DB connectivity from Netlify build environment.
- Runtime DB-backed routes require a reachable Postgres instance.

## Clean Deploy Package

Do not ship local/runtime artifacts in release zips:
- `.next/`
- `node_modules/`
- `.git/`
- `.data/*.db*`
- `.dev*.log`

If you need a source-only zip, prefer:

```bash
git archive --format=zip --output release.zip HEAD
```

## Release Stabilization

Use release guards before publishing:

1. Commit all changes (clean working tree required).
2. Create an annotated release tag:

```bash
npm run release:tag -- v0.1.0
```

3. Run preflight checks (must pass clean tree + tag on `HEAD`):

```bash
npm run release:preflight
```

4. Build source-only archive from the release tag:

```bash
git archive --format=zip --output release-v0.1.0.zip v0.1.0
```

## File Upload / Download Flow (PR-5 object-storage)

- Client asks backend for signed upload URLs: `POST /api/dashboard/files/upload-url`
- Client uploads files directly to object storage using returned `uploadUrl` values.
- Client finalizes the dispatch: `POST /api/dashboard/files/send` with uploaded `assetIds`.
- Subscriber/creator requests private download URL: `POST /api/files/signed-url`.
- Backend performs auth+grant checks, then returns a short-lived signed download URL.

Orphaned upload drafts are cleaned by the internal cron endpoint:
- `POST /api/internal/retry-deliveries` (also runs notification/webhook retries)
- Upload drafts that expire before completion are marked orphaned and storage objects are deleted best-effort.

## Migration Notes (PR-2: db-postgres)

- Replaced local SQLite runtime with PostgreSQL (`pg` pool + SQL migrations).
- Added automatic migration runner.
- Added local Postgres via `docker-compose.yml` for development parity.

## Security Architecture

The app ships secure-by-default. Key controls:

- **Authentication**: bcrypt password hashing, JWT access tokens (12h),
  opaque refresh tokens (30d) hashed with separate HMAC secret in DB.
- **Refresh token replay detection**: rotating a refresh token preserves
  the prior hash for a 60s grace window. Any request that presents the
  prior token after rotation revokes the entire session and writes an
  `auth.refresh_token_replay_detected` audit row. See migration
  `0012_refresh_token_replay_detection.sql` and `rotateSession` in
  [src/lib/server/auth.ts](src/lib/server/auth.ts).
- **OAuth (Google + GitHub)**: PKCE (S256) on both flows, rate-limited
  init and callback routes, state cookies share the same Secure/SameSite
  policy as auth cookies. See
  [src/app/api/auth/oauth/[provider]/route.ts](src/app/api/auth/oauth/%5Bprovider%5D/route.ts).
- **Rate limiting**: per-IP + per-(IP, account) on login, signup,
  forgot/reset password, email verification, refresh, OAuth init/callback.
  Backed by `rate_limits` table with sliding window + block duration.
- **CSRF**: Origin/Referer check on all state-changing routes via
  `assertCsrf` in [src/lib/server/security.ts](src/lib/server/security.ts).
- **Client IP trust**: prefers platform-injected single-value headers
  (Netlify `x-nf-client-connection-ip`, Vercel, Cloudflare, Akamai) and
  falls back to the LAST hop of `x-forwarded-for` — not the first.
  Spoof-resistant. See
  [src/lib/server/request-context.ts](src/lib/server/request-context.ts).
- **CSP**: nonce-based Content-Security-Policy header set in
  [src/middleware.ts](src/middleware.ts).
- **Cookies**: HttpOnly + Secure in production + configurable SameSite.
- **Webhook idempotency**: Stripe events deduplicated by event ID with
  status tracking; replay-safe.
- **Boot-time validation**: production cold start refuses to serve
  traffic if any required secret is missing or insecure config is
  detected. See [src/instrumentation.ts](src/instrumentation.ts).

## Smoke Test (post-deploy)

```bash
APP_BASE_URL=https://your-domain npm run smoke
```

Probes: health (db + integrations), security headers, CSRF guard,
signup happy path. Exits non-zero on failure. See
[scripts/smoke.mjs](scripts/smoke.mjs).

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs on every PR
to `main` / `auth-prod`. Spins up Postgres 16 as a service, applies
migrations, then runs lint + typecheck + tests + build. Concurrency
guard cancels in-flight runs when a new commit lands on the same branch.
