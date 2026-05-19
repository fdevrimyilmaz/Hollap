# CreatorHub Production Deployment Runbook

End-to-end production deployment guide for the CreatorHub Next.js application.
Follow top-to-bottom for a clean first launch; later deployments only need the
relevant section.

---

## 0. Prerequisites

- A Netlify account with a site connected to this repository
- A managed PostgreSQL instance reachable from the public internet
  (recommended: Supabase, Neon, RDS, Render Postgres)
- A Stripe account in live mode with publishable + secret keys
- An SMTP provider for transactional email (Postmark, SendGrid, AWS SES,
  Resend, or any SMTP relay)
- An S3-compatible object storage bucket (AWS S3, Cloudflare R2, MinIO)
- A registered domain pointing at your Netlify site
- Local machine with Node 20+, npm 10+, and the Stripe CLI installed for
  webhook testing

---

## 1. Generate production secrets

Generate strong secrets locally (do NOT commit):

```bash
npm run env:secrets > /tmp/hollap-secrets.env
```

This outputs values for:
- `APP_JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `PASSWORD_RESET_TOKEN_SECRET`
- `EMAIL_VERIFICATION_TOKEN_SECRET`
- `FILE_TOKEN_SECRET`
- `INTERNAL_CRON_KEY`
- `INTERNAL_HEALTH_KEY`
- `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` (VAPID)

Keep `/tmp/hollap-secrets.env` open; copy values into Netlify in step 4. Delete
it after deploy.

---

## 2. Provision the production database

1. Create a Postgres 16+ instance from your provider.
2. Copy the full connection string. It should look like:
   ```
   postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
   ```
3. From your local machine, run the migrations once against production:

   ```bash
   DATABASE_URL='postgres://...' npm run db:migrate
   ```

   You should see migrations apply from `0001_init` through the current latest
   file (currently `0019_bookmarks_activity_coupons`).
4. Verify connectivity:

   ```bash
   DATABASE_URL='postgres://...' DATABASE_SSL=true \
     node -e "require('pg').Pool && console.log('pg ok')"
   ```

### TLS hardening

Always set `DATABASE_SSL=true` in production. If your provider gives you a CA
certificate, set `DATABASE_CA_CERT` to its full PEM content for strict
verification. Prefer `DATABASE_CA_CERT` for managed PostgreSQL. Use
`DATABASE_SSL_REJECT_UNAUTHORIZED=false` only as a temporary diagnostic
workaround.

---

## 3. Configure Stripe

### Live keys

1. From Stripe Dashboard → Developers → API keys, copy the **live** secret
   key. You will set it as `STRIPE_SECRET_KEY`.
2. Add an endpoint at `https://YOUR-DOMAIN/api/payments/webhook` for these
   events (minimum):
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Copy the endpoint's signing secret (`whsec_...`). You will set it as
   `STRIPE_WEBHOOK_SECRET`.

### Test the webhook locally before going live

```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhook
stripe trigger checkout.session.completed
```

See README.md "Stripe Webhook Local Test" for the full override example.

---

## 4. Configure object storage

### S3 / R2

1. Create a bucket (private by default).
2. Configure CORS on the bucket to allow browser PUT/GET from your app
   origin with `Content-Type` header. Minimal example:

   ```json
   [
     {
       "AllowedOrigins": ["https://YOUR-DOMAIN"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
3. Create an IAM user / R2 API token scoped to this bucket with
   `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on the bucket and
   `s3:HeadObject` for presign-revalidation.
4. Note the credentials for step 5.

---

## 5. Configure Netlify environment

In Netlify → Site settings → Environment variables, set all of the following.
Use scoped contexts (production / deploy-preview) where they should differ.

### Required (production fails to build without these)

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_BASE_URL` | `https://YOUR-DOMAIN` |
| `APP_ALLOWED_ORIGINS` | `https://YOUR-DOMAIN` |
| `AUTH_COOKIE_SECURE` | `true` |
| `AUTH_COOKIE_SAME_SITE` | `lax` |
| `DATABASE_URL_PRODUCTION` | from step 2 |
| `DATABASE_URL_PREVIEW` | a separate preview DB or omit |
| `DATABASE_SSL` | `true` |
| `APP_JWT_SECRET` | from step 1 |
| `REFRESH_TOKEN_SECRET` | from step 1 |
| `PASSWORD_RESET_TOKEN_SECRET` | from step 1 |
| `EMAIL_VERIFICATION_TOKEN_SECRET` | from step 1 |
| `FILE_TOKEN_SECRET` | from step 1 |
| `OBJECT_STORAGE_DRIVER` | `s3` |

### Object storage (when driver=s3)

