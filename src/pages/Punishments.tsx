// src/pages/Punishments.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type PunishmentCategory = "Leves" | "Médias" | "Graves" | "Extremas";
type PunishmentAction = "Aviso" | "Ban" | "Limpeza de inventário";

type Punishment = {
  code: string;
  title: string;
  description: string;
  actionType: PunishmentAction;
  duration: string;
  notes?: string;
};

type GroupedPunishments = {
  category: PunishmentCategory;
  items: Punishment[];
  total: number;
};

const categories: PunishmentCategory[] = ["Leves", "Médias", "Graves", "Extremas"];

const punishmentMatrixFallback: Record<PunishmentCategory, Punishment[]> = {
  Leves: [
    {
      code: "L-01",
      title: "Linguagem desadequada pontual",
      description: "Expressões agressivas ou palavrões ligeiros em momentos isolados.",
      actionType: "Aviso",
      duration: "Aviso verbal + nota na ficha",
    },
    {
      code: "L-02",
      title: "Uso indevido de chat OOC",
      description: "Debate OOC prolongado, reclamações públicas ou flood de mensagens fora de personagem.",
      actionType: "Aviso",
      duration: "Aviso escrito e reencaminhamento para tickets",
    },
  ],
  Médias: [
    {
      code: "M-01",
      title: "Metagaming com vantagem",
      description: "Uso de informação OOC para localizar ou perseguir outro jogador.",
      actionType: "Ban",
      duration: "Ban 12h - 24h",
    },
  ],
  Graves: [
    {
      code: "G-01",
      title: "RDM / VDM deliberado",
      description: "Atacar ou matar sem contexto RP, atropelamentos propositados ou repetidos.",
      actionType: "Ban",
      duration: "Ban 3 - 7 dias",
    },
  ],
  Extremas: [
    {
      code: "E-01",
      title: "Cheats / software não autorizado",
      description: "Qualquer forma de hacks, menus externos ou scripts que alterem o jogo.",
      actionType: "Ban",
      duration: "Ban permanente",
    },
  ],
};

const actionFilters: Array<"Todos" | PunishmentAction> = ["Todos", "Aviso", "Ban", "Limpeza de inventário"];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlight = (source: string, query: string) => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return source;
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = source.split(regex);
  return parts.map((part, index) =>
    part.toLowerCase() === trimmed ? (
      <mark key={`${part}-${index}`} className="bg-[hsl(7_76%_54%_/0.18)] px-1 text-[hsl(7_76%_54%)]">
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    )
  );
};

type DbRow = {
  code: string;
  title: string;
  description: string;
  action_type: PunishmentAction;
  duration: string;
  notes?: string | null;
  category: PunishmentCategory;
  position: number | null;
};

