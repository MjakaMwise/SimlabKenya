import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartSidebar = ({ isOpen, onClose }: CartSidebarProps) => {
  const { items, removeItem, updateQuantity, getTotal, getItemCount } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-heading font-bold">Shopping Cart</h2>
                <p className="text-sm text-muted-foreground">
                  {getItemCount()} {getItemCount() === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Add some items to get started!
                  </p>
                  <Button variant="default" onClick={onClose} asChild>
                    <Link to="/shop">Continue Shopping</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.size || "default"}`}
                      className="flex gap-4 p-3 bg-muted/50 rounded-lg"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        {item.size && (
                          <p className="text-sm text-muted-foreground">
                            Size: {item.size}
                          </p>
                        )}
                        <p className="text-accent font-bold">
                          KES {item.price.toLocaleString()}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity - 1,
                                  item.size
                                )
                              }
                              className="p-1 rounded bg-background hover:bg-muted transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity + 1,
                                  item.size
                                )
                              }
                              className="p-1 rounded bg-background hover:bg-muted transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id, item.size)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t p-4 space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Subtotal</span>
                  <span className="text-accent">
                    KES {getTotal().toLocaleString()}
                  </span>
                </div>
                <div className="grid gap-2">
                  <Button
                    variant="cta"
                    size="lg"
                    className="w-full"
                    onClick={onClose}
                    asChild
                  >
                    <Link to="/checkout">Checkout</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    asChild
                  >
                    <Link to="/cart">View Cart</Link>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
