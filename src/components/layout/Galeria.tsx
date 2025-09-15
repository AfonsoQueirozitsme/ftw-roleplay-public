// Gallery.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/* Carregar Montserrat + Goldman (se não estiver global) */
function useLoadFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Goldman:wght@400;700&family=Montserrat:wght@300;400;600;700;800;900&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
}

type GalleryImage = {
  src: string;
  alt?: string;
};

type GalleryProps = {
  title?: string;          // default: "GALERIA"
  images?: GalleryImage[]; // se não passares, uso defaults
};

/* Imagens de exemplo (troca pelos teus URLs do Supabase) */
const DEFAULT_IMAGES: GalleryImage[] = [
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/galeria/esquerda.webp", alt: "Cidade — esquerda" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/galeria/bottom.webp", alt: "Noite — avenida" },
  { src: "https://placehold.co/1200x800?text=FTW+01" },
  { src: "https://placehold.co/900x1200?text=FTW+02" },
  { src: "https://placehold.co/1600x900?text=FTW+03" },
  { src: "https://placehold.co/1000x1000?text=FTW+04" },
  { src: "https://placehold.co/1400x900?text=FTW+05" },
  { src: "https://placehold.co/900x1400?text=FTW+06" },
  { src: "https://placehold.co/1280x720?text=FTW+07" },
  { src: "https://placehold.co/1100x900?text=FTW+08" },
];

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const Gallery: React.FC<GalleryProps> = ({ title = "GALERIA", images = DEFAULT_IMAGES }) => {
  useLoadFonts();

  const [active, setActive] = useState<number | null>(null);
  const close = useCallback(() => setActive(null), []);
  const next  = useCallback(() => setActive((i) => (i === null ? 0 : (i + 1) % images.length)), [images.length]);
  const prev  = useCallback(() => setActive((i) => (i === null ? 0 : (i - 1 + images.length) % images.length)), [images.length]);

  // ESC + setas
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (active === null) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next, prev]);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (active !== null) overlayRef.current?.focus(); }, [active]);

  return (
    <section
      id="galeria"
      className="w-full bg-[#151515] text-[#fbfbfb] py-16"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6">
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight"
          style={{ fontFamily: "Goldman, system-ui, sans-serif", color: "#fbfbfb" }}  // Título branco
        >
          {title}
        </h2>
        <div className="h-px w-full bg-[#fbfbfb] opacity-80 mt-4" />
      </div>

      {/* Masonry responsivo (adapta-se ao tamanho original das fotos) */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* columns = masonry; evita espaços em branco e preserva proporções originais */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:balance]">
          {images.map((img, idx) => (
            <motion.button
              key={img.src + idx}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={itemVariants}
              onClick={() => setActive(idx)}
              className="inline-block w-full mb-4 cursor-zoom-in"
              style={{ breakInside: "avoid" }}  // impede quebras de coluna (evita buracos)
              aria-label={`Abrir imagem ${idx + 1}`}
            >
              <div className="relative w-full overflow-hidden rounded-lg">
                {/* A imagem ocupa a largura e respeita a altura original (h-auto) */}
                <img
                  src={img.src}
                  alt={img.alt || `Imagem ${idx + 1}`}
                  className="block w-full h-auto object-cover transition-transform duration-500 ease-out"
                  loading="lazy"
                  draggable={false}
                />
                {/* Overlay subtil no hover */}
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                {/* Borda subtil no hover */}
                <div className="pointer-events-none absolute inset-0 border border-transparent rounded-lg transition-colors duration-300 hover:border-white/30" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            ref={overlayRef}
            tabIndex={-1}
            key="overlay"
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            aria-modal="true"
            role="dialog"
          >
            <div className="relative max-w-5xl w-full">
              <motion.img
                key={images[active].src}
                src={images[active].src}
                alt={images[active].alt || `Imagem ${active + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-lg"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.18 } }}
                draggable={false}
              />

              <button
                onClick={close}
                className="absolute -top-3 -right-3 md:-right-4 md:-top-4 p-2 rounded-full bg-[#151515] text-[#fbfbfb] hover:opacity-90 transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#151515]/80 text-[#fbfbfb] hover:opacity-90 transition"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#151515]/80 text-[#fbfbfb] hover:opacity-90 transition"
                aria-label="Seguinte"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Gallery;
