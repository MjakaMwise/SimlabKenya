# SIM-Lab Kenya — Complete Feature Implementation Guide

> Covers every feature in the system with the technologies used, the techniques applied, and relevant code excerpts.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend: Express REST API](#backend-express-rest-api)
3. [Authentication & Security](#authentication--security)
4. [Shopping System](#shopping-system)
5. [Admin Panel](#admin-panel)
6. [Abstract Submissions](#abstract-submissions)
7. [Email Notification System](#email-notification-system)
8. [Database Design](#database-design)
9. [Deployment](#deployment)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React + TypeScript | 18 | UI components and logic |
| Styling | TailwindCSS + shadcn/ui | 3 | Component styling and design system |
| Animation | Framer Motion | 11 | Page and element animations |
| State | React Context | — | Cart and auth global state |
| Routing | React Router | v6 | Client-side navigation |
| Backend | Express.js + TypeScript | 4 | REST API server |
| Serverless | Vercel adapter | — | Wraps Express for Vercel deployment |
| SQL DB | Supabase (PostgreSQL) | — | Products, orders, admin OTP |
| NoSQL DB | Firebase Firestore | Admin SDK v13 | Abstract submissions |
| Auth | Supabase Auth | — | Admin JWT sessions |
| File Storage | Cloudinary | v2 | Abstract document uploads |
| Email | Nodemailer + Gmail SMTP | — | Order and abstract notifications |
| Validation | Zod | 3 | Runtime request body schemas |
| File Upload | Multer | v2 | Multipart form handling in Express |

### Request Flow

```
Browser / React app
       │
       │  fetch('/api/...')
       ▼
Vite dev proxy  ──►  Express server (localhost:5000)
(development)        │
                     ├── /api/products   → shopController
                     ├── /api/orders     → ordersController
                     ├── /api/abstracts  → abstractController
                     └── /api/admin      → adminController

─── Production ───────────────────────────────────────────
Vercel CDN  →  api/index.ts (serverless)  →  same Express app
```

### Project Structure

```
src/                         # React frontend
├── components/
│   ├── admin/
│   │   ├── AdminLayout.tsx       # Sidebar navigation shell
│   │   └── ProtectedRoute.tsx    # Auth guard component
│   └── shop/
│       ├── CartIcon.tsx
│       ├── CartSidebar.tsx
│       └── ProductCard.tsx
├── hooks/
│   ├── useCart.tsx               # Cart context + localStorage
│   └── useAdminAuth.tsx          # Admin session + MFA state
├── pages/
│   ├── Shop.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── OrderConfirmation.tsx
│   ├── Abstract.tsx              # Public submission form
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── AdminDashboard.tsx
│       ├── AdminOrders.tsx
│       ├── AdminOrderDetail.tsx
│       ├── AdminProducts.tsx
│       ├── AdminAbstracts.tsx
│       └── AdminAbstractDetail.tsx
└── App.tsx

server/                      # Express backend
├── index.ts                      # Server entry point
└── src/
    ├── app.ts                    # Express setup (CORS, middleware, routes)
    ├── config/
    │   ├── supabase.ts           # Supabase service-role client
    │   └── email.ts              # Nodemailer transporter factory
    ├── controllers/
    │   ├── adminController.ts    # OTP send/verify, stats
    │   ├── shopController.ts     # Product CRUD
    │   ├── ordersController.ts   # Order CRUD
    │   └── abstractController.ts # Abstract submit + admin ops
    ├── middleware/
    │   ├── auth.ts               # requireAuth, requireAdmin, optionalAuth
    │   ├── errorHandler.ts       # Global error handler
    │   └── validate.ts           # Zod validation helper
    ├── routes/
    │   ├── index.ts              # Mounts all sub-routers under /api
    │   ├── shop.ts
    │   ├── orders.ts
    │   ├── abstracts.ts
    │   └── admin.ts
    ├── services/
    │   ├── firebaseService.ts    # Firestore CRUD via Admin SDK
    │   ├── cloudinaryService.ts  # File upload via upload_stream
    │   └── emailService.ts       # All email templates + send logic
    └── types/
        └── index.ts              # Shared TypeScript interfaces

api/
└── index.ts                 # Vercel serverless adapter (re-exports Express app)
```

---

## Backend: Express REST API

### 1. Express App Setup

**File:** `server/src/app.ts`

**Technologies:** Express, CORS, body-parser

**Technique: CORS with dynamic origin whitelist**

The allowed origins list includes both local dev ports and the production URL. The `origin` callback checks `startsWith` so sub-paths are also allowed.

```typescript
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'https://simlabkenya.co.ke/admin',
  process.env.ADMIN_DASHBOARD_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
```

**Technique: Route mounting under /api prefix**

All routes are registered under a single `/api` prefix via a root router, keeping the app file clean:

```typescript
app.use('/api', apiRoutes);
// apiRoutes mounts: /products, /orders, /abstracts, /admin
```

**Health check endpoint:**
```typescript
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

### 2. Vercel Serverless Adapter

**File:** `api/index.ts`

**Technology:** Vercel serverless functions

Vercel treats any file in `api/` as a serverless function. Rather than writing individual functions per route, the entire Express app is exported from a single file:

```typescript
// api/index.ts — 3 lines
import app from '../server/src/app.js';
export default app;
```

Vercel's Node.js runtime accepts an Express `app` directly as the function handler. This means every `/api/*` route is handled by the unified Express router with zero duplication.

---

### 3. Route Definitions

**Files:** `server/src/routes/*.ts`

**Technology:** Express Router

Each resource has its own router file. The `abstracts` router shows the full pattern — public POST for submissions, admin-guarded GET/PATCH for management:

```typescript
// routes/abstracts.ts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

router.post('/',           upload.array('files', 10), submitAbstract); // public
router.get('/',            requireAuth, requireAdmin, listAbstracts);   // admin
router.get('/:id',         requireAuth, requireAdmin, getAbstract);     // admin
router.patch('/:id/status',requireAuth, requireAdmin, updateAbstractStatus); // admin
```

**Products** uses `optionalAuth` on GET so admins can see unavailable products while the public only sees available ones:

```typescript
// routes/shop.ts
router.get('/',    optionalAuth,                getProducts);  // public + admin
router.post('/',   requireAuth, requireAdmin,   createProduct);
router.put('/:id', requireAuth, requireAdmin,   updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);
```

---

### 4. Zod Request Validation

**Technology:** Zod

All request bodies are validated with Zod schemas before any business logic runs. The `.safeParse()` method returns a typed result without throwing:

```typescript
const abstractBodySchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  studentNames: z.preprocess(
    // multer gives string when one field, array when multiple
    (val) => (Array.isArray(val) ? val : [val]),
    z.array(z.string().min(1)).min(1, 'At least one student name is required')
  ),
  teacherEmail: z.string().email('Valid teacher email is required'),
  projectDescription: z.string().min(10),
  // ...
});

const parsed = abstractBodySchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
}
```

The `z.preprocess` technique on `studentNames` normalises multipart form data: when a single field is sent, `req.body.studentNames` is a string; when multiple are sent it becomes an array. The preprocess always coerces it to an array before Zod validates it.

---

## Authentication & Security

### 1. Supabase JWT Verification Middleware

**File:** `server/src/middleware/auth.ts`

**Technologies:** Supabase JS client, Express middleware

The `requireAuth` middleware extracts the Bearer token from the `Authorization` header and validates it against Supabase's auth API. On success, `req.user` is populated for downstream handlers:

```typescript
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing authorization header' });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = { id: user.id, email: user.email || '' };
  next();
};
```

**Technique: Optional auth middleware**

`optionalAuth` runs the same token check but calls `next()` regardless of the result. Used on `GET /api/products` so admins see all products (including unavailable) while the public only sees available ones:

```typescript
export const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(); // no token — proceed as public

  try {
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (user) req.user = { id: user.id, email: user.email || '' };
  } catch { /* ignore */ }
  next();
};
```

**Technique: Admin email whitelist middleware**

`requireAdmin` is a synchronous guard that runs after `requireAuth`. It checks `req.user.email` against the hardcoded admin list:

```typescript
const ADMIN_EMAILS = ['simlabkenya@gmail.com'];

export const requireAdmin = (req, res, next) => {
  if (!ADMIN_EMAILS.includes(req.user!.email)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

---

### 2. Two-Factor OTP Login

**Files:** `server/src/controllers/adminController.ts`, `src/pages/admin/AdminLogin.tsx`

**Technologies:** Supabase PostgreSQL (`admin_2fa_otp` table), Nodemailer, sessionStorage

**Flow:**
```
1. Admin signs in via Supabase Auth (email + password)
2. Frontend calls POST /api/admin/send-otp
3. Server generates a 6-digit OTP, stores it in admin_2fa_otp with expiry
4. OTP is emailed to admin via Nodemailer
5. Admin enters OTP → POST /api/admin/verify-otp
6. Server checks OTP is valid, not used, not expired
7. On success, marks OTP as used → admin is granted access
```

**Technique: OTP generation and storage**

```typescript
const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString(); // always 6 digits

// Stored in Supabase:
await supabase.from('admin_2fa_otp').insert({ admin_email: email, otp_code: otp });
// expires_at set by DB default (10 minutes from insert)
```

**Technique: Secure OTP verification**

The query enforces all conditions in one call — correct email, correct code, not yet used, not expired:

```typescript
const { data: otpRecord } = await supabase
  .from('admin_2fa_otp')
  .select('*')
  .eq('admin_email', email)
  .eq('otp_code', otp)
  .eq('is_used', false)
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

**Technique: Email enumeration protection**

The `sendOTP` endpoint returns the same generic response whether or not the email is an admin, preventing attackers from discovering which emails have admin access:

```typescript
const genericResponse = {
  success: true,
  message: 'If this email is registered for admin access, you will receive an OTP.',
};
if (!ADMIN_EMAILS.includes(email)) return res.json(genericResponse); // same response
```

**Technique: MFA state stored in sessionStorage (frontend)**

After OTP verification, `isMfaVerified` is persisted per user ID in `sessionStorage` so page refreshes don't require re-entering the OTP within the same browser session:

```typescript
const key = `adminMfaVerified:${userId}`;
sessionStorage.setItem(key, "true");
// Cleared on sign-out:
sessionStorage.removeItem(key);
```

---

### 3. Frontend Auth Context

**File:** `src/hooks/useAdminAuth.tsx`

**Technology:** React Context, Supabase Auth listener

`AdminAuthProvider` wraps the entire admin section and provides session, token, isAdmin, and isMfaVerified to all admin pages via context:

```typescript
// Supabase auth state listener — fires on login, logout, token refresh
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  resolveAdmin(session);   // sync email whitelist check
  syncMfa(session);        // sync sessionStorage MFA flag
});

// Token exposed for API calls
token: session?.access_token ?? null,
```

**Technique: Synchronous admin check (no database RPC)**

Admin status is determined by checking the authenticated user's email against a local list — no database round-trip required:

```typescript
const ADMIN_EMAILS = ["simlabkenya@gmail.com"];

const resolveAdmin = (activeSession: Session | null) => {
  if (!activeSession?.user?.email) { setIsAdmin(false); return; }
  setIsAdmin(ADMIN_EMAILS.includes(activeSession.user.email));
};
```

---

### 4. Protected Routes

**File:** `src/components/admin/ProtectedRoute.tsx`

**Technology:** React Router v6 `useNavigate`

Every admin page is wrapped in `ProtectedRoute`. It checks auth loading state, then `isAdmin`, then `isMfaVerified` before rendering children:

```typescript
useEffect(() => {
  if (!isLoading) {
    if (!user) navigate("/admin/login");
    else if (!isAdmin) navigate("/admin/login?error=unauthorized");
    else if (!isMfaVerified) navigate("/admin/login");
  }
}, [user, isLoading, isAdmin, isMfaVerified, navigate]);
```

---

## Shopping System

### 1. Product Catalog

**File:** `src/pages/Shop.tsx`

**Technologies:** React, Fetch API, Framer Motion

Products are fetched from the REST API on mount. Admins (with a valid JWT) receive all products including unavailable ones via `optionalAuth` on the backend:

```typescript
useEffect(() => {
  const fetchProducts = async () => {
    const res = await fetch('/api/products', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setProducts(await res.json());
  };
  fetchProducts();
}, [token]);
```

Products are grouped by category client-side:

```typescript
const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
  (acc[p.category] ??= []).push(p);
  return acc;
}, {});
```

---

### 2. Product Cards

**File:** `src/components/shop/ProductCard.tsx`

**Technologies:** shadcn/ui, React state

**Technique: Size-aware add to cart**

Products with `has_sizes: true` show a size selector. The cart tracks `(id, size)` pairs so the same product in different sizes is stored as separate line items:

```typescript
const handleAddToCart = () => {
  if (product.has_sizes && !selectedSize) {
    toast({ title: "Please select a size", variant: "destructive" });
    return;
  }
  addItem({ ...product, size: selectedSize }, quantity);
};
```

---

### 3. Shopping Cart

**File:** `src/hooks/useCart.tsx`

**Technology:** React Context, localStorage

**Technique: localStorage persistence with lazy initializer**

The cart initialises from `localStorage` using a function argument to `useState`, which runs only once on mount (not on every render):

```typescript
const [items, setItems] = useState<CartItem[]>(() => {
  const saved = localStorage.getItem("simlab-cart");
  return saved ? JSON.parse(saved) : [];
});

// Auto-persist on every change
useEffect(() => {
  localStorage.setItem("simlab-cart", JSON.stringify(items));
}, [items]);
```

**Technique: Size-aware deduplication**

When the same product is added twice with the same size, quantity increases instead of creating a duplicate:

```typescript
const existingIndex = prev.findIndex(
  (i) => i.id === item.id && i.size === item.size
);
if (existingIndex >= 0) {
  // increment quantity
} else {
  // add new line item
}
```

---

### 4. Cart Sidebar

**File:** `src/components/shop/CartSidebar.tsx`

**Technology:** Framer Motion, React Portal

**Technique: Spring slide-in animation**

```typescript
<motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{ x: "100%" }}
  transition={{ type: "spring", damping: 25, stiffness: 200 }}
  className="fixed right-0 top-0 h-full w-full max-w-md"
>
```

---

### 5. Checkout Form

**File:** `src/pages/Checkout.tsx`

**Technologies:** Zod, React Hook Form, Fetch API

**Technique: Zod schema validation**

```typescript
const checkoutSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryLocation: z.string().optional(),
  deliveryAddress: z.string().max(500).optional(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});
```

**Technique: Conditional animated fields**

Delivery-specific fields appear with a height animation when the user selects "delivery":

```typescript
{formData.deliveryMethod === "delivery" && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
  >
    {/* location and address fields */}
  </motion.div>
)}
```

**Technique: Date-based order number generation**

```typescript
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 900) + 100;
  return `ORD-${dateStr}-${random}`; // e.g. ORD-20260316-742
};
```

---

### 6. Order Confirmation

**File:** `src/pages/OrderConfirmation.tsx`

**Technology:** React Router `useSearchParams`

The order number is passed via query string from checkout so the confirmation page works even after a page reload:

```typescript
const [searchParams] = useSearchParams();
const orderNumber = searchParams.get("order") || "N/A";
```

---

## Admin Panel

### 1. Admin Layout & Navigation

**File:** `src/components/admin/AdminLayout.tsx`

**Technologies:** React Router `useLocation`, Tailwind responsive classes

**Technique: Responsive sidebar**

The sidebar is fixed and full-height on desktop, and slides in as an overlay on mobile via a hamburger button:

```typescript
<aside className={`fixed top-0 left-0 h-full w-64 transform transition-transform
  lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
```

**Technique: Active route detection**

The dashboard route needs an exact match; all other routes use `startsWith` to highlight parent routes when on nested pages (e.g. `/admin/abstracts/abc` highlights the "Abstracts" nav item):

```typescript
const isActive = item.href === "/admin"
  ? location.pathname === "/admin"
  : location.pathname.startsWith(item.href);
```

**Navigation items:** Dashboard, Orders, Products, Abstracts, Settings.

---

### 2. Admin Dashboard

**File:** `src/pages/admin/AdminDashboard.tsx`

**Technology:** Fetch API, Framer Motion

Data is loaded from `GET /api/admin/stats` which runs three parallel queries on the server (Supabase orders × 2 + Firestore abstracts):

```typescript
const [ordersResult, recentOrdersResult, abstracts] = await Promise.all([
  supabase.from('orders').select('order_status, payment_status, total_amount'),
  supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
  getAbstractsFromFirestore().catch(() => []), // non-blocking fallback
]);
```

**Technique: Dual module KPI cards**

The dashboard has two large section cards at the top — one for the **Shop** module and one for **Abstracts** — each showing counts and linking to their respective management pages. Below them are four quick-stat cards (Pending, Contacted, Completed, Revenue) and a recent orders table.

---

### 3. Orders Management

**File:** `src/pages/admin/AdminOrders.tsx`

**Technologies:** Fetch API, client-side filtering, CSV export

Orders are fetched once from `GET /api/orders` and filtered client-side for instant search response:

**Technique: Multi-field search**

```typescript
result = result.filter((o) => {
  const q = searchQuery.toLowerCase();
  return (
    o.order_number.toLowerCase().includes(q) ||
    o.customer_name.toLowerCase().includes(q) ||
    o.customer_email.toLowerCase().includes(q) ||
    o.customer_phone.includes(q)
  );
});
```

**Technique: CSV export**

```typescript
const exportToCSV = () => {
  const headers = ["Order Number", "Customer", "Email", "Status", "Total"];
  const rows = filteredOrders.map((o) => [
    o.order_number, o.customer_name, o.customer_email,
    o.order_status, `KES ${o.total_amount}`
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
};
```

**Technique: Pagination**

```typescript
const ITEMS_PER_PAGE = 20;
const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
const paginated = filtered.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);
```

---

### 4. Order Detail View

**File:** `src/pages/admin/AdminOrderDetail.tsx`

**Technologies:** Fetch API, WhatsApp deep link

**Technique: WhatsApp pre-filled message**

```typescript
const wa = formatPhoneForWhatsApp(order.customer_phone); // normalise to 254XXXXXXXXX
const msg = encodeURIComponent(
  `Hello ${order.customer_name}, this is SIM-Lab Kenya regarding order #${order.order_number}.`
);
const url = `https://wa.me/${wa}?text=${msg}`;
```

**Technique: Status update with timestamps**

Contacted and completed timestamps are set only once (first time that status is reached):

```typescript
const updates: Record<string, unknown> = { order_status: newStatus };
if (newStatus === "contacted" && !order.contacted_at) {
  updates.contacted_at = new Date().toISOString();
}
if (newStatus === "completed") {
  updates.completed_at = new Date().toISOString();
}
await fetch(`/api/orders/${order.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify(updates),
});
```

---

### 5. Products Management

**File:** `src/pages/admin/AdminProducts.tsx`

**Technologies:** shadcn/ui Dialog, Fetch API

**Technique: Unified create/edit dialog**

One dialog handles both creating a new product and editing an existing one, switching mode based on whether `editingProduct` is set:

```typescript
const handleOpenDialog = (product?: Product) => {
  if (product) {
    setEditingProduct(product);
    setFormData({ ...product });
  } else {
    setEditingProduct(null);
    setFormData(defaultProduct);
  }
  setIsDialogOpen(true);
};

const handleSave = async () => {
  const method = editingProduct ? "PUT" : "POST";
  const url = editingProduct
    ? `/api/products/${editingProduct.id}`
    : "/api/products";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(formData),
  });
};
```

---

### 6. Abstract Submissions List

**File:** `src/pages/admin/AdminAbstracts.tsx`

**Technologies:** Fetch API, client-side search/filter, pagination

**Technique: Search across all student names**

Submissions can have multiple students. The search joins them into a string before matching:

```typescript
const students = a.studentNames?.join(' ') ?? a.studentName ?? '';
return (
  a.projectTitle.toLowerCase().includes(q) ||
  a.schoolName.toLowerCase().includes(q) ||
  students.toLowerCase().includes(q) ||
  a.teacherName.toLowerCase().includes(q)
);
```

**Technique: Explicit error state with retry**

Rather than silently showing an empty table when the fetch fails, a dedicated error state shows the error message and a Retry button:

```typescript
if (fetchError) {
  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{fetchError}</p>
        <Button variant="outline" onClick={fetchAbstracts}>
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    </AdminLayout>
  );
}
```

---

### 7. Abstract Detail & Status Update

**File:** `src/pages/admin/AdminAbstractDetail.tsx`

**Technologies:** Fetch API, shadcn/ui Select

**Technique: Inline status update**

The status dropdown fires a PATCH request immediately on change and updates local state optimistically without refetching the full document:

```typescript
const handleStatusChange = async (newStatus: string) => {
  setIsUpdating(true);
  const res = await fetch(`/api/abstracts/${abstract.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) throw new Error("Failed to update");
  setAbstract((prev) => prev ? { ...prev, status: newStatus } : prev);
};
```

**Technique: Adaptive student display**

The label and layout adapt based on how many students are on the submission. Legacy submissions with a single `studentName` string are also handled:

```typescript
{abstract.studentNames && abstract.studentNames.length > 1 ? (
  <ul className="space-y-0.5">
    {abstract.studentNames.map((name, i) => (
      <li key={i} className="text-sm font-medium">{name}</li>
    ))}
  </ul>
) : (
  <p className="text-sm font-medium">
    {abstract.studentNames?.[0] ?? abstract.studentName ?? "—"}
  </p>
)}
```

**Technique: Text overflow containment**

Long unbroken strings (e.g. URLs in project descriptions) are contained with a combination of Tailwind and inline style:

```typescript
<p
  className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words"
  style={{ overflowWrap: "anywhere" }}
