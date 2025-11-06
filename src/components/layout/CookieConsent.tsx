import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Settings, Check } from "lucide-react";

type ConsentType = "functional" | "analytics" | "marketing";

type ConsentState = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "ftw_cookie_consent";
const STORAGE_TIMESTAMP_KEY = "ftw_cookie_consent_timestamp";

function loadConsent(): ConsentState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ConsentState;
  } catch {
    return null;
  }
}

function saveConsent(consent: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: consent }));
  } catch (err) {
    console.error("Erro ao guardar consentimento:", err);
  }
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    functional: true, // Sempre necessário
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const existing = loadConsent();
    if (existing) {
      setConsent(existing);
      setShowBanner(false);
    } else {
      // Mostra após um pequeno delay para não ser intrusivo
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: ConsentState = {
      functional: true,
      analytics: true,
      marketing: true,
    };
    setConsent(allAccepted);
    saveConsent(allAccepted);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleRejectAll = () => {
    const minimal: ConsentState = {
      functional: true, // Sempre necessário
      analytics: false,
      marketing: false,
    };
    setConsent(minimal);
    saveConsent(minimal);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSaveSettings = () => {
    saveConsent(consent);
    setShowSettings(false);
    setShowBanner(false);
  };

  const toggleConsent = (type: ConsentType) => {
    if (type === "functional") return; // Não pode desativar
    setConsent((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
          >
            <div className="mx-auto max-w-4xl rounded-2xl border border-white/20 bg-[#151515] shadow-2xl p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Cookie className="w-8 h-8 text-[#e53e30]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold mb-2">Cookies e Privacidade</h3>
                  <p className="text-sm md:text-base text-white/80 mb-4 leading-relaxed">
                    Utilizamos cookies para melhorar a tua experiência, analisar o tráfego do site e personalizar conteúdo.
                    Alguns cookies são essenciais para o funcionamento do site. Podes escolher quais aceitas.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleAcceptAll}
                      className="px-5 py-2.5 rounded-lg bg-[#e53e30] text-white font-semibold hover:brightness-110 transition text-sm"
                    >
                      Aceitar todos
                    </button>
                    <button
                      onClick={handleRejectAll}
                      className="px-5 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition text-sm"
                    >
                      Rejeitar opcionais
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/90 font-medium hover:bg-white/10 transition text-sm inline-flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Personalizar
                    </button>
                    <a
                      href="/cookies"
                      className="px-5 py-2.5 rounded-lg text-white/70 hover:text-white transition text-sm underline underline-offset-2"
                    >
                      Saber mais
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de definições */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/70"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#151515] shadow-2xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Definições de Cookies</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Funcional - sempre ativo */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">Cookies Funcionais</h4>
                      <p className="text-sm text-white/70">Necessários para o funcionamento básico do site</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                      Sempre ativo
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">Cookies de Análise</h4>
                      <p className="text-sm text-white/70">
                        Ajudam-nos a entender como utilizas o site para melhorar a experiência
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConsent("analytics")}
                      className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        consent.analytics ? "bg-[#e53e30]" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          consent.analytics ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Marketing */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">Cookies de Marketing</h4>
                      <p className="text-sm text-white/70">
                        Utilizados para personalizar anúncios e medir a eficácia de campanhas
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConsent("marketing")}
                      className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        consent.marketing ? "bg-[#e53e30]" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          consent.marketing ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 rounded-lg bg-[#e53e30] text-white font-semibold hover:brightness-110 transition inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Guardar preferências
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

