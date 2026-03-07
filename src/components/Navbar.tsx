import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartIcon from "@/components/shop/CartIcon";
import CartSidebar from "@/components/shop/CartSidebar";
import logo from "@/assets/logo.jpeg";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Programs", href: "/programs" },
  { label: "Shop", href: "/shop" },
  { label: "Gallery", href: "/gallery" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const shouldShowWhiteText = isHomePage && !isScrolled;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled || !isHomePage
          ? "bg-white/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container-custom">
        <nav className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="SIM-Lab Kenya"
              className="h-12 w-12 object-contain rounded-full"
            />
            <div className="hidden sm:block">
              <span
                className={`font-heading font-bold text-xl ${
                  shouldShowWhiteText ? "text-white" : "text-primary"
                }`}
              >
                SIM-Lab
              </span>
              <p
                className={`text-xs tracking-wider ${
                  shouldShowWhiteText ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                SCIENCE IN MOTION
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    item.highlight
                      ? "bg-accent/20 text-accent hover:bg-accent hover:text-accent-foreground"
                      : isActive
                      ? shouldShowWhiteText
                        ? "text-accent bg-white/10"
                        : "text-primary bg-muted"
                      : shouldShowWhiteText
                      ? "text-white hover:text-accent hover:bg-white/10"
                      : "text-foreground hover:text-primary hover:bg-muted"
                  }`}
                >
                  {item.label}
                  {item.highlight && (
                    <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* CTA Button & Cart */}
          <div className="hidden lg:flex items-center gap-4">
            <CartIcon 
              onClick={() => setIsCartOpen(true)} 
              className={shouldShowWhiteText ? "text-white" : "text-foreground"}
            />
            <Button variant="cta" asChild>
              <Link to="/abstract">Register Now</Link>
            </Button>
          </div>

          {/* Mobile Cart & Menu */}
          <div className="lg:hidden flex items-center gap-2">
            <CartIcon 
              onClick={() => setIsCartOpen(true)} 
              className={shouldShowWhiteText ? "text-white" : "text-foreground"}
            />
            {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg ${
              shouldShowWhiteText ? "text-white" : "text-foreground"
            }`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white border-t"
          >
            <div className="container-custom py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "bg-muted text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                    {item.highlight && (
                      <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
              <div className="pt-4">
                <Button variant="cta" className="w-full" asChild>
                  <Link to="/abstract">Register Now</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </motion.header>
  );
};

export default Navbar;