>
  {abstract.projectDescription}
</p>
```

---

## Abstract Submissions

### 1. Public Submission Form

**File:** `src/pages/Abstract.tsx`

**Technologies:** React state, Fetch API (multipart), Framer Motion

**Technique: Dynamic multi-student inputs**

Students are stored as a `string[]`. The "Add Student" button appends an empty string; each input updates its index in the array; the trash button removes by index:

```typescript
const [studentNames, setStudentNames] = useState<string[]>([""]);

// Add
<button onClick={() => setStudentNames((prev) => [...prev, ""])}>
  + Add Student
</button>

// Update one entry
onChange={(e) =>
  setStudentNames((prev) =>
    prev.map((v, i) => (i === idx ? e.target.value : v))
  )
}

// Remove
onClick={() =>
  setStudentNames((prev) => prev.filter((_, i) => i !== idx))
}
```

**Technique: Client-side file validation**

Before submitting, each file is checked against an allowed MIME types list and a 5MB size limit. Invalid files are skipped with a toast notification rather than blocking the entire upload:

```typescript
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // ...
];

for (const file of selected) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    toast({ title: "Invalid file type", description: `"${file.name}" skipped`, variant: "destructive" });
    continue;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast({ title: "File too large", description: `"${file.name}" exceeds 5MB`, variant: "destructive" });
    continue;
  }
  valid.push(file);
}
```

**Technique: Duplicate file prevention**

When the user picks files in multiple batches, already-added files are filtered out by name:

```typescript
setAbstractFiles((prev) => {
  const existing = new Set(prev.map((f) => f.name));
  return [...prev, ...valid.filter((f) => !existing.has(f.name))];
});
```

**Technique: Multipart form submission**

Multiple student names are appended as repeated fields with the same key. Multer on the backend then delivers them as an array:

```typescript
const body = new FormData();
body.append("schoolName", formData.schoolName.trim());
filledStudents.forEach((name) => body.append("studentNames", name));
body.append("teacherName", formData.teacherName.trim());
// ...
abstractFiles.forEach((file) => body.append("files", file));

