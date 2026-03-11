# SIM-Lab Kenya — Implementation Notes

## Project Overview

React 18 + TypeScript + Vite website for SIM-Lab Kenya Science Fair. Features include a public-facing abstract submission form, Cloudinary PDF uploads, Firebase/Firestore metadata storage, Gmail email notifications, and a Supabase-authenticated admin panel with 2FA OTP login.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite (port 8080) |
| Styling | Tailwind CSS, shadcn/ui |
| File Storage | Cloudinary (unsigned upload preset) |
| Abstract Metadata | Firebase Firestore |
| Email | nodemailer + Gmail SMTP (port 465, SSL) |
| Admin Auth | Supabase Auth + custom `is_admin()` RPC |
| Admin 2FA | OTP via email, stored in `admin_2fa_otp` Supabase table |
| Deployment | Vercel (serverless functions in `api/`) |

---

## Features Implemented

### 1. Abstract Submission Form (`src/pages/Abstract.tsx`)
- Fields: School Name, Student Name, Teacher/Patron Name, Teacher Email, Teacher Phone, Project Title, Project Category, Project Description, PDF Upload
- Client-side validation: email regex, phone regex, title min 5 chars, description min 30 chars, PDF only, max 5MB
- All fields `.trim()` before submission
- Uploads PDF to Cloudinary (`raw` resource type, `simlab/abstracts` folder)
- Saves metadata to Firestore (`abstracts` collection)
- Sends email notification to admin and confirmation to teacher (non-blocking — uses `.catch()` so form success is not blocked by email failure)

### 2. Email Notifications
- **Local dev**: `email-server.mjs` — plain Node.js ESM HTTP server on port 5000
  - Run with: `npm run server` (`node --env-file=.env email-server.mjs`)
  - Vite proxies `/api/*` → `http://localhost:5000`
- **Production (Vercel)**: `api/send-abstract-email.ts` — Vercel serverless function
  - Sends admin notification email with PDF link and dashboard button
  - Sends confirmation email to teacher with submission summary
  - Uses `Promise.race` with 12s hard timeout per email to prevent SMTP hangs

### 3. Admin Panel (`src/pages/admin/`)
- Login via Supabase Auth (email + password)
- Admin status checked via Supabase RPC `is_admin()` — email allowlist in function body
- 2FA OTP sent to admin email on login via `/api/send-otp-email`
- OTP stored in `admin_2fa_otp` Supabase table (expires in 10 minutes)
- Verified via `/api/verify-otp`
- Pages: Dashboard, Orders, Products, Settings

### 4. Vercel Deployment
- `vercel.json` configures SPA rewrites and serverless function memory/timeout
- `.npmrc` with `legacy-peer-deps=true` to resolve TypeScript version conflicts
- All `VITE_*` env vars must be set in Vercel dashboard (baked into bundle at build time)

---

## Supabase Setup

### `is_admin()` Function
Run in Supabase SQL Editor to create/update:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(auth.jwt() ->> 'role', '') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('simlabkenya@gmail.com');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
```

To add more admins, add their email to the `IN (...)` list and re-run.

### `admin_2fa_otp` Table
```sql
CREATE TABLE IF NOT EXISTS admin_2fa_otp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE admin_2fa_otp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Backend can manage OTP codes" ON admin_2fa_otp FOR ALL USING (FALSE) WITH CHECK (FALSE);
```

### To view all users and admin status:
```sql
SELECT id, email, created_at, last_sign_in_at FROM auth.users;
```

---

## Environment Variables

All variables live in `.env` (never committed to GitHub).

| Variable | Used By | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless functions | Supabase secret key (server only) |
| `VITE_FIREBASE_API_KEY` | Frontend | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Frontend | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Frontend | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Frontend | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Frontend | Firebase config |
| `VITE_FIREBASE_APP_ID` | Frontend | Firebase config |
| `VITE_CLOUDINARY_CLOUD_NAME` | Frontend | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Frontend | Unsigned upload preset name |
| `GMAIL_USER` | Serverless functions | Gmail address for sending |
| `GMAIL_APP_PASSWORD` | Serverless functions | Gmail App Password (not login password) |
| `ADMIN_EMAIL` | Serverless functions | Who receives new submission alerts |
| `ADMIN_DASHBOARD_URL` | Serverless functions | Live dashboard URL for email buttons |

> **Vercel note**: All `VITE_*` variables must be added in Vercel → Settings → Environment Variables. After adding, redeploy so they are baked into the build.

---

## Errors Encountered & Solutions

### 1. `@firebase/firestore` / `@firebase/app` not resolving
**Error**: `Could not resolve '@firebase/firestore'`
**Cause**: Windows MAX_PATH limit caused partial npm install
**Fix**: `npm install @firebase/app @firebase/firestore --legacy-peer-deps`

### 2. Vite 504 Outdated Optimize Dep
**Error**: `GET /node_modules/.vite/deps/firebase_firestore.js 504 (Outdated Optimize Dep)`
**Cause**: Stale Vite dep cache after package install
**Fix**: Deleted `node_modules/.vite` and restarted dev server

### 3. Cloudinary 401 Unauthorized
**Error**: `api.cloudinary.com/v1_1/.../raw/upload 401 Unauthorized`
**Cause**: Upload preset `simlab_abstracts` not created, or set to Signed mode
**Fix**: Created preset in Cloudinary dashboard as **Unsigned** mode

### 4. Cloudinary `v1_1/undefined/raw/upload`
**Error**: Cloud name was `undefined` in the upload URL
**Cause**: `VITE_CLOUDINARY_CLOUD_NAME` not set in Vercel environment variables
**Fix**: Added all `VITE_*` vars to Vercel → Settings → Environment Variables, then redeployed

### 5. SMTP hanging indefinitely
**Error**: Email send never resolved or rejected — process hung
**Cause**: Gmail port 587 (STARTTLS) hangs on this network
**Fix**: Switched to port 465 (direct SSL: `secure: true`) + `Promise.race` with 12s hard timeout

### 6. `vercel dev` zombie process
**Error**: Port 3000 was occupied by a hung `vercel dev` process that never responded
**Fix**: Killed via `taskkill //F //PID <pid>`. Abandoned `vercel dev` entirely — use `email-server.mjs` + Vite proxy instead

