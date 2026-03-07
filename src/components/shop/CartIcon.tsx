import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface CartIconProps {
  onClick: () => void;
  className?: string;
}

const CartIcon = ({ onClick, className = "" }: CartIconProps) => {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-colors hover:bg-muted ${className}`}
      aria-label="Shopping cart"
    >
      <ShoppingCart className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
};

export default CartIcon;