await fetch("/api/abstracts", { method: "POST", body });
// No Content-Type header — browser sets multipart boundary automatically
```

---

### 2. Multer File Handling

**File:** `server/src/routes/abstracts.ts`

**Technology:** Multer v2

Multer is configured with `memoryStorage()` so files are held as `Buffer` objects in RAM — no temp files written to disk. This makes the upload-to-Cloudinary pipeline direct and avoids cleanup issues:

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

router.post('/', upload.array('files', 10), submitAbstract);
// req.files is Express.Multer.File[] with .buffer, .originalname, .mimetype, .size
```

Server-side MIME type and size validation runs in the controller as a second layer after Multer:

```typescript
for (const file of files) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ error: `Invalid file type for "${file.originalname}"` });
  }
  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ error: `"${file.originalname}" exceeds 5MB` });
  }
}
```

---

### 3. Cloudinary File Upload

**File:** `server/src/services/cloudinaryService.ts`

**Technology:** Cloudinary Node.js SDK v2 (`upload_stream`)

The Cloudinary SDK's upload API accepts a stream, not a buffer directly. A helper converts the buffer to a `Readable` stream, which is then piped into the upload stream:

```typescript
const bufferToStream = (buffer: Buffer): Readable => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null); // signals end of stream
  return readable;
};

export const uploadToCloudinary = async (fileBuffer: Buffer, originalName: string) => {
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'simlab-abstracts', resource_type: 'auto', public_id: sanitizedId },
      (error, result) => {
        if (error || !result) reject(error);
        else resolve(result);
      }
    );
    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};
```

