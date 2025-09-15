// src/pages/static/Rules.tsx
import React from "react";
import StaticPageShell from "./StaticPageShell";

export default function Rules() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <StaticPageShell>
      <h1
        className="text-3xl md:text-4xl font-extrabold mb-2"
        style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
      >
        Regras & Políticas
      </h1>

      {/* Índice */}
      <nav className="mb-8 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-[#fbfbfb]/85">
        <p className="font-semibold mb-2">Índice</p>
        <ol className="list-decimal pl-5 space-y-1 marker:text-[#e53e30]">
          <li><a href="#defs" className="underline underline-offset-2">Conceitos e definições</a></li>
          <li><a href="#conduct" className="underline underline-offset-2">Conduta geral</a></li>
          <li><a href="#rp" className="underline underline-offset-2">Fundamentos de RP</a></li>
          <li><a href="#crime" className="underline underline-offset-2">Crime e ilegalidades</a></li>
          <li><a href="#weapons" className="underline underline-offset-2">Armas e combate</a></li>
          <li><a href="#vehicles" className="underline underline-offset-2">Veículos e perseguições</a></li>
          <li><a href="#robberies" className="underline underline-offset-2">Roubos, reféns e negociações</a></li>
          <li><a href="#leo-ems" className="underline underline-offset-2">Polícia (LEO) e EMS</a></li>
          <li><a href="#zones" className="underline underline-offset-2">Zonas (seguras, quentes) e propriedades</a></li>
          <li><a href="#economy" className="underline underline-offset-2">Economia, empregos e bens</a></li>
          <li><a href="#comms" className="underline underline-offset-2">Comunicações, tecnologia e media</a></li>
          <li><a href="#staff" className="underline underline-offset-2">Staff, sanções e recursos</a></li>
          <li><a href="#refunds" className="underline underline-offset-2">Reembolsos e reposições</a></li>
          <li><a href="#changes" className="underline underline-offset-2">Atualizações e aceitação</a></li>
        </ol>
      </nav>

      <div className="space-y-8 text-[#fbfbfb]/85">
        {/* Definições */}
        <section id="defs">
          <h2 className="text-xl font-semibold mb-2">1) Conceitos e definições</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[GR-01] OOC</strong>: conversa fora da personagem. Usa apenas quando necessário e de forma breve.</li>
            <li><strong>[GR-02] Metagaming</strong>: usar info OOC em IC. Proibido.</li>
            <li><strong>[GR-03] Powergaming</strong>: ações irreais/forçadas sem dar hipótese de resposta. Proibido.</li>
            <li><strong>[GR-04] Fear RP</strong>: valoriza a vida. Reage a ameaças com bom senso.</li>
            <li><strong>[GR-05] NLR</strong> (Nova Vida): se deres respawn no hospital, esqueces a cena que levou à morte e não voltas ao local durante <strong>30 minutos</strong>.</li>
            <li><strong>[GR-06] Combat Logging</strong>: sair para evitar consequências. Proibido.</li>
          </ul>
        </section>

        {/* Conduta geral */}
        <section id="conduct">
          <h2 className="text-xl font-semibold mb-2">2) Conduta geral</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[CG-01]</strong> Respeita todos os jogadores e a equipa. Nada de assédio, racismo, homofobia ou ódio.</li>
            <li><strong>[CG-02]</strong> Microfone audível. Evita ruído constante. Se o som estragar cenas, podes ser retirado até arranjares.</li>
            <li><strong>[CG-03]</strong> Bugs/exploits: reporta de imediato. Usar para vantagem dá sanção.</li>
            <li><strong>[CG-04]</strong> Stream sniping, doxing e ameaças reais dão ban imediato.</li>
            <li><strong>[CG-05]</strong> Personagem coerente. Nada de nomes troll ou copy de figuras públicas reais.</li>
            <li><strong>[CG-06]</strong> Tóxicos reincidentes perdem acesso a cenas/eventos e podem levar ban.</li>
          </ul>
        </section>

        {/* Fundamentos de RP */}
        <section id="rp">
          <h2 className="text-xl font-semibold mb-2">3) Fundamentos de RP</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[RP-01]</strong> <em>Roleplay acima de gunplay</em>. Procura história antes de puxar arma.</li>
            <li><strong>[RP-02]</strong> Inicia conflitos com contexto: <em>intenção + oportunidade + ameaça clara</em>.</li>
            <li><strong>[RP-03]</strong> Não uses /me e /do para impor ações que o outro não consegue contrariar.</li>
            <li><strong>[RP-04]</strong> Ferido no chão: fala o mínimo, sem coordenar equipas. Sem rádio/telefone enquanto algemado ou apontado.</li>
            <li><strong>[RP-05]</strong> Regressar à cena após respawn viola NLR (30 min).</li>
          </ul>
        </section>

        {/* Crime e ilegalidades */}
        <section id="crime">
          <h2 className="text-xl font-semibold mb-2">4) Crime e ilegalidades</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[CR-01]</strong> Crimes menores (furtos, vandalismo) exigem cena mínima e coerente.</li>
            <li><strong>[CR-02]</strong> Tráficos/armazenamento requerem logística plausível. Evita “teletransportes” de itens.</li>
            <li><strong>[CR-03]</strong> Sequestro fora de contexto é fail RP. Tem motivo e objetivo claro.</li>
            <li><strong>[CR-04]</strong> Corupção em LEO/EMS é <em>proibida</em> salvo whitelist explícita da direção.</li>
            <li><strong>[CR-05]</strong> Scam OOC (dinheiro real) dá ban permanente.</li>
          </ul>
        </section>

        {/* Armas e combate */}
        <section id="weapons">
          <h2 className="text-xl font-semibold mb-2">5) Armas e combate</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[WB-01]</strong> Sacar arma em público tem risco. Fear RP aplica-se a ti também.</li>
            <li><strong>[WB-02]</strong> Não dispares de forma cega contra massas sem contexto (mass-RDM).</li>
            <li><strong>[WB-03]</strong> Terceiros em cenas: avalia risco antes de intervir. Evita “terceiros mágicos”.</li>
            <li><strong>[WB-04]</strong> Hitman/contratos só com aprovação prévia da staff para alvos específicos.</li>
          </ul>
        </section>

        {/* Veículos e perseguições */}
        <section id="vehicles">
          <h2 className="text-xl font-semibold mb-2">6) Veículos e perseguições</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[VH-01]</strong> Evita condução irreal (rampar prédios, saltos absurdos) sem cena a justificar.</li>
            <li><strong>[VH-02]</strong> PIT e embates fortes: apenas veículos adequados e a velocidades razoáveis.</li>
            <li><strong>[VH-03]</strong> Trocas de carro infinitas para escapar sem cena contam como abuso. Usa comedimento.</li>
            <li><strong>[VH-04]</strong> Drive-by contra civis sem contexto é fail RP.</li>
          </ul>
        </section>

        {/* Roubos, reféns e negociações */}
        <section id="robberies">
          <h2 className="text-xl font-semibold mb-2">7) Roubos, reféns e negociações</h2>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="mb-2">
              <strong>Requisitos por omissão</strong> (ajusta no Discord do servidor):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Lojas</strong>: mínimo 2 LEO em serviço; cooldown <strong>30 min</strong> global.</li>
              <li><strong>Joalharia</strong>: mínimo 4 LEO; 1–2 reféns reais; cooldown <strong>60 min</strong>.</li>
              <li><strong>Banco</strong>: mínimo 6 LEO; 2–4 reféns reais; cooldown <strong>120 min</strong>.</li>
            </ul>
          </div>
          <ul className="list-disc pl-5 space-y-1 mt-3">
            <li><strong>[RB-01]</strong> Reféns devem ser jogadores reais e tratados com respeito. Proibido usar amigos como “bonecos” repetidos.</li>
            <li><strong>[RB-02]</strong> Exigências válidas: passadeira limpa até ao carro, retirada de spikes, 1 reparação leve. Não podes exigir invencibilidade, imunidade a rastreio ou fuga garantida.</li>
            <li><strong>[RB-03]</strong> Tempo com refém: máximo razoável (<strong>15–20 min</strong>) salvo cena especial.</li>
            <li><strong>[RB-04]</strong> Se o negociador cumprir, manténs a palavra. Quebrar acordo sem cena é powergaming.</li>
          </ul>
        </section>

        {/* LEO e EMS */}
        <section id="leo-ems">
          <h2 className="text-xl font-semibold mb-2">8) Polícia (LEO) e EMS</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[LE-01]</strong> LEO seguem SOP internos. Uso de força proporcional e relato após incidentes.</li>
            <li><strong>[LE-02]</strong> Perseguições longas: avalia risco público. PIT apenas quando justificado.</            li>
            <li><strong>[LE-03]</strong> Proibido usar info OOC (streams, Discord externo) em operações.</li>
            <li><strong>[EM-01]</strong> EMS priorizam vida, não lootam, não entram em troca de tiros sem segurança.</li>
            <li><strong>[EM-02]</strong> EMS como reféns: em regra <em>não</em>; só em eventos aprovados.</li>
          </ul>
        </section>

        {/* Zonas e propriedades */}
        <section id="zones">
          <h2 className="text-xl font-semibold mb-2">9) Zonas e propriedades</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[ZN-01]</strong> Zonas seguras: hospitais, PD principal e DMV. Proibido iniciar crimes nestes locais.</li>
            <li><strong>[ZN-02]</strong> Zonas quentes (se anunciadas): expectativas de conflito aumentam. Mesmo assim, evita RDM.</li>
            <li><strong>[ZN-03]</strong> Propriedades privadas: respeita trancas. Arrombamentos exigem ferramenta/cena.</li>
          </ul>
        </section>

        {/* Economia */}
        <section id="economy">
          <h2 className="text-xl font-semibold mb-2">10) Economia, empregos e bens</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[EC-01]</strong> Transferências grandes entre contas exigem justificação RP (faturas, negócios).</li>
            <li><strong>[EC-02]</strong> Dupla contabilística ou farms AFK dão sanção e wipe dos ganhos.</li>
            <li><strong>[EC-03]</strong> Itens ilegais: transporte e venda com lógica. Perda de items faz parte do risco.</li>
          </ul>
        </section>

        {/* Comunicações */}
        <section id="comms">
          <h2 className="text-xl font-semibold mb-2">11) Comunicações, tecnologia e media</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[CM-01]</strong> Rádio/telefone: sem uso enquanto algemado, rendido ou com arma apontada muito perto.</li>
            <li><strong>[CM-02]</strong> Aplicações VOIP externas apenas para IC quando autorizadas. Caso contrário, usa o VOIP do servidor.</li>
            <li><strong>[CM-03]</strong> Bodycams: segue regras internas (quando ativar, onde gravar). Proibido usar como “radar mágico”.</li>
            <li><strong>[CM-04]</strong> Streamers respeitam delays e ocultam info sensível quando necessário.</li>
          </ul>
        </section>

        {/* Staff e sanções */}
        <section id="staff">
          <h2 className="text-xl font-semibold mb-2">12) Staff, sanções e recursos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[ST-01]</strong> A staff pode intervir em cena, pausar ação e decidir no momento para proteger o RP.</li>
            <li><strong>[ST-02]</strong> Escalonamento comum: aviso → kick → ban temporário → ban permanente. Reincidência agrava.</li>
            <li><strong>[ST-03]</strong> Para recurso, abre ticket com prova (clips/logs) nas <em>48 h</em> seguintes.</li>
            <li><strong>[ST-04]</strong> Abuso contra staff dá ban. Discord e in-game contam para a mesma avaliação.</li>
          </ul>
        </section>

        {/* Reembolsos */}
        <section id="refunds">
          <h2 className="text-xl font-semibold mb-2">13) Reembolsos e reposições</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>[RF-01]</strong> Apenas por falha técnica confirmada ou erro administrativo. Perdas RP não dão refund.</li>
            <li><strong>[RF-02]</strong> Pede até <em>24 h</em> após o incidente, com clip/logs. Sem prova, não há reposição.</li>
            <li><strong>[RF-03]</strong> A staff pode substituir por item/valor equivalente se o original não existir.</li>
          </ul>
        </section>

        {/* Atualizações */}
        <section id="changes">
          <h2 className="text-xl font-semibold mb-2">14) Atualizações e aceitação</h2>
          <p>
            As regras podem mudar para proteger a experiência de todos. Quando entras, aceitas
            estas regras e as versões futuras. Alterações materiais serão destacadas nos nossos canais.
          </p>
        </section>

        <hr className="my-6 border-[#fbfbfb]/30" />
        <p className="text-sm opacity-70">Última atualização: {today}</p>
      </div>
    </StaticPageShell>
  );
}
