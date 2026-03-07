import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  FlaskConical,
  Globe,
  Gamepad2,
  Users,
  PenTool,
  Atom,
} from "lucide-react";

const programs = [
  {
    icon: FlaskConical,
    title: "Hands-On STEM Learning",
    description:
      "We integrate chemistry, physics, biology, and coding through hands-on experiments and interactive learning to help students understand real-world challenges and develop practical problem-solving skills.",
    color: "bg-secondary",
  },
  {
    icon: Globe,
    title: "Climate Action & Renewable Energy",
    description:
      "Apply scientific principles to fundamentally understand climate change and how to effectively use renewable energy as a solution for environmental challenges.",
    color: "bg-green-500",
  },
  {
    icon: Gamepad2,
    title: "Interactive Learning Aids",
    description:
      "Engage with science through interactive games and visual aids like animations, making complex concepts fun and accessible. Explore hands-on tools that bring STEM to life.",
    color: "bg-purple-500",
  },
  {
    icon: Users,
    title: "Community Driven Innovation",
    description:
      "We create opportunities for innovation forums and multidisciplinary talks to ensure innovation is community-driven and addresses local challenges.",
    color: "bg-orange-500",
  },
  {
    icon: PenTool,
    title: "Scientific Writing & Publication",
    description:
      "Learn to craft and publish research papers, developing essential skills to communicate scientific discoveries and innovations effectively.",
    color: "bg-pink-500",
  },
  {
    icon: Atom,
    title: "Nanotechnology",
    description:
      "Dive into the world of the tiny, discovering innovations and applications of nanotechnology in everyday life and cutting-edge research.",
    color: "bg-cyan-500",
  },
];

const ProgramsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="programs" ref={ref} className="section-padding bg-white">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-4">
            What We Offer
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comprehensive STEM education and innovation training programs designed
            to inspire and empower the next generation of scientists and innovators.
          </p>
          <div className="dotted-separator" />
        </motion.div>

        {/* Programs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program, index) => (
            <motion.div
              key={program.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-white border border-border rounded-2xl p-6 card-hover hover:border-secondary/30"
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 ${program.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <program.icon className="w-7 h-7 text-white" />
              </div>

              {/* Dotted separator */}
              <div className="flex gap-1 mb-4">
                {[...Array(6)].map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-accent rounded-full"
                  />
                ))}
              </div>

              {/* Content */}
              <h3 className="text-xl font-heading font-bold text-primary mb-3">
                {program.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {program.description}
              </p>

              {/* Learn More Link */}
              <a
                href="#contact"
                className="text-accent font-semibold hover:text-accent/80 transition-colors inline-flex items-center gap-2"
              >
                Learn More
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgramsSection;
