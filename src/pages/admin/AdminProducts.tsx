import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Loader2,
    Edit2,
    Trash2,
    Package,
    Check,
    X,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string;
    has_sizes: boolean;
    available_sizes: string[] | null;
    stock_quantity: number;
    is_available: boolean;
    image_url: string | null;
}

const defaultProduct: Omit<Product, "id"> = {
    name: "",
    description: "",
    price: 0,
    category: "",
    has_sizes: false,
    available_sizes: null,
    stock_quantity: 100,
    is_available: true,
    image_url: "/placeholder.svg",
};

const AdminProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Omit<Product, "id">>(defaultProduct);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description || "",
                price: product.price,
                category: product.category,
                has_sizes: product.has_sizes,
                available_sizes: product.available_sizes,
                stock_quantity: product.stock_quantity,
                is_available: product.is_available,
                image_url: product.image_url,
            });
        } else {
            setEditingProduct(null);
            setFormData(defaultProduct);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingProduct(null);
        setFormData(defaultProduct);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.category) {
            toast({
                title: "Validation Error",
                description: "Name and category are required",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);

        try {
            const productData = {
                ...formData,
                available_sizes: formData.has_sizes
                    ? formData.available_sizes || ["S", "M", "L", "XL", "XXL"]
                    : null,
            };

            if (editingProduct) {
                // Update existing product
                const { error } = await supabase
                    .from("products")
                    .update(productData)
                    .eq("id", editingProduct.id);

                if (error) throw error;

                toast({
                    title: "Product updated",
                    description: `${formData.name} has been updated.`,
                });
            } else {
                // Create new product
                const { error } = await supabase.from("products").insert(productData);

                if (error) throw error;

                toast({
                    title: "Product created",
                    description: `${formData.name} has been added.`,
                });
            }

            fetchProducts();
            handleCloseDialog();
        } catch (error) {
            console.error("Error saving product:", error);
            toast({
                title: "Error",
                description: "Failed to save product",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", product.id);

            if (error) throw error;

            toast({
                title: "Product deleted",
                description: `${product.name} has been removed.`,
            });

            fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
            toast({
                title: "Error",
                description: "Failed to delete product",
                variant: "destructive",
            });
        }
    };

    const toggleAvailability = async (product: Product) => {
        try {
            const { error } = await supabase
                .from("products")
                .update({ is_available: !product.is_available })
                .eq("id", product.id);

            if (error) throw error;

            setProducts((prev) =>
                prev.map((p) =>
                    p.id === product.id ? { ...p, is_available: !p.is_available } : p
                )
            );

            toast({
                title: product.is_available ? "Product hidden" : "Product visible",
                description: `${product.name} is now ${product.is_available ? "hidden from" : "visible in"} the shop.`,
            });
        } catch (error) {
            console.error("Error toggling availability:", error);
        }
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-gray-900">
                            Products
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your shop products
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="w-4 h-4" /> Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingProduct ? "Edit Product" : "Add New Product"}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Product Name *</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            placeholder="e.g., SIM-Lab T-Shirt"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category *</Label>
                                        <Input
                                            value={formData.category}
                                            onChange={(e) =>
                                                setFormData({ ...formData, category: e.target.value })
                                            }
                                            placeholder="e.g., Merchandise"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={formData.description || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        placeholder="Product description..."
                                        rows={3}
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Price (KES) *</Label>
                                        <Input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) =>
                                                setFormData({ ...formData, price: Number(e.target.value) })
                                            }
                                            min={0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stock Quantity</Label>
                                        <Input
                                            type="number"
                                            value={formData.stock_quantity}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    stock_quantity: Number(e.target.value),
                                                })
                                            }
                                            min={0}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Image URL</Label>
                                    <Input
                                        value={formData.image_url || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, image_url: e.target.value })
                                        }
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="has_sizes"
                                            checked={formData.has_sizes}
                                            onCheckedChange={(checked) =>
                                                setFormData({ ...formData, has_sizes: !!checked })
                                            }
                                        />
                                        <Label htmlFor="has_sizes">Has Size Options</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="is_available"
                                            checked={formData.is_available}
                                            onCheckedChange={(checked) =>
                                                setFormData({ ...formData, is_available: !!checked })
                                            }
                                        />
                                        <Label htmlFor="is_available">Available in Shop</Label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={handleCloseDialog}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                            </>
                                        ) : editingProduct ? (
                                            "Update Product"
                                        ) : (
                                            "Create Product"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Products Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {products.length === 0 ? (
                        <div className="col-span-full bg-white p-12 rounded-xl shadow-sm border text-center">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No products yet</p>
                            <Button className="mt-4" onClick={() => handleOpenDialog()}>
                                <Plus className="w-4 h-4" /> Add First Product
                            </Button>
                        </div>
                    ) : (
                        products.map((product) => (
                            <div
                                key={product.id}
                                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${!product.is_available ? "opacity-60" : ""
                                    }`}
                            >
                                <div className="aspect-video relative bg-gray-100">
                                    <img
                                        src={product.image_url || "/placeholder.svg"}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {!product.is_available && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                Hidden
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-heading font-bold">{product.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {product.category}
                                            </p>
                                        </div>
                                        <p className="text-lg font-bold text-primary">
                                            KES {product.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                        {product.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        {product.has_sizes && (
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                Has Sizes
                                            </span>
                                        )}
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            Stock: {product.stock_quantity}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleOpenDialog(product)}
                                        >
                                            <Edit2 className="w-4 h-4" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleAvailability(product)}
                                        >
                                            {product.is_available ? (
                                                <X className="w-4 h-4" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(product)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
};

export default AdminProducts;
