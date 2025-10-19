// src/pages/Rules.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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

const buildRuleItems = (
  sectionId: string,
  entries: Array<{ title: string; description?: string }>
): RuleItem[] =>
  entries.map((entry, index) => ({
    id: `${sectionId}-${index}`,
    title: entry.title,
    description: entry.description,
    order: index,
  }));

const fallbackSections: RuleSection[] = [
  {
    id: "1",
    title: "Geral",
    subtitle: "Regras gerais do servidor",
    color: "text-red-500",
    gradient: "from-red-500 to-red-400",
    iconPath: "M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z",
    rules: buildRuleItems("1", [
      { title: "Respeito", description: "Respeite todos os jogadores." },
      { title: "Sem cheats", description: "É proibido uso de cheats ou exploits." },
    ]),
  },
  {
    id: "2",
    title: "Polícia",
    subtitle: "Regras específicas para policiais",
    color: "text-sky-400",
    gradient: "from-sky-500 to-blue-500",
    iconPath:
      "M4 4h16a2 2 0 0 1 2 2v4.5a2 2 0 0 1-1.106 1.788l-8 4a2 2 0 0 1-1.788 0l-8-4A2 2 0 0 1 2 10.5V6a2 2 0 0 1 2-2zm0 8.618V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.382l-7.106 3.553a4 4 0 0 1-3.788 0z",
    rules: buildRuleItems("2", [
      { title: "Uso de armas", description: "Policiais só podem usar armas em serviço." },
    ]),
  },
  {
    id: "3",
    title: "Criminosos",
    subtitle: "Regras para atividades ilegais",
    color: "text-amber-400",
    gradient: "from-amber-500 to-orange-500",
    iconPath: "M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z",
    rules: buildRuleItems("3", [
      { title: "Assaltos", description: "Assaltos devem ser planejados e realistas." },
    ]),
  },
];

const enforcementStages = [
  { label: "1.┬¬ Ocorr├¬ncia", detail: "Aviso", color: "text-yellow-500" },
  { label: "2.┬¬ Ocorr├¬ncia", detail: "Ban 24h", color: "text-orange-500" },
  { label: "3.┬¬ Ocorr├¬ncia", detail: "Ban Permanente", color: "text-red-600" },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Icon = ({ path }: { path: string }) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
);

