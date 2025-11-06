// /src/pages/dashboard/RulesTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner";
import { supabase } from "@/lib/supabase";
import { markdownToHtml } from "@/utils/markdown";

type Post = {
  id: string;
  title: string;
  date: string;       // ISO
  tags: string[];
  content: string;    // markdown leve
};

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

const SEED_POSTS: Post[] = [
  {
    id: "ea-1",
    title: "Como funciona o Early Access",
    date: "2025-08-01",
    tags: ["early-access", "guia", "inÃ­cio"],
    content: `O **Early Access** dÃ¡-te entrada faseada ao FTW Roleplay.  
- Slots sÃ£o **limitados**.  
- A candidatura Ã© avaliada por critÃ©rios de **comportamento**, **RP** e **histÃ³rico**.  
SugestÃ£o: prepara **backstory**, lÃª as *regras principais* e garante que tens o **Discord** verificado.`,
  },
  {
    id: "ea-2",
    title: "Requisitos tÃ©cnicos e performance",
    date: "2025-08-03",
    tags: ["performance", "tÃ©cnico"],
    content: `Para uma experiÃªncia estÃ¡vel:  
- LigaÃ§Ãµes **estÃ¡veis** (> 20 Mbps)  
- FPS: ideal > **60**  
- Fecha apps pesadas antes de entrar.  
Problemas? VÃª o tÃ³pico **Troubleshooting** ou abre um \`Report\`.`,
  },
  {
    id: "ea-3",
    title: "Economia, empregos e empresas",
    date: "2025-08-05",
    tags: ["economia", "gameplay"],
    content: `A economia Ã© **progressiva**: comeÃ§a com **tarefas base** e evolui para **empregos especializados**.  
Empresas **player-owned** abrem em *waves*.  
LÃª o *roadmap* de carreiras e evita *powergaming*/ *metagaming*.`,
  },
  {
    id: "ea-4",
    title: "PolÃ­cia, crime e equilÃ­brio",
    date: "2025-08-06",
    tags: ["polÃ­cia", "crime", "equilÃ­brio"],
    content: `A polÃ­cia segue *guidelines* de **proporcionalidade**.  
Gangues tÃªm limites por **slot** e **tempo de resposta**.  
Objetivo: **tensÃ£o** sem perder **realismo**. DenÃºncias? Usa o separador **Reports**.`,
  },
  {
    id: "ea-5",
    title: "FAQs e Troubleshooting",
    date: "2025-08-10",
    tags: ["faq", "ajuda"],
    content: `**NÃ£o consigo ligar?** Limpa cache do FiveM e reinicia o Discord.  
**Crashou?** Verifica drivers e reduz *textures*.  
**Ban appeals?** SÃ³ via **Reports**.  
Mais dÃºvidas? Junta-te ao Discord em #suporte.`,
  },
  {
    id: "ea-6",
    title: "CalendÃ¡rio de eventos e wipes",
    date: "2025-08-15",
    tags: ["eventos", "wipes", "cronograma"],
    content: `Eventos semanais **PVE/PVP** e *mini-arcs* RP.  
**Wipes** sÃ³ por necessidade de equilÃ­brio, sempre com **aviso**.  
Consulta o calendÃ¡rio no **dashboard** e no **Discord**.`,
  },
];

