import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Loader2,
    Phone,
    MessageCircle,
    Mail,
    MapPin,
    Truck,
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    DollarSign,
    User,
    FileText,
    Printer,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    delivery_method: string;
    delivery_location: string | null;
    delivery_address: string | null;
    items: OrderItem[];
    total_amount: number;
    additional_notes: string | null;
    order_status: string;
    payment_status: string;
    created_at: string;
    updated_at: string;
    contacted_at: string | null;
    completed_at: string | null;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    contacted: "bg-blue-100 text-blue-800 border-blue-300",
    confirmed: "bg-purple-100 text-purple-800 border-purple-300",
    completed: "bg-green-100 text-green-800 border-green-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
};

const paymentColors: Record<string, string> = {
    pending: "bg-orange-100 text-orange-800 border-orange-300",
    paid: "bg-green-100 text-green-800 border-green-300",
};

const AdminOrderDetail = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { token } = useAdminAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchOrder = useCallback(async () => {
        if (!orderId || !token) return;
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Order not found");
            const data = await res.json();
            setOrder({
                ...data,
                items: (typeof data.items === "string"
                    ? JSON.parse(data.items)
                    : data.items) as OrderItem[],
            });
        } catch (error) {
            console.error("Error fetching order:", error);
            toast({
                title: "Order not found",
                description: "The order could not be found.",
                variant: "destructive",
            });
            navigate("/admin/orders");
        } finally {
            setIsLoading(false);
        }
    }, [orderId, token, navigate, toast]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const patchOrder = async (updates: Record<string, unknown>) => {
        if (!order || !token) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/orders/${order.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error("Update failed");
            const updated = await res.json();
            setOrder({ ...order, ...updated });
            return true;
        } catch (error) {
            console.error("Error updating order:", error);
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    const updateOrderStatus = async (newStatus: string) => {
        const ok = await patchOrder({ order_status: newStatus });
        toast(ok
            ? { title: "Status updated", description: `Order status changed to ${newStatus}` }
            : { title: "Update failed", description: "Failed to update order status", variant: "destructive" }
        );
    };

    const updatePaymentStatus = async (newStatus: string) => {
        const ok = await patchOrder({ payment_status: newStatus });
        toast(ok
            ? { title: "Payment updated", description: `Payment status changed to ${newStatus}` }
            : { title: "Update failed", description: "Failed to update payment status", variant: "destructive" }
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-KE", {
            year: "numeric",
            month: "long",
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

    const getPaymentInfo = () => {
        if (!order) return "";
        if (order.delivery_method === "pickup") {
            return "Pay on collection at IOME001 Innovation Hub (Cash or M-Pesa)";
        }
        if (order.delivery_location === "mombasa") {
            return "Pay on Delivery (Cash or M-Pesa)";
        }
        return "Payment required before shipping (M-Pesa or Bank Transfer)";
    };

    const handlePrint = () => {
        window.print();
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

    if (!order) {
        return null;
    }

    const whatsappNumber = formatPhoneForWhatsApp(order.customer_phone);
    const whatsappMessage = encodeURIComponent(
        `Hello ${order.customer_name}, this is SIM-Lab Kenya regarding your order #${order.order_number}.`
    );

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin/orders"
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-heading font-bold text-gray-900">
                                Order {order.order_number}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Placed on {formatDate(order.created_at)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4" /> Print
                        </Button>
                    </div>
                </div>

                {/* Status Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-4"
                >
                    <div
                        className={`px-4 py-2 rounded-lg border-2 ${statusColors[order.order_status]}`}
                    >
                        <p className="text-xs font-medium opacity-70">Order Status</p>
                        <p className="font-bold capitalize">{order.order_status}</p>
                    </div>
                    <div
                        className={`px-4 py-2 rounded-lg border-2 ${paymentColors[order.payment_status]}`}
                    >
                        <p className="text-xs font-medium opacity-70">Payment Status</p>
                        <p className="font-bold capitalize">{order.payment_status}</p>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - Order Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl shadow-sm border"
                        >
                            <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" /> Customer Information
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Full Name</p>
                                    <p className="font-medium">{order.customer_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <a
                                        href={`mailto:${order.customer_email}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {order.customer_email}
                                    </a>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <a
                                        href={`tel:${order.customer_phone}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {order.customer_phone}
                                    </a>
                                </div>
                            </div>

                            {/* Quick Contact Actions */}
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                                <a
                                    href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                </a>
                                <a
                                    href={`tel:${order.customer_phone}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <Phone className="w-4 h-4" /> Call
                                </a>
                                <a
                                    href={`mailto:${order.customer_email}?subject=Order ${order.order_number}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <Mail className="w-4 h-4" /> Email
                                </a>
                            </div>
                        </motion.div>

                        {/* Delivery Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-6 rounded-xl shadow-sm border"
                        >
                            <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                                {order.delivery_method === "pickup" ? (
                                    <MapPin className="w-5 h-5 text-primary" />
                                ) : (
                                    <Truck className="w-5 h-5 text-primary" />
                                )}
                                Delivery Details
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">Method</p>
                                    <p className="font-medium capitalize">
                                        {order.delivery_method === "pickup"
                                            ? "Pickup at IOME001 Innovation Hub"
                                            : "Delivery"}
                                    </p>
                                </div>
                                {order.delivery_location && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Location</p>
                                        <p className="font-medium capitalize">
                                            {order.delivery_location === "mombasa"
                                                ? "Within Mombasa"
                                                : "Outside Mombasa"}
                                        </p>
                                    </div>
                                )}
                                {order.delivery_address && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Address</p>
                                        <p className="font-medium">{order.delivery_address}</p>
                                    </div>
                                )}
                                <div className="pt-3 border-t">
                                    <p className="text-sm text-muted-foreground">Payment Method</p>
                                    <p className="font-medium text-green-700">{getPaymentInfo()}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Order Items */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-6 rounded-xl shadow-sm border"
                        >
                            <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" /> Order Items
                            </h2>
                            <div className="divide-y">
                                {(order.items as OrderItem[]).map((item, index) => (
                                    <div key={index} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.size && `Size: ${item.size} • `}
                                                Qty: {item.quantity} × KES {item.price.toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="font-bold">
                                            KES {(item.price * item.quantity).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 mt-4 border-t">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-primary">
                                        KES {Number(order.total_amount).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Additional Notes */}
                        {order.additional_notes && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white p-6 rounded-xl shadow-sm border"
                            >
                                <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" /> Customer Notes
                                </h2>
                                <p className="text-muted-foreground bg-gray-50 p-4 rounded-lg">
                                    {order.additional_notes}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column - Status Management */}
                    <div className="space-y-6">
                        {/* Update Status */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-6 rounded-xl shadow-sm border"
                        >
                            <h2 className="text-lg font-heading font-bold mb-4">
                                Update Status
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Order Status
                                    </label>
                                    <Select
                                        value={order.order_status}
                                        onValueChange={updateOrderStatus}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">
                                                <span className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-yellow-600" /> Pending
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="contacted">
                                                <span className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-blue-600" /> Contacted
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="confirmed">
                                                <span className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-purple-600" /> Confirmed
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="completed">
                                                <span className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Completed
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="cancelled">
                                                <span className="flex items-center gap-2">
                                                    <XCircle className="w-4 h-4 text-red-600" /> Cancelled
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Payment Status
                                    </label>
                                    <Select
                                        value={order.payment_status}
                                        onValueChange={updatePaymentStatus}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">
                                                <span className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-orange-600" /> Pending
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="paid">
                                                <span className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-green-600" /> Paid
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-6 rounded-xl shadow-sm border"
                        >
                            <h2 className="text-lg font-heading font-bold mb-4">
                                Quick Actions
                            </h2>
                            <div className="space-y-2">
                                {order.order_status === "pending" && (
                                    <Button
                                        className="w-full"
                                        onClick={() => updateOrderStatus("contacted")}
                                        disabled={isUpdating}
                                    >
                                        <Phone className="w-4 h-4" /> Mark as Contacted
                                    </Button>
                                )}
                                {order.payment_status === "pending" && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => updatePaymentStatus("paid")}
                                        disabled={isUpdating}
                                    >
                                        <DollarSign className="w-4 h-4" /> Mark as Paid
                                    </Button>
                                )}
                                {order.order_status !== "completed" &&
                                    order.order_status !== "cancelled" && (
                                        <Button
                                            variant="default"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={() => updateOrderStatus("completed")}
                                            disabled={isUpdating}
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Complete Order
                                        </Button>
                                    )}
                            </div>
                        </motion.div>

                        {/* Timeline */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white p-6 rounded-xl shadow-sm border"
                        >
                            <h2 className="text-lg font-heading font-bold mb-4">Timeline</h2>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                    <div>
                                        <p className="text-sm font-medium">Order Placed</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(order.created_at)}
                                        </p>
                                    </div>
                                </div>
                                {order.contacted_at && (
                                    <div className="flex gap-3">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <div>
                                            <p className="text-sm font-medium">Customer Contacted</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(order.contacted_at)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {order.completed_at && (
                                    <div className="flex gap-3">
                                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                                        <div>
                                            <p className="text-sm font-medium">Order Completed</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(order.completed_at)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Last Updated
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(order.updated_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminOrderDetail;
