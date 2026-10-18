import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    FileText,
    Waves,
    MessagesSquare,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Users,
    Download,
    School,
} from "lucide-react";
import { useAdminAuth, Area } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { useTeamUnread } from "@/hooks/useTeamUnread";
import { useAdminManifest, useInstallPrompt } from "@/lib/pwa";
import logo from "@/assets/logo.jpeg";

type NavItem = { label: string; href: string; icon: typeof Users; area?: Area; adminOnly?: boolean };
const navItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Team", href: "/admin/team", icon: MessagesSquare },
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart, area: "orders" },
    { label: "Products", href: "/admin/products", icon: Package, area: "shop" },
    { label: "Abstracts", href: "/admin/abstracts", icon: FileText, area: "abstracts" },
    { label: "Ocean Shujaa", href: "/admin/ocean-shujaa", icon: Waves, adminOnly: true },
    { label: "Schools", href: "/admin/schools", icon: School, adminOnly: true },
    { label: "Staff", href: "/admin/staff", icon: Users, adminOnly: true },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user, signOut, isFullAdmin, can } = useAdminAuth();
    const visibleNav = navItems.filter((i) => (i.adminOnly ? isFullAdmin : i.area ? can(i.area, "view") : true));
    const location = useLocation();
    const teamUnread = useTeamUnread();
    useAdminManifest();
    const { canInstall, install } = useInstallPrompt();
    const onPath = (href: string) => (href === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(href));
    const pageTitle = visibleNav.find((i) => onPath(i.href))?.label ?? "Admin";
    // The phone's tab bar holds the everyday places; everything else lives in the side menu.
    const tabs = [
        ...visibleNav.filter((i) => i.href === "/admin" || i.href === "/admin/team"),
        ...visibleNav.filter((i) => ["/admin/orders", "/admin/abstracts", "/admin/products"].includes(i.href)),
    ].slice(0, 4);

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-40 h-16 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] box-content">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <img src={logo} alt="SIM-Lab" className="h-8 w-8 rounded-full" />
                    <span className="font-heading font-bold text-primary truncate">{pageTitle}</span>
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
                    {visibleNav.map((item) => {
                        const isActive =
                            item.href === "/admin"
                                ? location.pathname === "/admin"
                                : location.pathname.startsWith(item.href);
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
                                {item.href === "/admin/team" && teamUnread > 0 && (
                                    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-black text-[11px] font-bold grid place-items-center" aria-label={`${teamUnread} unread`}>{teamUnread}</span>
                                )}
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
                            <p className="text-xs text-muted-foreground">{isFullAdmin ? "Administrator" : "Staff"}</p>
                        </div>
                    </div>
                    {canInstall && (
                        <Button variant="outline" size="sm" className="w-full mb-2" onClick={install}>
                            <Download className="w-4 h-4" /> Install app
                        </Button>
                    )}
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
            <main className="lg:ml-64 min-h-screen pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
                <div className="p-4 lg:p-8">{children}</div>
            </main>

            {/* Phone tab bar */}
            <nav aria-label="Quick links" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
                {tabs.map((item) => {
                    const Icon = item.icon;
                    const active = onPath(item.href);
                    return (
                        <Link key={item.href} to={item.href} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-primary" : "text-gray-500"}`}>
                            <Icon className="w-5 h-5" />
                            {item.label}
                            {item.href === "/admin/team" && teamUnread > 0 && (
                                <span className="absolute top-1 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold grid place-items-center">{teamUnread}</span>
                            )}
                        </Link>
                    );
                })}
                <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-gray-500">
                    <Menu className="w-5 h-5" />
                    More
                </button>
            </nav>
        </div>
    );
};

export default AdminLayout;
