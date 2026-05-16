# Hollap Core

Hollap Core is the MVP for `hollap.com`, focused on the Borsa & Finans category.

## Included MVP Modules

- `auth` (JWT access/refresh + OAuth-ready endpoints)
- `teachers` (teacher profile and pricing)
- `subscriptions` (Stripe-ready simulation flow)
- `stage` (live voice stage with request-to-speak moderation)
- `wall` (async voice wall with 60-second audio replies)

## Tech Stack

- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL + Redis
- Realtime: Socket.IO + WebRTC signaling
- Object storage: S3/MinIO-compatible SDK
- Frontend: Next.js + Tailwind CSS (PWA-friendly setup)
- Testing: Jest + Supertest

## Quick Start

1. Copy environment file:
   - `cp .env.example .env` (Windows: `copy .env.example .env`)
2. Install dependencies:
   - `npm install`
3. Start infra:
   - `npm run infra:up`
4. Generate Prisma client, run migrations, and seed demo data:
   - `npm run demo:setup`
5. Start development:
   - `npm run dev`

## Demo Accounts

- Teacher: `teacher@hollap.com` / `Hollap123!`
- Assistant: `assistant@hollap.com` / `Hollap123!`
- Student: `student@hollap.com` / `Hollap123!`

## API Routes

- Auth: `/api/auth/*`
  - `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me`
  - `POST /oauth/google`, `POST /oauth/apple`
- Teachers: `/api/teachers/*`
  - `GET /`, `GET /:teacherUserId`, `PUT /me/profile`
  - `GET /me/stripe/status`, `POST /me/stripe/onboarding-link`
- Subscriptions: `/api/subscriptions/*`
  - `POST /checkout`, `POST /mock/confirm`, `GET /me`, `POST /webhook`
- Stage: `/api/stage/*`
  - `GET /teachers/me/rooms`, `GET /teachers/:teacherUserId/rooms`
  - `POST /rooms`, `GET /rooms/:roomId`, `POST /rooms/:roomId/notes`
  - `GET /rooms/:roomId/notes`, `GET /rooms/:roomId/notes/export.txt`
  - `GET /rooms/:roomId/mic-requests`, `POST /rooms/:roomId/end`
- Wall: `/api/wall/*`
  - `POST /questions`, `GET /teachers/:teacherUserId/questions`
  - `GET /questions/:questionId/replies`, `POST /questions/:questionId/replies`, `DELETE /replies/:replyId`
- Media: `/api/media/avatar`

## Socket.IO Events

- Room lifecycle: `room:join`, `room:leave`, `end:room`
- Mic moderation: `request:mic`, `approve:mic`, `revoke:mic`
- Live notes: `new:note`
- WebRTC signaling helper: `webrtc:signal`

## Verification

- Backend tests: `npm run test`
- Production build: `npm run build`
- API smoke flow: `npm run smoke:api`

## Infrastructure Commands

- Start infra: `npm run infra:up`
- Stop infra: `npm run infra:down`

## Apps

- API: `http://localhost:4001`
- Web: `http://localhost:3001`

## Assistant Moderator Mode

- Assistant accounts can use moderator tools for a teacher by opening:
  - `http://localhost:3001/moderator?teacherId=<teacher_user_id>`
- In this mode, assistant can monitor and manage mic requests in active rooms.

## Important Notes

- Stripe can run in simulation mode with `STRIPE_MOCK=true`.
- In Stripe live/test mode (`STRIPE_MOCK=false`), teacher payout onboarding is required before subscription checkout.
- OAuth routes are production-ready in structure but can run with fallback behavior when provider credentials are absent.
- WebRTC is peer-to-peer in MVP. A transport abstraction is provided to swap in Mediasoup/Agora later.
