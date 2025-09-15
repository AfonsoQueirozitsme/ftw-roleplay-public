// src/pages/static/About.tsx
import React from "react";
import StaticPageShell from "./StaticPageShell";

const timeline = [
  { date: "2023 Q4", title: "Ideia inicial", body: "Conceito FTW Roleplay e primeiros protótipos." },
  { date: "2024 Q2", title: "Alpha privada", body: "Testes internos, sistemas base e economia." },
  { date: "2025 Q1", title: "Infra & Bots", body: "Automação, triagem de reports, pipelines." },
  { date: "2025 Q3", title: "Early Access", body: "Acesso progressivo, rework de jobs e facções." },
];

export default function About() {
  return (
    <StaticPageShell>
      <h1 className="text-3xl md:text-5xl font-extrabold mb-2" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
        Sobre nós
      </h1>
      <p className="text-[#fbfbfb]/85 mb-8 max-w-3xl">
        O FTW Roleplay nasceu para elevar o standard do RP em Portugal: economia viva, facções com impacto real, 
        ferramentas modernas e uma cultura competitiva mas saudável. 
      </p>

      <h2 className="text-xl font-bold mb-3">O que nos diferencia</h2>
      <ul className="grid md:grid-cols-2 gap-4 mb-10">
        <li className="p-4 border border-[#6c6c6c]">Economia sistémica, inflação e mercados dinâmicos.</li>
        <li className="p-4 border border-[#6c6c6c]">IA assistiva para triagem rápida de reports e tickets.</li>
        <li className="p-4 border border-[#6c6c6c]">Ferramentas self-service (dashboard, candidaturas, logs).</li>
        <li className="p-4 border border-[#6c6c6c]">Eventos sazonais e meta progressiva por temporadas.</li>
      </ul>

      <h2 className="text-xl font-bold mb-3">Timeline</h2>
      <ol className="relative border-l border-[#fbfbfb] pl-6">
        {timeline.map((t) => (
          <li key={t.date} className="mb-6">
            <div className="absolute -left-[5px] mt-1 h-2 w-2 bg-[#e53e30]" />
            <div className="text-sm opacity-80">{t.date}</div>
            <div className="font-semibold">{t.title}</div>
            <div className="text-[#fbfbfb]/80">{t.body}</div>
          </li>
        ))}
      </ol>
    </StaticPageShell>
  );
}