| Variable | Value |
|---|---|
| `OBJECT_STORAGE_BUCKET` | bucket name |
| `OBJECT_STORAGE_REGION` | `us-east-1`, `auto`, etc. |
| `OBJECT_STORAGE_ENDPOINT` | required for R2/MinIO; omit for AWS |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | from step 4 |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | from step 4 |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `true` for MinIO, otherwise `false` |
| `OBJECT_STORAGE_PRESIGN_TTL_SECONDS` | `300` (default) |

### Payments

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | from step 3 |
| `STRIPE_WEBHOOK_SECRET` | from step 3 |

### Email

| Variable | Value |
|---|---|
| `SMTP_HOST` | provider SMTP host |
| `SMTP_PORT` | `587` (STARTTLS) or `465` (TLS) |
| `SMTP_USER` | provider username |
| `SMTP_PASS` | provider password |
| `SMTP_FROM` | `no-reply@YOUR-DOMAIN` |

### Web Push (optional, enables /api/push/subscribe)

| Variable | Value |
|---|---|
| `WEB_PUSH_PUBLIC_KEY` | from step 1 |
| `WEB_PUSH_PRIVATE_KEY` | from step 1 |
| `WEB_PUSH_SUBJECT` | `mailto:ops@YOUR-DOMAIN` |

### OAuth (optional)

Set the pair if you configured the provider in step 6.

| Variable | Value |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` |  |
| `GOOGLE_OAUTH_CLIENT_SECRET` |  |
| `GITHUB_OAUTH_CLIENT_ID` |  |
| `GITHUB_OAUTH_CLIENT_SECRET` |  |

### Internal

| Variable | Value |
|---|---|
| `INTERNAL_CRON_KEY` | from step 1 — required for the retry cron to authenticate |
| `INTERNAL_HEALTH_KEY` | from step 1 — gates detailed `/api/health` metrics |

---

## 6. (Optional) Configure OAuth providers

Skip this section if you only want email/password signup.

### Google

1. Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth
   client ID (Web application).
2. Add authorized redirect URI:
   `https://YOUR-DOMAIN/api/auth/oauth/google/callback`
3. Copy client ID and secret into Netlify env.

### GitHub

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Authorization callback URL:
   `https://YOUR-DOMAIN/api/auth/oauth/github/callback`
3. Copy client ID and generate client secret. Set in Netlify env.

PKCE is enabled by default on both flows; no extra configuration needed.

---

## 7. Deploy

Trigger a Netlify deploy from the dashboard or push to the production branch.

Netlify will run:
```
npm ci && npm run env:check:deploy && npm run ci && npm run build
```

If any required env var is missing or placeholder, `env:check:deploy` fails
the build before publishing. This is intentional.

On first boot, `src/instrumentation.ts` validates env again and throws fatally
if anything is misconfigured (cookie secure off, localhost URLs, missing
secret). This double-check means a misconfigured deploy never serves user
traffic with a broken auth surface.

---

## 8. Post-deploy smoke test

Run the smoke script against the live site:

```bash
APP_BASE_URL=https://YOUR-DOMAIN node scripts/smoke.mjs
```

Expected output:
- `GET /api/health` → 200 with `ok: true` and `integrations.stripe = "configured"`,
  `smtp = "configured"`, `storage = "configured"`
- Signup → returns 201 / 409 (idempotent)
- Login flow → returns 401 / 200 depending on verification state

If `/api/health` returns `ok: false`, check the `integrations` field for
`"missing"` values and complete the corresponding section above.

After every deploy, also run these endpoint checks:

```bash
BASE=https://your-domain.example
curl -fsS $BASE/api/health | jq '{ok, db, integrations}'
curl -fsS $BASE/api/payments/products | jq '.products | length'
curl -fsS $BASE/api/push/vapid-key | jq
```

If `/api/health` reports `db: "error"`, the most likely cause is
`DATABASE_URL` pointing at a DB the function can't reach (firewall, SSL).
Try `DATABASE_SSL=true` + `DATABASE_CA_CERT` for managed providers.

### Stripe webhook end-to-end

From your local machine with Stripe CLI:

```bash
stripe trigger checkout.session.completed
```

Watch Netlify Function logs for the webhook handler. A successful run shows
`payments.checkout_completed` logged.

---

## 9. Monitoring and observability

### Uptime

Configure an external monitor (UptimeRobot, Better Stack, Pingdom) to hit
`https://YOUR-DOMAIN/api/health` every 60 seconds.

- HTTP 200 with `ok: true` → healthy
- HTTP 200 with `ok: false` → degraded (integration partially configured)
- HTTP 503 → DB or critical infrastructure failure

For internal detailed metrics, the monitor can send header
`x-internal-key: <INTERNAL_HEALTH_KEY>` to receive:
- `metrics.pendingDeliveries`
- `metrics.failedDeliveries`
- `metrics.failedWebhooks`
- `metrics.activeSessions`

