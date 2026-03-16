# SIM-Lab Kenya - Error Log & Solutions

> Documents every significant error encountered during development, the root cause, and the exact fix applied.

---

## Table of Contents

1. [ERR_MODULE_NOT_FOUND: dotenv](#1-err_module_not_found-dotenv)
2. [Admin Page Not Loading / Infinite Redirect to Login](#2-admin-page-not-loading--infinite-redirect-to-login)
3. [Firebase: Missing or Insufficient Permissions](#3-firebase-missing-or-insufficient-permissions)
4. [Abstracts Not Appearing in Admin Panel After Firebase Fix](#4-abstracts-not-appearing-in-admin-panel-after-firebase-fix)
5. [Cloudinary Cloud Name Mismatch](#5-cloudinary-cloud-name-mismatch)
6. [Project Description Overflow in Admin Detail View](#6-project-description-overflow-in-admin-detail-view)
7. [Products Not Showing on Shop Page](#7-products-not-showing-on-shop-page)
8. [Admin Stats Missing Abstract Counts](#8-admin-stats-missing-abstract-counts)

---

## 1. ERR_MODULE_NOT_FOUND: dotenv

**Error Message:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dotenv' imported from
.../server/index.ts
```

**Root Cause:**
`server/index.ts` contained `import 'dotenv/config'` but the `dotenv` package was not installed in the server's `package.json`. The server's npm environment did not have it.

**Fix:**
Removed the import entirely. The server is started with `tsx --env-file=.env`, which natively loads the `.env` file before execution — no `dotenv` package is needed.

```typescript
// REMOVED from server/index.ts:
// import 'dotenv/config';

// server/index.ts final content:
import app from './src/app.js';
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`SIM-Lab Kenya API server running on http://localhost:${PORT}`);
});
```

**File:** `server/index.ts`

---

## 2. Admin Page Not Loading / Infinite Redirect to Login

**Symptom:**
Every admin page immediately redirected to `/admin/login`. Even after logging in successfully with a valid admin email, the page would redirect again.

**Root Cause:**
`src/hooks/useAdminAuth.tsx` called `supabase.rpc("is_admin")` on every page load to verify admin status. This PostgreSQL RPC function did not exist in the Supabase project (absent from `types.ts`). The call returned an error, `resolveAdmin` set `isAdmin = false`, and `ProtectedRoute` redirected to login.

```typescript
// OLD broken code:
const { data, error } = await supabase.rpc("is_admin");
// data was always null, error was always set
// → isAdmin = false → redirect to login
```

**Fix:**
Replaced the RPC call with a direct email whitelist check against the authenticated user's email — the same pattern already used on the backend.

```typescript
// NEW code in useAdminAuth.tsx:
const ADMIN_EMAILS = ["simlabkenya@gmail.com"];

const resolveAdmin = (activeSession: Session | null) => {
  if (!activeSession?.user?.email) {
    setIsAdmin(false);
    return;
  }
  setIsAdmin(ADMIN_EMAILS.includes(activeSession.user.email));
};
```

**File:** `src/hooks/useAdminAuth.tsx`

---

## 3. Firebase: Missing or Insufficient Permissions

**Error Message:**
```
[FirebaseError: Missing or insufficient permissions.]
{
  code: 'permission-denied',
  ...
}
```

**Symptom:**
- Abstract file uploads appeared to succeed (Cloudinary upload worked)
- But the submission was not saved — Firestore write failed silently in some paths and threw this error in others
- Admin panel showed no submissions

**Root Cause:**
`server/src/services/firebaseService.ts` used the Firebase **client SDK** (`firebase/app`, `firebase/firestore`) on the server. The client SDK is governed by Firestore Security Rules. The server was not authenticated as any Firebase user, so all reads and writes were blocked by the default "deny unauthenticated" rules.

```typescript
// OLD code — client SDK on server (WRONG):
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
// This runs as an unauthenticated client → blocked by Firestore rules
```

**Fix:**
Rewrote `firebaseService.ts` to use the **Firebase Admin SDK** (`firebase-admin`). The Admin SDK authenticates using a service account and bypasses all Firestore security rules entirely.

```typescript
// NEW code — Admin SDK (CORRECT):
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getAdminApp = (): App => {
  if (adminApp) return adminApp;
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  return adminApp;
};
```

**Required environment variables:**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note on `FIREBASE_PRIVATE_KEY`:** When stored in `.env`, newlines in the private key are escaped as `\n` literal strings. The `.replace(/\\n/g, '\n')` converts them back to real newlines before passing to `cert()`.

**File:** `server/src/services/firebaseService.ts`

---

## 4. Abstracts Not Appearing in Admin Panel After Firebase Fix

**Symptom:**
After fixing the Firebase Admin SDK issue (Error #3), the admin panel still showed no submissions and the same permission error appeared in server logs.

**Root Cause:**
The Express server (`npm run server`) was still running the **old** version of `firebaseService.ts` that used the client SDK. The file had been rewritten on disk but the running Node.js process had not been restarted, so the old compiled code was still in memory.

**Fix:**
Restart the Express server to reload the updated module:

```bash
# Stop the running server (Ctrl+C), then restart:
npm run server
```

After restart, the new Admin SDK code loaded correctly and Firestore access worked. Verified with a direct test:
```
Firestore OK - docs found: 3
```

**Lesson:** Always restart the server after modifying any server-side service files. Hot-reload (`tsx --watch`) would prevent this in development.

---

## 5. Cloudinary Cloud Name Mismatch

**Symptom:**
File uploads to Cloudinary returned errors or uploaded to the wrong account.

**Root Cause:**
The backend `.env` file initially contained `CLOUDINARY_CLOUD_NAME=simlab`, which did not match the actual Cloudinary account name (`dzzvxpbc1`).

**Fix:**
Updated `.env`:
```
CLOUDINARY_CLOUD_NAME=dzzvxpbc1
```

**Note:** This was found and corrected when reading the `.env` file. Always verify Cloudinary cloud name against the Cloudinary dashboard at Settings > Account.

**File:** `.env` (server environment)

---

## 6. Project Description Overflow in Admin Detail View

**Symptom:**
In `AdminAbstractDetail.tsx`, long project descriptions (especially those with no spaces or very long words/URLs) would overflow their container, breaking the card layout and extending beyond the page boundary.

**Root Cause:**
The description `<p>` element used `whitespace-pre-wrap` to preserve line breaks, but had no CSS overflow containment. Long unbroken strings would not wrap.

Additionally, the project title in the header had no `min-w-0` constraint, causing the flex container to overflow when the title was long.

**Fix:**

```typescript
// Description paragraph:
<p
  className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words"
  style={{ overflowWrap: "anywhere" }}
>
  {abstract.projectDescription}
</p>

// Title container (flex item):
<div className="min-w-0 flex-1">
  <h1 className="text-2xl font-heading font-bold text-gray-900 break-words">
    {abstract.projectTitle}
  </h1>
</div>
```

**Key CSS properties:**
- `break-words`: breaks long words at the boundary
- `overflowWrap: "anywhere"`: allows breaking at any character (stronger than `break-words`)
- `min-w-0 flex-1`: prevents flex children from growing beyond their container

**File:** `src/pages/admin/AdminAbstractDetail.tsx`

---

## 7. Products Not Showing on Shop Page

**Symptom:**
The shop page displayed no products. No error was shown in the browser.

**Root Cause:**
The frontend was fetching products from `/api/products` (the Express REST API), but the Express server (`npm run server`) was not running. The Vite dev server (`npm run dev`) was running, but it does not serve the API.

**Fix:**
Both servers must run simultaneously in separate terminals:

```bash
# Terminal 1: Frontend (Vite)
npm run dev

# Terminal 2: Express API
npm run server
```

**Long-term fix:** Use `concurrently` in `package.json` to run both with a single command:
```json
"scripts": {
  "dev:all": "concurrently \"npm run dev\" \"npm run server\""
}
```

---

## 8. Admin Stats Missing Abstract Counts

**Symptom:**
The admin dashboard showed `totalAbstracts: undefined` and `pendingAbstracts: undefined` even after adding those fields to the frontend.

**Root Cause:**
`server/src/controllers/adminController.ts` — the `getStats` endpoint — did not fetch abstract data from Firestore. It only queried Supabase for orders and products.

**Fix:**
Added a parallel Firestore fetch inside `getStats`:

```typescript
const [ordersResult, recentOrdersResult, abstracts] = await Promise.all([
  supabase.from('orders').select('order_status, payment_status, total_amount'),
  supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
  getAbstractsFromFirestore().catch(() => [] as { status?: string }[]),
]);

const totalAbstracts = abstracts.length;
const pendingAbstracts = abstracts.filter((a) => a.status === 'pending').length;
```

The `.catch(() => [])` ensures that if Firestore is unavailable, the stats endpoint still returns order data without failing.

**File:** `server/src/controllers/adminController.ts`

---

## General Lessons Learned

| Lesson | Context |
|--------|---------|
| Always restart the server after changing server-side files | Error #4 |
| Firebase Admin SDK must be used for server-side Firestore access | Error #3 |
| `tsx --env-file=.env` replaces `dotenv` — don't import both | Error #1 |
| Admin auth should never depend on database functions that may not exist | Error #2 |
| Verify third-party service credentials (cloud names, API keys) against dashboards | Error #5 |
| Use `min-w-0` on flex children to prevent overflow in flex containers | Error #6 |
| Both dev and API servers must be running for full local development | Error #7 |
| Parallel async calls should have individual `.catch()` fallbacks to prevent cascade failures | Error #8 |