/* â€” Util â€” */
function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function excerpt(s: string, n = 140) {
  const t = s.replace(/\n/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "â€¦" : t;
}

export default function RulesTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sourcePosts, setSourcePosts] = useState<Post[]>(SEED_POSTS);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // estados para o spinner
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // debounce visual do search â†’ mostra spinner enquanto "procura"
  useEffect(() => {
    if (!query) { setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => setSearching(false), 350);
    return () => clearTimeout(t);
  }, [query]);

  // mini-loading ao trocar de post (simula fetch/UX suave)
  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    const t = setTimeout(() => setDetailLoading(false), 250);
    return () => clearTimeout(t);
  }, [selected]);

  useEffect(() => {
    if (selected && !sourcePosts.some((p) => p.id === selected)) {
      setSelected(null);
    }
  }, [selected, sourcePosts]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingPosts(true);
      try {
        const { data, error } = await supabase
          .from("player_info_posts")
          .select("id,title,content,tags,published_at,created_at")
          .order("published_at", { ascending: false, nullsLast: false })
          .order("created_at", { ascending: false, nullsLast: false });

        if (!ignore && !error && data) {
          const mapped: Post[] = data.map((row) => ({
            id: row.id,
            title: row.title ?? "Sem tÃ­tulo",
            date: row.published_at ?? row.created_at ?? new Date().toISOString(),
            tags: Array.isArray(row.tags)
              ? row.tags
                  .map((t) => (typeof t === "string" ? t.trim() : ""))
                  .filter((t): t is string => Boolean(t))
              : [],
            content: row.content ?? "",
          }));
          setSourcePosts(mapped);
        }
      } catch (err) {
        console.error("Falha a carregar posts da Ã¡rea de jogadores", err);
      } finally {
        if (!ignore) setLoadingPosts(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sourcePosts.length ? sourcePosts : SEED_POSTS;
    if (!q) return list;
    return list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [query, sourcePosts]);

  const active = useMemo(() => posts.find((p) => p.id === selected) || null, [posts, selected]);

  return (
    <section
      className="bg-[#151515] border border-[#6c6c6c] p-6 rounded-none"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif", color: "#fbfbfb" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-[#6c6c6c] uppercase">InformaÃ§Ã£o</p>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
          >
            Servidor & Early Access
          </h2>
        </div>

        {/* Search */}
        <div className="w-full max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6c6c6c]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar postsâ€¦"
              className={`w-full pl-9 pr-10 py-2 bg-[#151515] border border-[#6c6c6c] text-sm rounded-none ${RING}`}
            />
            {/* spinner do search */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <AnimatePresence>
                {searching && (
                  <motion.div
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <UltraSpinner size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Corpo: lista + detalhe */}
      <div className="flex gap-6">
        {/* LISTA */}
        <div className={`transition-all ${active ? "w-[380px]" : "w-full"} flex-shrink-0`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#fbfbfb]/80">
              {loadingPosts ? "A sincronizar..." : `${posts.length} post${posts.length !== 1 ? "s" : ""}`}
            </span>
            {active && (
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-2 px-3 py-1 border border-[#6c6c6c] text-sm hover:bg-[#fbfbfb]/10 rounded-none"
              >
                <span className="inline-block -rotate-180">â†©</span> Voltar
              </button>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#6c6c6c] px-4 py-10 text-center text-sm text-[#fbfbfb]/60">
              Sem publicaÃ§Ãµes disponÃ­veis no momento.
            </div>
          ) : (
            <ul className="divide-y divide-[#6c6c6c]">
              {posts.map((p) => {
                const isActive = p.id === active?.id;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelected(p.id)}
                      className={`w-full text-left p-4 transition ${RING} ${
                        isActive
                          ? "bg-[#fbfbfb]/5 border border-[#e53e30]"
                          : "bg-[#151515] border border-transparent hover:bg-[#fbfbfb]/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className={`text-[15px] font-semibold ${isActive ? "text-[#e53e30]" : ""}`}>
                            {p.title}
                          </h3>
                          <p className="text-xs text-[#fbfbfb]/70 mt-0.5">
                            {formatDate(p.date)} â€¢ {excerpt(p.content)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {p.tags.map((t) => (
                              <button
                                key={t}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuery(t);
                                }}
                                className="text-[11px] px-2 py-0.5 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 rounded-none"
                                title={`Filtrar por "${t}"`}
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* DETALHE */}
        <AnimatePresence mode="wait">
          {active && (
            <motion.aside
              key={active.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 min-w-0"
            >
              <div className="border border-[#6c6c6c] p-6 rounded-none min-h-[260px]">
                {detailLoading ? (
                  <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                    <UltraSpinner size={24} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className="text-xl font-bold"
                          style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
                        >
                          {active.title}
                        </h3>
                        <p className="text-xs text-[#fbfbfb]/70 mt-1">
                          {formatDate(active.date)} â€¢{" "}
                          {active.tags.map((t) => (
                            <button
                              key={t}
                              onClick={() => setQuery(t)}
                              className="underline underline-offset-2 hover:text-[#e53e30] mr-2"
                              title={`Filtrar por "${t}"`}
                            >
                              #{t}
                            </button>
                          ))}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="h-8 px-3 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 text-sm rounded-none"
                        aria-label="Fechar detalhe"
                      >
                        Fechar
                      </button>
                    </div>

                    <div
                      className="mt-4 text-[15px] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(active.content) }}
                    />
                  </>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}



