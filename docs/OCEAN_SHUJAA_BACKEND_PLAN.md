# Ocean Shujaa Registration Backend + VPS Deployment — Build Plan

Status: **plan written before any code**. Everything below is what will be created or changed, and why.

## 1. Goal

1. Visitors register for the Ocean Shujaa holiday program through a form on `/oceanshujaa`.
2. Registrations are stored in a **PostgreSQL database running in a Docker container**.
3. The admin manages them from the existing admin panel (`/admin/ocean-shujaa`): search, filter, change status, add notes, export CSV, delete.
4. The whole site (frontend + API + database) moves to a **single VPS**, deployed with `docker compose`, served over HTTPS.

## 2. Architecture

```
                    Internet (80/443)
                          │
                ┌─────────▼─────────┐
                │  web  (Caddy)     │  serves built React app (dist/)
                │  auto-HTTPS       │  proxies /api/* → api:5000
                └─────────┬─────────┘
                          │ internal docker network
                ┌─────────▼─────────┐        ┌────────────────────┐
                │  api (Express)    │───────▶│  db (Postgres 16)  │
                │  existing server/ │  pg    │  volume: pgdata    │
                └─────────┬─────────┘        └────────────────────┘
                          │ (existing features only)
                  Firebase, Cloudinary, Gmail SMTP
```

Decisions:

- **Reuse the existing Express server** (`server/`) instead of a second service. It already has CORS, validation (zod), error handling and admin auth. We only add one route group.
- **Postgres is only reachable inside the docker network.** No port is published to the internet.
- **Admin auth is unchanged.** The admin signs in with password + email OTP. The new admin endpoints reuse the existing `requireAuth` + `requireAdmin` middleware, so only `simlabkenya@gmail.com` can read or change registrations.
- **Existing orders/abstracts keep using Supabase/Firebase.** Migrating those off Supabase is out of scope; this plan only adds the new Postgres-backed feature and moves hosting to the VPS.
- **Caddy** is used as the web server because it gets and renews Let's Encrypt certificates automatically with a 3-line config.

## 3. Step by step

### Step 1 — Database (Postgres container + schema)

| File | Action | What it does |
|---|---|---|
| `db/init/001_ocean_shujaa.sql` | create | Runs automatically the first time the `db` container starts. Creates the `ocean_shujaa_registrations` table (id, participant name, age, level, institution, guardian name/phone/email, group size, notes, status, timestamps), CHECK constraints on `status`/`level`, and indexes on `status` and `created_at`. |

### Step 2 — API (registration endpoints)

| File | Action | What it does |
|---|---|---|
| `package.json` | edit | Adds dependencies `pg` (Postgres driver) and `express-rate-limit` (anti-spam). |
| `server/src/config/postgres.ts` | create | Single `pg` connection pool built from `DATABASE_URL`. |
| `server/src/controllers/oceanShujaaController.ts` | create | Handlers: public `createRegistration`; admin `listRegistrations`, `getRegistration`, `updateRegistration` (status + admin notes), `deleteRegistration`, `exportCsv`, `getSummary` (counts by status). All SQL is parameterised. |
| `server/src/routes/oceanShujaa.ts` | create | `POST /api/ocean-shujaa/registrations` (public, rate-limited, zod-validated, honeypot field). Everything else under `/api/ocean-shujaa/admin/*` behind `requireAuth` + `requireAdmin`. |
| `server/src/routes/index.ts` | edit | Mounts the new router. |
| `server/src/app.ts` | edit | Adds the VPS domain via an `ALLOWED_ORIGINS` env var, enables `trust proxy` (so rate limiting sees real client IPs behind Caddy). |
| `server/src/middleware/errorHandler.ts` | edit | Stops leaking `err.message` to clients in production (it was marked temporary). |

### Step 3 — Public registration form

| File | Action | What it does |
|---|---|---|
| `src/pages/OceanShujaa.tsx` | edit | Adds a "Register" section with the form (participant, level, institution, guardian contact, group size, notes) posting to the API, with success/error states. WhatsApp/call buttons stay as alternatives. |

### Step 4 — Admin panel

| File | Action | What it does |
|---|---|---|
| `src/pages/admin/AdminOceanShujaa.tsx` | create | Table of registrations, search, status filter, summary counts, status change, notes, delete, "Export CSV". Follows the pattern of `AdminAbstracts.tsx`. |
| `src/components/admin/AdminLayout.tsx` | edit | Adds an "Ocean Shujaa" item to the sidebar. |
| `src/App.tsx` | edit | Adds the protected route `/admin/ocean-shujaa`. |

### Step 5 — Containerisation and VPS deployment

