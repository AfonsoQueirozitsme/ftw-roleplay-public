// /src/pages/static/Terms.tsx
import React from "react";
import StaticPageShell from "./StaticPageShell";

export default function Terms() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <StaticPageShell>
      <h1
        className="text-3xl md:text-4xl font-extrabold mb-6"
        style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
      >
        Termos de Serviço
      </h1>

      {/* Sumário / Índice */}
      <nav className="mb-8 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-[#fbfbfb]/85">
        <p className="font-semibold mb-2">Índice</p>
        <ol className="list-decimal pl-5 space-y-1 marker:text-[#e53e30]">
          <li><a href="#intro" className="underline underline-offset-2">Introdução e aceitação</a></li>
          <li><a href="#defs" className="underline underline-offset-2">Definições</a></li>
          <li><a href="#eligibility" className="underline underline-offset-2">Elegibilidade</a></li>
          <li><a href="#account" className="underline underline-offset-2">Conta e segurança</a></li>
          <li><a href="#conduct" className="underline underline-offset-2">Regras de conduta</a></li>
          <li><a href="#ugc" className="underline underline-offset-2">Conteúdo do utilizador</a></li>
          <li><a href="#ip" className="underline underline-offset-2">Propriedade intelectual</a></li>
          <li><a href="#payments" className="underline underline-offset-2">Pagamentos e bens virtuais</a></li>
          <li><a href="#third" className="underline underline-offset-2">Serviços de terceiros</a></li>
          <li><a href="#moderation" className="underline underline-offset-2">Moderação e sanções</a></li>
          <li><a href="#termination" className="underline underline-offset-2">Suspensão e terminação</a></li>
          <li><a href="#availability" className="underline underline-offset-2">Disponibilidade e manutenção</a></li>
          <li><a href="#warranty" className="underline underline-offset-2">Exoneração de garantias</a></li>
          <li><a href="#liability" className="underline underline-offset-2">Limitação de responsabilidade</a></li>
          <li><a href="#indemnity" className="underline underline-offset-2">Indemnização</a></li>
          <li><a href="#privacy" className="underline underline-offset-2">Privacidade</a></li>
          <li><a href="#changes" className="underline underline-offset-2">Alterações aos termos</a></li>
          <li><a href="#comms" className="underline underline-offset-2">Comunicações</a></li>
          <li><a href="#law" className="underline underline-offset-2">Lei aplicável e foro</a></li>
          <li><a href="#final" className="underline underline-offset-2">Disposições finais</a></li>
          <li><a href="#contact" className="underline underline-offset-2">Contactos</a></li>
        </ol>
      </nav>

      <div className="space-y-8 text-[#fbfbfb]/85">
        <section id="intro">
          <h2 className="text-xl font-semibold mb-2">1. Introdução e aceitação</h2>
          <p>
            Ao utilizar o <strong>FTW Roleplay</strong>, os seus websites, aplicações, servidores e
            comunidades associadas (doravante, “Serviço”), concordas com estes Termos de Serviço
            (“Termos”) e com quaisquer políticas adicionais referidas neste documento. Se não
            concordares, não deves aceder nem usar o Serviço.
          </p>
        </section>

        <section id="defs">
          <h2 className="text-xl font-semibold mb-2">2. Definições</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Utilizador</strong>: qualquer pessoa que acede ou utiliza o Serviço.</li>
            <li><strong>Conta</strong>: registo associado ao Utilizador para aceder a funcionalidades.</li>
            <li><strong>Conteúdo</strong>: texto, imagens, áudio, vídeo, mods, scripts, mensagens e quaisquer dados enviados ou disponibilizados.</li>
            <li><strong>Bens virtuais</strong>: itens, vantagens, moedas ou estatutos sem valor monetário fora do Serviço.</li>
          </ul>
        </section>

        <section id="eligibility">
          <h2 className="text-xl font-semibold mb-2">3. Elegibilidade</h2>
          <p>
            Para usar o Serviço, confirmas que tens capacidade legal e cumpres a idade mínima
            exigida na tua jurisdição. Se tiveres menos de 16 anos, será necessário consentimento
            dos teus representantes legais, quando aplicável.
          </p>
        </section>

        <section id="account">
          <h2 className="text-xl font-semibold mb-2">4. Conta e segurança</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>És responsável por manter a confidencialidade das credenciais e por toda a atividade na tua conta.</li>
            <li>Deves fornecer informações verdadeiras e atualizadas. O uso de identidade de terceiros sem autorização é proibido.</li>
            <li>Notifica-nos de imediato sobre qualquer acesso não autorizado ou suspeita de violação de segurança.</li>
          </ul>
        </section>

        <section id="conduct">
          <h2 className="text-xl font-semibold mb-2">5. Regras de conduta</h2>
          <p className="mb-2">Para garantir uma comunidade saudável, concordas em:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Respeitar as regras de roleplay e as instruções da equipa de moderação.</li>
            <li>Abster-te de assédio, discurso de ódio, difamação, spam ou divulgação de conteúdos ilegais.</li>
            <li>Não utilizar cheats, exploits, automações ou engenharia inversa que afetem o Serviço.</li>
            <li>Não divulgar dados pessoais de terceiros (“doxing”) nem invadir privacidade.</li>
            <li>Não comercializar contas ou bens virtuais fora das regras internas.</li>
          </ul>
          <p className="mt-2">
            O incumprimento pode resultar em avisos, restrições, expulsão temporária ou banimento
            permanente, conforme a gravidade e avaliação da equipa.
          </p>
        </section>

        <section id="ugc">
          <h2 className="text-xl font-semibold mb-2">6. Conteúdo do utilizador</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Continuas a deter os direitos sobre o teu Conteúdo. Ao submeter Conteúdo, concedes uma licença mundial, não exclusiva e gratuita para alojar, reproduzir e exibir esse Conteúdo no âmbito do Serviço.</li>
            <li>Garante que tens os direitos necessários para publicar o Conteúdo e que este não viola direitos de terceiros.</li>
            <li>Podemos remover ou bloquear Conteúdo que viole estes Termos ou a lei.</li>
          </ul>
        </section>

        <section id="ip">
          <h2 className="text-xl font-semibold mb-2">7. Propriedade intelectual do FTW</h2>
          <p>
            Marcas, logótipos, design, código, documentação e outros elementos do Serviço são
            propriedade do FTW Roleplay ou dos respetivos licenciantes. Não tens autorização para
            copiar, modificar, distribuir ou explorar comercialmente qualquer parte do Serviço sem
            consentimento prévio por escrito.
          </p>
        </section>

        <section id="payments">
          <h2 className="text-xl font-semibold mb-2">8. Pagamentos, doações e bens virtuais</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contribuições, “passes” ou vantagens adquiridas no Serviço são bens virtuais sem valor cambial fora do Serviço.</li>
            <li>Salvo disposição legal imperativa, pagamentos são finais e não reembolsáveis.</li>
            <li>Podemos alterar, equilibrar ou descontinuar bens virtuais para manter a integridade do jogo/servidor.</li>
            <li>Fraude de pagamento pode levar a sanções e reporte às entidades competentes.</li>
          </ul>
        </section>

        <section id="third">
          <h2 className="text-xl font-semibold mb-2">9. Ferramentas e serviços de terceiros</h2>
          <p>
            O Serviço pode integrar ou depender de plataformas de terceiros (por exemplo, Discord,
            FiveM, Steam, fornecedores de pagamento e alojamento). O teu uso desses serviços está
            sujeito aos termos e políticas desses terceiros. Não assumimos responsabilidade por
            interrupções, alterações ou ações de terceiros.
          </p>
        </section>

        <section id="moderation">
          <h2 className="text-xl font-semibold mb-2">10. Moderação e aplicação de regras</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>A equipa de moderação pode intervir, solicitar provas, aplicar medidas graduais ou imediatas e agir sem aviso prévio em casos graves.</li>
            <li>Podes apresentar recurso de decisões, segundo o procedimento indicado nos nossos canais oficiais.</li>
            <li>Medidas aplicadas por parceiros/terceiros (ex.: plataformas de voz) podem refletir-se no teu acesso ao Serviço.</li>
          </ul>
        </section>

        <section id="termination">
          <h2 className="text-xl font-semibold mb-2">11. Suspensão e terminação</h2>
          <p>
            Podemos suspender ou terminar o acesso ao Serviço se houver violação destes Termos,
            risco para a segurança, exigência legal ou descontinuação do Serviço. Podes pedir o
            encerramento da tua conta a qualquer momento. A terminação não elimina obrigações já
            vencidas (ex.: montantes em dívida ou violações anteriores).
          </p>
        </section>

        <section id="availability">
          <h2 className="text-xl font-semibold mb-2">12. Suporte, manutenção e disponibilidade</h2>
          <p>
            Fornecemos o Serviço “tal como se encontra” e “conforme disponível”. Podemos realizar
            manutenção programada ou emergente. Podem ocorrer interrupções, perdas de dados ou
            alterações de funcionalidades.
          </p>
        </section>

        <section id="warranty">
          <h2 className="text-xl font-semibold mb-2">13. Exoneração de garantias</h2>
          <p>
            Na medida máxima permitida por lei, excluímos garantias expressas ou implícitas, incluindo,
            sem limitar, garantias de qualidade, adequação a um fim específico, disponibilidade
            ininterrupta e ausência de erros.
          </p>
        </section>

        <section id="liability">
          <h2 className="text-xl font-semibold mb-2">14. Limitação de responsabilidade</h2>
          <p>
            Não seremos responsáveis por danos indiretos, incidentais, especiais, consequenciais,
            lucros cessantes, perda de dados, interrupções de atividade, danos reputacionais ou
            outros prejuízos semelhantes decorrentes do uso ou impossibilidade de uso do Serviço.
            A responsabilidade agregada, quando aplicável, limita-se ao montante que pagaste nos 12
            meses anteriores ao evento que originou a responsabilidade, salvo dolo ou culpa grave.
          </p>
        </section>

        <section id="indemnity">
          <h2 className="text-xl font-semibold mb-2">15. Indemnização</h2>
          <p>
            Concordas em indemnizar e isentar de responsabilidade o FTW Roleplay, a sua equipa e
            parceiros contra reclamações de terceiros relacionadas com o teu uso do Serviço, o teu
            Conteúdo ou violação destes Termos.
          </p>
        </section>

        <section id="privacy">
          <h2 className="text-xl font-semibold mb-2">16. Proteção de dados e privacidade</h2>
          <p>
            O tratamento de dados pessoais segue a nossa <a href="/privacy" className="underline underline-offset-2">Política de Privacidade</a>.
            Ao usar o Serviço, reconheces essa política. Para pedidos de acesso, correção ou eliminação,
            usa os contactos indicados.
          </p>
        </section>

        <section id="changes">
          <h2 className="text-xl font-semibold mb-2">17. Alterações aos termos</h2>
          <p>
            Podemos atualizar estes Termos para refletir alterações legais, técnicas ou operacionais.
            Em caso de mudança material, procuraremos avisar com antecedência razoável. O uso contínuo
            do Serviço após a data efetiva das alterações representa aceitação das novas condições.
          </p>
        </section>

        <section id="comms">
          <h2 className="text-xl font-semibold mb-2">18. Comunicações eletrónicas</h2>
          <p>
            Concordas em receber comunicações eletrónicas relacionadas com a tua conta e com o
            Serviço (por exemplo, anúncios, avisos, atualizações e mensagens de suporte).
          </p>
        </section>

        <section id="law">
          <h2 className="text-xl font-semibold mb-2">19. Lei aplicável e foro</h2>
          <p>
            Estes Termos regem-se pela lei portuguesa. Salvo disposição imperativa, os tribunais da
            comarca de Lisboa são competentes para dirimir qualquer litígio relacionado com o
            Serviço.
          </p>
        </section>

        <section id="final">
          <h2 className="text-xl font-semibold mb-2">20. Disposições finais</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Integração completa</strong>: estes Termos constituem o acordo integral entre ti e o FTW Roleplay quanto ao Serviço.</li>
            <li><strong>Separabilidade</strong>: se alguma cláusula for inválida, as restantes mantêm-se em vigor.</li>
            <li><strong>Não renúncia</strong>: a falta de exercício de um direito não implica renúncia a esse direito.</li>
            <li><strong>Cessão</strong>: podemos ceder estes Termos; não podes ceder sem consentimento prévio por escrito.</li>
            <li><strong>Força maior</strong>: não existe incumprimento por eventos fora do nosso controlo razoável.</li>
          </ul>
        </section>

        <section id="contact">
          <h2 className="text-xl font-semibold mb-2">21. Contactos</h2>
          <p>
            Dúvidas ou pedidos: <a className="underline underline-offset-2">via Dashboard</a>
            {" "}ou os nossos canais oficiais (ex.: Discord).
          </p>
        </section>

        <hr className="my-6 border-[#fbfbfb]/30" />
        <p className="text-sm opacity-70">
          Última atualização: {today}
        </p>
      </div>
    </StaticPageShell>
  );
}