const Punishments: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Todas" | PunishmentCategory>("Todas");
  const [selectedAction, setSelectedAction] = useState<"Todos" | PunishmentAction>("Todos");
  const [dbMap, setDbMap] = useState<Record<PunishmentCategory, Punishment[]> | null>(null);

  // Sticky inteligente
  const containerRef = useRef<HTMLDivElement | null>(null); // coluna esquerda (posicionamento)
  const asideRef = useRef<HTMLDivElement | null>(null);     // sidebar
  const boundsRef = useRef<HTMLDivElement | null>(null);    // coluna direita (limites)
  const [asideStyle, setAsideStyle] = useState<React.CSSProperties>({});
  const TOP_OFFSET = 112;   // ajusta à tua navbar
  const BOTTOM_MARGIN = 24;

  useEffect(() => {
    const elContainer = containerRef.current;
    const elAside = asideRef.current;
    const elBounds = boundsRef.current;
    if (!elContainer || !elAside || !elBounds) return;

    const recalc = () => {
      const boundsRect = elBounds.getBoundingClientRect();
      const boundsTop = window.scrollY + boundsRect.top;
      const boundsBottom = boundsTop + elBounds.offsetHeight;

      const containerRect = elContainer.getBoundingClientRect();
      const containerTopAbs = window.scrollY + containerRect.top;

      const asideHeight = elAside.offsetHeight;
      const maxY = boundsBottom - asideHeight - BOTTOM_MARGIN;
      const clampedAbsY = Math.min(
        Math.max(window.scrollY + TOP_OFFSET, boundsTop),
        Math.max(boundsTop, maxY)
      );

      setAsideStyle({
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
    ro.observe(elAside);

    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
      ro.disconnect();
    };
  }, []);

  // dados da BD
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("punishments")
          .select("code,title,description,action_type,duration,notes,category,position")
          .order("position", { ascending: true });

        if (error || !data || !mounted) return;

        const grouped: Record<PunishmentCategory, Punishment[]> = { Leves: [], Médias: [], Graves: [], Extremas: [] };
        (data as DbRow[]).forEach((row) => {
          const p: Punishment = {
            code: row.code,
            title: row.title,
            description: row.description,
            actionType: row.action_type,
            duration: row.duration,
            notes: row.notes ?? undefined,
          };
          grouped[row.category].push(p);
        });
        setDbMap(grouped);
      } catch {
        // fallback para estático
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const grouped = useMemo<GroupedPunishments[]>(() => {
    return categories
      .filter((category) => selectedCategory === "Todas" || category === selectedCategory)
      .map((category) => {
        const source = (dbMap && dbMap[category]) || punishmentMatrixFallback[category];
        const items = (source || []).filter((punishment) => {
          const matchesAction = selectedAction === "Todos" || punishment.actionType === selectedAction;
          const haystack = `${punishment.title} ${punishment.description} ${punishment.code} ${punishment.duration}`.toLowerCase();
          const matchesSearch = normalizedSearch ? haystack.includes(normalizedSearch) : true;
          return matchesAction && matchesSearch;
        });
        return {
          category,
          items,
          total: (dbMap && dbMap[category]?.length) ?? punishmentMatrixFallback[category].length,
        };
      });
  }, [normalizedSearch, selectedAction, selectedCategory, dbMap]);

  const totalVisible = grouped.reduce((acc, group) => acc + group.items.length, 0);
  const showEmptyState = totalVisible === 0;

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("Todas");
    setSelectedAction("Todos");
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--ftw-bg))] bg-[none]">
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <header className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(7_76%_54%)]/85">Guia de Sanções</p>
            <h1 className="mt-2 text-5xl font-extrabold leading-[0.95] md:text-6xl">
              Tabela de <span className="text-[hsl(7_76%_54%)]">Punições</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[hsl(0_0%_98%_/0.7)]">
              Consulta as consequências aplicadas quando uma regra é quebrada. Usa a pesquisa e os filtros para encontrar
              rapidamente a situação desejada. As punições podem acumular e escalar de acordo com o histórico do jogador.
            </p>
          </header>

          <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
            {/* Sidebar sticky sem scroll interno */}
            <div ref={containerRef} className="relative hidden lg:block">
              <aside
                ref={asideRef}
                style={asideStyle}
                className="space-y-6 border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-6 rounded-none"
              >
                {/* Pesquisa */}
                <div>
                  <label htmlFor="punishments-search" className="text-sm font-semibold text-[hsl(0_0%_98%_/0.7)]">
                    Pesquisa
                  </label>
                  <div className="mt-2 flex items-center border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-4 py-3 rounded-none">
                    <svg className="mr-3 h-5 w-5 text-white/60" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.5 11.5l4 4m-2.5-6a5 5 0 11-10 0 5 5 0 0110 0z" />
                    </svg>
                    <input
                      id="punishments-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Procura por código, descrição ou ação..."
                      className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/50"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] px-3 py-1 text-sm text-white/80 hover:bg-[hsl(0_0%_16%)] rounded-none"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  {search.trim() && (
                    <p className="mt-2 text-sm text-[hsl(0_0%_98%_/0.6)]">{totalVisible} resultado(s) após filtros.</p>
                  )}
                </div>

                {/* Categorias */}
                <div>
                  <p className="text-sm font-semibold text-[hsl(0_0%_98%_/0.7)]">Categorias</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["Todas", ...categories] as const).map((category) => {
                      const isActive = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={`px-4 py-2 text-sm transition border rounded-none ${
                            isActive
                              ? "border-[hsl(0_0%_98%)] bg-[hsl(7_76%_54%)] text-black"
                              : "border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] text-white/85 hover:bg-[hsl(0_0%_16%)]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tipo de ação */}
                <div>
                  <p className="text-sm font-semibold text-[hsl(0_0%_98%_/0.7)]">Tipo de ação</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actionFilters.map((action) => {
                      const isActive = selectedAction === action;
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => setSelectedAction(action)}
                          className={`px-4 py-2 text-sm transition border rounded-none ${
                            isActive
                              ? "border-[hsl(0_0%_98%)] bg-[hsl(0_0%_98%)] text-black"
                              : "border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] text-white/90 hover:bg-[hsl(0_0%_16%)]"
                          }`}
                        >
                          {action}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] py-3 text-sm font-semibold text-white transition hover:bg-[hsl(0_0%_16%)] rounded-none"
                >
                  Repor filtros
                </button>

                <div className="border border-[hsl(0_0%_18%)] p-4 text-sm text-white/90 bg-[hsl(0_0%_12%)] rounded-none">
                  <p className="font-semibold text-white">Notas importantes</p>
                  <ul className="mt-2 space-y-1 list-disc pl-5">
                    <li>Punições podem escalar se houver reincidência.</li>
                    <li>Staff pode ajustar tempos conforme contexto RP.</li>
                    <li>
                      Consulta também as{" "}
                      <Link to="/rules" className="text-[hsl(7_76%_54%)] underline underline-offset-4 hover:opacity-90">
                        regras completas
                      </Link>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>

            {/* Content (limites do sticky) */}
            <div ref={boundsRef} className="space-y-10">
              {showEmptyState ? (
                <div className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-8 text-white/90 rounded-none">
                  <p className="text-lg font-semibold text-white">Sem resultados para os filtros atuais.</p>
                  <p className="mt-2">
                    Ajusta a pesquisa ou seleciona outra combinação de filtros. Se o comportamento que procuras não estiver
                    listado, abre ticket com a staff para avaliação manual.
                  </p>
                </div>
              ) : (
                grouped.map((group) => (
                  <section key={group.category} className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-8 rounded-none">
                    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white">Categoria {group.category}</h2>
                        <p className="text-sm text-white/70">
                          {group.total} registo(s) totais • {group.items.length} visível(eis) após filtros
                        </p>
                      </div>
                      <span className="inline-flex items-center border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-4 py-1 text-xs text-white/80 rounded-none">
                        Escala recomendada — sujeita a revisão da staff
                      </span>
                    </header>

                    {group.items.length === 0 ? (
                      <div className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] p-6 text-sm text-white/80 rounded-none">
                        <p className="font-semibold text-white">Sem entradas nesta categoria com os filtros atuais.</p>
                        <p className="mt-1">Experimenta outra ação ou remove a pesquisa.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2">
                        {group.items.map((item) => (
                          <article
                            key={item.code}
                            className="flex h-full flex-col border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] p-6 transition hover:bg-[hsl(0_0%_14%)] rounded-none"
                          >
                            <div className="flex items-center justify-between">
                              <span className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] px-3 py-1 text-xs font-semibold text-[hsl(7_76%_54%)]">
                                {item.code}
                              </span>
                              <span
                                className={`px-3 py-1 text-xs font-semibold border rounded-none ${
                                  item.actionType === "Ban"
                                    ? "border-[hsl(0_0%_98%)] bg-[hsl(0_0%_20%)] text-[hsl(7_76%_54%)]"
                                    : item.actionType === "Aviso"
                                    ? "border-[hsl(0_0%_98%)] bg-[hsl(0_0%_98%)] text-black"
                                    : "border-[hsl(0_0%_98%)] bg-[hsl(0_0%_8%)] text-[hsl(190_100%_80%)]"
                                }`}
                              >
                                {item.actionType}
                              </span>
                            </div>

                            <h3 className="mt-4 text-xl font-semibold text-white">{highlight(item.title, search)}</h3>
                            <p className="mt-2 flex-1 text-sm text-white/80">{highlight(item.description, search)}</p>

                            <div className="mt-4 border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] px-4 py-3 text-sm text-white rounded-none">
                              <p className="font-semibold text-white">Escala sugerida</p>
                              <p>{highlight(item.duration, search)}</p>
                              {item.notes && <p className="mt-2 text-xs text-white/70">{item.notes}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Punishments;
