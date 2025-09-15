// /src/pages/static/About.tsx
import React from "react";
import StaticPageShell from "./StaticPageShell";

type Chapter = { date: string; title: string; body: string };

const chapters: Chapter[] = [
  {
    date: "2023 · O começo",
    title: "Um servidor que nasce de conversas tarde da noite",
    body:
      "Havia servidores cheios, regras confusas e histórias que morriam no chat. Tu pedias algo mais: consequências reais, economia viva e uma comunidade que te levasse a sério. Nasceu a ideia de um lugar onde cada decisão deixa marca.",
  },
  {
    date: "2024 · Almas corajosas",
    title: "A primeira cidade abre as portas",
    body:
      "Juntaram-se os teimosos. Testes privados, quedas de serviços, logs infinitos e cenas que só funcionavam ao segundo dia. Entre falhas e vitórias, percebemos uma coisa simples: quando a história é boa, tu ficas. E trouxeste amigos.",
  },
  {
    date: "2025 Q1 · Ferramentas com propósito",
    title: "Bots, triagem inteligente e menos fricção",
    body:
      "Automatizámos o aborrecido e libertámos tempo para o que interessa. O teu report chega à equipa certa, o teu pedido encontra resposta e as regras estão claras. A cidade respira melhor quando o backstage não falha.",
  },
  {
    date: "2025 Q3 · Early Access",
    title: "A cidade ganha ritmo",
    body:
      "As ruas encheram, as facções mexeram na balança e a economia começou a morder. Um assalto corre mal, um informador falha, uma esquadra investiga, e de repente a tua decisão muda o mapa. Tu já não és figurante.",
  },
  {
    date: "A seguir",
    title: "Temporadas com meta clara",
    body:
      "Cada temporada vem com objetivos, eventos e riscos. Hoje és pequeno comerciante, amanhã controlas rotas. O caminho depende de escolhas, não de sorte. E o mundo lembra-se da tua assinatura.",
  },
];

export default function About() {
  return (
    <StaticPageShell>
      <h1
        className="text-3xl md:text-5xl font-extrabold mb-2"
        style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
      >
        Sobre nós
      </h1>

      <p className="text-[#fbfbfb]/85 mb-8 max-w-3xl">
        O <strong>FTW Roleplay</strong> não promete perfeição. Promete-te espaço para criar, regras que protegem a
        história e um palco onde cada risco conta. Se entras, entras para deixar rasto.
      </p>

      {/* Manifesto curto */}
      <div className="mb-10 grid md:grid-cols-3 gap-4">
        <div className="p-4 border border-[#6c6c6c]">
          <h3 className="font-semibold mb-1">Histórias com consequência</h3>
          <p className="text-[#fbfbfb]/80 text-sm">
            Um mundo que reage. A polícia investiga, a rua responde, os jornais contam.
          </p>
        </div>
        <div className="p-4 border border-[#6c6c6c]">
          <h3 className="font-semibold mb-1">Ferramentas a teu favor</h3>
          <p className="text-[#fbfbfb]/80 text-sm">
            Triagem justa, dashboards úteis, menos espera. Jogas mais, esperas menos.
          </p>
        </div>
        <div className="p-4 border border-[#6c6c6c]">
          <h3 className="font-semibold mb-1">Cultura competitiva saudável</h3>
          <p className="text-[#fbfbfb]/80 text-sm">
            Ganha quem lê a cidade. Respeito nas vitórias, cabeça fria nas derrotas.
          </p>
        </div>
      </div>

      {/* História em capítulos (timeline) */}
      <h2 className="text-xl font-bold mb-3">A nossa história</h2>
      <ol className="relative border-l border-[#fbfbfb]/60 pl-6 mb-10">
        {chapters.map((c) => (
          <li key={c.title} className="mb-6">
            <div className="absolute -left-[6px] mt-1 h-2 w-2 bg-[#e53e30]" />
            <div className="text-xs opacity-80">{c.date}</div>
            <div className="font-semibold">{c.title}</div>
            <div className="text-[#fbfbfb]/80">{c.body}</div>
          </li>
        ))}
      </ol>

      {/* O que nos diferencia (revisão em tom narrativo) */}
      <h2 className="text-xl font-bold mb-3">O que te espera quando entras</h2>
      <ul className="grid md:grid-cols-2 gap-4 mb-10">
        <li className="p-4 border border-[#6c6c6c]">
          <span className="font-semibold block mb-1">Economia que respira</span>
          <span className="text-[#fbfbfb]/80 text-sm">
            Preços que mexem, rotas que valem ouro e mercados que não perdoam.
          </span>
        </li>
        <li className="p-4 border border-[#6c6c6c]">
          <span className="font-semibold block mb-1">Facções com impacto</span>
          <span className="text-[#fbfbfb]/80 text-sm">
            Um erro muda alianças. Uma vitória muda a noite. O mapa não fica igual.
          </span>
        </li>
        <li className="p-4 border border-[#6c6c6c]">
          <span className="font-semibold block mb-1">Ferramentas self-service</span>
          <span className="text-[#fbfbfb]/80 text-sm">
            Candidaturas claras, reports com contexto e logs que contam a verdade.
          </span>
        </li>
        <li className="p-4 border border-[#6c6c6c]">
          <span className="font-semibold block mb-1">Eventos que deixam marca</span>
          <span className="text-[#fbfbfb]/80 text-sm">
            Temporadas temáticas, metas públicas e recompensas com história.
          </span>
        </li>
      </ul>

      {/* Valores */}
      <h2 className="text-xl font-bold mb-3">Os nossos valores</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <div className="p-4 border border-[#6c6c6c]">
          <div className="font-semibold mb-1">Justiça</div>
          <div className="text-[#fbfbfb]/80 text-sm">Mesmas regras para todos. Sem atalhos.</div>
        </div>
        <div className="p-4 border border-[#6c6c6c]">
          <div className="font-semibold mb-1">Transparência</div>
          <div className="text-[#fbfbfb]/80 text-sm">Decisões explicadas, processos visíveis.</div>
        </div>
        <div className="p-4 border border-[#6c6c6c]">
          <div className="font-semibold mb-1">Ambição</div>
          <div className="text-[#fbfbfb]/80 text-sm">Crescimento sem perder a essência do RP.</div>
        </div>
      </div>

      {/* Promessa em 3 linhas */}
      <div className="p-5 border border-[#6c6c6c] mb-8">
        <p className="text-[#fbfbfb]/90">
          A nossa promessa é simples: dás-nos tempo e personagem, nós damos-te palco e consequência.
          Se a tua história prender a cidade, a cidade prende-se a ti.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-3 font-semibold bg-[#e53e30] text-[#151515] hover:brightness-95 transition"
        >
          Entrar no painel
        </a>
        <a
          href="/rules"
          className="inline-flex items-center gap-2 px-5 py-3 font-semibold bg-transparent text-[#fbfbfb] border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition"
        >
          Ler as regras
        </a>
      </div>
    </StaticPageShell>
  );
}
