import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Search,
    Filter,
    Download,
    Loader2,
    Eye,
    Phone,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    delivery_method: string;
    delivery_location: string | null;
    total_amount: number;
    order_status: string;
    payment_status: string;
    created_at: string;
    items: { name: string; quantity: number }[];
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    confirmed: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<string, string> = {
    pending: "bg-orange-100 text-orange-800",
    paid: "bg-green-100 text-green-800",
};

const ITEMS_PER_PAGE = 20;

const AdminOrders = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [deliveryFilter, setDeliveryFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchOrders = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const filterOrders = useCallback(() => {
        let filtered = [...orders];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (o) =>
                    o.order_number.toLowerCase().includes(query) ||
                    o.customer_name.toLowerCase().includes(query) ||
                    o.customer_email.toLowerCase().includes(query) ||
                    o.customer_phone.includes(query)
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter((o) => o.order_status === statusFilter);
        }

        // Payment filter
        if (paymentFilter !== "all") {
            filtered = filtered.filter((o) => o.payment_status === paymentFilter);
        }

        // Delivery filter
        if (deliveryFilter !== "all") {
            filtered = filtered.filter((o) => o.delivery_method === deliveryFilter);
        }

        setFilteredOrders(filtered);
        setCurrentPage(1);
    }, [orders, searchQuery, statusFilter, paymentFilter, deliveryFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        filterOrders();
    }, [filterOrders]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatPhoneForWhatsApp = (phone: string): string => {
        let cleaned = phone.replace(/[\s-()]/g, "");
        if (cleaned.startsWith("0")) {
            cleaned = "254" + cleaned.substring(1);
        }
        if (!cleaned.startsWith("+")) {
            cleaned = cleaned.startsWith("254") ? cleaned : "254" + cleaned;
        }
        return cleaned.replace("+", "");
    };

    const exportToCSV = () => {
        const headers = [
            "Order Number",
            "Customer Name",
            "Email",
            "Phone",
            "Delivery Method",
            "Location",
            "Total Amount",
            "Order Status",
            "Payment Status",
            "Date",
        ];

        const rows = filteredOrders.map((o) => [
            o.order_number,
            o.customer_name,
            o.customer_email,
            o.customer_phone,
            o.delivery_method,
            o.delivery_location || "",
            o.total_amount,
            o.order_status,
            o.payment_status,
            formatDate(o.created_at),
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers, ...rows].map((row) => row.join(",")).join("\n");

        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-gray-900">
                            Orders
                        </h1>
                        <p className="text-muted-foreground">
                            Manage and track all customer orders
                        </p>
                    </div>
                    <Button onClick={exportToCSV} variant="outline">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 rounded-xl shadow-sm border space-y-4"
                >
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by order #, name, email, phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full lg:w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Payment Filter */}
                        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                            <SelectTrigger className="w-full lg:w-40">
                                <SelectValue placeholder="Payment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Delivery Filter */}
                        <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                            <SelectTrigger className="w-full lg:w-40">
                                <SelectValue placeholder="Delivery" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Delivery</SelectItem>
                                <SelectItem value="pickup">Pickup</SelectItem>
                                <SelectItem value="delivery">Delivery</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                            Showing {paginatedOrders.length} of {filteredOrders.length} orders
                        </p>
                        {(searchQuery || statusFilter !== "all" || paymentFilter !== "all" || deliveryFilter !== "all") && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("all");
                                    setPaymentFilter("all");
                                    setDeliveryFilter("all");
                                }}
                                className="text-primary hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Orders Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                    {paginatedOrders.length === 0 ? (
                        <div className="p-12 text-center">
                            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No orders found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Order
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Customer
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                                            Items
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginatedOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <Link
                                                    to={`/admin/orders/${order.order_number}`}
                                                    className="font-mono text-sm font-medium text-primary hover:underline"
                                                >
                                                    {order.order_number}
                                                </Link>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {order.delivery_method}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-medium">{order.customer_name}</p>
                                                <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                                            </td>
                                            <td className="px-4 py-4 hidden md:table-cell">
                                                <p className="text-sm">
                                                    {(order.items as { name: string; quantity: number }[])?.length || 0} items
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-medium">
                                                    KES {Number(order.total_amount).toLocaleString()}
                                                </p>
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full ${paymentColors[order.payment_status]
                                                        }`}
                                                >
                                                    {order.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.order_status]
                                                        }`}
                                                >
                                                    {order.order_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        to={`/admin/orders/${order.order_number}`}
                                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-gray-600" />
                                                    </Link>
                                                    <a
                                                        href={`https://wa.me/${formatPhoneForWhatsApp(order.customer_phone)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-green-50 rounded-lg"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4 text-green-600" />
                                                    </a>
                                                    <a
                                                        href={`tel:${order.customer_phone}`}
                                                        className="p-2 hover:bg-blue-50 rounded-lg"
                                                        title="Call"
                                                    >
                                                        <Phone className="w-4 h-4 text-blue-600" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
};

export default AdminOrders;
