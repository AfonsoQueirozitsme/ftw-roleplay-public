import React, { useEffect, useRef, useState } from "react";

/**
 * Ajusta o URL:
 * - De preferência via variável de ambiente (ex.: VITE_TXADMIN_URL)
 * - Fallback para um placeholder
 */
const TXADMIN_URL =
  (import.meta as any)?.env?.VITE_TXADMIN_URL ||
  "https://txadmin.exemplo.com"; // <- TROCA para o teu domínio

export default function TxAdmin() {
  const [full, setFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Se o iframe demorar demasiado, mostramos aviso de possível bloqueio por X-Frame-Options/CSP
  useEffect(() => {
    const t = setTimeout(() => {
      if (loading) setBlocked(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [loading]);

  const openNewTab = () => window.open(TXADMIN_URL, "_blank", "noopener,noreferrer");

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">txAdmin</h2>
          <p className="text-white/70 text-sm">
            Interface embebida do txAdmin. Se não aparecer, abre numa nova aba.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
            onClick={() => setFull((v) => !v)}
          >
            {full ? "Janela normal" : "Ecrã inteiro"}
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-white text-black text-sm hover:opacity-90"
            onClick={openNewTab}
          >
            Abrir numa nova aba
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        {/* Barra de loading */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 text-sm text-white/80">
            <span className="inline-block h-2 w-2 rounded-full bg-white/60 animate-pulse" />
            A carregar o painel do txAdmin…
          </div>
        )}

        {/* Iframe responsivo */}
        <div className={full ? "w-full h-[calc(100vh-16rem)]" : "aspect-[16/9] w-full"}>
          <iframe
            ref={iframeRef}
            src={TXADMIN_URL}
            className="w-full h-full"
            title="txAdmin"
            // Permissões comuns; ajusta se necessário
            allow="fullscreen; clipboard-read; clipboard-write"
            // Sandbox básico; remove restrições se o teu txAdmin precisar de mais
            sandbox="allow-same-origin allow-forms allow-scripts"
            // Se o site permitir, poderás ir a fullscreen
            allowFullScreen
            // Quando terminar de carregar, removemos loading
            onLoad={() => setLoading(false)}
          />
        </div>

        {/* Aviso de bloqueio por X-Frame-Options / CSP */}
        {blocked && (
          <div className="px-4 py-3 border-t border-white/10 text-sm text-amber-200 bg-amber-500/10">
            Parece que o txAdmin não permite ser embebido (X-Frame-Options/CSP).{" "}
            <button onClick={openNewTab} className="underline hover:opacity-90">
              Abre numa nova aba
            </button>{" "}
            ou ajusta as definições do servidor para permitir o domínio do teu site no iframe.
          </div>
        )}
      </div>
    </div>
  );
}
