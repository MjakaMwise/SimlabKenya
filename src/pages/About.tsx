import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  FlaskConical,
  Lightbulb,
  Users,
  Target,
  Handshake,
  GraduationCap,
  Building,
  Award,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import activityImage from "@/assets/activity-2.jpeg";
import heroImage from "@/assets/hero-2.jpeg";

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: FlaskConical,
      title: "Hands-On Learning",
      description: "Practical experiments that bring science to life",
    },
    {
      icon: Lightbulb,
      title: "Innovation Focus",
      description: "Developing creative solutions to real-world problems",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Connecting science to everyday life challenges",
    },
    {
      icon: Target,
      title: "SDG 4 Aligned",
      description: "Contributing to quality education goals",
    },
  ];

  const whyChooseUs = [
    {
      icon: FlaskConical,
      title: "Practical Training",
      description: "Hands-on, practical training sessions that go beyond theory",
    },
    {
      icon: Users,
      title: "Community-Centered",
      description: "Community-centered approach with real-life applications",
    },
    {
      icon: Lightbulb,
      title: "Innovation Support",
      description: "Support for innovation, creativity, and entrepreneurship",
    },
    {
      icon: Handshake,
      title: "Strong Partnerships",
      description: "Strong partnerships with schools, researchers, and organizations",
    },
    {
      icon: GraduationCap,
      title: "Collaborative Projects",
      description: "Collaborative research projects and STEM outreach programs",
    },
    {
      icon: Award,
      title: "Continuous Mentorship",
      description: "Ongoing mentorship and support beyond program completion",
    },
  ];

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          title="About SIM-Lab Kenya"
          subtitle="Science in Motion - Transforming Education Through Innovation"
          backgroundImage={heroImage}
        />

        {/* Who We Are Section */}
        <section ref={ref} className="section-padding bg-white">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">
                  Who We Are
                </h2>
                <p className="text-lg text-foreground leading-relaxed mb-6">
                  <span className="font-semibold text-primary">SIM-Lab</span> is
                  a science-based innovation lab dedicated to bridging the gap
                  between classroom learning and real-world application.
                  Incubated under{" "}
                  <span className="font-semibold">IOME001 Innovation Hub</span>,
                  we offer broad, multidisciplinary exposure across different
                  fields, fusing academic knowledge with practical,
                  community-centered solutions.
                </p>
                <p className="text-lg text-foreground leading-relaxed mb-8">
                  We empower individuals, schools, and organizations by making
                  science and technology relatable to everyday life challenges,
                  encouraging students to think critically and innovatively. Our
                  mission is to transform classroom concepts into practical
                  skills, driving creativity, innovation, and sustainable
                  development within communities.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                      className="flex items-start gap-3 p-4 bg-muted rounded-xl"
                    >
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <feature.icon className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary text-sm">
                          {feature.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Image */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={activityImage}
                    alt="SIM-Lab presentation"
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                </div>

                {/* Floating Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={isInView ? { scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.6, type: "spring" }}
                  className="absolute -bottom-6 -left-6 bg-accent text-accent-foreground px-6 py-4 rounded-xl shadow-xl"
                >
                  <div className="text-2xl font-heading font-bold">Mombasa</div>
                  <div className="text-sm opacity-80">IOME001 Innovation Hub</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="section-padding bg-secondary/10">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">
                Our Vision
              </h2>
              <p className="text-xl text-foreground max-w-3xl mx-auto leading-relaxed">
                "To inspire and empower a new generation of science-minded
                individuals who will drive innovation, research, and sustainable
                development in Kenya and beyond."
              </p>
            </motion.div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Why Choose SIM-Lab?
              </h2>
              <div className="dotted-separator" />
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {whyChooseUs.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-6 bg-muted rounded-xl"
                >
                  <div className="p-3 bg-primary rounded-xl">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* IOME001 Partnership */}
        <section className="section-padding bg-muted">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <Building className="w-16 h-16 text-secondary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Proud Partner of IOME001 Innovation Hub
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                SIM-Lab operates within the IOME001 Innovation Hub in Mombasa,
                Kenya. Our facility provides students with access to modern
                equipment, collaborative workspaces, and a creative environment
                designed to foster innovation and hands-on learning.
              </p>
              <Button variant="cta" size="lg" asChild>
                <Link to="/contact">Partner With Us</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                Ready to Start Your Innovation Journey?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button variant="cta" size="lg" asChild>
                  <Link to="/programs">View Programs</Link>
                </Button>
                <Button variant="hero-outline" size="lg" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default About;