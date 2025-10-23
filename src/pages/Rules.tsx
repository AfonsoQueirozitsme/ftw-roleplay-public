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

/* ───────────────────────────── UI helpers ───────────────────────────── */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Icon = ({ path }: { path: string }) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
);

/* Paleta base para cores/gradientes/ícones (cíclica pelas categorias) */
const PALETTE = [
  {
    color: "text-red-500",
    gradient: "from-red-500 to-red-400",
    iconPath: "M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z",
  },
  {
    color: "text-sky-400",
    gradient: "from-sky-500 to-blue-500",
    iconPath:
      "M4 4h16a2 2 0 0 1 2 2v4.5a2 2 0 0 1-1.106 1.788l-8 4a2 2 0 0 1-1.788 0l-8-4A2 2 0 0 1 2 10.5V6a2 2 0 0 1 2-2zm0 8.618V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.382l-7.106 3.553a4 4 0 0 1-3.788 0z",
  },
  {
    color: "text-amber-400",
    gradient: "from-amber-500 to-orange-500",
    iconPath: "M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z",
  },
  {
    color: "text-emerald-400",
    gradient: "from-emerald-500 to-green-500",
    iconPath:
      "M12 2a10 10 0 100 20 10 10 0 000-20zm-1 15l-4-4 1.414-1.414L11 13.172l5.586-5.586L18 9l-7 8z",
  },
];

/* Etapas de aplicação (exemplo) */
const enforcementStages = [
  { label: "1.ª Ocorrência", detail: "Aviso", color: "text-yellow-500" },
  { label: "2.ª Ocorrência", detail: "Ban 24h", color: "text-orange-500" },
  { label: "3.ª Ocorrência", detail: "Ban Permanente", color: "text-red-600" },
];