All files in a submission are uploaded in **parallel** using `Promise.all`:

```typescript
uploadedFiles = await Promise.all(
  files.map(async (file): Promise<UploadedAbstractFile> => {
    const result = await uploadToCloudinary(file.buffer, file.originalname);
    return {
      originalName: file.originalname,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      mimeType: file.mimetype,
      size: file.size,
    };
  })
);
```

---

### 4. Firebase Firestore (Admin SDK)

**File:** `server/src/services/firebaseService.ts`

**Technology:** Firebase Admin SDK v13 (`firebase-admin`)

**Why Admin SDK instead of client SDK:**
The Firebase client SDK is bound by Firestore Security Rules. Running it server-side without a logged-in Firebase user means every read/write is rejected with `permission-denied`. The Admin SDK authenticates via a service account and bypasses rules entirely.

**Technique: Lazy singleton initialization**

The Firebase Admin app is initialized once and reused on subsequent calls. This prevents "already initialized" errors in hot-reload environments:

```typescript
let adminApp: App;

const getAdminApp = (): App => {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  adminApp = initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  return adminApp;
};

const db = () => getFirestore(getAdminApp());
```

The `FIREBASE_PRIVATE_KEY` contains literal `\n` escape sequences when read from `.env`. The `.replace(/\\n/g, '\n')` converts them to real newline characters, which the RSA key parser requires.