### Application logs

Netlify Functions logs are accessible from the Netlify dashboard. Key search
strings:
- `[boot]` — startup validation events
- `auth.refresh_token_replay_detected` — token theft signal
- `auth.login_failed` — failed login attempts (rate-limited per IP+account)
- `health.check` — every uptime probe

### Retry cron

`POST /api/internal/retry-deliveries` runs notification + webhook + upload
draft cleanup. Authenticated with `INTERNAL_CRON_KEY` via
`x-internal-key` header. Schedule this every 5–15 minutes from:
- Netlify scheduled functions
- Or any external cron service

### Error tracking (optional)

TODO: Sentry/Logflare/Datadog browser SDK integration is not wired by default.
`src/app/error.tsx` and `src/app/global-error.tsx` currently only log to the
browser console.

---

## 10. Rollback

If a deploy goes bad:

1. In Netlify → Deploys, find the last good deploy and click "Publish deploy".
2. If the bad deploy applied a migration that you need to revert: write a
   compensating migration in `src/lib/server/migrations/` with the next
   sequential number. Migrations are append-only; do not edit applied SQL.
3. If the rollback breaks because the new deploy's code expects new schema:
   run the compensating migration first, then redeploy.

---

## 11. Operating playbooks

### Rotating secrets

JWT and refresh token secrets can be rotated without downtime by:
1. Setting the new secret in Netlify env.
2. All sessions immediately invalidate (expected behavior on secret rotation).
3. Users re-login.

For password reset / email verification token secrets, the same applies but
in-flight tokens become invalid; user must request a new email.

### Recovering a locked-out admin

Direct DB update (use sparingly):

```sql
UPDATE users SET role = 'admin', email_verified_at = NOW()
WHERE email = 'admin@YOUR-DOMAIN';
```

### Forcing logout for a compromised user

```sql
UPDATE auth_sessions
SET revoked_at = NOW(), updated_at = NOW()
WHERE user_id = 'usr_XXX' AND revoked_at IS NULL;
```

---

## 12. Known constraints

- Netlify Functions: each cold start gets its own DB pool. Default pool size
  is 2 in serverless to avoid exhausting provider connection limits. Tune
  with `DATABASE_POOL_MAX` only if you switch to a long-lived runtime.
- `storage/private/` local fallback driver is for development only; ship S3.
- Stripe SDK is pinned to `^20.3.1` and API version `2026-01-28.clover`.
  Upgrade as a deliberate operation: bump SDK, update `STRIPE_API_VERSION`
  in `src/lib/server/payments.ts`, run webhook tests.

---

## 13. Feature flag matrix (env-aware fallbacks)

The platform degrades gracefully when third-party integrations are not
configured. Use this table when triaging "X doesn't work in production":

| Feature | Env vars needed | When missing |
|---|---|---|
| Stripe checkout / payouts | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `/api/payments/checkout` returns error; `PayoutsCard` shows dev placeholder that assigns stub `acct_dev_*` |
| Mux live streaming (optional; requires Mux SDK + credentials) | `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | Dashboard "Start broadcast" assigns local stream key; HLS playback URL is null |
| Email (signup verify, reset, digest) | `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` | Mail bodies + links are logged to the server console |
| Web Push | `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` | Browser bell hidden; `/api/push/vapid-key` returns `{enabled: false}` |
| OAuth Google | `GOOGLE_OAUTH_CLIENT_ID` + `_SECRET` | TODO: credential yokken butonlar halen görünebilir; akış credentials set edilene kadar başarısız olur |
| OAuth GitHub | `GITHUB_OAUTH_CLIENT_ID` + `_SECRET` | TODO: credential yokken butonlar halen görünebilir; akış credentials set edilene kadar başarısız olur |
| S3/R2 object storage | `OBJECT_STORAGE_DRIVER=s3` + bucket creds | Falls back to `storage/private/` on local disk. NEVER use local storage fallback in production/serverless deployments. |
| Cron-driven digests / retries | `INTERNAL_CRON_KEY` (sender side) | `/api/internal/*` endpoints are open in dev; protected in prod once the key is set |

Run `npm run env:check` to see which features are currently enabled.

---

## 14. Recurring tasks (cron)

The repo includes ready-to-wire cron endpoints. Hook them up via Netlify
scheduled functions, GitHub Actions, or your platform's cron:

| Endpoint | Recommended schedule | Purpose |
|---|---|---|
| `POST /api/internal/retry-deliveries` | every 5 min | Replay failed push / email deliveries |
| `POST /api/internal/digest/send` | weekly (Mon 09:00 local) | Sends each creator their 7-day stats summary |

Both require `Authorization: Bearer ${INTERNAL_CRON_KEY}` in production.