/* ───────────────────────────── Component ───────────────────────────── */
const Rules: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("");
  const [sections, setSections] = useState<RuleSection[]>([]);
  const [loading, setLoading] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const trimmedQuery = query.trim().toLowerCase();

  /* ── Carregar categorias + regras da BD (como no teu AdminRulesPage) ── */
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

        const palette = PALETTE;
        const byId = new Map<number, RuleSection>();

        (categoriesData ?? []).forEach((cat, idx) => {
          const style = palette[idx % palette.length];
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
        // Mantém-se vazio se falhar — a página depende da BD.
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

  /* ── Filtro de pesquisa ── */
  const results = useMemo<SectionResult[]>(() => {
    if (!trimmedQuery) {
      return sections.map((s) => ({ ...s, filteredRules: s.rules, matchesTitle: false }));
    }
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

  /* ── Sincronizar activeSection com resultados ── */
  useEffect(() => {
    if (!results.length) {
      setActiveSection("");
      return;
    }
    if (!results.some((s) => s.id === activeSection)) {
      setActiveSection(results[0].id);
    }
  }, [results, activeSection]);

  /* ── Observador para ativar a secção visível ── */
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

  /* ── Helpers de UI ── */
  const highlightText = (text: string) => {
    if (!trimmedQuery) return text;
    const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "ig");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === trimmedQuery ? (
        <mark key={`${part}-${i}`} className="bg-red-500/20 px-1 text-red-300">
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${part}-${i}`}>{part}</React.Fragment>
      )
    );
  };

  const handleIndexClick = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (!el) return;
    setActiveSection(sectionId);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const noResults = trimmedQuery.length > 0 && results.length === 0;

  /* ───────────────────────────── Render ───────────────────────────── */
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Cabeçalho */}
        <header className="mb-10 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[0.95]">
            Server <span className="text-red-500">Rules</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/70">
            Ao jogar nos servidores <span className="text-red-400 font-semibold">FTW Roleplay</span>,
            assumes cumprir estas regras. Violações podem resultar em avisos, expulsões ou banimentos
            permanentes. Usa o índice e a pesquisa para chegar rapidamente ao ponto que precisas.
          </p>
        </header>

        {/* INDEX FLOATING (fixo) — só desktop; o conteúdo passa por trás */}
        <aside
          className="
            hidden lg:block
            fixed left-8 top-28 z-40 w-[260px]
            border border-white/10 bg-white/5 p-6 backdrop-blur-xl
            shadow-[0_12px_40px_rgba(0,0,0,0.35)]
          "
          aria-label="Índice de regras"
        >
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Índice</p>
              <p className="mt-2 text-sm text-white/60">
                Fica sempre visível — usa para navegar pelos blocos.
              </p>
            </div>

            {loading && <p className="mt-2 text-xs text-white/55">A sincronizar com a base de dados…</p>}

            <nav>
              <ul className="space-y-2 text-sm">
                {results.map((section) => {
                  const isActive = section.id === activeSection;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => handleIndexClick(section.id)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left transition ${
                          isActive
                            ? "bg-white/15 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{section.title}</span>
                        {trimmedQuery && (
                          <span className="ml-3 bg-black/50 px-2 py-0.5 text-xs">
                            {section.filteredRules.length}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border border-red-500/30 bg-red-500/5 p-4 text-sm text-white/70">
              <p className="font-semibold text-white">Nova!</p>
              <p>
                Consulta também as{" "}
                <Link to="/punishments" className="text-red-400 underline">
                  punições aplicáveis
                </Link>{" "}
                para perceber o que acontece quando uma regra é quebrada.
              </p>
            </div>
          </div>
        </aside>

        {/* Conteúdo — cria margem à esquerda para não ficar por baixo do índice */}
        <div className="lg:ml-[300px]">
          {/* Índice compacto (mobile) */}
          <div className="lg:hidden">
            <div className="border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Índice</p>
              <div className="mt-4 flex gap-3 overflow-x-auto">
                {results.map((section) => {
                  const isActive = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleIndexClick(section.id)}
                      className={`whitespace-nowrap px-4 py-2 text-sm transition ${
                        isActive ? "bg-red-500 text-black" : "bg-white/10 text-white/80"
                      }`}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pesquisa */}
          <div className="mt-10">
            <label htmlFor="rules-search" className="text-sm font-semibold text-white/60">
              Pesquisa
            </label>
            <div className="mt-2 flex items-center border border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
              <svg
                className="mr-3 h-5 w-5 text-white/40"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.5 11.5l4 4m-2.5-6a5 5 0 11-10 0 5 5 0 0110 0z" />
              </svg>
              <input
                id="rules-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procura regras, termos ou palavras-chave…"
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20"
                >
                  Limpar
                </button>
              )}
            </div>
            {trimmedQuery && !noResults && (
              <p className="mt-2 text-sm text-white/50">
                {results.reduce((acc, s) => acc + s.filteredRules.length, 0)} resultado(s) encontrados
              </p>
            )}
            {noResults && (
              <div className="mt-4 border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                <p className="font-semibold text-white">Sem resultados</p>
                <p className="mt-2">
                  Não encontrámos regras para <span className="text-red-400">“{query}”</span>. Ajusta os termos ou remove a
                  pesquisa para ver a lista completa.
                </p>
              </div>
            )}
          </div>

          {/* Listagem de secções + regras (com scroll-mt para compensar cabeçalhos fixos) */}
          {!noResults &&
            results.map((section) => (
              <section
                key={section.id}
                id={section.id}
                data-section-id={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                className="mt-10 border border-white/10 bg-white/[0.06] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl scroll-mt-28"
              >
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center bg-gradient-to-br ${section.gradient} text-black shadow-lg`}>
                      <Icon path={section.iconPath} />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${section.color}`}>{highlightText(section.title)}</h2>
                      {section.subtitle && <p className="text-sm text-white/60">{section.subtitle}</p>}
                    </div>
                  </div>
                  {trimmedQuery && (
                    <span className="border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      {section.filteredRules.length} resultado(s)
                    </span>
                  )}
                </header>
                <ul className="space-y-5">
                  {section.filteredRules.map((rule) => (
                    <li key={rule.id} className="flex items-start gap-4">
                      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-gradient-to-br ${section.gradient} shadow-[0_0_0_4px_rgba(255,255,255,0.12)]`} />
                      <div className="leading-relaxed text-white/90">
                        <p className="font-semibold text-white">{highlightText(rule.title)}</p>
                        {rule.description && (
                          <p className="mt-1 text-sm text-white/70">{highlightText(rule.description)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

          {/* Política de aplicação */}
          <section className="mt-10 border border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-red-500/10 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <header className="mb-6">
              <h3 className="text-2xl font-bold text-red-500">Política de Aplicação</h3>
              <p className="mt-3 text-white/70">
                Violações são tratadas com seriedade. Infracções leves podem levar apenas a aviso, mas casos graves podem
                resultar em ação imediata. Reincidência implica sanções progressivas que escalam rapidamente.
              </p>
            </header>
            <div className="grid gap-4 md:grid-cols-3">
              {enforcementStages.map((stage) => (
                <div key={stage.label} className="border border-white/10 bg-black/40 p-5 text-center shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
                  <p className={`text-sm font-semibold uppercase tracking-wide ${stage.color}`}>{stage.label}</p>
                  <p className="mt-2 text-base text-white/80">{stage.detail}</p>
                </div>
              ))}
            </div>
            <footer className="mt-6 flex flex-col gap-3 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
              <p>Em caso de dúvida ou para reportar situações, abre ticket no Discord oficial.</p>
              <Link
                to="/punishments"
                className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-300 transition hover:border-red-500 hover:bg-red-500/20"
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
    </section>
  );
};

export default Rules;
