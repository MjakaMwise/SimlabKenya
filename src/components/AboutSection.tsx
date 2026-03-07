import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { FlaskConical, Lightbulb, Users, Target } from "lucide-react";
import activityImage from "@/assets/activity-2.jpeg";

const AboutSection = () => {
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

  return (
    <section
      id="about"
      ref={ref}
      className="section-padding bg-muted relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern-hex opacity-50" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-4">
            Who We Are
          </h2>
          <div className="dotted-separator" />
        </motion.div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-lg text-foreground leading-relaxed mb-6">
              <span className="font-semibold text-primary">SIM-Lab</span> is a science-based innovation lab dedicated 
              to bridging the gap between classroom learning and real-world application. 
              Incubated under <span className="font-semibold">IOME001 Innovation Hub</span>, we offer broad, 
              multidisciplinary exposure across different fields, fusing academic knowledge 
              with practical, community-centered solutions.
            </p>
            <p className="text-lg text-foreground leading-relaxed mb-8">
              We empower individuals, schools, and organizations by making science and 
              technology relatable to everyday life challenges, encouraging students to 
              think critically and innovatively. Our mission is to transform classroom 
              concepts into practical skills, driving creativity, innovation, and 
              sustainable development within communities.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm"
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
            transition={{ duration: 0.6, delay: 0.3 }}
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
              transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
              className="absolute -bottom-6 -left-6 bg-accent text-accent-foreground px-6 py-4 rounded-xl shadow-xl"
            >
              <div className="text-2xl font-heading font-bold">Mombasa</div>
              <div className="text-sm opacity-80">IOME001 Innovation Hub</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
