import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
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

const ContactSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello SIM-Lab, I would like to learn more about your programs."
    );
    window.open(`https://wa.me/254738668529?text=${message}`, "_blank");
  };

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <section id="contact" ref={ref} className="section-padding bg-primary text-white">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Get In Touch
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Ready to start your innovation journey? Contact us today!
          </p>
        </motion.div>

        {/* Contact Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
          >
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
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="text-lg font-heading font-bold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["About Us", "Programs", "Holiday Program", "Gallery", "FAQ"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase().replace(" ", "")}`}
                      className="text-white/70 hover:text-accent transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </motion.div>

          {/* Connect */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
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
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-white/20 text-center"
        >
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} SIM-Lab Kenya. All rights reserved.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;