import { motion } from "framer-motion";
import {
  GraduationCap,
  Calendar,
  Tag,
  CheckCircle,
  MessageCircle,
  Phone,
  Mail,
  Target,
  Users,
  Award,
  BookOpen,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-1.jpeg";

const HolidayProgram = () => {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello SIM-Lab, I would like to register for the Holiday Innovation Program 2025. Please send me more details."
    );
    window.open(`https://wa.me/254738668529?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open("tel:+254738668529", "_self");
  };

  const handleEmail = () => {
    window.open(
      "mailto:simlabkenya@gmail.com?subject=Holiday Program Registration Inquiry",
      "_self"
    );
  };

  const features = [
    "Hands-on workshops & experiments",
    "Innovation project development",
    "Mentorship & networking",
    "Certificate of completion",
    "Continuous project support",
    "Access to IOME001 resources",
  ];

  const objectives = [
    "Nurture innovative thinking and curiosity",
    "Equip students with practical STEM and green innovation skills",
    "Guide learners in developing personal or group innovation projects",
    "Provide continuous mentorship and follow-up",
    "Strengthen engagement with experiential and sustainable learning",
  ];

  const outcomes = [
    "Develop and present original science-based innovation projects",
    "Understand application of science to real-life challenges",
    "Demonstrate improved creativity, teamwork, and communication skills",
    "Gain mentorship connections through SIM-Lab and IOME001",
    "Continue developing projects under guided follow-up and incubation",
    "Receive Certificate of Participation/Completion",
    "Portfolio of innovation work",
  ];

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          title="Holiday Innovation Program 2025"
          subtitle="Empowering Students through Science, Innovation, and Creativity for a Sustainable Future"
          backgroundImage={heroImage}
        />

        {/* Quick Info Cards */}
        <section className="py-12 bg-primary relative">
          <div className="container-custom">
            <div className="grid md:grid-cols-3 gap-6 -mt-24 relative z-10">
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
                  value:  "April 2025",
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
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 text-center shadow-xl"
                >
                  <div className="w-14 h-14 bg-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-secondary" />
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">
                    {item.label}
                  </p>
                  <p className="text-2xl font-heading font-bold text-primary mb-1">
                    {item.value}
                  </p>
                  <p className="text-secondary text-sm">{item.subtitle}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why This Program */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Why Holiday Innovation Program?
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Many students understand science conceptually but rarely
                experience its real-world relevance. This program fills that gap
                by:
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: BookOpen,
                  title: "Hands-on Learning",
                  description:
                    "Encouraging creativity and innovation through practical experiments",
                },
                {
                  icon: Target,
                  title: "Problem Solving",
                  description: "Building critical problem-solving skills",
                },
                {
                  icon: GraduationCap,
                  title: "Environmental Awareness",
                  description:
                    "Introducing sustainability and environmental consciousness",
                },
                {
                  icon: Users,
                  title: "Practical STEM",
                  description: "Providing practical STEM approaches",
                },
                {
                  icon: Award,
                  title: "Continuous Mentorship",
                  description:
                    "Offering ongoing guidance beyond the holiday period",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-6 bg-muted rounded-xl"
                >
                  <div className="p-3 bg-accent rounded-xl">
                    <item.icon className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Program Goals */}
        <section className="section-padding bg-secondary/10">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                  Program Goals & Objectives
                </h2>
                <p className="text-lg text-primary font-medium mb-6">
                  "To inspire and empower students to apply science and
                  creativity in solving community and environmental challenges."
                </p>
                <div className="space-y-4">
                  {objectives.map((objective, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="text-foreground">{objective}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h3 className="text-2xl font-heading font-bold text-primary mb-6">
                  What Students Will Achieve
                </h3>
                <div className="space-y-3">
                  {outcomes.map((outcome, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{outcome}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* What's Included & Registration */}
        <section className="section-padding bg-primary">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Features */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h3 className="text-2xl font-heading font-bold text-white mb-6">
                  What's Included
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
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
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
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

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={handleEmail}
                  >
                    <Mail className="w-5 h-5" />
                    Email Registration
                  </Button>

                  <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                    <p>
                      <span className="font-semibold">Phone:</span> +254 738
                      668529 / +254 118 636095
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

        {/* Beyond the Holiday */}
        <section className="section-padding bg-white">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Beyond the Holiday
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Our commitment doesn't end when the program does. SIM-Lab
                provides continuous mentorship, annual follow-up sessions,
                teacher training for curriculum integration, and long-term
                partnership opportunities.
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default HolidayProgram;
