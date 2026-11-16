import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/hooks/useCart";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { SchoolAuthProvider } from "@/hooks/useSchoolAuth";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

// Public Pages (new SIM-Lab design)
import SiteLayout from "@/site/SiteLayout";
import Index from "./pages/Index";
import Bench from "./pages/Bench";
import About from "./pages/About";
import Programs from "./pages/Programs";
import OceanShujaa from "./pages/OceanShujaa";
import OceanShujaaRegistration from "./pages/OceanShujaaRegistration";
import SchoolLogin from "./pages/school/SchoolLogin";
import SchoolPortal from "./pages/school/SchoolPortal";
import Gallery from "./pages/Gallery";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Abstract from "./pages/Abstract";
import ShopGate from "./components/shop/ShopGate";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminAbstracts from "./pages/admin/AdminAbstracts";
import AdminAbstractDetail from "./pages/admin/AdminAbstractDetail";
import AdminOceanShujaa from "./pages/admin/AdminOceanShujaa";
import AdminSchools from "./pages/admin/AdminSchools";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminEmail from "./pages/admin/AdminEmail";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";
import AdminWhatsAppSetup from "./pages/admin/AdminWhatsAppSetup";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTeam from "./pages/admin/AdminTeam";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminAuthProvider>
      <SchoolAuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public Routes */}
              <Route element={<SiteLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/bench" element={<Bench />} />
                <Route path="/about" element={<About />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/oceanshujaa" element={<OceanShujaa />} />
                <Route path="/school/login" element={<SchoolLogin />} />
                <Route path="/school/portal" element={<SchoolPortal />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
              {/* Abstract submission is always open; the shop pages only work while an admin has switched the shop on */}
              <Route path="/abstract" element={<Abstract />} />
              <Route path="/shop" element={<ShopGate><Shop /></ShopGate>} />
              <Route path="/cart" element={<ShopGate><Cart /></ShopGate>} />
              <Route path="/checkout" element={<ShopGate><Checkout /></ShopGate>} />
              <Route path="/order-confirmation" element={<ShopGate><OrderConfirmation /></ShopGate>} />
              </Route>
              {/* full-page, one-question-at-a-time registration */}
              <Route path="/oceanshujaaregistration" element={<OceanShujaaRegistration />} />
              {/* older links */}
              <Route path="/holiday-program" element={<Navigate to="/oceanshujaa" replace />} />
              <Route path="/ocean-shujaa" element={<Navigate to="/oceanshujaa" replace />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute area="orders">
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders/:orderNumber"
                element={
                  <ProtectedRoute area="orders">
                    <AdminOrderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute area="shop">
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/abstracts"
                element={
                  <ProtectedRoute area="abstracts">
                    <AdminAbstracts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/abstracts/:id"
                element={
                  <ProtectedRoute area="abstracts">
                    <AdminAbstractDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ocean-shujaa"
                element={
                  <ProtectedRoute area="ocean">
                    <AdminOceanShujaa />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/schools"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminSchools />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/staff"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminStaff />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/whatsapp"
                element={
                  <ProtectedRoute area="whatsapp">
                    <AdminWhatsApp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/whatsapp/setup"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminWhatsAppSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/email"
                element={
                  <ProtectedRoute area="email">
                    <AdminEmail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/team"
                element={
                  <ProtectedRoute area="chat">
                    <AdminTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
      </SchoolAuthProvider>
    </AdminAuthProvider>
  </QueryClientProvider>
);

export default App;
