import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ShoppingCart,
    Phone,
    CheckCircle2,
    DollarSign,
    TrendingUp,
    Clock,
    ArrowRight,
    Loader2,
    FileText,
    Package,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";

interface DashboardStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    totalAbstracts: number;
    pendingAbstracts: number;
}

interface RecentOrder {
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    order_status: string;
    created_at: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    confirmed: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

const AdminDashboard = () => {
    const { token } = useAdminAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        totalAbstracts: 0,
        pendingAbstracts: 0,
    });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) fetchDashboardData();
    }, [token]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch("/api/admin/stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch stats");
            const data = await res.json();
            setStats({
                totalOrders: data.totalOrders,
                pendingOrders: data.pendingOrders,
                completedOrders: data.completedOrders,
                totalRevenue: data.totalRevenue,
                totalAbstracts: data.totalAbstracts ?? 0,
                pendingAbstracts: data.pendingAbstracts ?? 0,
            });
            setRecentOrders(data.recentOrders || []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-KE", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-900">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Welcome back! Here's an overview of your operations.
                    </p>
                </div>

                {/* Section KPI Cards */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {/* Shop Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                    >
                        <div className="bg-primary p-5 flex items-center justify-between">
                            <div>
                                <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wide">
                                    Shop
                                </p>
                                <h2 className="text-3xl font-bold text-white mt-1">
                                    {stats.totalOrders}
                                    <span className="text-lg font-normal ml-1 text-primary-foreground/80">
                                        orders
                                    </span>
                                </h2>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShoppingCart className="w-7 h-7 text-white" />
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-yellow-50 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                                </div>
                                <div className="bg-primary/5 rounded-xl p-3">
                                    <p className="text-sm font-bold text-primary leading-tight">
                                        KES {stats.totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Revenue</p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button asChild size="sm" className="flex-1">
                                    <Link to="/admin/orders">
                                        View Orders <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="flex-1">
                                    <Link to="/admin/products">
                                        <Package className="w-4 h-4" /> Products
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Abstracts Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                    >
                        <div className="bg-violet-600 p-5 flex items-center justify-between">
                            <div>
                                <p className="text-violet-100 text-sm font-medium uppercase tracking-wide">
                                    Abstracts
                                </p>
                                <h2 className="text-3xl font-bold text-white mt-1">
                                    {stats.totalAbstracts}
                                    <span className="text-lg font-normal ml-1 text-violet-200">
                                        submissions
                                    </span>
                                </h2>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <FileText className="w-7 h-7 text-white" />
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-yellow-50 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingAbstracts}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-green-600">
                                        {stats.totalAbstracts - stats.pendingAbstracts}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Reviewed</p>
                                </div>
                                <div className="bg-violet-50 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-violet-600">{stats.totalAbstracts}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total</p>
                                </div>
                            </div>
                            <div className="pt-1">
                                <Button asChild size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
                                    <Link to="/admin/abstracts">
                                        View Submissions <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-5 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Orders</p>
                                <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                            </div>
                            <div className="w-11 h-11 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Clock className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                        <Link
                            to="/admin/orders?status=pending"
                            className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-white p-5 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Contacted</p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {stats.totalOrders - stats.pendingOrders - stats.completedOrders}
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center">
                                <Phone className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <Link
                            to="/admin/orders?status=contacted"
                            className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-5 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
                            </div>
                            <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <Link
                            to="/admin/orders?status=completed"
                            className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-white p-5 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold text-primary">
                                    KES {stats.totalRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            From paid orders
                        </p>
                    </motion.div>
                </div>

                {/* Recent Orders */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl shadow-sm border"
                >
                    <div className="p-6 border-b flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-heading font-bold">Recent Orders</h2>
                            <p className="text-sm text-muted-foreground">Latest 10 orders</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/admin/orders">View All Orders</Link>
                        </Button>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="p-12 text-center">
                            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No orders yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-medium">
                                                    {order.order_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{order.customer_name}</td>
                                            <td className="px-6 py-4 font-medium">
                                                KES {Number(order.total_amount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.order_status] || "bg-gray-100"}`}
                                                >
                                                    {order.order_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    to={`/admin/orders/${order.id}`}
                                                    className="text-primary hover:underline text-sm"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
