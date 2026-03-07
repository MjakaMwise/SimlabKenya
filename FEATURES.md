# SIM-Lab Shop - Complete Feature Implementation Guide

> This document outlines every feature implemented in the SIM-Lab Shop system, the techniques used, and how each component works.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Core Shopping System](#phase-1-core-shopping-system)
3. [Phase 2: Admin Panel](#phase-2-admin-panel)
4. [Database Design](#database-design)
5. [Email Notification System](#email-notification-system)
6. [Authentication & Security](#authentication--security)
7. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI components and logic |
| Styling | TailwindCSS + shadcn/ui | Component styling |
| Animation | Framer Motion | Smooth animations |
| State Management | React Context | Cart & Auth state |
| Routing | React Router v6 | Page navigation |
| Database | Supabase (PostgreSQL) | Data storage |
| Authentication | Supabase Auth | Admin login |
| Email | Nodemailer + Gmail SMTP | Order notifications |
| Hosting | Vercel | Deployment & serverless functions |
| Validation | Zod | Form validation |

### Project Structure

```
src/
├── components/
│   ├── admin/           # Admin panel components
│   │   ├── AdminLayout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── shop/            # Shop components
│   │   ├── CartIcon.tsx
│   │   ├── CartSidebar.tsx
│   │   └── ProductCard.tsx
│   └── ui/              # shadcn/ui components
├── hooks/
│   ├── useCart.tsx      # Shopping cart context
│   └── useAdminAuth.tsx # Admin authentication context
├── pages/
│   ├── Shop.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── OrderConfirmation.tsx
│   └── admin/           # Admin pages
│       ├── AdminLogin.tsx
│       ├── AdminDashboard.tsx
│       ├── AdminOrders.tsx
│       ├── AdminOrderDetail.tsx
│       ├── AdminProducts.tsx
│       └── AdminSettings.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabase client
│       └── types.ts     # Generated types
└── App.tsx              # Route definitions

api/
└── send-order-email.ts  # Vercel serverless function

supabase/
└── migrations/          # Database migrations
```

---

## Phase 1: Core Shopping System

### 1. Product Catalog

**File:** `src/pages/Shop.tsx`

**Features:**
- Fetches products from Supabase
- Groups products by category
- Responsive grid layout (3/2/1 columns)
- Loading spinner during fetch

**Technique: Data Fetching with Supabase**
```typescript
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)  // Only show available products
    .order("created_at");

  if (error) console.error("Error:", error);
  else setProducts(data || []);
};
```

---

### 2. Product Cards

**File:** `src/components/shop/ProductCard.tsx`

**Features:**
- Product image with category badge
- "In Stock" status badge
- Size selector (for T-Shirts, Lab Coats)
- Quantity selector (1-99)
- Add to Cart button with feedback animation

**Technique: Conditional Rendering for Size Selector**
```typescript
{product.has_sizes && product.available_sizes && (
  <div className="flex flex-wrap gap-2">
    {product.available_sizes.map((size) => (
      <button
        key={size}
        onClick={() => setSelectedSize(size)}
        className={selectedSize === size ? "bg-primary" : "bg-muted"}
      >
        {size}
      </button>
    ))}
  </div>
)}
```

**Technique: Add to Cart with Validation**
```typescript
const handleAddToCart = () => {
  if (product.has_sizes && !selectedSize) {
    toast({ title: "Please select a size", variant: "destructive" });
    return;
  }
  addItem({ id, name, price, size: selectedSize, image_url }, quantity);
  toast({ title: "Added to cart!" });
};
```

---

### 3. Shopping Cart Context

**File:** `src/hooks/useCart.tsx`

**Features:**
- Global cart state using React Context
- localStorage persistence
- Size-aware item tracking
- Add, remove, update quantity functions
- Total and item count calculations

**Technique: React Context with localStorage**
```typescript
const [items, setItems] = useState<CartItem[]>(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("simlab-cart");
    return saved ? JSON.parse(saved) : [];
  }
  return [];
});

// Auto-save to localStorage
useEffect(() => {
  localStorage.setItem("simlab-cart", JSON.stringify(items));
}, [items]);
```

**Technique: Size-Aware Item Management**
```typescript
// Items with same ID but different sizes are tracked separately
const existingIndex = prev.findIndex(
  (i) => i.id === item.id && i.size === item.size
);
```

---

### 4. Cart Sidebar

**File:** `src/components/shop/CartSidebar.tsx`

**Features:**
- Slide-in animation from right
- Dark overlay background
- Item list with thumbnails
- Quantity adjustment buttons
- Remove item button
- Subtotal display
- Checkout and View Cart buttons
- Empty cart state

**Technique: Framer Motion Slide Animation**
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

### 5. Full Cart Page

**File:** `src/pages/Cart.tsx`

**Features:**
- Breadcrumb navigation
- Cart items in table/card format
- Quantity controls
- Remove item with confirmation
- Order summary sidebar (sticky)
- Empty cart state with CTA
- Proceed to Checkout button

**Technique: Responsive Layout with CSS Grid**
```typescript
<div className="grid lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* Cart Items */}
  </div>
  <div className="sticky top-28">
    {/* Order Summary */}
  </div>
</div>
```

---

### 6. Checkout Form

**File:** `src/pages/Checkout.tsx`

**Features:**
- Contact information (name, email, phone)
- Delivery method selection (Pickup/Delivery)
- Conditional location selector (Mombasa/Outside)
- Conditional address textarea
- Character counters
- Additional notes field
- Order summary
- Payment information display
- Terms & conditions checkbox
- Form validation with Zod
- Loading state during submission

**Technique: Zod Schema Validation**
```typescript
const checkoutSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(10).max(20),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryLocation: z.string().optional(),
  deliveryAddress: z.string().max(500).optional(),
  termsAccepted: z.literal(true),
});
```

**Technique: Conditional Field Display**
```typescript
{formData.deliveryMethod === "delivery" && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
  >
    {/* Location and Address fields */}
  </motion.div>
)}
```

**Technique: Dynamic Payment Info**
```typescript
{formData.deliveryMethod === "pickup" ? (
  <p>Pay when you collect at IOME001 (Cash or M-Pesa)</p>
) : formData.deliveryLocation === "mombasa" ? (
  <p>Pay on delivery (Cash or M-Pesa)</p>
) : (
  <p>Payment required before shipping</p>
)}
```

---

### 7. Order Number Generation

**Technique: Date-Based Unique ID**
```typescript
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 900) + 100;
  return `ORD-${dateStr}-${random}`;  // e.g., ORD-20260126-742
};
```

---

### 8. Order Confirmation Page

**File:** `src/pages/OrderConfirmation.tsx`

**Features:**
- Success animation (spring effect)
- Order number display
- "What Happens Next" steps
- Contact options (WhatsApp, Phone, Email)
- Continue Shopping / Home buttons

**Technique: URL Query Parameters**
```typescript
const [searchParams] = useSearchParams();
const orderNumber = searchParams.get("order") || "N/A";
```

---

## Phase 2: Admin Panel

### 1. Admin Authentication

**File:** `src/hooks/useAdminAuth.tsx`

**Features:**
- Supabase Auth integration
- Email-based admin verification
- Session management
- Sign in/out functions

**Technique: Admin Email Whitelist**
```typescript
const ADMIN_EMAILS = ["simlabkenya@gmail.com"];

const isAdmin = user ? ADMIN_EMAILS.includes(user.email || "") : false;
```

**Technique: Auth State Listener**
```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

### 2. Protected Routes

**File:** `src/components/admin/ProtectedRoute.tsx`

**Features:**
- Redirects to login if not authenticated
- Redirects with error if not admin
- Loading state during auth check

**Technique: Route Protection with useEffect**
```typescript
useEffect(() => {
  if (!isLoading) {
    if (!user) {
      navigate("/admin/login");
    } else if (!isAdmin) {
      navigate("/admin/login?error=unauthorized");
    }
  }
}, [user, isLoading, isAdmin, navigate]);
```

---

### 3. Admin Layout

**File:** `src/components/admin/AdminLayout.tsx`

**Features:**
- Responsive sidebar navigation
- Mobile hamburger menu
- User profile dropdown
- Sign out button
- Active route highlighting

**Technique: Responsive Sidebar with Tailwind**
```typescript
<aside
  className={`fixed top-0 left-0 h-full w-64 transform transition-transform
    lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
>
```

---

### 4. Admin Dashboard

**File:** `src/pages/admin/AdminDashboard.tsx`

**Features:**
- Statistics cards (pending, contacted, completed, revenue)
- Recent orders table
- Quick links to filtered views

**Technique: Aggregating Order Stats**
```typescript
const pending = orders.filter((o) => o.order_status === "pending").length;
const contacted = orders.filter((o) => o.order_status === "contacted").length;
const completed = orders.filter((o) => o.order_status === "completed").length;
const totalRevenue = orders
  .filter((o) => o.payment_status === "paid")
  .reduce((sum, o) => sum + Number(o.total_amount), 0);
```

---

### 5. Orders Management

**File:** `src/pages/admin/AdminOrders.tsx`

**Features:**
- Search by order #, name, email, phone
- Filter by status, payment, delivery method
- Sortable table
- Pagination (20 per page)
- CSV export
- Quick contact actions (WhatsApp, Call)

**Technique: Multi-Filter System**
```typescript
const filterOrders = () => {
  let filtered = [...orders];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.order_number.toLowerCase().includes(query) ||
        o.customer_name.toLowerCase().includes(query)
    );
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((o) => o.order_status === statusFilter);
  }

  // ... more filters
};
```

**Technique: CSV Export**
```typescript
const exportToCSV = () => {
  const headers = ["Order Number", "Customer", ...];
  const rows = filteredOrders.map((o) => [o.order_number, o.customer_name, ...]);
  
  const csvContent = "data:text/csv;charset=utf-8," +
    [headers, ...rows].map((row) => row.join(",")).join("\n");
  
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
};
```

---

### 6. Order Detail View

**File:** `src/pages/admin/AdminOrderDetail.tsx`

**Features:**
- Customer information card
- Quick contact buttons (WhatsApp, Call, Email)
- Delivery details
- Order items list with subtotals
- Status update dropdowns
- Quick action buttons (Mark Contacted, Mark Paid, Complete)
- Timeline of order events
- Print functionality

**Technique: Status Update with Timestamps**
```typescript
const updateOrderStatus = async (newStatus: string) => {
  const updates: Record<string, unknown> = { order_status: newStatus };
  
  if (newStatus === "contacted" && !order.contacted_at) {
    updates.contacted_at = new Date().toISOString();
  }
  if (newStatus === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  await supabase.from("orders").update(updates).eq("id", order.id);
};
```

**Technique: WhatsApp Pre-filled Message**
```typescript
const whatsappMessage = encodeURIComponent(
  `Hello ${order.customer_name}, this is SIM-Lab Kenya regarding your order #${order.order_number}.`
);
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
```

---

### 7. Products Management

**File:** `src/pages/admin/AdminProducts.tsx`

**Features:**
- Product grid display
- Add/Edit dialog
- Delete with confirmation
- Toggle visibility
- Form validation

**Technique: Dialog for Create/Edit**
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
```

---

### 8. Settings Page

**File:** `src/pages/admin/AdminSettings.tsx`

**Features:**
- Account information display
- Password change form
- Notification preferences (toggles)
- Shop information display
- Danger zone actions

**Technique: Supabase Password Update**
```typescript
const handlePasswordChange = async () => {
  const { error } = await supabase.auth.updateUser({
    password: passwordData.newPassword,
  });
  if (error) throw error;
  toast({ title: "Password updated" });
};
```

---

## Database Design

### Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  has_sizes BOOLEAN DEFAULT false,
  available_sizes TEXT[],
  stock_quantity INTEGER DEFAULT 100,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Orders Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  delivery_location TEXT,
  delivery_address TEXT,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  additional_notes TEXT,
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  contacted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### Row Level Security (RLS)

```sql
-- Public: Anyone can view available products
CREATE POLICY "Anyone can view available products"
ON products FOR SELECT USING (is_available = true);

-- Public: Anyone can place orders
CREATE POLICY "Anyone can place orders"
ON orders FOR INSERT WITH CHECK (true);

-- Admin: Authenticated users can view/update/delete orders
CREATE POLICY "Authenticated users can view all orders"
ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update orders"
ON orders FOR UPDATE TO authenticated USING (true);
```

---

## Email Notification System

**File:** `api/send-order-email.ts`

### Architecture

```
Customer places order
        ↓
Checkout.tsx saves to Supabase
        ↓
Checkout.tsx calls /api/send-order-email
        ↓
Vercel serverless function
        ↓
Nodemailer sends via Gmail SMTP
        ↓
Two emails sent:
├── Admin notification (simlabkenya@gmail.com)
└── Customer confirmation (customer email)
```

### Email Templates

**Admin Email Features:**
- Order number in subject
- Customer contact info with click-to-action
- WhatsApp and Call buttons
- Order items table
- Delivery details
- Total amount prominently displayed
- Additional notes from customer

**Customer Email Features:**
- Success confirmation
- Order number for reference
- Items ordered summary
- "What happens next" steps
- Contact information

### Nodemailer Configuration

```typescript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,  // 16-char app password
  },
});
```

---

## Authentication & Security

### Admin Authentication Flow

```
1. User visits /admin
2. ProtectedRoute checks auth state
3. If not authenticated → redirect to /admin/login
4. If not in ADMIN_EMAILS list → redirect with error
5. If authenticated + admin → render admin page
```

### Security Measures

| Security Layer | Implementation |
|----------------|----------------|
| RLS (Row Level Security) | Prevents unauthorized data access |
| Admin Email Whitelist | Only approved emails can access admin |
| Session Management | Supabase handles token refresh |
| Environment Variables | Secrets stored in Vercel |
| HTTPS | Enforced by Vercel |

---

## Deployment Guide

### Environment Variables (Vercel)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
GMAIL_USER=simlabkenya@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Supabase Setup

1. Run migrations in Supabase SQL Editor
2. Enable Row Level Security on both tables
3. Create admin user in Authentication > Users
4. Verify products are seeded

### Gmail App Password

See [GMAIL_SETUP.md](./GMAIL_SETUP.md) for detailed instructions.

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add GMAIL_USER
vercel env add GMAIL_APP_PASSWORD
```

---

## Testing Checklist

### Phase 1: Shopping Flow
- [ ] Browse products on /shop
- [ ] Add items to cart (with sizes)
- [ ] View cart sidebar
- [ ] Navigate to full cart page
- [ ] Complete checkout form
- [ ] Submit order
- [ ] Verify redirect to confirmation
- [ ] Check order in Supabase
- [ ] Verify emails received (admin + customer)

### Phase 2: Admin Panel
- [ ] Access /admin/login
- [ ] Sign in with admin email
- [ ] View dashboard statistics
- [ ] Navigate to orders list
- [ ] Search and filter orders
- [ ] View order details
- [ ] Update order status
- [ ] Update payment status
- [ ] Contact customer via WhatsApp
- [ ] Manage products (add/edit/delete)
- [ ] Change password in settings
- [ ] Sign out

---

## Summary

This implementation provides a complete e-commerce solution for SIM-Lab Kenya with:

✅ **5 Products** with size and quantity options  
✅ **Shopping Cart** with localStorage persistence  
✅ **Checkout Form** with comprehensive validation  
✅ **Order Management** saved to Supabase  
✅ **Email Notifications** for admin and customers  
✅ **Admin Panel** with dashboard, orders, products, settings  
✅ **Authentication** with Supabase Auth  
✅ **Responsive Design** for all devices  
✅ **Production Ready** for Vercel deployment
