import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import activityImage from "@/assets/activity-2.jpeg";
import A from "@/assets/hero-2.jpeg";


const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const hasSeenLoading = sessionStorage.getItem("simlab-loaded");
    if (hasSeenLoading) {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setHasLoaded(true);
    sessionStorage.setItem("simlab-loaded", "true");
  };

  return (
    <>
      {isLoading && !hasLoaded && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      <div className={`${isLoading && !hasLoaded ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}>
        <Navbar />
        <main>
          <HeroSection />

          {/* About Preview */}
          <section className="section-padding bg-muted">
            <div className="container-custom">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                    Who We Are
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    SIM-Lab is a science-based innovation lab bridging the gap between 
                    classroom learning and real-world application. Incubated under IOME001 
                    Innovation Hub, we transform classroom concepts into practical skills.
                  </p>
                  <Button variant="default" size="lg" asChild>
                    <Link to="/about">
                      Learn More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.img
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  src={activityImage}
                  alt="SIM-Lab activities"
                  className="rounded-2xl shadow-xl"
                />
              </div>
            </div>
          </section>

          {/* Holiday Program CTA */}
          <section className="py-20 bg-primary relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern-hex opacity-20" />
            <div className="container-custom relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <span className="inline-block bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-bold mb-4">
                  🎓 REGISTRATION OPEN
                </span>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                  Holiday Innovation Program 2026
                </h2>
                <p className="text-white/80 max-w-2xl mx-auto mb-8">
                  Empowering students through hands-on science, innovation, and creativity.
                  Grade 5 to Form 4 • KES 1,000 per session
                </p>
                <Button variant="cta" size="xl" asChild>
                  <Link to="/holiday-program">Register Now</Link>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="section-padding bg-white">
            <div className="container-custom">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { title: "Our Programs", desc: "Explore STEM courses", link: "/programs", image: A},
                  { title: "Gallery", desc: "See our activities", link: "/gallery", image: activityImage },
                  { title: "Contact Us", desc: "Get in touch", link: "/contact", image: A },
                ].map((item, i) => (
                  <Link
                    key={item.title}
                    to={item.link}
                    className="group relative overflow-hidden rounded-2xl h-48"
                  >
                    <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-primary/70 group-hover:bg-primary/80 transition-colors flex flex-col items-center justify-center text-white">
                      <h3 className="text-xl font-heading font-bold">{item.title}</h3>
                      <p className="text-white/70">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
