import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

const Footer = () => {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello SIM-Lab, I would like to learn more about your programs."
    );
    window.open(`https://wa.me/254738668529?text=${message}`, "_blank");
  };

  const socialLinks = [
    { icon: Facebook, href: "https://www.facebook.com/A22labs/", label: "Facebook" },
    { icon: Instagram, href: "https://www.instagram.com/simlabkenya/", label: "Instagram" },
    { icon: Twitter, href: "https://x.com/Simlabkenya", label: "Twitter" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/simlab-kenya-aa0a023a9/", label: "LinkedIn" },
    { icon: Youtube, href: "https://www.youtube.com/@SIMLABKENYA", label: "YouTube" },
  ];

  const quickLinks = [
    { label: "About Us", href: "/about" },
    { label: "Programs", href: "/programs" },
    { label: "Holiday Program", href: "/holiday-program" },
    { label: "Gallery", href: "/gallery" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer className="section-padding bg-primary text-white">
      <div className="container-custom">
        {/* Footer Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-6">
              <img
                src={logo}
                alt="SIM-Lab Kenya"
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h3 className="text-2xl font-heading font-bold">SIM-Lab Kenya</h3>
                <p className="text-secondary">Science in Motion</p>
              </div>
            </div>

            <p className="text-white/80 mb-6 leading-relaxed">
              Transforming classroom concepts into practical skills, driving
              creativity, innovation, and sustainable development within
              communities.
            </p>

            <div className="space-y-4">
              <a
                href="mailto:simlabkenya@gmail.com"
                className="flex items-center gap-3 text-white/80 hover:text-accent transition-colors"
              >
                <Mail size={20} />
                simlabkenya@gmail.com
              </a>
              <a
                href="tel:+254738668529"
                className="flex items-center gap-3 text-white/80 hover:text-accent transition-colors"
              >
                <Phone size={20} />
                +254 738 668529
              </a>
              <a
                href="tel:+254118636095"
                className="flex items-center gap-3 text-white/80 hover:text-accent transition-colors"
              >
                <Phone size={20} />
                +254 118 636095
              </a>
              <div className="flex items-start gap-3 text-white/80">
                <MapPin size={20} className="flex-shrink-0 mt-1" />
                <span>IOME001 Innovation Hub, Mombasa, Kenya</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-heading font-bold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-lg font-heading font-bold mb-4">Connect With Us</h4>
            <Button
              variant="whatsapp"
              size="lg"
              className="w-full mb-6"
              onClick={handleWhatsApp}
            >
              <MessageCircle size={20} />
              Chat on WhatsApp
            </Button>

            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/20 text-center">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} SIM-Lab Kenya. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
