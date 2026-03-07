import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    question: "What age groups do you cater to?",
    answer:
      "Our programs are designed for students from Grade 5 through Form 4 (ages 10-18). We have tailored activities for different age groups to ensure age-appropriate learning experiences.",
  },
  {
    question: "Where is SIM-Lab located?",
    answer:
      "SIM-Lab is located within the IOME001 Innovation Hub in Mombasa, Kenya. We also conduct school-based programs at various partner institutions.",
  },
  {
    question: "How much does the Holiday Program cost?",
    answer:
      "The Holiday Innovation Program costs KES 1,000 per student per session. This includes all materials, expert facilitation, mentorship, and certificate of completion.",
  },
  {
    question: "What should students bring?",
    answer:
      "Students should come in comfortable clothing. All lab coats, safety equipment, and materials are provided by SIM-Lab. We recommend bringing a notebook and pen for notes.",
  },
  {
    question: "Are there group discounts available?",
    answer:
      "Yes! We offer group discounts for school registrations of 5 or more students. Contact us via WhatsApp or phone to discuss group pricing.",
  },
  {
    question: "How do I register my child?",
    answer:
      "You can register via WhatsApp (+254 738 668529), phone call, or email (simlabkenya@gmail.com). After registration, you'll receive payment instructions and program details.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "Yes. Full refund if canceled 14+ days before program start, 50% refund for 7-13 days notice, and no refund for less than 7 days. Exceptions may be made for emergencies.",
  },
  {
    question: "Can schools partner with SIM-Lab?",
    answer:
      "Absolutely! We offer school partnerships including regular STEM workshops, holiday program hosting, teacher training, science club support, and innovation project mentorship.",
  },
];

const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" ref={ref} className="section-padding bg-white">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Got questions? We've got answers. If you don't find what you're
            looking for, feel free to contact us.
          </p>
          <div className="dotted-separator" />
        </motion.div>

        {/* FAQ Grid */}
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="border-b border-border last:border-none"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-6 flex items-center justify-between text-left group"
              >
                <span className="text-lg font-heading font-semibold text-primary group-hover:text-secondary transition-colors pr-4">
                  {faq.question}
                </span>
                <span className="flex-shrink-0 text-secondary">
                  {openIndex === index ? (
                    <ChevronUp size={24} />
                  ) : (
                    <ChevronDown size={24} />
                  )}
                </span>
              </button>
              <motion.div
                initial={false}
                animate={{
                  height: openIndex === index ? "auto" : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="pb-6 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;