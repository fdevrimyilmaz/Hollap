# CreatorHub

Next.js application with a backend for creator workflows (PostgreSQL, auth, payments, notifications, and delivery retries).

## Requirements

- Node.js 20+
- npm 10+

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
- `FILE_TOKEN_SECRET`
- `OBJECT_STORAGE_DRIVER` (`local` or `s3`)

For real Stripe payments/webhooks:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Local Postgres (Recommended)

Start local PostgreSQL with Docker Compose:

```bash
docker compose up -d
```

This starts `postgres:16` on `127.0.0.1:5432` with:
- DB: `hollap`
- User: `postgres`
- Password: `postgres`

Default `DATABASE_URL` in `.env.example` already matches this local setup.

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

4. Trigger subscription checkout completion (creates/updates subscription mapping):

```bash
stripe trigger checkout.session.completed \
  --override checkout_session:mode=subscription \
  --override checkout_session:subscription=sub_harden_1 \
  --override checkout_session:customer=cus_harden_1 \
  --override checkout_session:metadata.creatorId=usr_creator_demo \
  --override checkout_session:metadata.subscriberId=usr_subscriber_demo \
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

## Database Migrations

Migrations are SQL files in `src/lib/server/migrations` and run automatically on first DB access.

Migration flow:
1. Ensure `DATABASE_URL` points to your Postgres instance.
2. Start the app (`npm run dev`) or call any API endpoint.
3. The app creates `schema_migrations` and applies pending migrations in filename order.
4. Verify DB connectivity and migration success via `GET /api/health` (`db: "ok"`).

Smoke seed:
- A minimal seed migration inserts demo-safe starter records.
- Seed inserts are idempotent (`ON CONFLICT DO NOTHING`) and won’t duplicate data.

Migrating from previous local SQLite:
1. Backup old SQLite data if needed.
2. Provision Postgres and set `DATABASE_URL`.
3. Start app to apply migrations.
4. Recreate/import any legacy SQLite-only data you still need.

## Netlify Deploy

This repo is configured for Next.js on Netlify with `@netlify/plugin-nextjs` in `netlify.toml`.

- Build command: `npm ci && npm run build`
- Node version: `20`
- Plugin: `@netlify/plugin-nextjs`

Set the same environment variables from `.env.local` in Netlify Site Settings before deploying.
`DATABASE_URL` must point to a reachable Postgres instance for production build/runtime.

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
- Added automatic migration runner with idempotent smoke seed.
- Added local Postgres via `docker-compose.yml` for development parity.

## Demo Accounts

- Creator: `creator@hollap.dev` / `creator123`
- Subscriber: `student@hollap.dev` / `student123`
