import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { PageHead } from "@/site/ui";
import { useSite } from "@/site/SiteContext";
import { useCart } from "@/hooks/useCart";

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
  const { toast } = useSite();
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
    if (items.length === 0) {
      navigate("/shop");
    }
  }, [items.length, navigate]);

  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
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
      toast("Some fields need your attention.");
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
      const orderItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: formData.name.trim(),
          customer_email: formData.email.trim(),
          customer_phone: formData.phone.trim(),
          delivery_method: formData.deliveryMethod,
          delivery_location: formData.deliveryLocation || undefined,
          delivery_address: formData.deliveryAddress?.trim() || undefined,
          items: orderItems,
          total_amount: getTotal(),
          additional_notes: formData.additionalNotes?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to place order");
      }

      const order = await res.json();
      clearCart();
      navigate(`/order-confirmation?order=${order.order_number}`);
    } catch (error) {
      console.error("Order error:", error);
      toast(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  const err = (k: keyof CheckoutFormData) => errors[k] && <span className="err">{errors[k]}</span>;
  const pay =
    formData.deliveryMethod === "pickup"
      ? "Pay when you collect your order at IOME001 Innovation Hub (cash or M-Pesa)."
      : formData.deliveryLocation === "mombasa"
      ? "Pay on delivery. Cash or M-Pesa accepted."
      : formData.deliveryLocation === "outside"
      ? "Payment is required before shipping. We'll contact you with M-Pesa or bank details."
      : "Select a delivery option to see payment details.";

  return (
    <>
      <PageHead title="Checkout" sub="Tell us where to reach you and how you'd like to receive your order." />
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <div className="crumbs"><Link to="/">Home</Link>/<Link to="/shop">Shop</Link>/<Link to="/cart">Cart</Link>/<span>Checkout</span></div>
          <form onSubmit={handleSubmit} noValidate style={{ gap: 24 }}>
            <div className="sec-card">
              <h2>Contact Information</h2>
              <div className="two">
                <label htmlFor="name">Full Name *
                  <input type="text" id="name" autoComplete="name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="John Doe" />
                  {err("name")}
                </label>
                <label htmlFor="email">Email Address *
                  <input type="email" id="email" autoComplete="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="john@example.com" />
                  {err("email")}
                </label>
              </div>
              <label htmlFor="phone">Phone Number *
                <input type="tel" id="phone" autoComplete="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} placeholder="+254 712 345 678" />
                {err("phone")}
              </label>
            </div>

            <div className="sec-card">
              <h2>Delivery Details</h2>
              <div className="opts">
                <button type="button" className="opt" aria-pressed={formData.deliveryMethod === "pickup"} onClick={() => handleInputChange("deliveryMethod", "pickup")}>
                  <b>Pickup at IOME001 Hub</b><small>Free. Pay on collection.</small>
                </button>
                <button type="button" className="opt" aria-pressed={formData.deliveryMethod === "delivery"} onClick={() => handleInputChange("deliveryMethod", "delivery")}>
                  <b>Delivery to my address</b><small>Fee confirmed after contact.</small>
                </button>
              </div>
              {formData.deliveryMethod === "delivery" && (
                <>
                  <div className="opts">
                    <button type="button" className="opt" aria-pressed={formData.deliveryLocation === "mombasa"} onClick={() => handleInputChange("deliveryLocation", "mombasa")}>
                      <b>Within Mombasa</b><small>Pay on delivery</small>
                    </button>
                    <button type="button" className="opt" aria-pressed={formData.deliveryLocation === "outside"} onClick={() => handleInputChange("deliveryLocation", "outside")}>
                      <b>Outside Mombasa</b><small>Payment before shipping</small>
                    </button>
                  </div>
                  {err("deliveryLocation")}
                  <label htmlFor="address">Delivery Address *
                    <textarea id="address" rows={3} maxLength={500} value={formData.deliveryAddress} onChange={(e) => handleInputChange("deliveryAddress", e.target.value)} placeholder="Full address including landmarks" style={{ minHeight: 90 }} />
                    <span className="hint">{formData.deliveryAddress?.length || 0}/500</span>
                    {err("deliveryAddress")}
                  </label>
                </>
              )}
            </div>

            <div className="sec-card">
              <h2>Additional Information</h2>
              <label htmlFor="notes">Special instructions (optional)
                <textarea id="notes" maxLength={300} value={formData.additionalNotes} onChange={(e) => handleInputChange("additionalNotes", e.target.value)} placeholder="Any special requests for your order" style={{ minHeight: 80 }} />
                <span className="hint">{formData.additionalNotes?.length || 0}/300</span>
              </label>
            </div>

            <div className="sec-card">
              <h2>Order Summary</h2>
              <div>
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="crow" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <div>
                      <b>{item.name}</b>
                      <p className="hint">{item.size && `Size: ${item.size} · `}Qty: {item.quantity}</p>
                    </div>
                    <b>KES {(item.price * item.quantity).toLocaleString()}</b>
                  </div>
                ))}
              </div>
              <div className="sum" style={{ position: "static", border: 0, padding: 0 }}>
                <div className="ln"><span>Subtotal</span><span>KES {getTotal().toLocaleString()}</span></div>
                <div className="ln"><span>Delivery</span><span>Confirmed after contact</span></div>
                <div className="ln tot"><span>Total</span><span>KES {getTotal().toLocaleString()}</span></div>
              </div>
              <p className="note"><b>Payment:</b> {pay}</p>
            </div>

            <label className="chkrow" htmlFor="terms" style={{ display: "flex" }}>
              <input type="checkbox" id="terms" checked={!!formData.termsAccepted} onChange={(e) => handleInputChange("termsAccepted", e.target.checked)} />
              <span>I agree to the terms and conditions and privacy policy.</span>
            </label>
            {err("termsAccepted")}

            <div className="row">
              <Link className="btn out" to="/cart">Back to cart</Link>
              <button className="btn go xl" type="submit" disabled={isSubmitting}>{isSubmitting ? "Placing order..." : "Place order"}</button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default Checkout;
