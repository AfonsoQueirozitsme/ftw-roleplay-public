// src/pages/static/Privacy.tsx
import React from "react";
import StaticPageShell from "./StaticPageShell";

export default function Privacy() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <StaticPageShell>
      <h1
        className="text-3xl md:text-4xl font-extrabold mb-6"
        style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
      >
        Política de Privacidade
      </h1>

      <div className="space-y-8 text-[#fbfbfb]/85">
        {/* Introdução */}
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p>
            A tua privacidade importa. Esta Política explica que dados recolhemos, por que razão o fazemos,
            como os tratamos e que escolhas tens. O <strong>FTW Roleplay</strong> cumpre o Regulamento
            (UE) 2016/679 (“RGPD”) e a legislação portuguesa aplicável.
          </p>
          <p className="mt-3 text-sm opacity-80">
            Controlador: <strong>FTW Roleplay</strong> • Contacto:{" "}
            <a className="underline underline-offset-2" href="mailto:admin@ftwrp.example">
              admin@ftwrp.example
            </a>{" "}
            • Morada: <em>preencher morada</em>.
          </p>
        </section>

        {/* Dados que recolhemos */}
        <section>
          <h2 className="text-xl font-semibold mb-2">1) Que dados recolhemos</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Dados de conta e autenticação</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>E-mail, ID de utilizador, nomes de Discord, avatar e ID (quando fazes login via Discord).</li>
                <li>Registos de sessão (timestamps, IP aproximado, agente de utilizador).</li>
              </ul>
            </div>
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Conteúdo submetido por ti</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Candidaturas, reports/tickets e respetivas mensagens.</li>
                <li>Anexos carregados (ficheiros, imagens) e respetivos metadados técnicos.</li>
              </ul>
            </div>
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Dados técnicos</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Logs de aplicação/segurança para garantir estabilidade e prevenir abuso.</li>
                <li>Cookies estritamente necessários à sessão e preferências.</li>
              </ul>
            </div>
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">IA assistiva (quando ativa)</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Resumo de reports/tickets apenas para triagem e sugestões à equipa.</li>
                <li>Sem perfilização para decisões com efeitos legais sobre ti.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Finalidades e bases legais */}
        <section>
          <h2 className="text-xl font-semibold mb-2">2) Finalidades e bases legais (RGPD)</h2>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Fornecer o serviço</strong> (autenticação, gestão de conta, execução de jogo/servidor,
                candidaturas, tickets) — <em>execução de contrato</em> (art. 6.º, n.º 1, al. b) RGPD).
              </li>
              <li>
                <strong>Segurança e prevenção de abuso</strong> (logs, rate-limits, deteção de fraude) —{" "}
                <em>interesse legítimo</em> (art. 6.º, n.º 1, al. f)).
              </li>
              <li>
                <strong>Comunicações operacionais</strong> (notificações de conta, estado de candidatura, respostas a
                tickets) — <em>execução de contrato</em>.
              </li>
              <li>
                <strong>Obrigações legais</strong> (responder a autoridades competentes, fiscalidade quando aplicável) —{" "}
                <em>cumprimento de obrigação legal</em> (art. 6.º, n.º 1, al. c)).
              </li>
              <li>
                <strong>IA assistiva</strong> para triagem/apoio à moderação — <em>interesse legítimo</em>, com
                minimização de dados e possibilidade de oposição (art. 21.º).
              </li>
              <li>
                <strong>Cookies opcionais/analítica</strong> — <em>consentimento</em> (art. 6.º, n.º 1, al. a)), apenas
                quando presentes e aceites por ti.
              </li>
            </ul>
          </div>
        </section>

        {/* Conservação */}
        <section>
          <h2 className="text-xl font-semibold mb-2">3) Prazos de conservação</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Conta e autenticação:</strong> enquanto manténs a conta ativa. Eliminamos/anonimizamos até 30 dias após pedido de eliminação, salvo obrigação legal.</li>
            <li><strong>Candidaturas:</strong> 24 meses para gestão de ciclos de acesso.</li>
            <li><strong>Reports/tickets e anexos:</strong> 24 meses para histórico e auditoria.</li>
            <li><strong>Logs técnicos/segurança:</strong> 12 meses (ou menos, se operacionalmente possível).</li>
            <li><strong>Dados sujeitos a obrigação legal:</strong> pelo prazo legal aplicável.</li>
          </ul>
        </section>

        {/* Partilha e subcontratantes */}
        <section>
          <h2 className="text-xl font-semibold mb-2">4) Com quem partilhamos dados (subcontratantes)</h2>
          <p className="mb-3">
            Só partilhamos dados com fornecedores que suportam o Serviço, seguindo instruções nossas e acordos de
            tratamento. Eis os principais:
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3">Fornecedor</th>
                  <th className="text-left p-3">Finalidade</th>
                  <th className="text-left p-3">Localização</th>
                  <th className="text-left p-3">Política</th>
                  <th className="text-left p-3">Base legal</th>
                </tr>
              </thead>
              <tbody>
                {/* Confirmados no teu stack */}
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Supabase</td>
                  <td className="p-3">Autenticação, base de dados, storage, edge functions</td>
                  <td className="p-3">UE (regiões à escolha); pode usar sub-processadores</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
                      supabase.com/privacy
                    </a>
                  </td>
                  <td className="p-3">Execução de contrato; interesse legítimo (segurança)</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Discord</td>
                  <td className="p-3">Login OAuth; leitura de ID/username/avatar</td>
                  <td className="p-3">EUA/Global</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://discord.com/privacy" target="_blank" rel="noreferrer">
                      discord.com/privacy
                    </a>
                  </td>
                  <td className="p-3">Execução de contrato; consentimento quando aplicável</td>
                </tr>

                {/* >>> Ajusta/ativa apenas se usares estes serviços <<< */}
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Cloudflare (se aplicável)</td>
                  <td className="p-3">CDN, DNS, WAF, mitigação DDoS</td>
                  <td className="p-3">Global</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">
                      cloudflare.com/privacy
                    </a>
                  </td>
                  <td className="p-3">Interesse legítimo (segurança e desempenho)</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Vercel/Netlify (se aplicável)</td>
                  <td className="p-3">Alojamento front-end e edge</td>
                  <td className="p-3">UE/EUA (conforme região)</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                      vercel.com/privacy
                    </a>
                  </td>
                  <td className="p-3">Execução de contrato</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Stripe (se aplicável)</td>
                  <td className="p-3">Pagamentos/doações</td>
                  <td className="p-3">UE/EUA</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
                      stripe.com/privacy
                    </a>
                  </td>
                  <td className="p-3">Execução de contrato; obrigação legal</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Sentry/Datadog (se aplicável)</td>
                  <td className="p-3">Monitorização e erros</td>
                  <td className="p-3">UE/EUA</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://sentry.io/privacy/" target="_blank" rel="noreferrer">
                      sentry.io/privacy
                    </a>
                  </td>
                  <td className="p-3">Interesse legítimo (qualidade e estabilidade)</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Postmark/Resend (se aplicável)</td>
                  <td className="p-3">Envio de e-mails transacionais</td>
                  <td className="p-3">UE/EUA</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="https://postmarkapp.com/privacy" target="_blank" rel="noreferrer">
                      postmarkapp.com/privacy
                    </a>
                  </td>
                  <td className="p-3">Execução de contrato</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-medium">Fornecedor de IA (se aplicável)</td>
                  <td className="p-3">Suporte à triagem de tickets (resumo/sugestões)</td>
                  <td className="p-3">UE/EUA</td>
                  <td className="p-3">
                    <a className="underline underline-offset-2" href="#" target="_blank" rel="noreferrer">
                      política do fornecedor
                    </a>
                  </td>
                  <td className="p-3">Interesse legítimo; consentimento quando exigido</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm opacity-80">
            <strong>Transferências internacionais:</strong> quando um fornecedor esteja fora do EEE, usamos
            mecanismos adequados (Cláusulas Contratuais-Tipo da UE, decisões de adequação ou medidas
            adicionais) para proteger os teus dados.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-xl font-semibold mb-2">5) Cookies e tecnologias semelhantes</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Estritamente necessários:</strong> sessão, segurança, preferências essenciais.</li>
            <li><strong>Funcionais/analítica (opcional):</strong> só após consentimento no banner (quando ativo).</li>
          </ul>
          <p className="text-sm opacity-80 mt-2">
            Podes gerir preferências no teu navegador e, quando disponível, através do nosso gestor de consentimento.
          </p>
        </section>

        {/* IA assistiva */}
        <section>
          <h2 className="text-xl font-semibold mb-2">6) IA assistiva</h2>
          <p>
            Usamos IA apenas para <strong>apoiar</strong> a triagem de reports/tickets e acelerar respostas.
            Enviamos o mínimo de dados necessário, removemos identificadores sempre que possível e não
            tomamos decisões com efeitos legais <em>apenas</em> com base em processamento automatizado.
            Podes opor-te a este tratamento; a equipa então trata o teu caso manualmente.
          </p>
        </section>

        {/* Os teus direitos */}
        <section>
          <h2 className="text-xl font-semibold mb-2">7) Os teus direitos (RGPD)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acesso aos teus dados e obtenção de cópia.</li>
            <li>Retificação de dados incorretos ou incompletos.</li>
            <li>Apagamento (“direito a ser esquecido”) quando aplicável.</li>
            <li>Limitação e oposição ao tratamento em certas situações.</li>
            <li>Portabilidade dos dados fornecidos por ti.</li>
            <li>Retirar consentimento a qualquer momento, sem afetar o tratamento anterior.</li>
            <li>
              Reclamar junto da <strong>CNPD</strong> (Comissão Nacional de Proteção de Dados) —{" "}
              <a className="underline underline-offset-2" href="https://www.cnpd.pt" target="_blank" rel="noreferrer">
                cnpd.pt
              </a>.
            </li>
          </ul>
          <p className="text-sm opacity-80 mt-2">
            Para exercer direitos, contacta-nos em{" "}
            <a className="underline underline-offset-2" href="mailto:admin@ftwrp.example">
              admin@ftwrp.example
            </a>. Respondemos sem demora injustificada.
          </p>
        </section>

        {/* Segurança */}
        <section>
          <h2 className="text-xl font-semibold mb-2">8) Segurança</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Transporte cifrado (HTTPS/TLS) e encriptação em repouso nos nossos fornecedores.</li>
            <li>Controlo de acessos por perfis e princípio do menor privilégio.</li>
            <li>Backups, registos de auditoria e separação de ambientes.</li>
            <li>Revisões periódicas e resposta a incidentes com notificação quando exigida por lei.</li>
          </ul>
        </section>

        {/* Idades */}
        <section>
          <h2 className="text-xl font-semibold mb-2">9) Crianças e limites de idade</h2>
          <p>
            O Serviço destina-se a utilizadores com <strong>16 anos ou mais</strong>. Se identificarmos conta de menor
            sem consentimento adequado, removemos os dados após verificação.
          </p>
        </section>

        {/* Comunidade e moderação */}
        <section>
          <h2 className="text-xl font-semibold mb-2">10) Comunidade e moderação</h2>
          <p>
            Podemos moderar conteúdo e comunicações para garantir cumprimento das regras e da lei. Em caso de suspeita
            grave, podemos conservar elementos de prova e cooperar com autoridades competentes.
          </p>
        </section>

        {/* Alterações */}
        <section>
          <h2 className="text-xl font-semibold mb-2">11) Alterações a esta Política</h2>
          <p>
            Podemos atualizar esta Política para refletir mudanças legais, técnicas ou operacionais. Quando a alteração
            for material, procuramos avisar com antecedência razoável. O uso contínuo do Serviço implica aceitação das
            novas versões.
          </p>
        </section>

        {/* Contactos */}
        <section>
          <h2 className="text-xl font-semibold mb-2">12) Contactos</h2>
          <p>
            Dúvidas sobre privacidade? Escreve para{" "}
            <a className="underline underline-offset-2" href="mailto:admin@ftwrp.example">
              admin@ftwrp.example
            </a>.
          </p>
        </section>

        <hr className="my-6 border-[#fbfbfb]/30" />
        <p className="text-sm opacity-70">Última atualização: {today}</p>
      </div>
    </StaticPageShell>
  );
}
