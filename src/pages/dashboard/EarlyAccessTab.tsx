// /src/pages/dashboard/EarlyAccessTab.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ApplicationForm from "@/components/ApplicationForm";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, UserCircle2, FileText, PlusCircle, X } from "lucide-react";

/**
 * Melhorias principais:
 * - Modal MUITO mais largo (md:max-w-2xl → lg:max-w-4xl) e mais respiro (p-6/8)
 * - Sheet full‑height em mobile (tipo bottom sheet) com scroll interno suave
 * - Lock ao scroll do body quando o modal abre + fecho por ESC
 * - Cabeçalho fixo no modal com botão fechar; conteúdo do formulário com overflow-auto
 * - Pequenos ajustes visuais no cartão principal
 */

type App = {
  id: string;
  status: "pending" | "approved" | "rejected" | "waitlist" | "under_review" | string;
  created_at: string;
  discord_username: string | null;
  discord_id: string | null;
};

type PresetDiscord = {
  id: string;
  username?: string | null;
  global_name?: string | null;
  avatar_url?: string | null;
};

const ring =
  "focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black";

export default function EarlyAccessTab() {
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [preset, setPreset] = useState<PresetDiscord | null>(null);

  // Lê dados do Discord da sessão Supabase (se login for via Discord)
  const readDiscordFromSession = useCallback(async (): Promise<PresetDiscord | null> => {
    const { data } = await supabase.auth.getUser();
    const user = data.user as any;
    if (!user) return null;
    const identities: any[] = user.identities || [];
    const disc = identities.find((i) => i.provider === "discord");
    const meta: any = user.user_metadata || {};

    const id = disc?.identity_data?.sub || disc?.id || meta?.provider_id || meta?.sub;
    if (!id) return null;

    const username =
      disc?.identity_data?.preferred_username ??
      disc?.identity_data?.user_name ??
      disc?.identity_data?.name ??
      meta?.user_name ??
      meta?.name ??
      null;

    const global_name = disc?.identity_data?.global_name ?? meta?.global_name ?? null;
    const avatar_url = disc?.identity_data?.avatar_url ?? meta?.avatar_url ?? meta?.picture ?? null;

    return { id: String(id), username, global_name, avatar_url };
  }, []);

  async function fetchApp() {
    const { data: user } = await supabase.auth.getUser();
    const email = user?.user?.email;
    if (!email) {
      setApp(null);
      return;
    }
    const { data } = await supabase
      .from("applications")
      .select("id,status,created_at,discord_username,discord_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1);
    setApp((data?.[0] as App) ?? null);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await readDiscordFromSession();
      if (p) setPreset(p);
      await fetchApp();
      setLoading(false);
    })();
  }, [readDiscordFromSession]);

  // Lock scroll body + fecho por ESC quando o modal está aberto
  useEffect(() => {
    if (!modalOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  const createdDate = useMemo(() => {
    if (!app?.created_at) return null;
    try {
      return new Date(app.created_at).toLocaleString();
    } catch {
      return app.created_at;
    }
  }, [app?.created_at]);

  function openModal() {
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
  }
  function onSubmitted() {
    closeModal();
    fetchApp();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="px-4 py-2 rounded-lg bg-white/10 border border-white/15">A carregar…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartão principal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl p-6 lg:p-8 bg-white/10 border border-white/15 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      >
        {app ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-bold">A tua candidatura</h2>
            </div>

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-white/80">
                <span className="font-semibold">Estado:</span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                    app.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : app.status === "pending" || app.status === "under_review" || app.status === "waitlist"
                      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                      : "bg-red-500/20 text-red-300 border-red-500/40"
                  }`}
                >
                  {app.status}
                </span>
              </p>
              <p className="flex items-center gap-2 text-white/60">
                <Clock className="w-4 h-4 opacity-70" />
                Submetida em {createdDate}
              </p>
              {app.discord_username && (
                <p className="flex items-center gap-2 text-white/70">
                  <UserCircle2 className="w-4 h-4 opacity-70" />
                  @{app.discord_username} ({app.discord_id})
                </p>
              )}
            </div>

            {app.status === "rejected" && (
              <div className="mt-5">
                <p className="text-sm text-white/70 mb-3">Queres tentar de novo? Clica abaixo para re‑submeter em modo rápido.</p>
                <button
                  onClick={openModal}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-white/15 hover:bg-white/25 border border-white/15 transition ${ring}`}
                >
                  <PlusCircle className="w-4 h-4" /> Candidatar agora
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-2">Ainda não te candidataste</h2>
            <p className="opacity-80 text-sm mb-4">Clica no botão abaixo para preencheres a candidatura em modo rápido.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openModal}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-red-500 text-black hover:brightness-95 transition ${ring}`}
              >
                <PlusCircle className="w-4 h-4" /> Candidatar agora
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* MODAL — alargado e mais user‑friendly */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex md:items-center items-end justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="w-full md:max-h-[85vh] h-[90vh] md:h-auto md:rounded-2xl rounded-t-2xl md:mx-0 mx-3 bg-white/10 border border-white/15 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              {/* Header fixo */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 md:px-6 lg:px-8 py-4 bg-white/5 border-b border-white/10">
                <div className="font-semibold">Candidatura — Early Access</div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo scrollável */}
              <div className="px-5 md:px-6 lg:px-8 py-4 overflow-y-auto max-h-[calc(90vh-64px)] md:max-h-[calc(85vh-64px)]">
                <p className="text-xs text-white/60 mb-4">O teu Discord preenche automaticamente se entraste com o Discord.</p>

                <div className="mx-auto w-full md:max-w-2xl lg:max-w-4xl">
                  <ApplicationForm
                    className="mt-1"
                    presetDiscord={preset?.id
                      ? {
                          id: preset.id,
                          username: preset.username ?? null,
                          global_name: preset.global_name ?? null,
                          avatar_url: preset.avatar_url ?? null,
                        }
                      : undefined}
                    lockDiscord={!!preset?.id}
                    onSubmitted={onSubmitted}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
