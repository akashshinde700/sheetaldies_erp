# Developer notes — Sheetal Dies ERP

## Auth

- JWT is stored in the browser as `localStorage` key `erp_token` (see frontend API helper).
- Set a strong `JWT_SECRET` in production `.env`; never commit secrets.

## Backend

- After schema changes: `cd backend && npx prisma migrate deploy` (or `npm run db:migrate` in dev).
- **PAN unique index:** migration `20260409140000_unique_party_pan` fails if duplicate non-null `parties.pan` values exist — fix data first.
- **`prisma generate` on Windows:** if you see `EPERM` / file locks, pause antivirus for the project folder or run the terminal as admin.

## Ops

- **`GET /api/health`** — returns `{ status, db, timestamp }`; use for load balancers (503 when DB is down).
- Login: **30 requests / 15 minutes / IP** on `POST /api/auth/login` (`express-rate-limit`).

## Tests

- `cd backend && npm test` — lightweight validation tests (no DB required).