| File | Action | What it does |
|---|---|---|
| `server/Dockerfile` | create | Builds the API image (Node 22 alpine, production deps, runs with `tsx`). |
| `Dockerfile` | create | Multi-stage: builds the Vite app (Supabase public keys passed as build args), then copies `dist/` into a Caddy image. |
| `deploy/Caddyfile` | create | Serves the SPA with fallback to `index.html`, proxies `/api/*` to `api:5000`, gzip, security headers, automatic HTTPS for `SITE_DOMAIN`. |
| `docker-compose.yml` | create | Defines `db`, `api`, `web`; named volumes for Postgres data and Caddy certs; healthchecks; `api` waits for a healthy `db`; restart policies. |
| `.env.example` | create | Template of every variable (DB password, domain, Supabase, SMTP, Firebase, Cloudinary). The real `.env` is never committed. |
| `.dockerignore` | create | Keeps `node_modules`, `.git`, `.env` out of images. |
| `.gitignore` | edit | Allows `.env.example` to be committed (it currently ignores `.env.*`). |
| `deploy/deploy.sh` | create | One command on the VPS: pull latest, rebuild, restart, show status. |
| `deploy/backup.sh` | create | `pg_dump` of the registrations database to a dated, gzipped file, keeping the last 14. Meant for a daily cron. |
| `docs/DEPLOYMENT.md` | create | VPS runbook: server prep (Docker, firewall), DNS, first deploy, updates, backups, restore, troubleshooting. |

`vercel.json`, `.htaccess` and `api/` (Vercel serverless) are left in place and simply unused on the VPS; they can be deleted after cut-over.

### Step 6 — Verify

1. `npm install`, `npm run build` (frontend) and a TypeScript check of `server/`.
2. `docker compose config` to validate the compose file.
3. If Docker is usable here: start `db`, confirm the schema is created, start the API and exercise create → list → update → delete → CSV with curl (admin routes checked to return 401 without a token).
4. Report anything that could not be verified locally (e.g. real HTTPS, which needs the VPS and DNS).

## 4. Out of scope (can follow later)

- Email confirmation to the registrant / alert to the admin on new registration.
- Migrating orders, abstracts and admin auth off Supabase/Firebase.
- Payment collection.

## 5. What you need to provide at deploy time

- VPS with Ubuntu 22.04+ and root/sudo access, and a domain A record pointing at it (`simlabkenya.co.ke`).
- Values for the real `.env` (copy `.env.example`): a strong `POSTGRES_PASSWORD`, plus the existing Supabase / SMTP / Firebase / Cloudinary secrets.

## 6. Addendum — admin login on the VPS and `start-setup.sh`

**Admin login moves into the VPS Postgres.**

| File | Action | What it does |
|---|---|---|
| `db/init/002_admin_auth.sql` | create | `admin_users` (email, scrypt password hash) and `admin_otp` (hashed one-time codes, attempt counter, expiry). |
| `server/src/services/authService.ts` | create | Password hashing (Node `crypto`), OTP generation/hash, signed tokens (`pending` 10 min, `session` 8 h). |
| `server/src/middleware/auth.ts` | rewrite | Verifies our own tokens instead of Supabase and re-checks the admin still exists on every request. `ADMIN_EMAILS` hard-coding is gone. |
| `server/src/controllers/adminController.ts`, `routes/admin.ts` | edit | `/login`, `/resend-otp`, `/verify-otp`, `/change-password`; rate-limited. Code step is enforced on the server (before, only the browser enforced it). |
| `server/scripts/create-admin.ts` | create | Create/reset an admin from the command line. |
| `src/hooks/useAdminAuth.tsx`, `pages/admin/AdminLogin.tsx`, `AdminSettings.tsx` | edit | Frontend signs in through `/api/admin/*`; password change asks for the current password. The frontend no longer needs Supabase keys. |

**`start-setup.sh`** (repo root) installs missing software, configures the firewall and `.env`, verifies the environment, deploys, then verifies the running deployment. See `docs/DEPLOYMENT.md` §1 for the step list.

## 7. Addendum — Supabase removed

Everything that was in Supabase now lives in the VPS Postgres. Supabase packages, client, config, keys and the `supabase/` migrations folder are deleted.

| File | Action | What it does |
|---|---|---|
| `db/init/003_shop.sql` | create | `products` and `orders` tables (same columns as before), triggers, indexes, and the 5 starter products (only inserted into an empty table). |
| `server/src/controllers/shopController.ts`, `orderController.ts`, `adminController.ts` (stats) | rewrite | Same API responses, now using `pg` queries. |
| `server/src/config/postgres.ts` | edit | Returns NUMERIC/COUNT as JSON numbers, as the old API did. |
| `api/send-otp-email.ts`, `api/verify-otp.ts` | delete | Dead Vercel functions that used Supabase. |
| `start-setup.sh`, `.env.example`, `docs/DEPLOYMENT.md` | edit | No Supabase prompts or checks; verifies the shop tables. |

Later addendum: abstract submissions moved to Postgres, uploaded files to the `uploads` volume, and all email to Resend. Nothing runs outside the VPS apart from Resend.
