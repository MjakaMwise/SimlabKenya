import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import hero1 from "@/assets/hero-1.jpeg";
import hero2 from "@/assets/hero-2.jpeg";
import activity1 from "@/assets/activity-1.jpeg";
import activity2 from "@/assets/activity-2.jpeg";
import activity3 from "@/assets/activity-3.jpeg";
import activity4 from "@/assets/activity-4.jpeg";

const galleryImages = [
  { src: hero1, caption: "Hands-on science experiments", category: "workshop" },
  { src: activity1, caption: "Student collaboration", category: "workshop" },
  { src: hero2, caption: "Lab safety training", category: "training" },
  { src: activity2, caption: "Microplastics presentation", category: "presentation" },
  { src: activity3, caption: "Group experiments", category: "workshop" },
  { src: activity4, caption: "Interactive learning", category: "workshop" },
];

const GallerySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  return (
    <section id="gallery" ref={ref} className="section-padding bg-muted">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-4">
            Our Gallery
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Capturing moments of innovation and learning at SIM-Lab Kenya
          </p>
          <div className="dotted-separator" />
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative group cursor-pointer overflow-hidden rounded-xl ${
                index === 0 || index === 5 ? "md:col-span-2 md:row-span-2" : ""
              }`}
              onClick={() => setSelectedImage(index)}
            >
              <img
                src={image.src}
                alt={image.caption}
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  index === 0 || index === 5 ? "h-64 md:h-full" : "h-48 md:h-64"
                }`}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300 flex items-end justify-center pb-4">
                <p className="text-white text-center font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4">
                  {image.caption}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Privacy Notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          🔒 Student privacy protected - All photographs are used with consent
        </motion.p>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-accent transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img
            src={galleryImages[selectedImage].src}
            alt={galleryImages[selectedImage].caption}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center">
            {galleryImages[selectedImage].caption}
          </p>
        </motion.div>
      )}
    </section>
  );
};

export default GallerySection;
