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
    ImagePlus,
    Store,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
    images: string[];
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
    image_url: null,
    images: [],
};

const AdminProducts = () => {
    const { token } = useAdminAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Omit<Product, "id">>(defaultProduct);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [shopEnabled, setShopEnabled] = useState<boolean | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (token) fetchProducts();
    }, [token]);

    useEffect(() => {
        fetch("/api/settings")
            .then((r) => r.json())
            .then((d) => setShopEnabled(!!d.shop_enabled))
            .catch(() => setShopEnabled(false));
    }, []);

    const toggleShop = async (next: boolean) => {
        setShopEnabled(next);
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({ shop_enabled: next }),
            });
            if (!res.ok) throw new Error();
            toast({
                title: next ? "Shop is ON" : "Shop is OFF",
                description: next
                    ? "Visitors can now see products and place orders."
                    : "The Shop is hidden from the website and orders are blocked.",
            });
        } catch {
            setShopEnabled(!next);
            toast({ title: "Error", description: "Could not change the shop setting", variant: "destructive" });
        }
    };

    // Upload picked pictures to the media store and add them to this product's gallery
    const handleImageFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        setIsUploading(true);
        try {
            const body = new FormData();
            Array.from(files).forEach((f) => body.append("images", f));
            const res = await fetch("/api/products/upload-image", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Upload failed");
            setFormData((f) => {
                const images = [...f.images, ...data.urls].slice(0, 10);
                return { ...f, images, image_url: f.image_url || images[0] || null };
            });
        } catch (error) {
            toast({
                title: "Upload failed",
                description: error instanceof Error ? error.message : "Could not upload the image",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (url: string) =>
        setFormData((f) => {
            const images = f.images.filter((i) => i !== url);
            return { ...f, images, image_url: f.image_url === url ? images[0] ?? null : f.image_url };
        });

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    });

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch products");
            setProducts(await res.json());
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
                images: product.images ?? [],
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
                const res = await fetch(`/api/products/${editingProduct.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(productData),
                });
                if (!res.ok) throw new Error("Failed to update product");

                toast({
                    title: "Product updated",
                    description: `${formData.name} has been updated.`,
                });
            } else {
                const res = await fetch("/api/products", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(productData),
                });
                if (!res.ok) throw new Error("Failed to create product");

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
            const res = await fetch(`/api/products/${product.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to delete product");

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
            const res = await fetch(`/api/products/${product.id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ ...product, is_available: !product.is_available }),
            });
            if (!res.ok) throw new Error("Failed to update product");

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
                                    <Label>Product Images</Label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {formData.images.map((url) => (
                                            <div key={url} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                {formData.image_url === url ? (
                                                    <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Cover</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, image_url: url })}
                                                        className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded"
                                                    >
                                                        Set cover
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(url)}
                                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                                                    aria-label="Remove image"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground cursor-pointer hover:bg-gray-50">
                                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                            {isUploading ? "Uploading..." : "Add images"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                disabled={isUploading}
                                                onChange={(e) => {
                                                    handleImageFiles(e.target.files);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Up to 10 pictures, 8MB each. The cover picture shows in the shop.</p>
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

                {/* Shop on/off */}
                <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Store className="w-6 h-6 text-primary" />
                        <div>
                            <p className="font-medium">Shop is {shopEnabled ? "ON" : "OFF"}</p>
                            <p className="text-sm text-muted-foreground">
                                {shopEnabled
                                    ? "Visitors can see products and place orders."
                                    : "The Shop is hidden from the website and orders are blocked."}
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={!!shopEnabled}
                        disabled={shopEnabled === null}
                        onCheckedChange={toggleShop}
                        aria-label="Turn the shop on or off"
                    />
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
