import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import MarqueeBar from "@/components/layout/MarqueeBar";

/* — Fonts — */
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

/* — Faixa principal: ESQ | SEP | DIR (apenas 1 linha) — */
function MainSplit() {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (leftRef.current) {
      tl.fromTo(leftRef.current, { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2 }, 0);
    }
    if (rightRef.current) {
      tl.fromTo(rightRef.current, { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9 }, 0.25);
    }
  }, []);

  return (
    <section
      className="relative w-full bg-[#151515] overflow-hidden"
      style={{ height: "calc(100vh - 17rem)" }}  // 16 (nav) + 12 (marquee) + bottom à parte
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: "0.95fr 1px 1.05fr", // DIR ~10% maior
          gridTemplateRows: "1fr",
          gridTemplateAreas: `"left sep right"`,
        }}
      >
        {/* ESQUERDA — imagem por detrás, cortada pela célula */}
        <div
          ref={leftRef}
          className="relative z-0"
          style={{
            gridArea: "left",
            backgroundImage:
              "url('https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/galeria/esquerda.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#151515",
          }}
        />

        {/* SEPARADOR VERTICAL (igual às hr) */}
        <div style={{ gridArea: "sep" }} className="relative z-10 bg-[#fbfbfb]" />

        {/* DIREITA — sem card, texto alinhado à esquerda */}
        <div
          className="relative z-10 flex items-center justify-start"
          style={{ gridArea: "right", backgroundColor: "#151515" }}
        >
          <div ref={rightRef} className="px-8">
            <h2
              className="leading-[0.9] text-5xl md:text-6xl mb-4"
              style={{ color: "#e53e30", fontFamily: "Goldman, system-ui, sans-serif" }}
            >
              FOR THE WIN
              <br />
              ROLEPLAY
            </h2>

            {/* Ver mais — hover com setinha */}
            <a
              href="#ver-mais"
              className="group inline-flex items-center gap-2 underline decoration-2 underline-offset-4 mt-4"
              style={{ color: "#fbfbfb", fontFamily: "Montserrat, system-ui, sans-serif" }}
            >
              <span>Ver mais</span>
              <span
                className="transition-transform duration-300 translate-x-0 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* — Bottom encostado à faixa principal — */
function BottomBanner() {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      gsap.fromTo(
        bottomRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.25 }
      );
    }
  }, []);

  return (
    <div
      ref={bottomRef}
      className="relative w-full h-56 bg-[#151515] border-t border-[#fbfbfb] overflow-hidden"
    >
      <img
        src="https://tbgpcttwkqpyztyfmmrt.supabase.co/storage/v1/object/public/static/galeria/bottom.webp"
        alt="FTW Roleplay — banner"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

/* — Componente principal — */
const HeroFTW: React.FC = () => {
  useLoadFonts();
  return (
    <section id="home" className="min-h-screen bg-[#151515] text-[#fbfbfb]">
      <MarqueeBar />
      <MainSplit />
      <BottomBanner />
    </section>
  );
};

export default HeroFTW;
