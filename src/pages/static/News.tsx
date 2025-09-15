// src/pages/static/News.tsx
import React, { useEffect, useState } from "react";
import StaticPageShell from "./StaticPageShell";
import { supabase } from "@/lib/supabase";
import { ArrowUpRight } from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner";
import { Link } from "react-router-dom";

type NewsRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
};

export default function News() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NewsRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("news")
        .select("id,slug,title,excerpt,cover_url,published_at")
        .order("published_at", { ascending: false })
        .limit(25);
      if (!error) setItems((data as NewsRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <StaticPageShell>
      <p className="text-xs tracking-widest uppercase text-[#fbfbfb]/80 mb-2">Novo no mundo FTW Roleplay</p>
      <h1 className="text-3xl md:text-5xl font-extrabold mb-8" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
        Últimas Notícias
      </h1>

      {loading ? (
        <div className="py-16 grid place-items-center"><UltraSpinner size={84} label="A carregar…" /></div>
      ) : items.length === 0 ? (
        <p className="opacity-70">Ainda não há notícias publicadas.</p>
      ) : (
        <ul className="divide-y divide-[#fbfbfb]">
          {items.map((n) => {
            const d = n.published_at ? new Date(n.published_at) : null;
            const dia = d ? d.getDate().toString().padStart(2,"0") : "--";
            const mes = d ? d.toLocaleString("pt-PT",{ month:"short" }) : "--";
            const ano = d ? d.getFullYear() : "--";
            return (
              <li key={n.id} className="py-6 group">
                <Link to={`/news/${n.slug}`} className="grid md:grid-cols-[160px_1fr_auto] gap-6 items-center">
                  {/* imagem */}
                  <div className="h-28 w-full border border-[#6c6c6c] overflow-hidden">
                    {n.cover_url ? (
                      <img src={n.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs opacity-60">Sem imagem</div>
                    )}
                  </div>

                  {/* data + texto */}
                  <div className="grid md:grid-cols-[90px_1fr] gap-4 items-center">
                    {/* data */}
                    <div className="text-center">
                      <div className="text-4xl leading-none font-extrabold">{dia}</div>
                      <div className="text-sm uppercase">{mes}</div>
                      <div className="text-xs opacity-70">{ano}</div>
                    </div>
                    {/* conteúdo */}
                    <div>
                      <h3 className="font-semibold transition group-hover:text-[#e53e30]">{n.title}</h3>
                      {n.excerpt && <p className="opacity-80 mt-1">{n.excerpt}</p>}
                    </div>
                  </div>

                  {/* seta */}
                  <div className="justify-self-end">
                    <ArrowUpRight className="w-8 h-8 transition group-hover:text-[#e53e30]" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </StaticPageShell>
  );
}