### 7. `npm install EBUSY` on tsx/dotenv
**Error**: Supabase package lock prevented installing TypeScript runner
**Fix**: Used Node 24's built-in `--env-file=.env` flag instead of dotenv; wrote email server in plain ESM JS (`email-server.mjs`) — no TypeScript runner needed

### 8. Git push rejected
**Error**: `! [rejected] main -> main (non-fast-forward)`
**Cause**: Remote had a default README commit
**Fix**: `git push --force origin main`

### 9. Vercel deployment blocked — git author mismatch
**Error**: "The git author could not be matched to a Vercel account"
**Cause**: Git config email (`simlabkenya@gmail.com`) didn't match the Vercel account email
**Fix**: Updated git config to `marshallisraelokoth@gmail.com` / `MjakaMwise`, created empty commit, pushed

### 10. `@vercel/node` TypeScript module not found
**Error**: `Cannot find module '@vercel/node' or its corresponding type declarations`
**Cause**: `@vercel/node` was not installed
**Fix**: `npm install @vercel/node --save-dev --legacy-peer-deps`

### 11. Vercel build ERESOLVE — TypeScript version conflict
**Error**: `typescript-eslint` requires `typescript <5.9.0` but `@vercel/node` pulls `typescript@5.9.3`
**Fix**: Created `.npmrc` with `legacy-peer-deps=true` so Vercel install skips strict peer resolution

### 12. `is_admin` RPC 404
**Error**: `tobcsmkuhyjdklgtghaz.supabase.co/rest/v1/rpc/is_admin 404`
**Cause**: Migration file existed locally but was never applied to Supabase
**Fix**: Ran the `CREATE OR REPLACE FUNCTION public.is_admin()` SQL directly in Supabase SQL Editor

### 13. `/api/send-otp-email` 500
**Error**: OTP serverless function returning 500
**Cause**: `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel — function couldn't connect to database to store OTP
**Fix**: Added `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables

### 14. `admin_2fa_otp` policy already exists
**Error**: `ERROR: 42710: policy "Backend can manage OTP codes" already exists`
**Cause**: Table creation migration had been partially run before
**Fix**: Skipped the table creation block, ran only the `is_admin` function SQL

---

## Local Development

Two terminals required:

```bash
# Terminal 1 — Frontend
npm run dev        # Vite on http://localhost:8080

# Terminal 2 — Email server
npm run server     # Node.js on http://localhost:5000
```

Vite proxies `/api/*` → `http://localhost:5000` (configured in `vite.config.ts`).

---

## Deployment Checklist

- [ ] All env vars added in Vercel → Settings → Environment Variables
- [ ] `VITE_*` vars set (require redeploy to take effect)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (secret key from Supabase → Settings → API)
- [ ] `ADMIN_DASHBOARD_URL` updated to live Vercel URL
- [ ] `is_admin()` function created in Supabase SQL Editor
- [ ] `admin_2fa_otp` table created in Supabase
- [ ] Admin user created in Supabase → Authentication → Users
- [ ] Cloudinary upload preset `simlab_abstracts` set to Unsigned mode
- [ ] Firebase project has Firestore enabled
