// src/pages/static/Cookies.tsx
import React, { useEffect, useMemo, useState } from "react";
import StaticPageShell from "./StaticPageShell";

type LocalConsent = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

function loadLocalConsent(): LocalConsent | null {
  try {
    const raw = localStorage.getItem("ftwConsent");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      functional: !!parsed.functional,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
    };
  } catch {
    return null;
  }
}

function saveLocalConsent(c: LocalConsent) {
  localStorage.setItem("ftwConsent", JSON.stringify(c));
  // dispara evento para a app reagir (ex.: inicializar analytics apenas após consentimento)
  window.dispatchEvent(
    new CustomEvent("ftw-consent-changed", { detail: c })
  );
}

export default function Cookies() {
  const [localOpen, setLocalOpen] = useState(false);
  const [consent, setConsent] = useState<LocalConsent>({
    functional: false,
    analytics: false,
    marketing: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = loadLocalConsent();
    if (existing) setConsent(existing);
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function tryOpenNativeCMP() {
    let opened = false;

    // IAB TCF v2 (alguns CMPs usam __tcfapi)
    try {
      // @ts-ignore
      if (typeof window.__tcfapi === "function") {
        // displayConsentUi é suportado por vários CMPs TCF
        // @ts-ignore
        window.__tcfapi("displayConsentUi", 2, () => {});
        opened = true;
      }
    } catch {}

    // OneTrust
    try {
      // @ts-ignore
      if (typeof window.OneTrust?.ToggleInfoDisplay === "function") {
        // @ts-ignore
        window.OneTrust.ToggleInfoDisplay();
        opened = true;
      }
    } catch {}

    // Cookiebot
    try {
      // @ts-ignore
      if (typeof window.Cookiebot?.renew === "function") {
        // @ts-ignore
        window.Cookiebot.renew();
        opened = true;
      }
    } catch {}

    // CookieYes
    try {
      // @ts-ignore
      if (typeof window.cookieyes?.open === "function") {
        // @ts-ignore
        window.cookieyes.open();
        opened = true;
      }
    } catch {}

    // Se nenhum CMP estiver presente, mostra o modal local
    if (!opened) setLocalOpen(true);
  }

  function saveAndClose() {
    saveLocalConsent(consent);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLocalOpen(false);
  }

  return (
    <StaticPageShell>
      <h1
        className="text-3xl md:text-4xl font-extrabold mb-6"
        style={{ fontFamily: "Goldman, system-ui, sans-serif" }}
      >
        Política de Cookies
      </h1>

      <div className="space-y-8 text-[#fbfbfb]/85">
        {/* Introdução */}
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p>
            Esta Política explica como o <strong>FTW Roleplay</strong> utiliza cookies e tecnologias
            semelhantes para operar o serviço, lembrar preferências e melhorar a experiência.
          </p>
          <p className="mt-2 text-sm opacity-80">
            Alguns cookies são <strong>estritamente necessários</strong> e funcionam sem consentimento. Os restantes
            apenas ativam após a tua escolha.
          </p>
        </section>

        {/* Categorias */}
        <section>
          <h2 className="text-xl font-semibold mb-2">1) Categorias de cookies</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Estritamente necessários</h3>
              <p className="text-sm text-[#fbfbfb]/85">
                Mantêm sessões, aplicam segurança e equilibram carga. Não podes desativar, porque
                o site depende deles para funcionar.
              </p>
            </div>
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Funcionais</h3>
              <p className="text-sm text-[#fbfbfb]/85">
                Recordam preferências (por exemplo, idioma, UI) e melhoram a usabilidade.
              </p>
            </div>
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Analíticos</h3>
              <p className="text-sm text-[#fbfbfb]/85">
                Ajudam a entender utilização agregada (páginas mais vistas, erros). Só ativam com o teu consentimento.
              </p>
            </div>
            <div className="p-4 border border-[#6c6c6c]">
              <h3 className="font-semibold mb-1">Marketing (opcional)</h3>
              <p className="text-sm text-[#fbfbfb]/85">
                Podem medir campanhas e personalizar conteúdos externos. Desligados por
                predefinição e apenas ativam se concordares.
              </p>
            </div>
          </div>
        </section>

        {/* Tabela de exemplos (ajusta conforme a tua stack) */}
        <section>
          <h2 className="text-xl font-semibold mb-2">2) Exemplos de cookies e armazenamento</h2>
          <div className="overflow-x-auto rounded-xl border border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Fornecedor</th>
                  <th className="text-left p-3">Finalidade</th>
                  <th className="text-left p-3">Duração</th>
                  <th className="text-left p-3">Categoria</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/10">
                  <td className="p-3">ftw_session</td>
                  <td className="p-3">FTW (primeira parte)</td>
                  <td className="p-3">Manter sessão autenticada</td>
                  <td className="p-3">Sessão</td>
                  <td className="p-3">Estritamente necessário</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3">sb-access-token (localStorage)</td>
                  <td className="p-3">Supabase</td>
                  <td className="p-3">Token de acesso para chamadas API</td>
                  <td className="p-3">Até logout/expiração</td>
                  <td className="p-3">Estritamente necessário</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3">sb-refresh-token (localStorage)</td>
                  <td className="p-3">Supabase</td>
                  <td className="p-3">Renovar sessão de forma segura</td>
                  <td className="p-3">Até logout/expiração</td>
                  <td className="p-3">Estritamente necessário</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3">ftw_prefs</td>
                  <td className="p-3">FTW (primeira parte)</td>
                  <td className="p-3">Guardar preferências de UI</td>
                  <td className="p-3">6 meses</td>
                  <td className="p-3">Funcional</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3">plausible_ignore</td>
                  <td className="p-3">Plausible (quando usado)</td>
                  <td className="p-3">Opt-out de analítica sem cookies</td>
                  <td className="p-3">12 meses</td>
                  <td className="p-3">Analítico</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3">_ga / _ga_*</td>
                  <td className="p-3">Google (quando usado)</td>
                  <td className="p-3">Medição de audiências</td>
                  <td className="p-3">13 meses</td>
                  <td className="p-3">Analítico</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="p-3">_fbp</td>
                  <td className="p-3">Meta (quando usado)</td>
                  <td className="p-3">Medição/remarketing</td>
                  <td className="p-3">3 meses</td>
                  <td className="p-3">Marketing</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm opacity-80 mt-2">
            Nota: a lista é exemplificativa. O conjunto efetivo pode variar com a tua navegação, conta e
            funcionalidades ativas.
          </p>
        </section>

        {/* Gestão de preferências */}
        <section>
          <h2 className="text-xl font-semibold mb-2">3) Como gerir as tuas preferências</h2>
          <p>
            Podes gerir as tuas preferências no navegador (bloquear/eliminar cookies) e, quando disponível,
            no nosso gestor de consentimento. O bloqueio de cookies necessários pode impedir o website de funcionar.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={tryOpenNativeCMP}
              className={`px-4 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition ${RING}`}
            >
              Abrir definições de cookies
            </button>

            {saved && (
              <span className="px-3 py-2 text-sm border border-green-400/40 bg-green-500/15 text-green-300">
                Preferências guardadas
              </span>
            )}
          </div>

          {/* Modal local de fallback */}
          {localOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={(e) => {
                if (e.target === e.currentTarget) setLocalOpen(false);
              }}
            >
              <div className="w-full max-w-lg bg-[#151515] border border-[#6c6c6c] p-6">
                <h3 className="text-lg font-semibold mb-4">Preferências de cookies</h3>

                <div className="space-y-3">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" disabled checked className="mt-1" />
                    <div>
                      <div className="font-semibold">Estritamente necessários</div>
                      <div className="text-sm text-[#fbfbfb]/75">
                        Sempre ativos. Mantêm a sessão e a segurança.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={consent.functional}
                      onChange={(e) =>
                        setConsent((c) => ({ ...c, functional: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Funcionais</div>
                      <div className="text-sm text-[#fbfbfb]/75">
                        Guardam preferências de interface.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={consent.analytics}
                      onChange={(e) =>
                        setConsent((c) => ({ ...c, analytics: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Analíticos</div>
                      <div className="text-sm text-[#fbfbfb]/75">
                        Ajudam a medir utilização de forma agregada.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={consent.marketing}
                      onChange={(e) =>
                        setConsent((c) => ({ ...c, marketing: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Marketing</div>
                      <div className="text-sm text-[#fbfbfb]/75">
                        Medição de campanhas e personalização externa.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setLocalOpen(false)}
                    className={`px-4 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition ${RING}`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveAndClose}
                    className={`px-4 py-2 bg-[#e53e30] text-[#151515] font-semibold hover:brightness-95 ${RING}`}
                  >
                    Guardar preferências
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Terceiros e transferências */}
        <section>
          <h2 className="text-xl font-semibold mb-2">4) Cookies de terceiros e transferências</h2>
          <p>
            Alguns cookies pertencem a terceiros (por exemplo, fornecedores de analítica ou CDN).
            Esses terceiros podem tratar dados em países fora do EEE. Utilizamos mecanismos adequados
            (Cláusulas Contratuais-Tipo da UE, decisões de adequação e medidas adicionais) para proteger os dados.
          </p>
        </section>

        {/* Atualizações */}
        <section>
          <h2 className="text-xl font-semibold mb-2">5) Atualizações desta Política</h2>
          <p>
            Podemos atualizar esta Política para refletir alterações técnicas, legais ou operacionais.
            Em caso de alterações relevantes, tentamos avisar com antecedência razoável. A data abaixo indica a última revisão.
          </p>
        </section>

        <hr className="my-6 border-[#fbfbfb]/30" />
        <p className="text-sm opacity-70">Última atualização: {today}</p>
      </div>
    </StaticPageShell>
  );
}
