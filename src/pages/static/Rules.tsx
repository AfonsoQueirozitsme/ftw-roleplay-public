// src/pages/Rules.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/* ───────────────────────────── Types ───────────────────────────── */
type RuleItem = {
  id: string;
  title: string;
  description?: string;
  order?: number | null;
};

type RuleSection = {
  id: string;
  title: string;
  subtitle?: string;
  color: string;
  gradient: string;
  iconPath: string;
  rules: RuleItem[];
};

type SectionResult = RuleSection & {
  filteredRules: RuleItem[];
  matchesTitle: boolean;
};

/* ───────────────────────────── Helpers ───────────────────────────── */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlight = (source: string, q: string) => {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return source;
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = source.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === trimmed ? (
      <mark key={`${part}-${i}`} className="bg-[hsl(7_76%_54%_/0.18)] px-1 text-[hsl(7_76%_54%)]">
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${i}`}>{part}</React.Fragment>
    )
  );
};

const Icon = ({ path }: { path: string }) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
);

/* Paleta HSL (alinha com Punishments.tsx) */
const PALETTE = [
  {
    color: "text-[hsl(7_76%_54%)]",
    gradient: "from-[hsl(7_76%_54%)] to-[hsl(12_85%_60%)]",
    iconPath: "M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z",
  },
  {
    color: "text-[hsl(190_100%_80%)]",
    gradient: "from-[hsl(195_74%_55%)] to-[hsl(210_80%_55%)]",
    iconPath:
      "M4 4h16a2 2 0 0 1 2 2v4.5a2 2 0 0 1-1.106 1.788l-8 4a2 2 0 0 1-1.788 0l-8-4A2 2 0 0 1 2 10.5V6a2 2 0 0 1 2-2zm0 8.618V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.382l-7.106 3.553a4 4 0 0 1-3.788 0z",
  },
  {
    color: "text-[hsl(40_100%_60%)]",
    gradient: "from-[hsl(40_100%_55%)] to-[hsl(22_95%_55%)]",
    iconPath: "M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z",
  },
  {
    color: "text-[hsl(150_70%_60%)]",
    gradient: "from-[hsl(150_60%_50%)] to-[hsl(140_60%_45%)]",
    iconPath:
      "M12 2a10 10 0 100 20 10 10 0 000-20zm-1 15l-4-4 1.414-1.414L11 13.172l5.586-5.586L18 9l-7 8z",
  },
];

/* Etapas (mantém coerência visual com Punishments) */
const enforcementStages = [
  { label: "1.ª Ocorrência", detail: "Aviso", color: "text-[hsl(45_100%_60%)]" },
  { label: "2.ª Ocorrência", detail: "Ban 24h", color: "text-[hsl(24_95%_60%)]" },
  { label: "3.ª Ocorrência", detail: "Ban Permanente", color: "text-[hsl(0_80%_60%)]" },
];

/* ───────────────────────────── Component ───────────────────────────── */
const Rules: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("");
  const [sections, setSections] = useState<RuleSection[]>([]);
  const [loading, setLoading] = useState(false);

  // Coluna esquerda (container do índice) + o próprio índice
  const containerRef = useRef<HTMLDivElement | null>(null);
  const indexRef = useRef<HTMLDivElement | null>(null);

  // Coluna direita (conteúdo) — usamos como "limites" do movimento
  const boundsRef = useRef<HTMLDivElement | null>(null);

  const [indexStyle, setIndexStyle] = useState<React.CSSProperties>({});
  const TOP_OFFSET = 112; // ~ top-28 (7rem). Ajusta ao teu header/navbar.
  const BOTTOM_MARGIN = 24;

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const trimmedQuery = query.trim().toLowerCase();

  /* BD: mesmas queries do AdminRulesPage */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: categoriesData, error: categoriesErr } = await supabase
          .from("rule_categories")
          .select("id,name,description")
          .order("id", { ascending: true });

        if (categoriesErr) throw categoriesErr;

        const { data: rulesData, error: rulesErr } = await supabase
          .from("rules")
          .select("id,category_id,title,description,order,active")
          .order("order", { ascending: true })
          .order("id", { ascending: true });

        if (rulesErr) throw rulesErr;
        if (!alive) return;

        const byId = new Map<number, RuleSection>();
        (categoriesData ?? []).forEach((cat, idx) => {
          const style = PALETTE[idx % PALETTE.length];
          byId.set(cat.id, {
            id: String(cat.id),
            title: cat.name,
            subtitle: cat.description ?? undefined,
            color: style.color,
            gradient: style.gradient,
            iconPath: style.iconPath,
            rules: [],
          });
        });

        (rulesData ?? []).forEach((r) => {
          if (r.active === false) return;
          const s = byId.get(r.category_id);
          if (!s) return;
          s.rules.push({
            id: String(r.id),
            title: r.title,
            description: r.description ?? undefined,
            order: r.order ?? null,
          });
        });

        const final = Array.from(byId.values())
          .map((s) => ({
            ...s,
            rules: [...s.rules].sort((a, b) => {
              const oa = a.order ?? 0;
              const ob = b.order ?? 0;
              if (oa !== ob) return oa - ob;
              return a.title.localeCompare(b.title);
            }),
          }))
          .sort((a, b) => Number(a.id) - Number(b.id));

        setSections(final);
        if (final.length && !activeSection) setActiveSection(final[0].id);
      } catch {
        setSections([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Filtro */
  const results = useMemo<SectionResult[]>(() => {
    if (!trimmedQuery) return sections.map((s) => ({ ...s, filteredRules: s.rules, matchesTitle: false }));
    return sections
      .map((section) => {
        const matchesTitle = section.title.toLowerCase().includes(trimmedQuery);
        const matchedRules = section.rules.filter((rule) => {
          const haystack = `${rule.title} ${rule.description ?? ""}`.toLowerCase();
          return haystack.includes(trimmedQuery);
        });
        if (!matchesTitle && matchedRules.length === 0) return null;
        const filteredRules = matchesTitle && matchedRules.length === 0 ? section.rules : matchedRules;
        return { ...section, filteredRules, matchesTitle };
      })
      .filter(Boolean) as SectionResult[];
  }, [trimmedQuery, sections]);

  /* Active section */
  useEffect(() => {
    if (!results.length) {
      setActiveSection("");
      return;
    }
    if (!results.some((s) => s.id === activeSection)) setActiveSection(results[0].id);
  }, [results, activeSection]);

  /* IntersectionObserver para realçar secção ativa */
  useEffect(() => {
    if (!results.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-section-id");
          if (id && id !== activeSection) setActiveSection(id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0.15, 0.4, 0.75] }
    );
    results.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  /* Smart-sticky: segue o scroll, limitado pelo conteúdo da direita (boundsRef) */
  useEffect(() => {
    const elContainer = containerRef.current; // coluna esquerda (para posicionar)
    const elIndex = indexRef.current;         // card do índice
    const elBounds = boundsRef.current;       // coluna direita (limites)
    if (!elContainer || !elIndex || !elBounds) return;

    const recalc = () => {
      // Top/Bottom absolutos da coluna direita (limites)
      const boundsRect = elBounds.getBoundingClientRect();
      const boundsTop = window.scrollY + boundsRect.top;
      const boundsBottom = boundsTop + elBounds.offsetHeight;

      // Top absoluto do container do índice (para converter em coordenada relativa)
      const containerRect = elContainer.getBoundingClientRect();
      const containerTopAbs = window.scrollY + containerRect.top;

      const indexHeight = elIndex.offsetHeight;
      const maxY = boundsBottom - indexHeight - BOTTOM_MARGIN;
      const clampedAbsY = Math.min(
        Math.max(window.scrollY + TOP_OFFSET, boundsTop),
        Math.max(boundsTop, maxY)
      );

      setIndexStyle({
        position: "absolute",
        top: clampedAbsY - containerTopAbs,
        left: 0,
        right: 0,
      });
    };

    recalc();
    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    const ro = new ResizeObserver(recalc);
    ro.observe(elBounds);
    ro.observe(elIndex);

    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
      ro.disconnect();
    };
  }, []);

  const handleIndexClick = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (!el) return;
    setActiveSection(sectionId);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const noResults = trimmedQuery.length > 0 && results.length === 0;

  /* ───────────────────────────── Render ───────────────────────────── */
  return (
    <div className="min-h-screen bg-[hsl(var(--ftw-bg))]">
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <header className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(7_76%_54%)]/85">Guia do Servidor</p>
            <h1 className="mt-2 text-5xl font-extrabold leading-[0.95] md:text-6xl">
              Tabela de <span className="text-[hsl(7_76%_54%)]">Regras</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[hsl(0_0%_98%_/0.7)]">
              Ao jogar nos servidores <span className="text-[hsl(7_76%_54%)] font-semibold">FTW Roleplay</span>, assumes cumprir estas regras. Violações podem
              resultar em avisos, expulsões ou banimentos permanentes. Usa o índice e a pesquisa para chegar rapidamente ao que precisas.
            </p>
          </header>

          {/* GRID: índice que segue o scroll + conteúdo */}
          <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
            {/* Coluna do índice: wrapper relativo para posicionar o aside */}
            <div ref={containerRef} className="relative hidden lg:block" aria-label="Índice de regras">
              <aside
                ref={indexRef}
                style={indexStyle}
                className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-6 max-h-[calc(100vh-140px)] overflow-auto rounded-none"
              >
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(0_0%_98%_/0.7)]">Índice</p>
                    <p className="mt-2 text-sm text-[hsl(0_0%_98%_/0.6)]">Fica sempre visível — usa para navegar pelos blocos.</p>
                  </div>

                  {loading && <p className="mt-2 text-xs text-[hsl(0_0%_98%_/0.55)]">A sincronizar com a base de dados…</p>}

                  <nav>
                    <ul className="space-y-2 text-sm">
                      {results.map((section) => {
                        const isActive = section.id === activeSection;
                        return (
                          <li key={section.id}>
                            <button
                              type="button"
                              onClick={() => handleIndexClick(section.id)}
                              className={`flex w-full items-center justify-between px-4 py-2 text-left transition border rounded-none ${
                                isActive
                                  ? "border-[hsl(0_0%_98%)] bg-[hsl(0_0%_16%)] text-white"
                                  : "border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] text-white/80 hover:bg-[hsl(0_0%_16%)]"
                              }`}
                            >
                              <span>{section.title}</span>
                              {trimmedQuery && (
                                <span className="ml-3 border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-2 py-0.5 text-xs text-white/80">
                                  {section.filteredRules.length}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <div className="border border-[hsl(0_0%_18%)] p-4 text-sm text-white/90 bg-[hsl(0_0%_12%)] rounded-none">
                    <p className="font-semibold text-white">Nova!</p>
                    <p>
                      Consulta também as{" "}
                      <Link to="/punishments" className="text-[hsl(7_76%_54%)] underline underline-offset-4 hover:opacity-90">
                        punições aplicáveis
                      </Link>{" "}
                      para perceber o que acontece quando uma regra é quebrada.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            {/* CONTEÚDO (limites do movimento do índice) */}
            <div ref={boundsRef} className="space-y-10">
              {/* Pesquisa */}
              <div>
                <label htmlFor="rules-search" className="text-sm font-semibold text-[hsl(0_0%_98%_/0.7)]">
                  Pesquisa
                </label>
                <div className="mt-2 flex items-center border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-4 py-3 rounded-none">
                  <svg className="mr-3 h-5 w-5 text-white/60" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.5 11.5l4 4m-2.5-6a5 5 0 11-10 0 5 5 0 0110 0z" />
                  </svg>
                  <input
                    id="rules-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Procura regras, termos ou palavras-chave…"
                    className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/50"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] px-3 py-1 text-sm text-white/80 hover:bg-[hsl(0_0%_16%)] rounded-none"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {trimmedQuery && !noResults && (
                  <p className="mt-2 text-sm text-[hsl(0_0%_98%_/0.6)]">
                    {results.reduce((acc, s) => acc + s.filteredRules.length, 0)} resultado(s) encontrados.
                  </p>
                )}
                {noResults && (
                  <div className="mt-4 border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-6 text-sm text-white/90 rounded-none">
                    <p className="font-semibold text-white">Sem resultados</p>
                    <p className="mt-2">
                      Não encontrámos regras para <span className="text-[hsl(7_76%_54%)]">“{query}”</span>. Ajusta os termos ou remove a pesquisa.
                    </p>
                  </div>
                )}
              </div>

              {/* Secções */}
              {!noResults &&
                results.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    data-section-id={section.id}
                    ref={(el) => {
                      sectionRefs.current[section.id] = el;
                    }}
                    className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-8 rounded-none scroll-mt-28"
                  >
                    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center bg-gradient-to-br ${section.gradient} text-black`}>
                          <Icon path={section.iconPath} />
                        </div>
                        <div>
                          <h2 className={`text-2xl font-bold ${section.color}`}>{highlight(section.title, query)}</h2>
                          {section.subtitle && <p className="text-sm text-white/70">{section.subtitle}</p>}
                        </div>
                      </div>
                      {trimmedQuery && (
                        <span className="inline-flex items-center border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-4 py-1 text-xs text-white/80 rounded-none">
                          {section.filteredRules.length} resultado(s)
                        </span>
                      )}
                    </header>

                    <ul className="space-y-5">
                      {section.filteredRules.map((rule) => (
                        <li key={rule.id} className="flex items-start gap-4">
                          <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-gradient-to-br ${section.gradient}`} />
                          <div className="leading-relaxed text-white/90">
                            <p className="font-semibold text-white">{highlight(rule.title, query)}</p>
                            {rule.description && (
                              <p className="mt-1 text-sm text-white/80">{highlight(rule.description, query)}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

              {/* Política de aplicação (último card) */}
              <section className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-8 rounded-none">
                <header className="mb-6">
                  <h3 className="text-2xl font-bold text-[hsl(7_76%_54%)]">Política de Aplicação</h3>
                  <p className="mt-3 text-white/80">
                    Violações são tratadas com seriedade. Infracções leves podem dar lugar a aviso, mas casos graves podem
                    resultar em ação imediata. Reincidência implica sanções progressivas que escalam rapidamente.
                  </p>
                </header>
                <div className="grid gap-4 md:grid-cols-3">
                  {enforcementStages.map((stage) => (
                    <div
                      key={stage.label}
                      className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] p-5 text-center rounded-none"
                    >
                      <p className={`text-sm font-semibold uppercase tracking-wide ${stage.color}`}>{stage.label}</p>
                      <p className="mt-2 text-base text-white/90">{stage.detail}</p>
                    </div>
                  ))}
                </div>
                <footer className="mt-6 flex flex-col gap-3 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
                  <p>Em caso de dúvida ou para reportar situações, abre ticket no Discord oficial.</p>
                  <Link
                    to="/punishments"
                    className="inline-flex items-center gap-2 border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] px-4 py-2 text-[hsl(7_76%_54%)] hover:bg-[hsl(0_0%_16%)] rounded-none"
                  >
                    <span>Ver tabela de punições</span>
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M9.5 3a.5.5 0 000 1h2.793L5.146 11.146a.5.5 0 10.707.707L13 4.707V7.5a.5.5 0 001 0v-4a.5.5 0 00-.5-.5h-4z" />
                    </svg>
                  </Link>
                </footer>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Rules;