**Technique: Firestore server timestamp**

```typescript
submittedAt: FieldValue.serverTimestamp(), // uses Firestore's server clock
```

When reading back, the Firestore `Timestamp` object is converted to an ISO string for JSON serialisation:

```typescript
submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? null,
```

**Technique: Cross-database stats aggregation**

The admin stats endpoint runs Supabase and Firestore queries in parallel with a non-blocking fallback for Firestore:

```typescript
const [ordersResult, recentOrdersResult, abstracts] = await Promise.all([
  supabase.from('orders').select('order_status, payment_status, total_amount'),
  supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
  getAbstractsFromFirestore().catch(() => []), // Firestore failure doesn't break stats
]);
```

---

## Email Notification System

**File:** `server/src/services/emailService.ts`

**Technology:** Nodemailer, Gmail SMTP, HTML email templates

### Transporter Setup

```typescript
export const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // 16-character app password
    },
  });
```

### Timeout Wrapper

All email sends are wrapped in a race with a 12-second timeout to prevent slow SMTP connections from blocking API responses:

```typescript
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Email timeout after ${ms}ms`)), ms)
    ),
  ]);
```

### Order Emails (`sendOrderEmails`)

**Triggered:** When a new order is placed (`POST /api/orders`)

Sends two emails simultaneously:
- **Admin** — order details, customer contact, WhatsApp/Call action buttons, items table, totals
- **Customer** — confirmation, order number, "what happens next" steps, contact info

### Abstract Confirmation Emails (`sendAbstractEmails`)

**Triggered:** Non-blocking background call after a new abstract is saved to Firestore

Sends two emails:
- **Admin** — new submission alert with all project details, student list, file link, dashboard link
- **Teacher/Patron** — receipt confirmation with submission summary

**Technique: Adaptive student display in email HTML**

```typescript
const studentDisplay = data.studentNames.length === 1
  ? data.studentNames[0]
  : `<ul>${data.studentNames.map((n) => `<li>${n}</li>`).join('')}</ul>`;
