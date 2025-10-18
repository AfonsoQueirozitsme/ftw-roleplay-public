// Gallery.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/* Carregar Montserrat + Goldman */
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

type GalleryImage = { src: string; alt?: string };
type GalleryProps = {
  title?: string;
  images?: GalleryImage[];
  /** força uma sequência de tamanhos; opções: "1x1" | "2x1" | "1x2" | "2x2" */
  pattern?: Array<"1x1" | "2x1" | "1x2" | "2x2">;
};

/* defaults */
const DEFAULT_IMAGES: GalleryImage[] = [
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/image3.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/image2.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/image.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/9.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/7.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/5.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/3.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/2.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/13.png" },
  { src: "https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/uploads/12.png" },
];

/* animação */
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: ([0.22, 1, 0.36, 1] as unknown) as any } },
};

/* mapeia um token tipo "2x1" para classes de grid-span (sem bordas, sem radius) */
function sizeClasses(token: "1x1" | "2x1" | "1x2" | "2x2") {
  switch (token) {
    case "2x1": return "col-span-2 row-span-1";
    case "1x2": return "col-span-1 row-span-2";
    case "2x2": return "col-span-2 row-span-2";
    default:    return "col-span-1 row-span-1";
  }
}

/* padrão giro por omissão (repete) */
const DEFAULT_PATTERN: Array<"1x1" | "2x1" | "1x2" | "2x2"> = [
  "2x2", "1x1", "1x2", "2x1",
  "1x1", "1x1", "2x1", "1x2",
];

const Gallery: React.FC<GalleryProps> = ({ title = "GALERIA", images = DEFAULT_IMAGES, pattern = DEFAULT_PATTERN }) => {
  useLoadFonts();

  const [active, setActive] = useState<number | null>(null);
  const close = useCallback(() => setActive(null), []);
  const next  = useCallback(() => setActive((i) => (i === null ? 0 : (i + 1) % images.length)), [images.length]);
  const prev  = useCallback(() => setActive((i) => (i === null ? 0 : (i - 1 + images.length) % images.length)), [images.length]);

  // ESC + setas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (active === null) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next, prev]);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (active !== null) overlayRef.current?.focus(); }, [active]);

  return (
    <section id="galeria" className="w-full bg-[#0b0b0b] text-white py-16" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight uppercase" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
          {title}
        </h2>
        <div className="h-[2px] w-full bg-white mt-4" />
      </div>

      {/* Grid retangular com tamanhos variáveis (sem bordas, sem radius) */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/*
          - 2 colunas no mobile, 4 no desktop.
          - definimos uma "altura base" das linhas com arbitrary property.
          - os itens expandem com row/col-span para criar o padrão.
        */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 [grid-auto-rows:120px] md:[grid-auto-rows:140px] lg:[grid-auto-rows:160px]">
          {images.map((img, idx) => {
            const token = pattern[idx % pattern.length];
            const span = sizeClasses(token);

            return (
              <motion.button
                key={img.src + idx}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={itemVariants}
                onClick={() => setActive(idx)}
                className={`group relative w-full overflow-hidden ${span} bg-[#111]`}
                aria-label={`Abrir imagem ${idx + 1}`}
              >
                {/* preenchimento total do tile (quadrado/retângulo consoante o span) */}
                <img
                  src={img.src}
                  alt={img.alt || `Imagem ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] select-none"
                  loading="lazy"
                  draggable={false}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            ref={overlayRef}
            tabIndex={-1}
            key="overlay"
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
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
                className="w-full h-auto max-h-[85vh] object-contain"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: ([0.22, 1, 0.36, 1] as unknown) as any } }}
                exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.18 } }}
                draggable={false}
              />

              <button
                onClick={close}
                className="absolute -top-3 -right-3 md:-top-4 md:-right-4 p-2 bg-[#0b0b0b] text-white hover:bg-red-600 transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-[#0b0b0b]/80 text-white hover:bg-red-600/50 transition"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-[#0b0b0b]/80 text-white hover:bg-red-600/50 transition"
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
