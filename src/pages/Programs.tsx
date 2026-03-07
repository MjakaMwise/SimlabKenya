import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FlaskConical,
  Globe,
  Gamepad2,
  Users,
  PenTool,
  Atom,
  Waves,
  Leaf,
  Mic,
  MessageCircle,
  Phone,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/activity-1.jpeg";

const programs = [
  {
    icon: FlaskConical,
    title: "The Fusion of Chemistry in All Disciplines",
    description:
      "Explore chemistry as applied in multiple subjects, projects, and products, including different phenomena. We help students understand how chemistry connects to their everyday lives and other scientific disciplines.",
    learns: [
      "Chemistry applications across subjects",
      "Real-world chemical phenomena",
      "Practical chemistry experiments",
      "Cross-disciplinary connections",
    ],
    color: "bg-secondary",
  },
  {
    icon: Globe,
    title: "Climate Change & Environmental Awareness",
    description:
      "Training on climate change solutions and renewable energy. Students learn environmental monitoring techniques for air, soil, and water quality, and develop practical solutions for environmental challenges.",
    learns: [
      "Climate change science and solutions",
      "Renewable energy technologies",
      "Environmental monitoring methods",
      "Sustainable practices",
    ],
    color: "bg-green-500",
  },
  {
    icon: Atom,
    title: "Nanotechnology & Green Chemistry",
    description:
      "Green synthesis of nanoparticles using local plants. Applications in water purification, catalysis, and solar energy. Students explore cutting-edge science with practical environmental applications.",
    learns: [
      "Nanotechnology basics",
      "Green chemistry principles",
      "Local plant applications",
      "Environmental solutions",
    ],
    color: "bg-cyan-500",
  },
  {
    icon: Waves,
    title: "Blue Economy & Ocean Projects",
    description:
      "Marine resource utilization for food, beauty, and packaging. Awareness programs on ocean conservation. Students learn to leverage ocean resources sustainably while protecting marine ecosystems.",
    learns: [
      "Marine resource utilization",
      "Ocean conservation",
      "Sustainable coastal practices",
      "Blue economy innovations",
    ],
    color: "bg-blue-500",
  },
  {
    icon: Leaf,
    title: "Traditional Medicine & Phytochemistry",
    description:
      "Research on local medicinal plants. Value addition and publication of findings. Students explore the science behind traditional medicine and contribute to documented knowledge.",
    learns: [
      "Medicinal plant identification",
      "Phytochemical analysis",
      "Research methodology",
      "Value addition processes",
    ],
    color: "bg-emerald-500",
  },
  {
    icon: PenTool,
    title: "Scientific Writing & Publications",
    description:
      "Training on writing research papers and journal articles. Support in publishing and knowledge dissemination. Students develop essential scientific communication skills.",
    learns: [
      "Research paper structure",
      "Scientific writing style",
      "Journal submission process",
      "Data presentation",
    ],
    color: "bg-pink-500",
  },
  {
    icon: Mic,
    title: "Multidisciplinary Talks & Innovation Forums",
    description:
      "Networking platforms for scientists, innovators, and entrepreneurs. Showcasing community-driven innovations. We create spaces for knowledge exchange and collaboration.",
    learns: [
      "Guest speaker series",
      "Student presentations",
      "Innovation showcases",
      "Networking events",
    ],
    color: "bg-purple-500",
  },
  {
    icon: Gamepad2,
    title: "Interactive Learning Aids",
    description:
      "Engage with science through interactive games and visual aids like animations, making complex concepts fun and accessible. Explore hands-on tools that bring STEM to life.",
    learns: [
      "Interactive games",
      "Visual learning aids",
      "Animated science concepts",
      "Gamified learning",
    ],
    color: "bg-orange-500",
  },
];

const Programs = () => {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello SIM-Lab, I would like to learn more about your programs."
    );
    window.open(`https://wa.me/254738668529?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open("tel:+254738668529", "_self");
  };

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          title="Our Programs & Services"
          subtitle="Comprehensive STEM Education and Innovation Training"
          backgroundImage={heroImage}
        />

        {/* Overview Section */}
        <section className="py-12 bg-white">
          <div className="container-custom text-center">
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We provide hands-on training, consultancy, and community
              engagement programs in the following areas (but not limited to):
            </p>
          </div>
        </section>

        {/* Programs Grid */}
        <section className="section-padding bg-muted">
          <div className="container-custom">
            <div className="space-y-12">
              {programs.map((program, index) => (
                <motion.div
                  key={program.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`grid lg:grid-cols-2 gap-8 items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`${index % 2 === 1 ? "lg:order-2" : "lg:order-1"}`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-14 h-14 ${program.color} rounded-xl flex items-center justify-center`}
                      >
                        <program.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-heading font-bold text-primary">
                        {program.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {program.description}
                    </p>
                    <div className="mb-6">
                      <h4 className="font-semibold text-primary mb-3">
                        What Students Learn:
                      </h4>
                      <ul className="grid grid-cols-2 gap-2">
                        {program.learns.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div
                    className={`bg-white p-6 rounded-2xl shadow-lg ${
                      index % 2 === 1 ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <h4 className="font-heading font-bold text-primary mb-4">
                      Interested in this program?
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="whatsapp"
                        className="flex-1"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat on WhatsApp
                      </Button>
                      <Button
                        variant="call"
                        className="flex-1"
                        onClick={handleCall}
                      >
                        <Phone className="w-4 h-4" />
                        Call for Details
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Info */}
        <section className="section-padding bg-secondary/10">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Flexible Program Options
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                We offer customized programs for individual students, schools,
                and organizations. Pricing varies based on program type,
                duration, and group size.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="whatsapp" size="lg" onClick={handleWhatsApp}>
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </Button>
                <Button variant="call" size="lg" onClick={handleCall}>
                  <Phone className="w-5 h-5" />
                  Call for Quote
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="mailto:simlabkenya@gmail.com">Email Us</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Holiday Program CTA */}
        <section className="py-16 bg-primary">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-bold mb-4">
                🎓 REGISTRATION OPEN
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                Holiday Innovation Program 2025
              </h2>
              <p className="text-white/80 mb-8">
                Join our special holiday program for hands-on STEM learning
              </p>
              <Button variant="cta" size="xl" asChild>
                <Link to="/holiday-program">Learn More & Register</Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Programs;