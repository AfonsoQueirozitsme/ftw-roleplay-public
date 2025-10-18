// src/pages/Rules.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type RuleSection = {
  id: string;
  title: string;
  subtitle?: string;
  color: string;
  gradient: string;
  iconPath: string;
  rules: string[];
};

type SectionResult = RuleSection & {
  filteredRules: string[];
  matchesTitle: boolean;
};

const ruleSections: RuleSection[] = [
  {
    id: "general",
    title: "General Rules",
    subtitle: "Fundamentos de convivência para todos os jogadores",
    color: "text-red-500",
    gradient: "from-red-500 to-red-400",
    iconPath: "M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z",
    rules: [
      "Respeita todos os jogadores e staff em qualquer momento.",
      "Sem assédio, discriminação ou discurso de ódio.",
      "Usa linguagem adequada em todas as comunicações.",
      "Segue as instruções da staff sem discussões no momento.",
      "Reporta violações pelos canais próprios (ticket Discord ou in-game).",
    ],
  },
  {
    id: "roleplay",
    title: "Roleplay Rules",
    subtitle: "Mantém a imersão e o bom senso em todas as interações",
    color: "text-red-400",
    gradient: "from-rose-500 to-red-400",
    iconPath:
      "M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zm-8 0c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm0 2c-2.673 0-8 1.337-8 4v2h10v-2c0-2.663-5.327-4-8-4zm8 0c-.486 0-1.036.034-1.624.094 1.942 1.06 3.624 2.725 3.624 4.906v2H24v-2c0-2.663-5.327-4-8-4z",
    rules: [
      "Mantém-te em personagem durante os cenários de roleplay (IC > OOC).",
      "Sem metagaming (usar informação OOC em IC).",
      "A personagem deve agir com comportamentos e limitações realistas.",
      "Sem powergaming (forçar ações noutros jogadores sem permitir resposta).",
      "Respeita e protege os cenários de roleplay dos outros, mesmo que não participes.",
    ],
  },
  {
    id: "combat",
    title: "Combat Rules",
    subtitle: "Combate limpo, justo e com contexto",
    color: "text-yellow-500",
    gradient: "from-yellow-400 to-amber-500",
    iconPath: "M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z",
    rules: [
      "Sem combat logging durante qualquer combate ativo.",
      "Jogo limpo — nada de explorar bugs, vantagens injustas ou mecânicas não intencionais.",
      "Honra rendições, tentativas de negociação e roleplay social durante conflitos.",
      "Sem spawn camping, griefing ou repetição de ataques sem justificação RP.",
      "Usa armas adequadas ao nível e acesso da tua personagem.",
    ],
  },
  {
    id: "prohibited",
    title: "Prohibited Actions",
    subtitle: "Atividades proibidas em qualquer circunstância",
    color: "text-red-600",
    gradient: "from-red-600 to-rose-700",
    iconPath: "M12 2C6.486 2 2 6.486 2 12c0 2.02.6 3.896 1.627 5.46L17.46 3.627A9.94 9.94 0 0012 2zm8.373 4.54L6.54 20.373A9.94 9.94 0 0012 22c5.514 0 10-4.486 10-10 0-2.02-.6-3.896-1.627-5.46z",
    rules: [
      "Proibido cheatar, hackear ou usar software/mods não autorizados.",
      "Sem publicidade a outros servidores, serviços ou comunidades.",
      "Proibido doxxing, ameaças reais ou partilha de dados pessoais.",
      "Sem spam em chat, voz ou uso abusivo de efeitos sonoros.",
      "Proibida a personificação de staff, outros jogadores ou figuras oficiais.",
    ],
  },
];
const ruleSectionsFallback: RuleSection[] = [
  {
    id: "general",
    title: "General Rules",
    subtitle: "Fundamentos de convivência para todos os jogadores",
    color: "text-red-500",
    gradient: "from-red-500 to-red-400",
    iconPath: "M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z",
    rules: [
      "Respeita todos os jogadores e staff em qualquer momento.",
      "Sem assédio, discriminação ou discurso de ódio.",
      "Usa linguagem adequada em todas as comunicações.",
      "Segue as instruções da staff sem discussões no momento.",
      "Reporta violações pelos canais próprios (ticket Discord ou in-game).",
    ],
  },
  {
    id: "roleplay",
    title: "Roleplay Rules",
    subtitle: "Mantém a imersão e o bom senso em todas as interações",
    color: "text-red-400",
    gradient: "from-rose-500 to-red-400",
    iconPath:
      "M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zm-8 0c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm0 2c-2.673 0-8 1.337-8 4v2h10v-2c0-2.663-5.327-4-8-4zm8 0c-.486 0-1.036.034-1.624.094 1.942 1.06 3.624 2.725 3.624 4.906v2H24v-2c0-2.663-5.327-4-8-4z",
    rules: [
      "Mantém-te em personagem durante os cenários de roleplay (IC > OOC).",
      "Sem metagaming (usar informação OOC em IC).",
      "A personagem deve agir com comportamentos e limitações realistas.",
      "Sem powergaming (forçar ações noutros jogadores sem permitir resposta).",
      "Respeita e protege os cenários de roleplay dos outros, mesmo que não participes.",
    ],
  },
  {
    id: "combat",
    title: "Combat Rules",
    subtitle: "Combate limpo, justo e com contexto",
    color: "text-yellow-500",
    gradient: "from-yellow-400 to-amber-500",
    iconPath: "M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z",
    rules: [
      "Sem combat logging durante qualquer combate ativo.",
      "Jogo limpo — nada de explorar bugs, vantagens injustas ou mecânicas não intencionais.",
      "Honra rendições, tentativas de negociação e roleplay social durante conflitos.",
      "Sem spawn camping, griefing ou repetição de ataques sem justificação RP.",
      "Usa armas adequadas ao nível e acesso da tua personagem.",
    ],
  },
  {
    id: "prohibited",
    title: "Prohibited Actions",
    subtitle: "Atividades proibidas em qualquer circunstância",
    color: "text-red-600",
    gradient: "from-red-600 to-rose-700",
    iconPath: "M12 2C6.486 2 2 6.486 2 12c0 2.02.6 3.896 1.627 5.46L17.46 3.627A9.94 9.94 0 0012 2zm8.373 4.54L6.54 20.373A9.94 9.94 0 0012 22c5.514 0 10-4.486 10-10 0-2.02-.6-3.896-1.627-5.46z",
    rules: [
      "Proibido cheatar, hackear ou usar software/mods não autorizados.",
      "Sem publicidade a outros servidores, serviços ou comunidades.",
      "Proibido doxxing, ameaças reais ou partilha de dados pessoais.",
      "Sem spam em chat, voz ou uso abusivo de efeitos sonoros.",
      "Proibida a personificação de staff, outros jogadores ou figuras oficiais.",
    ],
  },
];

