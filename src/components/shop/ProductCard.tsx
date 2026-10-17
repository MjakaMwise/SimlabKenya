import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useSite } from "@/site/SiteContext";

// Pictures bundled with the site, used until an admin uploads one for the product
import wallClockImg from "@/assets/products/wall-clock.jpg";
import labCoatImg from "@/assets/products/lab-coat.jpg";
import sweatshirtImg from "@/assets/products/sweatshirt.jpg";
import cardGameImg from "@/assets/products/element-fusion-game.jpg";
import calendarImg from "@/assets/products/calendar-2026.png";

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

// An uploaded picture always wins over the bundled one
const getProductImage = (productName: string, uploadedUrl: string): string => {
  if (uploadedUrl && uploadedUrl !== "/placeholder.svg") return uploadedUrl;
  const lowerName = productName.toLowerCase();
  for (const [keyword, imgSrc] of Object.entries(productImageMap)) {
    if (lowerName.includes(keyword)) return imgSrc;
  }
  return uploadedUrl || "/placeholder.svg";
};

export interface Product {
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

const ProductCard = ({ product }: { product: Product }) => {
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useSite();
  const img = getProductImage(product.name, product.image_url);
  const soldOut = product.stock_quantity <= 0;

  const add = () => {
    if (product.has_sizes && !size) {
      toast("Choose a size before adding to the cart.");
      return;
    }
    addItem({ id: product.id, name: product.name, price: product.price, size: size || undefined, image_url: img }, quantity);
    toast(`${quantity} x ${product.name}${size ? ` (${size})` : ""} added to your cart.`);
    setQuantity(1);
    setSize("");
  };

  return (
    <article className="prod">
      <div className="pic">
        <img src={img} alt={product.name} loading="lazy" />
        <span className="tag">{product.category}</span>
        <span className="tag stock">{soldOut ? "Sold out" : "In stock"}</span>
      </div>
      <div className="pbd">
        <h3>{product.name}</h3>
        {product.description && <p style={{ color: "var(--dim)", fontSize: ".95rem" }}>{product.description}</p>}
        <div className="price">KES {product.price.toLocaleString()}</div>
        {product.has_sizes && product.available_sizes && (
          <div className="sizes" role="group" aria-label="Size">
            {product.available_sizes.map((s) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="row" style={{ alignItems: "center" }}>
          <div className="qty">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
            <span>{quantity}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>+</button>
          </div>
          <button type="button" className="btn go" disabled={soldOut} onClick={add}>Add to cart</button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
