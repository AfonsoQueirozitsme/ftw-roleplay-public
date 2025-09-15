// /src/pages/dashboard/RulesTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft } from "lucide-react";
import Spinner from "@/components/layout/Spinner";

type Post = {
  id: string;
  title: string;
  date: string;       // ISO
  tags: string[];
  content: string;    // markdown leve
};

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

/* — Markdown leve e seguro (inline) — */
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
}
function mdToHtml(src: string) {
  let s = escapeHtml(src);
  s = s.replace(/`([^`]+)`/g, (_m, p1) => `<code class="px-1 py-0.5 bg-[#151515] border border-[#6c6c6c]">${p1}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=([\s.,;:!?)])|$)/g, (_m, p1, p2) => `${p1}<em>${p2}</em>`);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a class="underline underline-offset-2" href="$2" target="_blank" rel="noopener noreferrer">$1</a>`);
  s = s.replace(/^(?:-|\u2022)\s+(.*)$/gm, "• $1");
  s = s.replace(/\n/g, "<br/>");
  return s;
}

/* — Conteúdo seed — */
const SEED_POSTS: Post[] = [
  {
    id: "ea-1",
    title: "Como funciona o Early Access",
    date: "2025-08-01",
    tags: ["early-access", "guia", "início"],
    content: `O **Early Access** dá-te entrada faseada ao FTW Roleplay.  
- Slots são **limitados**.  
- A candidatura é avaliada por critérios de **comportamento**, **RP** e **histórico**.  
Sugestão: prepara **backstory**, lê as *regras principais* e garante que tens o **Discord** verificado.`,
  },
  {
    id: "ea-2",
    title: "Requisitos técnicos e performance",
    date: "2025-08-03",
    tags: ["performance", "técnico"],
    content: `Para uma experiência estável:  
- Ligações **estáveis** (> 20 Mbps)  
- FPS: ideal > **60**  
- Fecha apps pesadas antes de entrar.  
Problemas? Vê o tópico **Troubleshooting** ou abre um \`Report\`.`,
  },
  {
    id: "ea-3",
    title: "Economia, empregos e empresas",
    date: "2025-08-05",
    tags: ["economia", "gameplay"],
    content: `A economia é **progressiva**: começa com **tarefas base** e evolui para **empregos especializados**.  
Empresas **player-owned** abrem em *waves*.  
Lê o *roadmap* de carreiras e evita *powergaming*/ *metagaming*.`,
  },
  {
    id: "ea-4",
    title: "Polícia, crime e equilíbrio",
    date: "2025-08-06",
    tags: ["polícia", "crime", "equilíbrio"],
    content: `A polícia segue *guidelines* de **proporcionalidade**.  
Gangues têm limites por **slot** e **tempo de resposta**.  
Objetivo: **tensão** sem perder **realismo**. Denúncias? Usa o separador **Reports**.`,
  },
  {
    id: "ea-5",
    title: "FAQs e Troubleshooting",
    date: "2025-08-10",
    tags: ["faq", "ajuda"],
    content: `**Não consigo ligar?** Limpa cache do FiveM e reinicia o Discord.  
**Crashou?** Verifica drivers e reduz *textures*.  
**Ban appeals?** Só via **Reports**.  
Mais dúvidas? Junta-te ao Discord em #suporte.`,
  },
  {
    id: "ea-6",
    title: "Calendário de eventos e wipes",
    date: "2025-08-15",
    tags: ["eventos", "wipes", "cronograma"],
    content: `Eventos semanais **PVE/PVP** e *mini-arcs* RP.  
**Wipes** só por necessidade de equilíbrio, sempre com **aviso**.  
Consulta o calendário no **dashboard** e no **Discord**.`,
  },
];

/* — Util — */
function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function excerpt(s: string, n = 140) {
  const t = s.replace(/\n/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export default function RulesTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // estados para o spinner
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // debounce visual do search → mostra spinner enquanto "procura"
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

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEED_POSTS;
    return SEED_POSTS.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [query]);

  const active = useMemo(() => SEED_POSTS.find(p => p.id === selected) || null, [selected]);

  return (
    <section
      className="bg-[#151515] border border-[#6c6c6c] p-6 rounded-none"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif", color: "#fbfbfb" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-[#6c6c6c] uppercase">Informação</p>
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
              placeholder="Pesquisar posts…"
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
                    <Spinner className="w-4 h-4" />
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
              {posts.length} post{posts.length !== 1 ? "s" : ""}
            </span>
            {active && (
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-2 px-3 py-1 border border-[#6c6c6c] text-sm hover:bg-[#fbfbfb]/10 rounded-none"
              >
                <span className="inline-block -rotate-180">↩</span> Voltar
              </button>
            )}
          </div>

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
                          {formatDate(p.date)} • {excerpt(p.content)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.tags.map((t) => (
                            <button
                              key={t}
                              onClick={(e) => { e.stopPropagation(); setQuery(t); }}
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
                    <Spinner className="w-6 h-6" />
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
                          {formatDate(active.date)} •{" "}
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
                      dangerouslySetInnerHTML={{ __html: mdToHtml(active.content) }}
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
