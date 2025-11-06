// /src/pages/dashboard/RulesTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Tag, Calendar, Filter, X, ChevronRight } from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner";
import { supabase } from "@/lib/supabase";
import { markdownToHtml } from "@/utils/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Post = {
  id: string;
  title: string;
  date: string; // ISO
  tags: string[];
  content: string; // markdown leve
};

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

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
  try {
    return new Date(d).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function excerpt(s: string, n = 140) {
  const t = s.replace(/\n/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export default function RulesTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sourcePosts, setSourcePosts] = useState<Post[]>(SEED_POSTS);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // estados para o spinner
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // debounce visual do search → mostra spinner enquanto "procura"
  useEffect(() => {
    if (!query) {
      setSearching(false);
      return;
    }
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
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false, nullsFirst: false });

        if (!ignore && !error && data) {
          const mapped: Post[] = data.map((row) => ({
            id: row.id,
            title: row.title ?? "Sem título",
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
        console.error("Falha a carregar posts da área de jogadores", err);
      } finally {
        if (!ignore) setLoadingPosts(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sourcePosts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [sourcePosts]);

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sourcePosts.length ? sourcePosts : SEED_POSTS;
    let filtered = list;

    // Filtrar por tag selecionada
    if (selectedTag) {
      filtered = filtered.filter((p) => p.tags.includes(selectedTag));
    }

    // Filtrar por query
    if (q) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [query, sourcePosts, selectedTag]);

  const active = useMemo(() => posts.find((p) => p.id === selected) || null, [posts, selected]);

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <BookOpen className="w-4 h-4" />
          <span>Informação</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Regras & Info</h1>
          <p className="max-w-2xl text-sm text-white/70 leading-relaxed mt-2">
            Encontra toda a informação sobre o servidor, regras, guias e FAQs.
          </p>
        </div>
      </header>

      {/* Search e Filtros */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar posts..."
            className={`w-full pl-9 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 ${RING}`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
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

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-white/60" />
          <span className="text-xs text-white/60">Filtrar por:</span>
          <Button
            variant={selectedTag === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTag(null)}
            className="h-7 text-xs"
          >
            Todos
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(tag)}
              className="h-7 text-xs"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Posts */}
        <div className={`lg:col-span-1 space-y-3 ${selected ? "hidden lg:block" : "lg:col-span-3"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">
              {loadingPosts ? "A sincronizar..." : `${posts.length} post${posts.length !== 1 ? "s" : ""} encontrado${posts.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {posts.length === 0 ? (
            <Card className="border-white/10 bg-[#111215]/90">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/60">Sem publicações disponíveis no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => {
                const isActive = p.id === active?.id;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        isActive
                          ? "border-[#e53e30] bg-[#e53e30]/10"
                          : "border-white/10 bg-[#111215]/90 hover:border-white/20 hover:bg-white/5"
                      }`}
                      onClick={() => setSelected(p.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base mb-2 line-clamp-2">{p.title}</CardTitle>
                            <CardDescription className="text-xs text-white/60 line-clamp-2">
                              {excerpt(p.content)}
                            </CardDescription>
                          </div>
                          {isActive && (
                            <ChevronRight className="w-5 h-5 text-[#e53e30] flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            <Calendar className="w-3 h-3" />
                            {formatDate(p.date)}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.tags.slice(0, 3).map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-white/20 bg-white/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(t);
                                }}
                              >
                                {t}
                              </Badge>
                            ))}
                            {p.tags.length > 3 && (
                              <span className="text-[10px] text-white/40">+{p.tags.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalhe do Post */}
        <AnimatePresence mode="wait">
          {selected && active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="border-white/10 bg-[#111215]/90">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(null)}
                          className="lg:hidden text-white/60 hover:text-white"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Voltar
                        </Button>
                      </div>
                      <CardTitle className="text-2xl mb-2">{active.title}</CardTitle>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-white/60">
                          <Calendar className="w-4 h-4" />
                          {formatDate(active.date)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {active.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="cursor-pointer hover:bg-white/10"
                              onClick={() => {
                                setSelectedTag(t);
                                setSelected(null);
                              }}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(null)}
                      className="hidden lg:flex text-white/60 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <div className="py-20 flex items-center justify-center">
                      <UltraSpinner size={48} />
                    </div>
                  ) : (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-white/90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(active.content) }}
                      style={{
                        fontFamily: "Montserrat, system-ui, sans-serif",
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