```

**Technique: Non-blocking background emails**

Email failures never surface as API errors to the user:

```typescript
sendAbstractEmails({ ...submission, fileName, viewUrl })
  .catch((err) => console.error('[Abstract emails] Failed to send:', err.message));
// API response sent immediately — email runs asynchronously
```

### Abstract Status Update Email (`sendAbstractStatusEmail`)

**Triggered:** When admin changes a submission's status via `PATCH /api/abstracts/:id/status`

Status-specific message body:

| Status | Message |
|--------|---------|
| `accepted` | Congratulatory — team will be in touch with participation details |
| `rejected` | Regret message — encourages resubmission in future events |
| `reviewed` | Neutral status update |
| `pending` | Acknowledgment that submission is queued for review |

**Technique: Status-driven color coding**

```typescript
const STATUS_STYLES = {
  pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
  reviewed: { bg: '#dbeafe', color: '#1e40af', label: 'Reviewed' },
  accepted: { bg: '#d1fae5', color: '#065f46', label: 'Accepted' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
};
// Applied as inline styles in the HTML email badge
```

---

## Database Design

### Supabase PostgreSQL

#### Products Table

```sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  category        TEXT NOT NULL,
  has_sizes       BOOLEAN DEFAULT false,
  available_sizes TEXT[],
  stock_quantity  INTEGER DEFAULT 100,
  is_available    BOOLEAN DEFAULT true,
  image_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### Orders Table

```sql
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT UNIQUE NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_email   TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  delivery_method  TEXT NOT NULL CHECK (delivery_method IN ('pickup','delivery')),
  delivery_location TEXT,
  delivery_address  TEXT,
  items            JSONB NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  additional_notes TEXT,
  order_status     TEXT DEFAULT 'pending',
  payment_status   TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  contacted_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);
```

#### Admin OTP Table

```sql
CREATE TABLE admin_2fa_otp (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  TEXT NOT NULL,
  otp_code     TEXT NOT NULL,
  is_used      BOOLEAN DEFAULT false,
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ DEFAULT (now() + interval '10 minutes'),
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

#### Row Level Security

```sql
-- Products: public can read available; service role can do everything
CREATE POLICY "Public read available products"
ON products FOR SELECT USING (is_available = true);

-- Orders: public can insert; authenticated (service role) can read/update
CREATE POLICY "Public can place orders"
ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view all orders"
ON orders FOR SELECT TO authenticated USING (true);
```

The Express backend uses the **service role key** which bypasses RLS entirely, so the policies mainly govern direct client access.

---

### Firebase Firestore

**Collection:** `abstracts`

Each document stores:

```json
{
  "schoolName": "string",
  "studentNames": ["string"],
  "teacherName": "string",
  "teacherEmail": "string",
  "teacherContact": "string",
  "projectTitle": "string",
  "projectDescription": "string",
  "projectCategory": "string",
  "files": [
    {
      "originalName": "string",
      "url": "string (Cloudinary HTTPS URL)",
      "publicId": "string (Cloudinary public_id)",
      "mimeType": "string",
      "size": "number (bytes)"
    }
  ],
  "status": "pending | reviewed | accepted | rejected",
  "submittedAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp (set on status change)"
}
```

**Why Firestore for abstracts vs Supabase:**
Abstracts have a variable-length `files` array (each with its own metadata) and a free-form `studentNames` array. Firestore's document model stores these naturally without requiring join tables or JSONB workarounds.

---

## Deployment

### Running Locally

Two servers must run in parallel:

```bash
# Terminal 1 — Vite frontend (port 5173)
npm run dev

# Terminal 2 — Express API (port 5000)
npm run server
# Internally runs: tsx --env-file=.env server/index.ts
```

Vite proxies `/api/*` requests to `localhost:5000` in development.

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Firebase Admin SDK (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=your-secret

# Gmail (use an App Password, not your account password)
GMAIL_USER=simlabkenya@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Optional
ADMIN_DASHBOARD_URL=https://simlabkenya.co.ke/admin
```

### Vercel Deployment

```bash
vercel
```

Vercel automatically detects `api/index.ts` and deploys it as a serverless function. All `/api/*` requests are routed to this single function which runs the full Express app. The frontend is served as a static Vite build.

No extra Vercel configuration is needed — the project structure is enough.

---

## Complete API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Server health check |
| GET | `/api/products` | Optional | List products (admins see unavailable) |
| GET | `/api/products/:id` | None | Get single product |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |
| GET | `/api/orders` | Admin | List all orders |
| GET | `/api/orders/:id` | Admin | Get single order |
| POST | `/api/orders` | None | Place new order |
| PATCH | `/api/orders/:id` | Admin | Update order status/fields |
| POST | `/api/abstracts` | None | Submit new abstract (multipart) |
| GET | `/api/abstracts` | Admin | List all abstract submissions |
| GET | `/api/abstracts/:id` | Admin | Get single submission |
| PATCH | `/api/abstracts/:id/status` | Admin | Update review status |
| POST | `/api/admin/send-otp` | None | Send 2FA OTP to admin email |
| POST | `/api/admin/verify-otp` | None | Verify OTP code |
| GET | `/api/admin/me` | Admin | Get current admin profile |
| GET | `/api/admin/stats` | Admin | Get dashboard statistics |
