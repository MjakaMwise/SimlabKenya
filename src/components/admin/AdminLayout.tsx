import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user, signOut } = useAdminAuth();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-40 h-16 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <img src={logo} alt="SIM-Lab" className="h-8 w-8 rounded-full" />
                    <span className="font-heading font-bold text-primary">Admin</span>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-2"
                            >
                                <p className="px-4 py-2 text-sm text-muted-foreground truncate">
                                    {user?.email}
                                </p>
                                <hr className="my-1" />
                                <button
                                    onClick={handleSignOut}
                                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/50 z-50"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-white border-r z-50 transform transition-transform lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <Link to="/admin" className="flex items-center gap-3">
                        <img src={logo} alt="SIM-Lab" className="h-10 w-10 rounded-full" />
                        <div>
                            <span className="font-heading font-bold text-primary">SIM-Lab</span>
                            <p className="text-xs text-muted-foreground">Admin Panel</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{user?.email}</p>
                            <p className="text-xs text-muted-foreground">Administrator</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
                <div className="p-4 lg:p-8">{children}</div>
            </main>
        </div>
    );
};

export default AdminLayout;
