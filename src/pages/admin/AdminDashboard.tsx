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
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface OrderStats {
    pending: number;
    contacted: number;
    completed: number;
    totalRevenue: number;
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
    const [stats, setStats] = useState<OrderStats>({
        pending: 0,
        contacted: 0,
        completed: 0,
        totalRevenue: 0,
    });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch all orders
            const { data: orders, error } = await supabase
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (orders) {
                // Calculate stats
                const pending = orders.filter((o) => o.order_status === "pending").length;
                const contacted = orders.filter((o) => o.order_status === "contacted").length;
                const completed = orders.filter((o) => o.order_status === "completed").length;
                const totalRevenue = orders
                    .filter((o) => o.payment_status === "paid")
                    .reduce((sum, o) => sum + Number(o.total_amount), 0);

                setStats({ pending, contacted, completed, totalRevenue });
                setRecentOrders(orders.slice(0, 10));
            }
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
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-900">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Welcome back! Here's what's happening with your shop.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Orders</p>
                                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600" />
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
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Contacted</p>
                                <p className="text-3xl font-bold text-blue-600">{stats.contacted}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <Phone className="w-6 h-6 text-blue-600" />
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
                        transition={{ delay: 0.2 }}
                        className="bg-white p-6 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
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
                        transition={{ delay: 0.3 }}
                        className="bg-white p-6 rounded-xl shadow-sm border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-3xl font-bold text-primary">
                                    KES {stats.totalRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-primary" />
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
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Order
                                        </th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Customer
                                        </th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Actions
                                        </th>
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
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.order_status] || "bg-gray-100"
                                                        }`}
                                                >
                                                    {order.order_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    to={`/admin/orders/${order.order_number}`}
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
