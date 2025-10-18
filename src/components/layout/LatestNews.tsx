// LatestNews.tsx
import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  date: string;      // ISO
  href?: string | null;
};

type LatestNewsProps = {
  className?: string;
  limit?: number; // nº de notícias a carregar (default 6)
};

function formatDateParts(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("pt-PT", { month: "short" }).toUpperCase();
  const year = d.getFullYear().toString();
  return { day, month, year };
}

const PLACEHOLDER = "https://placehold.co/640x360?text=FTW+NEWS";

const LatestNews: React.FC<LatestNewsProps> = ({ className, limit = 6 }) => {
  useLoadFonts();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;

    async function load() {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, excerpt, cover_url, published_at")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(limit);

      if (abort) return;

      if (error) {
        setErr(error.message);
        setItems([]);
      } else {
        const mapped: NewsItem[] =
          (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.excerpt,
            image: r.cover_url,
            date: r.published_at,
            href: r.slug ? `/news/${r.slug}` : undefined,
          })) ?? [];
        setItems(mapped);
      }
      setLoading(false);
    }

    load();
    return () => { abort = true; };
  }, [limit]);

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

      {/* Loading / Erro */}
      <div className="max-w-7xl mx-auto mt-8 px-6">
        {loading && (
          <div className="animate-pulse space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-5">
                <div className="w-full sm:w-48 h-48 sm:h-28 bg-white/10 rounded-md" />
                <div className="flex-1">
                  <div className="h-6 w-2/3 bg-white/10 rounded mb-2" />
                  <div className="h-4 w-full bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {err && !loading && (
          <p className="text-red-400">Não foi possível carregar as notícias: {err}</p>
        )}
      </div>

      {/* Lista */}
      {!loading && !err && (
        <div className="max-w-7xl mx-auto mt-0" role="list">
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
                    src={item.image || PLACEHOLDER}
                    alt={item.title}
                    className="w-full sm:w-48 h-48 sm:h-28 object-cover rounded-md select-none"
                    draggable={false}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                  />

                  {/* Data */}
                  <div className="flex-shrink-0 flex sm:flex-col items-center justify-center gap-1 sm:gap-0">
                    <span className="text-5xl font-extrabold leading-none">{day}</span>
                    <span className="text-xs sm:mt-1 leading-none">{month}</span>
                    <span className="text-[10px] sm:mt-0.5 leading-none opacity-80">{year}</span>
                  </div>

                  {/* Conteúdo */}
                  <div className="relative flex-1 text-center sm:text-center">
                    <h3
                      className="text-lg md:text-xl font-semibold leading-snug transition-colors duration-500 ease-out"
                      style={{ color: "#fbfbfb" }}
                    >
                      <span className="group-hover:text-[#e53e30]">{item.title}</span>
                    </h3>
                    {item.description && (
                      <p className="mt-2 text-sm leading-relaxed text-white/80">
                        {item.description}
                      </p>
                    )}

                    <ArrowUpRight
                      className="absolute right-0 bottom-0 w-10 h-10 transition-all duration-500 ease-out
                                 group-hover:-translate-y-0.5 group-hover:translate-x-0.5
                                 group-hover:scale-110 group-hover:text-[#e53e30]"
                      style={{ color: "#fbfbfb" }}
                      aria-hidden="true"
                    />
                  </div>
                </a>

                {!isLast && (
                  <div className="h-px bg-[#fbfbfb] opacity-80 mx-6 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LatestNews;
