// LatestNews.tsx
import React, { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";

/* Carrega fontes caso não estejam globais */
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

type NewsItem = {
  id: string | number;
  title: string;
  description: string;
  image: string;
  date: string; // YYYY-MM-DD
  href?: string;
};

type LatestNewsProps = {
  items?: NewsItem[];
  className?: string;
};

function formatDateParts(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("pt-PT", { month: "short" }).toUpperCase();
  const year = d.getFullYear().toString();
  return { day, month, year };
}

const DEFAULT_ITEMS: NewsItem[] = [
  {
    id: 1,
    title: "Economia reajustada e novo sistema de empresas",
    description:
      "Rework total da economia: contratos, impostos dinâmicos e progressão mais justa.",
    image: "https://placehold.co/640x360?text=NEWS+01",
    date: "2025-08-24",
    href: "#noticia-1",
  },
  {
    id: 2,
    title: "Atualização das forças policiais",
    description:
      "Novas unidades, protocolos de perseguição e formações obrigatórias.",
    image: "https://placehold.co/640x360?text=NEWS+02",
    date: "2025-09-02",
    href: "#noticia-2",
  },
  {
    id: 3,
    title: "Eventos semanais e recompensas exclusivas",
    description:
      "Corridas ilegais, negócios sombrios e prémios raros para quem arrisca.",
    image: "https://placehold.co/640x360?text=NEWS+03",
    date: "2025-09-10",
    href: "#noticia-3",
  },
];

const LatestNews: React.FC<LatestNewsProps> = ({ items = DEFAULT_ITEMS, className }) => {
  useLoadFonts();

  return (
    <section
      id="latest-news"
      className={`w-full bg-[#151515] text-[#fbfbfb] py-16 ${className || ""}`}
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-[10px] tracking-[0.2em] uppercase mb-2">
          NOVO NO MUNDO FTW ROLEPLAY
        </p>
        <h2
          className="text-3xl md:text-5xl font-bold"
          style={{ fontFamily: "Goldman, system-ui, sans-serif", color: "#fbfbfb" }}
        >
          ÚLTIMAS NOTÍCIAS
        </h2>
      </div>

      {/* Lista (sempre vertical) */}
      <div className="max-w-7xl mx-auto mt-8" role="list">
        {items.map((item, idx) => {
          const { day, month, year } = formatDateParts(item.date);
          const isLast = idx === items.length - 1;

          return (
            <div key={item.id} role="listitem" className="w-full">
              <a
                href={item.href || "#"}
                className="group relative w-full flex flex-col sm:flex-row gap-5 px-6 py-6"
              >
                {/* Imagem */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full sm:w-48 h-48 sm:h-28 object-cover rounded-md select-none"
                  draggable={false}
                />

                {/* Data */}
                <div className="flex-shrink-0 flex sm:flex-col items-center justify-center gap-1 sm:gap-0">
                  <span className="text-5xl font-extrabold leading-none">{day}</span>
                  <span className="text-xs sm:mt-1 leading-none">{month}</span>
                  <span className="text-[10px] sm:mt-0.5 leading-none opacity-80">{year}</span>
                </div>

                {/* Conteúdo (centrado) */}
                <div className="relative flex-1 text-center sm:text-center">
                  <h3
                    className="text-lg md:text-xl font-semibold leading-snug transition-colors duration-500 ease-out"
                    style={{ color: "#fbfbfb" }}
                  >
                    <span className="group-hover:text-[#e53e30]">{item.title}</span>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {item.description}
                  </p>

                  {/* Seta (dobro do tamanho) — fica vermelha e com leve scale no hover (soft) */}
                  <ArrowUpRight
                    className="absolute right-0 bottom-0 w-10 h-10 transition-all duration-500 ease-out
                               group-hover:-translate-y-0.5 group-hover:translate-x-0.5
                               group-hover:scale-110 group-hover:text-[#e53e30]"
                    style={{ color: "#fbfbfb" }}
                    aria-hidden="true"
                  />
                </div>
              </a>

              {/* Separador (hr) entre notícias — com margens laterais e cantos arredondados */}
              {!isLast && (
                <div className="h-px bg-[#fbfbfb] opacity-80 mx-6 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LatestNews;
