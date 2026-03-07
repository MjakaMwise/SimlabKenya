import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

const Cart = () => {
  const { items, removeItem, updateQuantity, getTotal } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="section-padding">
          <div className="container-custom">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link to="/shop" className="hover:text-primary">Shop</Link>
              <span>/</span>
              <span className="text-foreground">Cart</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-8">
              Shopping Cart
            </h1>

            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <ShoppingBag className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold mb-2">
                  Your cart is empty
                </h2>
                <p className="text-muted-foreground mb-6">
                  Looks like you haven't added any items yet.
                </p>
                <Button variant="default" size="lg" asChild>
                  <Link to="/shop">
                    <ArrowLeft className="w-4 h-4" /> Browse Products
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${item.size || "default"}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4 p-4 bg-card rounded-xl border"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-heading font-bold">
                              {item.name}
                            </h3>
                            {item.size && (
                              <p className="text-sm text-muted-foreground">
                                Size: {item.size}
                              </p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-accent">
                            KES {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2 bg-muted rounded-lg">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1, item.size)
                              }
                              className="p-2 hover:bg-background/50 rounded-l-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1, item.size)
                              }
                              className="p-2 hover:bg-background/50 rounded-r-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id, item.size)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 text-primary hover:underline mt-4"
                  >
                    <ArrowLeft className="w-4 h-4" /> Continue Shopping
                  </Link>
                </div>

                {/* Order Summary */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card p-6 rounded-xl border h-fit sticky top-28"
                >
                  <h2 className="text-xl font-heading font-bold mb-4">
                    Order Summary
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        KES {getTotal().toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-sm">TBD (confirmed after contact)</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-accent">
                        KES {getTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Delivery fee will be confirmed when we contact you.
                  </p>

                  <Button variant="cta" size="lg" className="w-full" asChild>
                    <Link to="/checkout">Proceed to Checkout</Link>
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
