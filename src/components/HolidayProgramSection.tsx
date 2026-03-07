import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  GraduationCap,
  Calendar,
  Tag,
  CheckCircle,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HolidayProgramSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    "Hands-on workshops & experiments",
    "Innovation project development",
    "Mentorship & networking",
    "Certificate of completion",
    "Continuous project support",
    "Access to IOME001 resources",
  ];

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello SIM-Lab, I would like to register for the Holiday Innovation Program 2025. Please send me more details."
    );
    window.open(`https://wa.me/254738668529?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open("tel:+254738668529", "_self");
  };

  return (
    <section
      id="holiday"
      ref={ref}
      className="section-padding bg-primary relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-pattern-hex opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-bold mb-4">
            🎓 REGISTRATION OPEN
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            Holiday Innovation Program 2025
          </h2>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            Empowering Students through Science, Innovation, and Creativity for
            a Sustainable Future
          </p>
        </motion.div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: GraduationCap,
              label: "Target Audience",
              value: "Grade 5 to Form 4",
              subtitle: "Upper Primary & High School",
            },
            {
              icon: Calendar,
              label: "Program Period",
              value: "Nov - Dec 2025",
              subtitle: "School & Interschool Sessions",
            },
            {
              icon: Tag,
              label: "Participation Fee",
              value: "KES 1,000",
              subtitle: "per student/session",
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center"
            >
              <div className="w-14 h-14 bg-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-7 h-7 text-secondary" />
              </div>
              <p className="text-white/60 text-sm mb-1">{item.label}</p>
              <p className="text-2xl font-heading font-bold text-white mb-1">
                {item.value}
              </p>
              <p className="text-secondary text-sm">{item.subtitle}</p>
            </motion.div>
          ))}
        </div>

        {/* Features & CTA */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Features */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-2xl font-heading font-bold text-white mb-6">
              What's Included
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Box */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl p-8 shadow-2xl"
          >
            <h3 className="text-2xl font-heading font-bold text-primary mb-2">
              Register Now
            </h3>
            <p className="text-muted-foreground mb-6">
              Secure your spot in the Holiday Innovation Program 2025
            </p>

            <div className="space-y-4">
              <Button
                variant="whatsapp"
                size="lg"
                className="w-full"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="w-5 h-5" />
                Register via WhatsApp
              </Button>

              <Button
                variant="call"
                size="lg"
                className="w-full"
                onClick={handleCall}
              >
                <Phone className="w-5 h-5" />
                Call to Register
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>
                  <span className="font-semibold">Phone:</span> +254 738 668529
                </p>
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  simlabkenya@gmail.com
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HolidayProgramSection;
