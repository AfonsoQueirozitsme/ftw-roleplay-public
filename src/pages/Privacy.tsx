// src/pages/Privacy.tsx
import React from "react";

const Privacy: React.FC = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-2xl p-10 md:p-14 backdrop-blur-xl bg-white/10 border border-white/15 shadow-lg">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-red-500">
            Política de Privacidade
          </h1>
          <p className="text-white/70 mb-10">
            A{" "}
            <span className="text-white font-semibold">FTW Roleplay</span> valoriza
            a tua privacidade. Esta política explica como recolhemos, usamos e
            protegemos os teus dados.
          </p>

          <div className="space-y-6 text-white/80 leading-relaxed">
            <p>
              1. Os dados fornecidos (nome, e-mail, Discord, etc.) são usados
              exclusivamente para gestão da conta, comunicações e candidaturas
              dentro do servidor.
            </p>
            <p>
              2. Não partilhamos dados pessoais com terceiros, excepto quando
              exigido por lei ou para cumprimento das regras do servidor.
            </p>
            <p>
              3. Utilizamos medidas técnicas adequadas para proteger a
              informação contra acessos não autorizados, perda ou alteração.
            </p>
            <p>
              4. Podes solicitar a eliminação dos teus dados a qualquer momento
              através dos canais oficiais de contacto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Privacy;