// Database-driven state
type DbRuleRow = {
  id: string;
  section_id: string;
  content: string;
  position: number | null;
};

type DbSectionRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  color?: string | null;
  gradient?: string | null;
  icon_path?: string | null;
  position?: number | null;
};

const enforcementStages = [
  { label: "1.ª Ocorrência", detail: "Aviso", color: "text-yellow-500" },
  { label: "2.ª Ocorrência", detail: "Ban 24h", color: "text-orange-500" },
  { label: "3.ª Ocorrência", detail: "Ban Permanente", color: "text-red-600" },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Icon = ({ path }: { path: string }) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
);

const Rules: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>(ruleSections[0].id);
  const [ruleSectionsDb, setRuleSectionsDb] = useState<RuleSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const trimmedQuery = query.trim().toLowerCase();

  const sourceSections = ruleSectionsDb ?? ruleSectionsFallback;

  const results = useMemo<SectionResult[]>(() => {
    return sourceSections
      .map((section) => {
        if (!trimmedQuery) {
          return { ...section, filteredRules: section.rules, matchesTitle: false };
        }
        const matchesTitle = section.title.toLowerCase().includes(trimmedQuery);
        const matchedRules = section.rules.filter((rule) => rule.toLowerCase().includes(trimmedQuery));
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
        const { data: sectionsData, error: sectionsErr } = await supabase
          .from("rules_sections")
          .select("id,title,subtitle,color,gradient,icon_path,position")
          .order("position", { ascending: true });

        if (sectionsErr) throw sectionsErr;

        const { data: rulesData, error: rulesErr } = await supabase
          .from("rules")
          .select("id,section_id,content,position")
          .order("position", { ascending: true });

        if (rulesErr) throw rulesErr;

        if (!mounted) return;

        if (sectionsData && rulesData) {
          const sectionsMap: Record<string, RuleSection> = {};
          sectionsData.forEach((s) => {
            sectionsMap[s.id] = {
              id: s.id,
              title: s.title,
              subtitle: s.subtitle ?? undefined,
              color: s.color ?? "text-white",
              gradient: s.gradient ?? "from-black to-black",
              iconPath: s.icon_path ?? "M0 0h24v24H0z",
              rules: [],
            };
          });

          rulesData.forEach((r) => {
            const sec = sectionsMap[r.section_id];
            if (sec) sec.rules.push(r.content);
          });

          const final = Object.values(sectionsMap).sort((a, b) => (a.id > b.id ? 1 : -1));
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
            aceitas cumprir estas regras. Violações podem resultar em avisos, expulsões ou banimentos
            permanentes. Usa o índice e a pesquisa para chegar rapidamente ao ponto que precisas.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 border border-white/10 bg-white/5 p-6 backdrop-blur-xl rounded-none">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Índice</p>
                <p className="mt-2 text-sm text-white/60">
                  Fica sempre visível – usa para navegar pelos blocos de regras.
                </p>
              </div>
              <nav aria-label="Índice de regras">
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
                  Consulta também as <Link to="/punishments" className="text-red-400 underline">punições aplicáveis</Link>{" "}
                  para perceber o que acontece quando uma regra é quebrada.
                </p>
              </div>
            </div>
          </aside>

          <div className="space-y-10">
            <div className="lg:hidden">
              <div className="border border-white/10 bg-white/5 p-6 backdrop-blur-xl rounded-none">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Índice</p>
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
                    Não encontrámos regras para <span className="text-red-400">"{query}"</span>. Ajusta os termos ou consulta a
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
                    {section.filteredRules.map((rule, index) => (
                      <li key={`${section.id}-${index}`} className="flex items-start gap-4">
                        <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 bg-gradient-to-br from-red-500 to-red-400 shadow-[0_0_0_4px_rgba(229,62,48,0.15)]" />
                        <span className="leading-relaxed text-white/90">{highlightText(rule)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

            <section className="border border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-red-500/10 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl rounded-none">
              <header className="mb-6">
                <h3 className="text-2xl font-bold text-red-500">Política de Aplicação</h3>
                <p className="mt-3 text-white/70">
                  Violações são tratadas com seriedade. Infracções leves podem levar apenas a aviso, mas casos graves podem
                  resultar em ação imediata. Reincidência implica sanções progressivas que escalam rapidamente.
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
                <p>Em caso de dúvida ou para reportar situações, abre ticket no Discord oficial.</p>
                <Link
                  to="/punishments"
                  className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-300 transition hover:border-red-500 hover:bg-red-500/20 rounded-none"
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
  );
};

export default Rules;
