// src/pages/Terms.tsx
import React from "react";

const Terms: React.FC = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-2xl p-10 md:p-14 backdrop-blur-xl bg-white/10 border border-white/15 shadow-lg">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-red-500">
            Termos de Utilização
          </h1>
          <p className="text-white/70 mb-10">
            Ao acederes e jogares nos servidores da{" "}
            <span className="text-white font-semibold">FTW Roleplay</span>, aceitas
            estes termos. Lê com atenção antes de participar.
          </p>

          <div className="space-y-6 text-white/80 leading-relaxed">
            <p>
              1. O acesso ao servidor está sujeito às regras publicadas e poderá
              ser revogado em caso de violação.
            </p>
            <p>
              2. Todo o conteúdo criado dentro do servidor (personagens,
              histórias, empresas, etc.) é parte integrante da experiência FTW
              Roleplay e pode ser utilizado pela administração para eventos,
              divulgação ou desenvolvimento do roleplay.
            </p>
            <p>
              3. O incumprimento das regras ou conduta abusiva pode resultar em
              expulsão ou banimento, sem direito a reembolso de eventuais
              benefícios adquiridos.
            </p>
            <p>
              4. Reservamo-nos o direito de alterar estes termos a qualquer
              momento. As alterações entram em vigor imediatamente após
              publicação.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Terms;
