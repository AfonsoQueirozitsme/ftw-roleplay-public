// src/pages/Rules.tsx
import React, { useEffect, useRef } from "react";

const Rules: React.FC = () => {
  const card =
    "rounded-xl p-8 backdrop-blur-xl bg-white/10 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.25)]";
  const titleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // animação de entrada suave quando os blocos entram na viewport
  useEffect(() => {
    const els: HTMLElement[] = [];
    if (titleRef.current) els.push(titleRef.current);
    if (gridRef.current) els.push(...(Array.from(gridRef.current.children) as HTMLElement[]));

    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity .6s ease, transform .6s ease";
      el.style.transitionDelay = `${i * 80}ms`;

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
              io.disconnect();
            }
          });
        },
        { threshold: 0.2 }
      );

      io.observe(el);
    });
  }, []);

  // ícone simples inline (sem deps)
  const Icon = ({ path }: { path: string }) => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  );

  // helper para um bloco de regras
  const block = (
    icon: React.ReactNode,
    title: string,
    rules: string[],
    color = "text-red-500"
  ) => (
    <div className={card}>
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-red-500 to-red-400 flex items-center justify-center mr-4 text-black">
          {icon}
        </div>
        <h2 className={`text-2xl font-bold ${color}`}>{title}</h2>
      </div>
      <ul className="space-y-4">
        {rules.map((r, i) => (
          <li key={i} className="flex items-start">
            <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span className="leading-relaxed text-white/90">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* título */}
        <div ref={titleRef} className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[0.95]">
            Server <span className="text-red-500">Rules</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto">
            Ao jogar nos servidores <span className="text-red-400 font-semibold">FTW Roleplay</span>,
            aceitas cumprir estas regras. Violações podem resultar em avisos, expulsões ou
            banimentos permanentes.
          </p>
        </div>

        {/* grelha de categorias */}
        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {block(
            <Icon path="M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z" />,
            "General Rules",
            [
              "Respeita todos os jogadores e staff em qualquer momento",
              "Sem assédio, discriminação ou discurso de ódio",
              "Usa linguagem adequada em todas as comunicações",
              "Segue as instruções da staff sem discussões",
              "Reporta violações pelos canais próprios",
            ]
          )}

          {block(
            <Icon path="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zm-8 0c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm0 2c-2.673 0-8 1.337-8 4v2h10v-2c0-2.663-5.327-4-8-4zm8 0c-.486 0-1.036.034-1.624.094 1.942 1.06 3.624 2.725 3.624 4.906v2H24v-2c0-2.663-5.327-4-8-4z" />,
            "Roleplay Rules",
            [
              "Mantém-te em personagem durante os cenários de roleplay",
              "Sem metagaming (usar info OOC em IC)",
              "Comportamento e limitações realistas da personagem",
              "Sem powergaming (forçar acções noutros jogadores)",
              "Respeita os cenários de roleplay dos outros",
            ],
            "text-red-400"
          )}

          {block(
            <Icon path="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z" />,
            "Combat Rules",
            [
              "Sem combat logging durante combate activo",
              "Jogo limpo — nada de explorar bugs/mecânicas",
              "Honra rendições e tentativas de negociação",
              "Sem spawn camping ou griefing",
              "Armas adequadas ao nível da personagem",
            ],
            "text-yellow-500"
          )}

          {block(
            <Icon path="M12 2C6.486 2 2 6.486 2 12c0 2.02.6 3.896 1.627 5.46L17.46 3.627A9.94 9.94 0 0012 2zm8.373 4.54L6.54 20.373A9.94 9.94 0 0012 22c5.514 0 10-4.486 10-10 0-2.02-.6-3.896-1.627-5.46z" />,
            "Prohibited Actions",
            [
              "Proibido cheatar/hackear ou usar software não autorizado",
              "Sem publicidade a outros servidores/serviços",
              "Sem doxxing nem partilha de dados pessoais",
              "Sem spam em chat/voz",
              "Proibida a personificação de staff ou outros jogadores",
            ],
            "text-red-600"
          )}
        </div>

        {/* política de aplicação */}
        <div className={`${card} mt-16 text-center`}>
          <h3 className="text-2xl font-bold text-red-500 mb-4">Política de Aplicação</h3>
          <p className="text-white/70 mb-6 max-w-3xl mx-auto">
            As violações são tratadas com seriedade. Infracções leves podem levar a aviso, mas
            casos graves podem resultar em acção imediata. Reincidência implica sanções
            progressivas, incluindo banimento temporário ou permanente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="rounded-lg p-4 backdrop-blur-xl bg-white/10 border border-white/15">
              <div className="font-bold text-yellow-500">1.ª Ocorrência</div>
              <div className="text-sm text-white/70">Aviso</div>
            </div>
            <div className="rounded-lg p-4 backdrop-blur-xl bg-white/10 border border-white/15">
              <div className="font-bold text-orange-500">2.ª Ocorrência</div>
              <div className="text-sm text-white/70">Ban 24h</div>
            </div>
            <div className="rounded-lg p-4 backdrop-blur-xl bg-white/10 border border-white/15">
              <div className="font-bold text-red-600">3.ª Ocorrência</div>
              <div className="text-sm text-white/70">Ban Permanente</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Rules;
