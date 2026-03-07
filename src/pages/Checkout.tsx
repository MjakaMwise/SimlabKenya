import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, MapPin, Truck, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(20),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryLocation: z.string().optional(),
  deliveryAddress: z.string().max(500).optional(),
  additionalNotes: z.string().max(300).optional(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});

  const [formData, setFormData] = useState<CheckoutFormData>({
    name: "",
    email: "",
    phone: "",
    deliveryMethod: "pickup",
    deliveryLocation: "",
    deliveryAddress: "",
    additionalNotes: "",
    termsAccepted: false as unknown as true,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (items.length === 0) {
      navigate("/shop");
    }
  }, [items.length, navigate]);

  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 900) + 100;
    return `ORD-${dateStr}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as keyof CheckoutFormData;
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      toast({
        title: "Please fix the errors",
        description: "Some fields need your attention.",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for delivery
    if (formData.deliveryMethod === "delivery") {
      if (!formData.deliveryLocation) {
        setErrors({ deliveryLocation: "Please select a location" });
        return;
      }
      if (!formData.deliveryAddress?.trim()) {
        setErrors({ deliveryAddress: "Please enter your delivery address" });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      const orderItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
      }));

      const { error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        customer_name: formData.name.trim(),
        customer_email: formData.email.trim(),
        customer_phone: formData.phone.trim(),
        delivery_method: formData.deliveryMethod,
        delivery_location: formData.deliveryLocation || null,
        delivery_address: formData.deliveryAddress?.trim() || null,
        items: orderItems,
        total_amount: getTotal(),
        additional_notes: formData.additionalNotes?.trim() || null,
      });

      if (error) throw error;

      // Send email notifications (don't block order completion if email fails)
      try {
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber,
            customerName: formData.name.trim(),
            customerEmail: formData.email.trim(),
            customerPhone: formData.phone.trim(),
            deliveryMethod: formData.deliveryMethod,
            deliveryLocation: formData.deliveryLocation || undefined,
            deliveryAddress: formData.deliveryAddress?.trim() || undefined,
            items: orderItems,
            totalAmount: getTotal(),
            additionalNotes: formData.additionalNotes?.trim() || undefined,
          }),
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Continue with order - emails are not critical
      }

      clearCart();
      navigate(`/order-confirmation?order=${orderNumber}`);
    } catch (error) {
      console.error("Order error:", error);
      toast({
        title: "Order failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="section-padding">
          <div className="container-custom max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link to="/shop" className="hover:text-primary">Shop</Link>
              <span>/</span>
              <Link to="/cart" className="hover:text-primary">Cart</Link>
              <span>/</span>
              <span className="text-foreground">Checkout</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-8">
              Checkout
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-xl border space-y-4"
              >
                <h2 className="text-xl font-heading font-bold">Contact Information</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="John Doe"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@example.com"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+254 712 345 678"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </motion.div>

              {/* Delivery Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card p-6 rounded-xl border space-y-4"
              >
                <h2 className="text-xl font-heading font-bold">Delivery Details</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange("deliveryMethod", "pickup")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.deliveryMethod === "pickup"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-bold">Pickup at IOME001 Hub</p>
                        <p className="text-sm text-muted-foreground">Free - Pay on collection</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange("deliveryMethod", "delivery")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.deliveryMethod === "delivery"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-bold">Delivery to my address</p>
                        <p className="text-sm text-muted-foreground">Fee determined after contact</p>
                      </div>
                    </div>
                  </button>
                </div>

                {formData.deliveryMethod === "delivery" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 pt-4 border-t"
                  >
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <div className="grid md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleInputChange("deliveryLocation", "mombasa")}
                          className={`p-3 rounded-lg border text-left ${formData.deliveryLocation === "mombasa"
                              ? "border-primary bg-primary/5"
                              : "border-border"
                            }`}
                        >
                          <p className="font-medium">Within Mombasa</p>
                          <p className="text-sm text-muted-foreground">Pay on Delivery</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange("deliveryLocation", "outside")}
                          className={`p-3 rounded-lg border text-left ${formData.deliveryLocation === "outside"
                              ? "border-primary bg-primary/5"
                              : "border-border"
                            }`}
                        >
                          <p className="font-medium">Outside Mombasa</p>
                          <p className="text-sm text-muted-foreground">Payment before shipping</p>
                        </button>
                      </div>
                      {errors.deliveryLocation && (
                        <p className="text-sm text-destructive">{errors.deliveryLocation}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Delivery Address *</Label>
                      <Textarea
                        id="address"
                        value={formData.deliveryAddress}
                        onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
                        placeholder="Enter your complete delivery address including landmarks..."
                        rows={3}
                        maxLength={500}
                        className={errors.deliveryAddress ? "border-destructive" : ""}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.deliveryAddress?.length || 0}/500
                      </p>
                      {errors.deliveryAddress && (
                        <p className="text-sm text-destructive">{errors.deliveryAddress}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Additional Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card p-6 rounded-xl border space-y-4"
              >
                <h2 className="text-xl font-heading font-bold">Additional Information</h2>
                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                    placeholder="Any special requests or notes for your order..."
                    rows={2}
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.additionalNotes?.length || 0}/300
                  </p>
                </div>
              </motion.div>

              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card p-6 rounded-xl border space-y-4"
              >
                <h2 className="text-xl font-heading font-bold">Order Summary</h2>

                <div className="divide-y">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="py-3 flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size} • `}Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>KES {getTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-sm">TBD - will be confirmed</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-accent">KES {getTotal().toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Payment Information</h3>
                  {formData.deliveryMethod === "pickup" ? (
                    <p className="text-sm text-muted-foreground">
                      Pay when you collect your order at IOME001 Innovation Hub (Cash or M-Pesa).
                    </p>
                  ) : formData.deliveryLocation === "mombasa" ? (
                    <p className="text-sm text-muted-foreground">
                      Pay on delivery - Cash or M-Pesa accepted.
                    </p>
                  ) : formData.deliveryLocation === "outside" ? (
                    <p className="text-sm text-muted-foreground">
                      Payment required before shipping. We'll contact you with M-Pesa/Bank details.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a delivery option to see payment details.
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Terms & Submit */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleInputChange("termsAccepted", !!checked)}
                    className={errors.termsAccepted ? "border-destructive" : ""}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <a href="#" className="text-primary hover:underline">terms and conditions</a>
                    {" "}and{" "}
                    <a href="#" className="text-primary hover:underline">privacy policy</a>
                  </Label>
                </div>
                {errors.termsAccepted && (
                  <p className="text-sm text-destructive">{errors.termsAccepted}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" asChild className="sm:w-auto">
                    <Link to="/cart">
                      <ArrowLeft className="w-4 h-4" /> Back to Cart
                    </Link>
                  </Button>
                  <Button
                    type="submit"
                    variant="cta"
                    size="lg"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Placing Order...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Place Order
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
