import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import StaticPageShell from "./StaticPageShell";

type SectionMeta = {
  id: string;
  label: string;
};

const SECTION_META: SectionMeta[] = [
  { id: "defs", label: "Conceitos e definições" },
  { id: "conduct", label: "Conduta geral" },
  { id: "rp", label: "Fundamentos de RP" },
  { id: "crime", label: "Crime e ilegalidades" },
  { id: "weapons", label: "Armas e combate" },
  { id: "vehicles", label: "Veículos e perseguições" },
  { id: "robberies", label: "Roubos, reféns e negociações" },
  { id: "leo-ems", label: "Polícia (LEO) e EMS" },
  { id: "zones", label: "Zonas e propriedades" },
  { id: "economy", label: "Economia, empregos e bens" },
  { id: "comms", label: "Comunicações, tecnologia e media" },
  { id: "staff", label: "Staff, sanções e recursos" },
  { id: "refunds", label: "Reembolsos e reposições" },
  { id: "changes", label: "Atualizações e aceitação" },
];

const createVisibilityMap = (value: boolean): Record<string, boolean> =>
  SECTION_META.reduce<Record<string, boolean>>((acc, section) => {
    acc[section.id] = value;
    return acc;
  }, {});

export default function Rules() {
  const today = new Date().toISOString().slice(0, 10);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<string>(SECTION_META[0]?.id ?? "");
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(() =>
    createVisibilityMap(true)
  );
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const trimmedQuery = searchTerm.trim().toLowerCase();

  const registerSection = (id: string) => (element: HTMLElement | null) => {
    sectionRefs.current[id] = element;
  };

  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      setSectionVisibility(createVisibilityMap(true));
      return;
    }

    const next = SECTION_META.reduce<Record<string, boolean>>((acc, section) => {
      const el = sectionRefs.current[section.id];
      const text = el?.textContent?.toLowerCase() ?? "";
      acc[section.id] = text.includes(trimmed);
      return acc;
    }, {});
    setSectionVisibility(next);
  }, [searchTerm]);

  useEffect(() => {
    if (activeSection && sectionVisibility[activeSection]) {
      return;
    }
    const firstVisible = SECTION_META.find(({ id }) => sectionVisibility[id]);
    if (firstVisible) {
      setActiveSection(firstVisible.id);
    } else if (activeSection) {
      setActiveSection("");
    }
  }, [sectionVisibility, activeSection]);

  useEffect(() => {
    if (SECTION_META.every(({ id }) => !sectionVisibility[id])) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) {
          return;
        }

        const nextId = visibleEntries[0].target.getAttribute("data-section-id");
        if (nextId && nextId !== activeSection) {
          setActiveSection(nextId);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] }
    );

    SECTION_META.forEach(({ id }) => {
      if (!sectionVisibility[id]) {
        return;
      }
      const element = sectionRefs.current[id];
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sectionVisibility, activeSection]);

  const visibleSections = SECTION_META.filter(({ id }) => sectionVisibility[id]);
  const hasResults = visibleSections.length > 0;
  const navSections = trimmedQuery ? visibleSections : SECTION_META;

  const handleIndexClick = (id: string) => {
    const element = sectionRefs.current[id];
    if (!element) {
      return;
    }
    setActiveSection(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearSearch = () => setSearchTerm("");

  return (
    <StaticPageShell>
      <div className="pb-6">
        <header className="mb-10 max-w-3xl">
          <h1
            className="mb-2 text-3xl font-extrabold md:text-4xl"
            style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
          >
            Regras &amp; Políticas
          </h1>
          <p className="text-base text-[#fbfbfb]/85 md:text-lg">
            Ao participar no FTW Roleplay assumes que leste e aceitas estas regras. Usa o índice fixo para
            navegar rapidamente e a pesquisa para encontrar temas específicos.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Índice</p>
                <p className="mt-2 text-sm text-white/60">
                  Navega pelos capítulos sem perder o contexto.
                </p>
              </div>
              <nav aria-label="Índice de regras">
                {navSections.length ? (
                  <ul className="space-y-2 text-sm">
                    {navSections.map(({ id, label }) => {
                      const originalIndex = SECTION_META.findIndex((section) => section.id === id) + 1;
                      const isActive = id === activeSection;
                      const isVisible = sectionVisibility[id];

                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => handleIndexClick(id)}
                            className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left transition ${
                              isActive
                                ? "bg-white/15 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span>
                              <span className="mr-2 text-xs text-white/40">
                                {originalIndex.toString().padStart(2, "0")}
                              </span>
                              {label}
                            </span>
                            {trimmedQuery && (
                              <span
                                className={`ml-3 rounded-full px-2 py-0.5 text-xs ${
                                  isVisible ? "bg-black/40 text-white/70" : "bg-black/30 text-white/40"
                                }`}
                              >
                                {isVisible ? "✓" : "—"}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-white/50">Sem resultados para a pesquisa atual.</p>
                )}
              </nav>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/70">
                <p className="font-semibold text-white">Precisas de saber o castigo?</p>
                <p className="mt-1">
                  Vê a nova{" "}
                  <Link to="/punishments" className="text-red-300 underline">
                    tabela de punições
                  </Link>{" "}
                  para cada infração.
                </p>
              </div>
            </div>
          </aside>

          <div className="space-y-10">
            <div className="lg:hidden">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Índice</p>
                <div className="mt-4 flex gap-3 overflow-x-auto">
                  {navSections.length ? (
                    navSections.map(({ id, label }) => {
                      const isActive = id === activeSection;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleIndexClick(id)}
                          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                            isActive ? "bg-red-500 text-black" : "bg-white/10 text-white/80"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-white/50">Sem resultados.</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="rules-search" className="text-sm font-semibold text-white/60">
                Pesquisa
              </label>
              <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
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
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Procura termos, códigos ou palavras-chave..."
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/40"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 transition hover:bg-white/20"
                  >
                    Limpar
                  </button>
                )}
              </div>
              {trimmedQuery && (
                <p className="mt-2 text-sm text-white/50">
                  {hasResults
                    ? `${visibleSections.length} secção(ões) visíveis com “${searchTerm}”.`
                    : `Sem correspondências para “${searchTerm}”.`}
                </p>
              )}
            </div>

            {hasResults ? (
              <div className="space-y-10">
                <section
                  id="defs"
                  data-section-id="defs"
                  ref={registerSection("defs")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["defs"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">1) Conceitos e definições</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[GR-01] OOC</strong>: conversa fora da personagem. Usa apenas quando necessário e de forma breve.
                    </li>
                    <li>
                      <strong>[GR-02] Metagaming</strong>: usar info OOC em IC. Proibido.
                    </li>
                    <li>
                      <strong>[GR-03] Powergaming</strong>: ações irreais/forçadas sem dar hipótese de resposta. Proibido.
                    </li>
                    <li>
                      <strong>[GR-04] Fear RP</strong>: valoriza a vida. Reage a ameaças com bom senso.
                    </li>
                    <li>
                      <strong>[GR-05] NLR</strong> (Nova Vida): se deres respawn no hospital, esqueces a cena que levou à morte e
                      não voltas ao local durante <strong>30 minutos</strong>.
                    </li>
                    <li>
                      <strong>[GR-06] Combat Logging</strong>: sair para evitar consequências. Proibido.
                    </li>
                  </ul>
                </section>

                <section
                  id="conduct"
                  data-section-id="conduct"
                  ref={registerSection("conduct")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["conduct"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">2) Conduta geral</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[CG-01]</strong> Respeita todos os jogadores e a equipa. Nada de assédio, racismo, homofobia ou ódio.
                    </li>
                    <li>
                      <strong>[CG-02]</strong> Microfone audível. Evita ruído constante. Se o som estragar cenas, podes ser retirado
                      até arranjares.
                    </li>
                    <li>
                      <strong>[CG-03]</strong> Bugs/exploits: reporta de imediato. Usar para vantagem dá sanção.
                    </li>
                    <li>
                      <strong>[CG-04]</strong> Stream sniping, doxing e ameaças reais dão ban imediato.
                    </li>
                    <li>
                      <strong>[CG-05]</strong> Personagem coerente. Nada de nomes troll ou copiar figuras públicas reais.
                    </li>
                    <li>
                      <strong>[CG-06]</strong> Tóxicos reincidentes perdem acesso a cenas/eventos e podem levar ban.
                    </li>
                  </ul>
                </section>

                <section
                  id="rp"
                  data-section-id="rp"
                  ref={registerSection("rp")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["rp"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">3) Fundamentos de RP</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[RP-01]</strong> <em>Roleplay acima de gunplay</em>. Procura história antes de puxar arma.
                    </li>
                    <li>
                      <strong>[RP-02]</strong> Inicia conflitos com contexto: <em>intenção + oportunidade + ameaça clara</em>.
                    </li>
                    <li>
                      <strong>[RP-03]</strong> Não uses /me e /do para impor ações que o outro não consegue contrariar.
                    </li>
                    <li>
                      <strong>[RP-04]</strong> Ferido no chão: fala o mínimo, sem coordenar equipas. Sem rádio/telefone enquanto
                      algemado ou apontado.
                    </li>
                    <li>
                      <strong>[RP-05]</strong> Regressar à cena após respawn viola NLR (30 min).
                    </li>
                  </ul>
                </section>

                <section
                  id="crime"
                  data-section-id="crime"
                  ref={registerSection("crime")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["crime"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">4) Crime e ilegalidades</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[CR-01]</strong> Crimes menores (furtos, vandalismo) exigem cena mínima e coerente.
                    </li>
                    <li>
                      <strong>[CR-02]</strong> Tráficos/armazenamento requerem logística plausível. Evita “teletransportes” de itens.
                    </li>
                    <li>
                      <strong>[CR-03]</strong> Sequestro fora de contexto é fail RP. Tem motivo e objetivo claro.
                    </li>
                    <li>
                      <strong>[CR-04]</strong> Corrupção em LEO/EMS é <em>proibida</em> salvo whitelist explícita da direção.
                    </li>
                    <li>
                      <strong>[CR-05]</strong> Scam OOC (dinheiro real) dá ban permanente.
                    </li>
                  </ul>
                </section>

                <section
                  id="weapons"
                  data-section-id="weapons"
                  ref={registerSection("weapons")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["weapons"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">5) Armas e combate</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[WB-01]</strong> Sacar arma em público tem risco. Fear RP aplica-se a ti também.
                    </li>
                    <li>
                      <strong>[WB-02]</strong> Não dispares de forma cega contra massas sem contexto (mass-RDM).
                    </li>
                    <li>
                      <strong>[WB-03]</strong> Terceiros em cenas: avalia risco antes de intervir. Evita “terceiros mágicos”.
                    </li>
                    <li>
                      <strong>[WB-04]</strong> Hitman/contratos só com aprovação prévia da staff para alvos específicos.
                    </li>
                  </ul>
                </section>

                <section
                  id="vehicles"
                  data-section-id="vehicles"
                  ref={registerSection("vehicles")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["vehicles"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">6) Veículos e perseguições</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[VH-01]</strong> Evita condução irreal (rampar prédios, saltos absurdos) sem cena a justificar.
                    </li>
                    <li>
                      <strong>[VH-02]</strong> PIT e embates fortes: apenas veículos adequados e a velocidades razoáveis.
                    </li>
                    <li>
                      <strong>[VH-03]</strong> Trocas de carro infinitas para escapar sem cena contam como abuso. Usa comedimento.
                    </li>
                    <li>
                      <strong>[VH-04]</strong> Drive-by contra civis sem contexto é fail RP.
                    </li>
                  </ul>
                </section>

                <section
                  id="robberies"
                  data-section-id="robberies"
                  ref={registerSection("robberies")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["robberies"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">7) Roubos, reféns e negociações</h2>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-2 font-semibold text-white/80">
                      Requisitos por omissão (ajusta no Discord do servidor):
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/80">
                      <li>
                        <strong>Lojas</strong>: mínimo 2 LEO em serviço; cooldown <strong>30 min</strong> global.
                      </li>
                      <li>
                        <strong>Joalharia</strong>: mínimo 4 LEO; 1–2 reféns reais; cooldown <strong>60 min</strong>.
                      </li>
                      <li>
                        <strong>Banco</strong>: mínimo 6 LEO; 2–4 reféns reais; cooldown <strong>120 min</strong>.
                      </li>
                    </ul>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[RB-01]</strong> Reféns devem ser jogadores reais e tratados com respeito. Proibido usar amigos como
                      “bonecos” repetidos.
                    </li>
                    <li>
                      <strong>[RB-02]</strong> Exigências válidas: passadeira limpa até ao carro, retirada de spikes, 1 reparação
                      leve. Não podes exigir invencibilidade, imunidade a rastreio ou fuga garantida.
                    </li>
                    <li>
                      <strong>[RB-03]</strong> Tempo com refém: máximo razoável (<strong>15–20 min</strong>) salvo cena especial.
                    </li>
                    <li>
                      <strong>[RB-04]</strong> Se o negociador cumprir, manténs a palavra. Quebrar acordo sem cena é powergaming.
                    </li>
                  </ul>
                </section>

                <section
                  id="leo-ems"
                  data-section-id="leo-ems"
                  ref={registerSection("leo-ems")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["leo-ems"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">8) Polícia (LEO) e EMS</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[LE-01]</strong> LEO seguem SOP internos. Uso de força proporcional e relato após incidentes.
                    </li>
                    <li>
                      <strong>[LE-02]</strong> Perseguições longas: avalia risco público. PIT apenas quando justificado.
                    </li>
                    <li>
                      <strong>[LE-03]</strong> Proibido usar info OOC (streams, Discord externo) em operações.
                    </li>
                    <li>
                      <strong>[EM-01]</strong> EMS priorizam vida, não lootam, não entram em troca de tiros sem segurança.
                    </li>
                    <li>
                      <strong>[EM-02]</strong> EMS como reféns: em regra <em>não</em>; só em eventos aprovados.
                    </li>
                  </ul>
                </section>

                <section
                  id="zones"
                  data-section-id="zones"
                  ref={registerSection("zones")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["zones"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">9) Zonas e propriedades</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[ZN-01]</strong> Zonas seguras: hospitais, PD principal e DMV. Proibido iniciar crimes nestes locais.
                    </li>
                    <li>
                      <strong>[ZN-02]</strong> Zonas quentes (se anunciadas): expectativas de conflito aumentam. Mesmo assim, evita RDM.
                    </li>
                    <li>
                      <strong>[ZN-03]</strong> Propriedades privadas: respeita trancas. Arrombamentos exigem ferramenta/cena.
                    </li>
                  </ul>
                </section>

                <section
                  id="economy"
                  data-section-id="economy"
                  ref={registerSection("economy")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["economy"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">10) Economia, empregos e bens</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[EC-01]</strong> Transferências grandes entre contas exigem justificação RP (faturas, negócios).
                    </li>
                    <li>
                      <strong>[EC-02]</strong> Dupla contabilística ou farms AFK dão sanção e wipe dos ganhos.
                    </li>
                    <li>
                      <strong>[EC-03]</strong> Itens ilegais: transporte e venda com lógica. Perda de items faz parte do risco.
                    </li>
                  </ul>
                </section>

                <section
                  id="comms"
                  data-section-id="comms"
                  ref={registerSection("comms")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["comms"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">11) Comunicações, tecnologia e media</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[CM-01]</strong> Rádio/telefone: sem uso enquanto algemado, rendido ou com arma apontada muito perto.
                    </li>
                    <li>
                      <strong>[CM-02]</strong> Aplicações VOIP externas apenas para IC quando autorizadas. Caso contrário, usa o VOIP
                      do servidor.
                    </li>
                    <li>
                      <strong>[CM-03]</strong> Bodycams: segue regras internas (quando ativar, onde gravar). Proibido usar como “radar
                      mágico”.
                    </li>
                    <li>
                      <strong>[CM-04]</strong> Streamers respeitam delays e ocultam info sensível quando necessário.
                    </li>
                  </ul>
                </section>

                <section
                  id="staff"
                  data-section-id="staff"
                  ref={registerSection("staff")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["staff"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">12) Staff, sanções e recursos</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[ST-01]</strong> A staff pode intervir em cena, pausar ação e decidir no momento para proteger o RP.
                    </li>
                    <li>
                      <strong>[ST-02]</strong> Escalonamento comum: aviso → kick → ban temporário → ban permanente. Reincidência agrava.
                    </li>
                    <li>
                      <strong>[ST-03]</strong> Para recurso, abre ticket com prova (clips/logs) nas <em>48 h</em> seguintes.
                    </li>
                    <li>
                      <strong>[ST-04]</strong> Abuso contra staff dá ban. Discord e in-game contam para a mesma avaliação.
                    </li>
                  </ul>
                </section>

                <section
                  id="refunds"
                  data-section-id="refunds"
                  ref={registerSection("refunds")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["refunds"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">13) Reembolsos e reposições</h2>
                  <ul className="list-disc space-y-1 pl-5 text-[#fbfbfb]/85">
                    <li>
                      <strong>[RF-01]</strong> Apenas por falha técnica confirmada ou erro administrativo. Perdas RP não dão refund.
                    </li>
                    <li>
                      <strong>[RF-02]</strong> Pede até <em>24 h</em> após o incidente, com clip/logs. Sem prova, não há reposição.
                    </li>
                    <li>
                      <strong>[RF-03]</strong> A staff pode substituir por item/valor equivalente se o original não existir.
                    </li>
                  </ul>
                </section>

                <section
                  id="changes"
                  data-section-id="changes"
                  ref={registerSection("changes")}
                  className={`scroll-mt-28 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.4)] ${
                    sectionVisibility["changes"] ? "" : "hidden"
                  }`}
                >
                  <h2 className="text-xl font-semibold">14) Atualizações e aceitação</h2>
                  <p className="text-[#fbfbfb]/85">
                    As regras podem mudar para proteger a experiência de todos. Quando entras, aceitas estas regras e as versões
                    futuras. Alterações materiais serão destacadas nos nossos canais.
                  </p>
                </section>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
                <p className="text-lg font-semibold text-white">Nenhum resultado</p>
                <p className="mt-2">
                  Ajusta os termos de pesquisa ou limpa o campo para voltares a ver todas as regras.
                </p>
              </div>
            )}

            <hr className="border-white/20" />
            <p className="text-sm text-white/60">Última atualização: {today}</p>
          </div>
        </div>
      </div>
    </StaticPageShell>
  );
}
