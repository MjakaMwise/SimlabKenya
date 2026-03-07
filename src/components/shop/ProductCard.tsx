import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";

// Product images
import wallClockImg from "@/assets/products/wall-clock.jpg";
import labCoatImg from "@/assets/products/lab-coat.jpg";
import sweatshirtImg from "@/assets/products/sweatshirt.jpg";
import cardGameImg from "@/assets/products/element-fusion-game.jpg";
import calendarImg from "@/assets/products/calendar-2026.png";

// Map product names (lowercase keywords) to local images
const productImageMap: Record<string, string> = {
  "wall clock": wallClockImg,
  "clock": wallClockImg,
  "lab coat": labCoatImg,
  "labcoat": labCoatImg,
  "sweatshirt": sweatshirtImg,
  "hoodie": sweatshirtImg,
  "sweater": sweatshirtImg,
  "card game": cardGameImg,
  "element fusion": cardGameImg,
  "calendar": calendarImg,
};

// Helper to get local image based on product name
const getProductImage = (productName: string, fallbackUrl: string): string => {
  const lowerName = productName.toLowerCase();
  for (const [keyword, imgSrc] of Object.entries(productImageMap)) {
    if (lowerName.includes(keyword)) {
      return imgSrc;
    }
  }
  return fallbackUrl;
};

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  has_sizes: boolean;
  available_sizes: string[] | null;
  stock_quantity: number;
  is_available: boolean;
  image_url: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    if (product.has_sizes && !selectedSize) {
      toast({
        title: "Please select a size",
        description: "You need to choose a size before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        size: selectedSize || undefined,
        image_url: product.image_url,
      },
      quantity
    );

    setIsAdded(true);
    toast({
      title: "Added to cart!",
      description: `${quantity}x ${product.name}${selectedSize ? ` (${selectedSize})` : ""} added to your cart.`,
    });

    setTimeout(() => {
      setIsAdded(false);
      setQuantity(1);
      setSelectedSize("");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border"
    >
      {/* Image */}
      <div className="aspect-square relative bg-muted">
        <img
          src={getProductImage(product.name, product.image_url)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
          In Stock
        </span>
        <span className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
          {product.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-heading font-bold text-lg">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <p className="text-2xl font-bold text-accent">
          KES {product.price.toLocaleString()}
        </p>

        {/* Size Selector */}
        {product.has_sizes && product.available_sizes && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <div className="flex flex-wrap gap-2">
              {product.available_sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSize === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Qty:</span>
          <div className="flex items-center gap-2 bg-muted rounded-lg">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2 hover:bg-background/50 rounded-l-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="p-2 hover:bg-background/50 rounded-r-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          variant="cta"
          className="w-full"
          onClick={handleAddToCart}
          disabled={isAdded}
        >
          {isAdded ? (
            <>
              <Check className="w-4 h-4" /> Added!
            </>
          ) : (
            "Add to Cart"
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
