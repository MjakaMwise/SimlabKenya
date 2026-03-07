import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Phone, MessageCircle, Mail, ArrowRight, Home } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order") || "N/A";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="section-padding">
          <div className="container-custom max-w-2xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-accent" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Order Placed Successfully!
              </h1>

              <div className="bg-muted px-6 py-4 rounded-xl inline-block mb-6">
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-2xl font-bold font-mono text-primary">{orderNumber}</p>
              </div>

              <p className="text-lg text-muted-foreground mb-8">
                Thank you for your order! We've received your request and will contact you within 24 hours to confirm availability and arrange payment.
              </p>
            </motion.div>

            {/* What Happens Next */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card p-6 rounded-xl border text-left mb-8"
            >
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                What Happens Next?
              </h2>
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
                  <p>We'll contact you within 24 hours to confirm your order</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
                  <p>We'll verify product availability and confirm the final price</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
                  <p>We'll arrange payment and delivery/pickup details</p>
                </li>
              </ol>
            </motion.div>

            {/* Contact Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-muted p-6 rounded-xl mb-8"
            >
              <h2 className="text-lg font-heading font-bold mb-4">Need Help?</h2>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://wa.me/254727054994"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <a
                  href="tel:+254727054994"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +254 727 054 994
                </a>
                <a
                  href="mailto:simlabkenya@gmail.com"
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Us
                </a>
              </div>
            </motion.div>

            {/* Navigation Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button variant="default" size="lg" asChild>
                <Link to="/shop">
                  Continue Shopping <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/">
                  <Home className="w-4 h-4" /> Back to Home
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation;