const Rules: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>(fallbackSections[0]?.id ?? "");
  const [ruleSectionsDb, setRuleSectionsDb] = useState<RuleSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const trimmedQuery = query.trim().toLowerCase();

  const sourceSections = ruleSectionsDb ?? fallbackSections;

  const results = useMemo<SectionResult[]>(() => {
    return sourceSections
      .map((section) => {
        if (!trimmedQuery) {
          return { ...section, filteredRules: section.rules, matchesTitle: false };
        }
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
  }, [trimmedQuery, sourceSections]);

  useEffect(() => {
    if (!results.length) {
      setActiveSection("");
      return;
    }
    if (!results.some((section) => section.id === activeSection)) {
      setActiveSection(results[0].id);
    }
  }, [results, activeSection]);

  // fetch sections and rules from supabase
  useEffect(() => {
    let mounted = true;
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

        if (!mounted) return;

        if (categoriesData) {
          const palette = fallbackSections.map(({ color, gradient, iconPath }) => ({
            color,
            gradient,
            iconPath,
          }));

          const sectionsMap = new Map<number, RuleSection>();

          categoriesData.forEach((category, index) => {
            const style = palette[index % palette.length] ?? palette[0];
            sectionsMap.set(category.id, {
              id: String(category.id),
              title: category.name,
              subtitle: category.description ?? undefined,
              color: style?.color ?? "text-red-500",
              gradient: style?.gradient ?? "from-red-500 to-red-400",
              iconPath: style?.iconPath ?? "M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z",
              rules: [],
            });
          });

          rulesData?.forEach((rule) => {
            if (rule.active === false) return;
            const target = sectionsMap.get(rule.category_id);
            if (!target) return;
            target.rules.push({
              id: String(rule.id),
              title: rule.title,
              description: rule.description ?? undefined,
              order: rule.order ?? null,
            });
          });

          const final = Array.from(sectionsMap.values())
            .map((section) => ({
              ...section,
              rules: [...section.rules].sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title);
              }),
            }))
            .sort((a, b) => Number(a.id) - Number(b.id));

          setRuleSectionsDb(final);
        }
      } catch (err) {
        // keep fallback
        // console.warn("Failed to load rules from Supabase:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!results.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-section-id");
          if (id && id !== activeSection) setActiveSection(id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0.15, 0.4, 0.75] }
    );

    results.forEach((section) => {
      const element = sectionRefs.current[section.id];
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const highlightText = (text: string) => {
    if (!trimmedQuery) return text;
    const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "ig");
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === trimmedQuery ? (
        <mark key={`${part}-${index}`} className="bg-red-500/20 px-1 text-red-300">
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
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

  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-10 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[0.95]">
            Server <span className="text-red-500">Rules</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/70">
            Ao jogar nos servidores <span className="text-red-400 font-semibold">FTW Roleplay</span>,
            aceitas cumprir estas regras. Viola├º├Áes podem resultar em avisos, expuls├Áes ou banimentos
            permanentes. Usa o ├¡ndice e a pesquisa para chegar rapidamente ao ponto que precisas.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 border border-white/10 bg-white/5 p-6 backdrop-blur-xl rounded-none">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/50">├ìndice</p>
                <p className="mt-2 text-sm text-white/60">
                  Fica sempre vis├¡vel ÔÇô usa para navegar pelos blocos de regras.
                </p>
              </div>
              {loading && (
                <p className="mt-2 text-xs text-white/55">A sincronizar com a base de dados...</p>
              )}
              <nav aria-label="├ìndice de regras">
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
                            <span className="ml-3 bg-black/50 px-2 py-0.5 text-xs rounded-none">
                              {section.filteredRules.length}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="border border-red-500/30 bg-red-500/5 p-4 text-sm text-white/70 rounded-none">
                <p className="font-semibold text-white">Nova!</p>
                <p>
                  Consulta tamb├®m as <Link to="/punishments" className="text-red-400 underline">puni├º├Áes aplic├íveis</Link>{" "}
                  para perceber o que acontece quando uma regra ├® quebrada.
                </p>
              </div>
            </div>
          </aside>

          <div className="space-y-10">
            <div className="lg:hidden">
              <div className="border border-white/10 bg-white/5 p-6 backdrop-blur-xl rounded-none">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/50">├ìndice</p>
                <div className="mt-4 flex gap-3 overflow-x-auto">
                  {results.map((section) => {
                    const isActive = section.id === activeSection;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => handleIndexClick(section.id)}
                        className={`whitespace-nowrap px-4 py-2 text-sm transition rounded-none ${
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

            <div>
              <label htmlFor="rules-search" className="text-sm font-semibold text-white/60">
                Pesquisa
              </label>
              <div className="mt-2 flex items-center border border-white/10 bg-black/40 px-4 py-3 backdrop-blur rounded-none">
                <svg
                  className="mr-3 h-5 w-5 text-white/40"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11.5 11.5l4 4m-2.5-6a5 5 0 11-10 0 5 5 0 0110 0z"
                  />
                </svg>
                <input
                  id="rules-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Procura regras, termos ou palavras-chave..."
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/40"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20 rounded-none"
                  >
                    Limpar
                  </button>
                )}
              </div>
              {trimmedQuery && !noResults && (
                <p className="mt-2 text-sm text-white/50">
                  {results.reduce((acc, section) => acc + section.filteredRules.length, 0)} resultados encontrados
                </p>
              )}
              {noResults && (
                <div className="mt-4 border border-white/10 bg-white/5 p-6 text-sm text-white/70 rounded-none">
                  <p className="font-semibold text-white">Sem resultados</p>
                  <p className="mt-2">
                    N├úo encontr├ímos regras para <span className="text-red-400">"{query}"</span>. Ajusta os termos ou consulta a
                    lista completa removendo a pesquisa.
                  </p>
                </div>
              )}
            </div>

            {!noResults &&
              results.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  data-section-id={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] = el;
                  }}
                  className="border border-white/10 bg-white/[0.06] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl rounded-none"
                >
                  <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center bg-gradient-to-br ${section.gradient} text-black shadow-lg rounded-none`}
                      >
                        <Icon path={section.iconPath} />
                      </div>
                      <div>
                        <h2 className={`text-2xl font-bold ${section.color}`}>
                          {highlightText(section.title)}
                        </h2>
                        {section.subtitle && (
                          <p className="text-sm text-white/60">{section.subtitle}</p>
                        )}
                      </div>
                    </div>
                    {trimmedQuery && (
                      <span className="border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 rounded-none">
                        {section.filteredRules.length} resultado(s)
                      </span>
                    )}
                  </header>
                  <ul className="space-y-5">
                    {section.filteredRules.map((rule) => (
                      <li key={rule.id} className="flex items-start gap-4">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-gradient-to-br ${section.gradient} shadow-[0_0_0_4px_rgba(255,255,255,0.12)]`}
                        />
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

            <section className="border border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-red-500/10 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl rounded-none">
              <header className="mb-6">
                <h3 className="text-2xl font-bold text-red-500">Pol├¡tica de Aplica├º├úo</h3>
                <p className="mt-3 text-white/70">
                  Viola├º├Áes s├úo tratadas com seriedade. Infrac├º├Áes leves podem levar apenas a aviso, mas casos graves podem
                  resultar em a├º├úo imediata. Reincid├¬ncia implica san├º├Áes progressivas que escalam rapidamente.
                </p>
              </header>
              <div className="grid gap-4 md:grid-cols-3">
                {enforcementStages.map((stage) => (
                  <div
                    key={stage.label}
                    className="border border-white/10 bg-black/40 p-5 text-center shadow-[0_14px_30px_rgba(0,0,0,0.35)] rounded-none"
                  >
                    <p className={`text-sm font-semibold uppercase tracking-wide ${stage.color}`}>{stage.label}</p>
                    <p className="mt-2 text-base text-white/80">{stage.detail}</p>
                  </div>
                ))}
              </div>
              <footer className="mt-6 flex flex-col gap-3 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
                <p>Em caso de d├║vida ou para reportar situa├º├Áes, abre ticket no Discord oficial.</p>
                <Link
                  to="/punishments"
                  className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-300 transition hover:border-red-500 hover:bg-red-500/20 rounded-none"
                >
                  <span>Ver tabela de puni├º├Áes</span>
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
  );
};

export default Rules;
