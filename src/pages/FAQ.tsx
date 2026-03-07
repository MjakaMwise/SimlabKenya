import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, MessageCircle, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";

const faqCategories = [
  {
    title: "General Questions",
    faqs: [
      {
        question: "What age groups do you cater to?",
        answer:
          "Our programs are designed for students from Grade 5 through Form 4 (ages 10-18). We have tailored activities for different age groups to ensure age-appropriate learning experiences.",
      },
      {
        question: "Where is SIM-Lab located?",
        answer:
          "SIM-Lab is located within the IOME001 Innovation Hub in Mombasa, Kenya. We also conduct school-based programs at various partner institutions across the region.",
      },
      {
        question: "What should students bring?",
        answer:
          "Students should come in comfortable clothing. All lab coats, safety equipment, and materials are provided by SIM-Lab. We recommend bringing a notebook and pen for notes.",
      },
      {
        question: "Are meals provided during programs?",
        answer:
          "For half-day programs, snacks and refreshments are provided. For full-day programs, we provide lunch and refreshments. Please inform us of any dietary restrictions during registration.",
      },
    ],
  },
  {
    title: "Registration & Payment",
    faqs: [
      {
        question: "How much does the Holiday Program cost?",
        answer:
          "The Holiday Innovation Program costs KES 1,000 per student per session. This includes all materials, expert facilitation, mentorship, and certificate of completion.",
      },
      {
        question: "How do I register my child?",
        answer:
          "You can register via WhatsApp (+254 738 668529), phone call, or email (simlabkenya@gmail.com). After registration, you'll receive payment instructions and program details.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept M-Pesa (primary method for Kenyan payments), bank transfer, and cash payments at our office (by appointment). Payment instructions will be provided upon registration confirmation.",
      },
      {
        question: "Are there group discounts available?",
        answer:
          "Yes! We offer group discounts for school registrations of 5 or more students. Early bird discounts may also be offered for early registration. Contact us to discuss scholarship applications or group pricing.",
      },
      {
        question: "Is there a refund policy?",
        answer:
          "Yes. Full refund if canceled 14+ days before program start, 50% refund for 7-13 days notice, and no refund for less than 7 days. Exceptions may be made for emergencies—contact us to discuss.",
      },
    ],
  },
  {
    title: "Programs & Activities",
    faqs: [
      {
        question: "What programs do you offer?",
        answer:
          "We offer hands-on STEM learning, climate action and renewable energy workshops, nanotechnology and green chemistry, blue economy and ocean projects, traditional medicine research, scientific writing training, and multidisciplinary innovation forums.",
      },
      {
        question: "Do you offer school-based programs?",
        answer:
          "Yes! We partner with schools to deliver STEM programs at their premises or at our facility. This includes regular workshops, holiday programs, teacher training, and science club support.",
      },
      {
        question: "What makes SIM-Lab different from other programs?",
        answer:
          "SIM-Lab focuses on connecting classroom science to real-world applications through hands-on learning. We provide continuous mentorship beyond programs, focus on community-centered solutions, and offer access to innovation resources through our partnership with IOME001.",
      },
    ],
  },
  {
    title: "Partnership",
    faqs: [
      {
        question: "Can schools partner with SIM-Lab?",
        answer:
          "Absolutely! School partnerships can include regular STEM workshops during term time, holiday program hosting, teacher training sessions, science club support, innovation project mentorship, and joint research initiatives.",
      },
      {
        question: "What are the benefits of partnership?",
        answer:
          "Partners receive customized STEM programs for students, professional development for teachers, access to innovation resources and mentorship, reduced rates for programs, priority registration for events, long-term educational support, and certificate programs for students.",
      },
      {
        question: "How do I become a partner?",
        answer:
          "Contact us via WhatsApp, phone, or email to discuss partnership opportunities. We'll work with you to create a customized partnership package that meets your institution's needs and goals.",
      },
    ],
  },
];

const FAQ = () => {
  const [openItems, setOpenItems] = useState<{ [key: string]: number | null }>(
    {}
  );

  const toggleItem = (category: string, index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello SIM-Lab, I have a question about your programs."
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
          title="Frequently Asked Questions"
          subtitle="Got questions? We've got answers."
        />

        {/* FAQ Sections */}
        <section className="section-padding bg-white">
          <div className="container-custom max-w-4xl">
            {faqCategories.map((category, catIndex) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: catIndex * 0.1 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-heading font-bold text-primary mb-6">
                  {category.title}
                </h2>
                <div className="space-y-1 bg-muted rounded-2xl overflow-hidden">
                  {category.faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-white border-b border-border last:border-none"
                    >
                      <button
                        onClick={() => toggleItem(category.title, index)}
                        className="w-full px-6 py-5 flex items-center justify-between text-left group"
                      >
                        <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors pr-4">
                          {faq.question}
                        </span>
                        <span className="flex-shrink-0 text-secondary">
                          {openItems[category.title] === index ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </span>
                      </button>
                      <motion.div
                        initial={false}
                        animate={{
                          height:
                            openItems[category.title] === index ? "auto" : 0,
                          opacity: openItems[category.title] === index ? 1 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="section-padding bg-muted">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
                Still Have Questions?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Can't find what you're looking for? Reach out to us directly and
                we'll be happy to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="whatsapp" size="lg" onClick={handleWhatsApp}>
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </Button>
                <Button variant="call" size="lg" onClick={handleCall}>
                  <Phone className="w-5 h-5" />
                  Call Us
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/contact">Contact Page</Link>
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

export default FAQ;