import { motion } from "framer-motion";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import hero1 from "@/assets/hero-1.jpeg";
import hero2 from "@/assets/hero-2.jpeg";
import activity1 from "@/assets/activity-1.jpeg";
import activity2 from "@/assets/activity-2.jpeg";
import activity3 from "@/assets/activity-3.jpeg";
import activity4 from "@/assets/activity-4.jpeg";

import imgB from "@/assets/img-b.jpeg";
import imgD from "@/assets/img-d.jpeg";
import imgE from "@/assets/img-e.jpeg";
import imgG from "@/assets/img-g.jpeg";
import imgH from "@/assets/img-h.jpeg";
import imgK from "@/assets/img-k.jpeg";
import imgL from "@/assets/img-l.jpg";
import imgM from "@/assets/img-m.jpeg";
import imgN from "@/assets/img-n.jpg";

const categories = [
  "All Photos",
  "Holiday Programs",
  "Workshops",
  "Presentations",
];

const galleryImages = [
  {
    src: activity1,
    caption: "Collaborative science session",
    category: "Holiday Programs",
  },
  {
    src: imgE,
    caption: "Lab safety and best practices",
    category: "Workshops",
  },
  {
    src: activity2,
    caption: "Microplastics awareness presentation",
    category: "Presentations",
  },
    
  {
    src: activity4,
    caption: "Interactive whiteboard learning",
    category: "Holiday Programs",
  },
  {
    src: imgG,
    caption: "SIM-Lab activity highlight",
    category: "Workshops",
  },
  
  {
    src: imgD,
    caption: "Innovation in action",
    category: "Presentations",
  },
  {
    src: imgE,
    caption: "Hands-on STEM education",
    category: "Workshops",
  },
  {
    src: imgH,
    caption: "Exploring new concepts",
    category: "Presentations",
  },
  {
    src: imgK,
    caption: "Student demonstration",
    category: "Workshops",
  },
  {
    src: imgL,
    caption: "Learning through discovery",
    category: "Holiday Programs",
  },
  {
    src: imgM,
    caption: "Science fair project",
    category: "Presentations",
  },
  {
    src: imgN,
    caption: "Future scientists",
    category: "Workshops",
  },
];

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("All Photos");

  const filteredImages =
    activeCategory === "All Photos"
      ? galleryImages
      : galleryImages.filter((img) => img.category === activeCategory);

  const navigateImage = (direction: "prev" | "next") => {
    if (selectedImage === null) return;

    if (direction === "prev") {
      setSelectedImage(
        selectedImage === 0 ? filteredImages.length - 1 : selectedImage - 1
      );
    } else {
      setSelectedImage(
        selectedImage === filteredImages.length - 1 ? 0 : selectedImage + 1
      );
    }
  };

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          title="Our Gallery"
          subtitle="Capturing Moments of Innovation and Learning"
        />

        {/* Gallery Introduction */}
        <section className="py-12 bg-white">
          <div className="container-custom text-center">
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-4">
              Explore highlights from our programs, workshops, and innovation
              sessions. All student images are privacy-protected to ensure their
              safety while showcasing the incredible work happening at SIM-Lab.
            </p>
            <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
              🔒 Student privacy protected - All photographs used with consent
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section className="py-8 bg-muted">
          <div className="container-custom">
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${activeCategory === category
                      ? "bg-accent text-accent-foreground"
                      : "bg-white text-muted-foreground hover:bg-secondary hover:text-white"
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredImages.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative group cursor-pointer overflow-hidden rounded-xl aspect-square"
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={image.src}
                    alt={image.caption}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300 flex flex-col items-center justify-center p-4">
                    <p className="text-white text-center font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {image.caption}
                    </p>
                    <span className="text-accent text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
                      {image.category}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredImages.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                No images found in this category.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {/* Lightbox */}
      {selectedImage !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>

          {/* Navigation Buttons */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10 p-2"
            onClick={(e) => {
              e.stopPropagation();
              navigateImage("prev");
            }}
          >
            <ChevronLeft size={40} />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10 p-2"
            onClick={(e) => {
              e.stopPropagation();
              navigateImage("next");
            }}
          >
            <ChevronRight size={40} />
          </button>

          {/* Image */}
          <motion.img
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src={filteredImages[selectedImage].src}
            alt={filteredImages[selectedImage].caption}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white text-lg mb-1">
              {filteredImages[selectedImage].caption}
            </p>
            <p className="text-white/60 text-sm">
              {selectedImage + 1} of {filteredImages.length}
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default Gallery;
