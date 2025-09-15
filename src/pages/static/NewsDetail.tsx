// src/pages/static/NewsDetail.tsx
import React, { useEffect, useState } from "react";
import StaticPageShell from "./StaticPageShell";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import UltraSpinner from "@/components/layout/Spinner";
import { ArrowLeft } from "lucide-react";

type NewsOne = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  published_at: string | null;
};

export default function NewsDetail() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<NewsOne | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("slug", slug)
        .limit(1)
        .single();
      if (!error) setItem((data as NewsOne) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <StaticPageShell>
        <div className="py-16 grid place-items-center"><UltraSpinner size={84} label="A carregar…" /></div>
      </StaticPageShell>
    );
  }

  if (!item) {
    return (
      <StaticPageShell>
        <p className="opacity-70">Notícia não encontrada.</p>
      </StaticPageShell>
    );
  }

  const d = item.published_at ? new Date(item.published_at) : null;
  const dateText = d ? d.toLocaleString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }) : "";

  return (
    <StaticPageShell>
      <Link to="/news" className="inline-flex items-center gap-2 mb-6 border border-[#6c6c6c] px-3 py-2 hover:bg-[#fbfbfb]/10 transition">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <h1 className="text-3xl md:text-5xl font-extrabold mb-3" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
        {item.title}
      </h1>
      {dateText && <div className="text-sm opacity-70 mb-6">{dateText}</div>}

      {item.cover_url && (
        <div className="mb-6 w-full max-h-[480px] border border-[#6c6c6c] overflow-hidden">
          <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {item.excerpt && <p className="opacity-85 text-lg mb-4">{item.excerpt}</p>}
      {item.content ? (
        <article className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{item.content}</p>
        </article>
      ) : (
        <p className="opacity-75">Sem conteúdo adicional.</p>
      )}
    </StaticPageShell>
  );
}
