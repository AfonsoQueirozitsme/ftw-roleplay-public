// /src/pages/dashboard/EarlyAccessTab.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import ApplicationForm from "@/components/ApplicationForm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  UserCircle2,
  FileText,
  PlusCircle,
  X,
  RefreshCcw,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  AlertTriangle,
  Eye,
} from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner"; // mantém o teu import

type App = {
  id: string;
  status: "pending" | "approved" | "rejected" | "waitlist" | "under_review" | string;
  created_at: string;
  discord_username: string | null;
  discord_id: string | null;
  // campos extra (se existirem na tabela; se não, ficam undefined)
  nome?: string | null;
  personagem?: string | null;
  motivacao?: string | null;
};

type PresetDiscord = {
  id: string;
  username?: string | null;
  global_name?: string | null;
  avatar_url?: string | null;
};

const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending:   { label: "Pendente",     color: "text-[#fbfbfb] border-[#6c6c6c]", icon: <Clock3 className="w-4 h-4" /> },
  under_review: { label: "Em revisão", color: "text-[#fbfbfb] border-[#6c6c6c]", icon: <Eye className="w-4 h-4" /> },
  waitlist:  { label: "Lista de espera", color: "text-[#fbfbfb] border-[#6c6c6c]", icon: <Clock3 className="w-4 h-4" /> },
  approved:  { label: "Aprovada",     color: "text-[#fbfbfb] border-[#6c6c6c]", icon: <ShieldCheck className="w-4 h-4" /> },
  rejected:  { label: "Rejeitada",    color: "text-[#e53e30] border-[#6c6c6c]", icon: <AlertTriangle className="w-4 h-4" /> },
};

function timeAgo(date: string | number | Date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  return `há ${days} d`;
}

export default function EarlyAccessTab() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"apply" | "details">("apply");
  const [preset, setPreset] = useState<PresetDiscord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const bootstrap = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? null;
    setUserEmail(email);
    const p = await readDiscordFromSession();
    if (p) setPreset(p);
    await fetchApp(email);
    setLoading(false);
    // realtime
    if (email) subscribeRealtime(email);
  }, [readDiscordFromSession]);

  async function fetchApp(email: string | null) {
    if (!email) {
      setApp(null);
      return;
    }
    const { data } = await supabase
      .from("applications")
      .select("id,status,created_at,discord_username,discord_id,nome,personagem,motivacao")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1);
    setApp((data?.[0] as App) ?? null);
  }

  function subscribeRealtime(email: string) {
    // limpa canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase
      .channel(`applications_email_${email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `email=eq.${email}` },
        async (payload) => {
          await fetchApp(email);
          // pequeno aviso
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setNotice("Candidatura atualizada em tempo real.");
            setTimeout(() => setNotice(null), 3000);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
  }

  useEffect(() => {
    bootstrap();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [bootstrap]);

  // Lock do scroll + ESC para fechar modal
  useEffect(() => {
    if (!modalOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  const createdDate = useMemo(() => {
    if (!app?.created_at) return null;
    try { return new Date(app.created_at).toLocaleString("pt-PT"); }
    catch { return app.created_at; }
  }, [app?.created_at]);

  function openApplyModal() {
    setModalMode("apply");
    setModalOpen(true);
  }
  function openDetailsModal() {
    setModalMode("details");
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); }
  function onSubmitted() {
    closeModal();
    if (userEmail) fetchApp(userEmail);
  }

  async function manualRefresh() {
    if (!userEmail) return;
    setRefreshing(true);
    await fetchApp(userEmail);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="h-[50vh] md:h-[60vh] grid place-items-center">
        <UltraSpinner size={84} label="A carregar…" />
      </div>
    );
  }

  const meta = app ? (STATUS_META[app.status] ?? STATUS_META.pending) : null;

  return (
    <div className="space-y-6 text-[#fbfbfb]" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* aviso realtime */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 py-2 bg-[#151515] border border-[#6c6c6c] text-sm"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cartão principal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="p-6 lg:p-8 bg-[#151515] border border-[#6c6c6c] rounded-none"
      >
        {app ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <FileText className="w-5 h-5 text-[#e53e30]" />
              <h2 className="text-xl font-bold" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
                A tua candidatura
              </h2>
              <button
                onClick={manualRefresh}
                disabled={refreshing}
                className={`ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition rounded-none ${RING} disabled:opacity-60`}
                title="Atualizar"
              >
                <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            {/* Estado + timeline */}
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Estado:</span>
                  <span className={`inline-flex items-center gap-2 px-2 py-0.5 text-xs font-medium border rounded-none ${meta?.color}`}>
                    {meta?.icon}
                    {meta?.label ?? app.status}
                  </span>
                </div>
                <p className="flex items-center gap-2 text-[#fbfbfb]/75">
                  <Clock className="w-4 h-4 opacity-80" />
                  Submetida em {createdDate} <span className="opacity-50">({timeAgo(app.created_at)})</span>
                </p>
                {app.discord_username && (
                  <p className="flex items-center gap-2 text-[#fbfbfb]/80">
                    <UserCircle2 className="w-4 h-4 opacity-80" />
                    @{app.discord_username} ({app.discord_id})
                  </p>
                )}

                <div className="mt-4">
                  <button
                    onClick={openDetailsModal}
                    className={`inline-flex items-center gap-2 px-4 py-2 font-semibold border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition rounded-none ${RING}`}
                  >
                    <Eye className="w-4 h-4" /> Ver detalhes
                  </button>
                  {app.status === "rejected" && (
                    <button
                      onClick={openApplyModal}
                      className={`ml-3 inline-flex items-center gap-2 px-4 py-2 font-semibold bg-[#e53e30] text-[#151515] hover:brightness-95 transition rounded-none ${RING}`}
                    >
                      <PlusCircle className="w-4 h-4" /> Re-submeter
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline suave */}
              <div className="border border-[#6c6c6c] p-4 rounded-none">
                <h3 className="font-semibold mb-3">Progresso</h3>
                <ul className="space-y-3">
                  <TimelineStep
                    active
                    done
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    title="Recebida"
                    desc="Registámos a tua candidatura."
                  />
                  <TimelineStep
                    active={app.status === "under_review" || app.status === "approved" || app.status === "waitlist" || app.status === "rejected"}
                    done={app.status === "approved" || app.status === "waitlist" || app.status === "rejected"}
                    icon={<Eye className="w-4 h-4" />}
                    title="Em revisão"
                    desc="A equipa está a avaliar a tua submissão."
                  />
                  <TimelineStep
                    active={app.status === "approved"}
                    done={app.status === "approved"}
                    icon={<ShieldCheck className="w-4 h-4" />}
                    title="Aprovada"
                    desc="Terás acesso ao servidor assim que for possível."
                  />
                  <TimelineStep
                    active={app.status === "waitlist"}
                    done={app.status === "waitlist"}
                    icon={<Clock3 className="w-4 h-4" />}
                    title="Lista de espera"
                    desc="Serás notificado quando houver vaga."
                  />
                  <TimelineStep
                    active={app.status === "rejected"}
                    done={app.status === "rejected"}
                    danger
                    icon={<AlertTriangle className="w-4 h-4" />}
                    title="Rejeitada"
                    desc="Podes corrigir e re-submeter quando quiseres."
                  />
                </ul>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-[#e53e30]" />
              <h2 className="text-xl font-bold" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
                Ainda não te candidataste
              </h2>
            </div>
            <p className="text-sm text-[#fbfbfb]/85 mb-4">
              Clica no botão abaixo para preencheres a candidatura em modo rápido.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openApplyModal}
                className={`inline-flex items-center gap-2 px-5 py-3 font-semibold bg-[#e53e30] text-[#151515] hover:brightness-95 transition rounded-none ${RING}`}
              >
                <PlusCircle className="w-4 h-4" /> Candidatar agora
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* MODAL: detalhes ou candidatura */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex md:items-center items-end justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="w-full h-[92dvh] md:h-auto md:max-h-[85vh] bg-[#151515] border border-[#6c6c6c] rounded-none overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 md:px-6 lg:px-8 py-4 bg-[#151515] border-b border-[#6c6c6c]">
                <div className="font-semibold">
                  {modalMode === "apply" ? "Candidatura — Early Access" : "Detalhes da candidatura"}
                </div>
                <div className="flex items-center gap-3">
                  <UltraSpinner size={28} />
                  <button
                    onClick={closeModal}
                    className="px-3 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition rounded-none"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conteúdo scrollável */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-6 lg:px-8 py-4">
                <div className="mx-auto w-full md:max-w-2xl lg:max-w-4xl">
                  {modalMode === "apply" ? (
                    <ApplicationForm
                      className="mt-1"
                      onSubmitted={onSubmitted}
                    />
                  ) : (
                    <DetailsPane app={app} />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* —————————————————— Sub-componentes —————————————————— */

function TimelineStep({
  active,
  done,
  danger,
  icon,
  title,
  desc,
}: {
  active?: boolean;
  done?: boolean;
  danger?: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const dot =
    done ? "bg-[#e53e30]" : active ? "bg-[#fbfbfb]" : "bg-[#6c6c6c]";
  const bar = done || active ? "bg-[#fbfbfb]/60" : "bg-[#6c6c6c]/60";
  const text = danger ? "text-[#e53e30]" : "text-[#fbfbfb]";
  return (
    <li className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-2 h-2 ${dot}`} />
        <span className={`w-px flex-1 ${bar}`} />
      </div>
      <div>
        <div className={`flex items-center gap-2 ${text}`}>
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <p className="text-sm text-[#fbfbfb]/75">{desc}</p>
      </div>
    </li>
  );
}

function DetailsPane({ app }: { app: App | null }) {
  if (!app) {
    return (
      <div className="p-6 bg-[#151515] border border-[#6c6c6c]">
        Não encontrámos detalhes desta candidatura.
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <div className="p-6 bg-[#151515] border border-[#6c6c6c]">
        <h3 className="font-semibold mb-2">Resumo</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="opacity-70">Estado</dt>
            <dd className="mt-0.5">{STATUS_META[app.status]?.label ?? app.status}</dd>
          </div>
          <div>
            <dt className="opacity-70">Submetida</dt>
            <dd className="mt-0.5">{new Date(app.created_at).toLocaleString("pt-PT")}</dd>
          </div>
          {app.discord_username && (
            <div className="md:col-span-2">
              <dt className="opacity-70">Discord</dt>
              <dd className="mt-0.5">@{app.discord_username} ({app.discord_id})</dd>
            </div>
          )}
        </dl>
      </div>

      {(app.nome || app.personagem || app.motivacao) && (
        <div className="p-6 bg-[#151515] border border-[#6c6c6c]">
          <h3 className="font-semibold mb-2">Conteúdo da candidatura</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {app.nome && (
              <div>
                <dt className="opacity-70">Nome</dt>
                <dd className="mt-0.5">{app.nome}</dd>
              </div>
            )}
            {app.personagem && (
              <div>
                <dt className="opacity-70">Personagem</dt>
                <dd className="mt-0.5">{app.personagem}</dd>
              </div>
            )}
            {app.motivacao && (
              <div className="md:col-span-2">
                <dt className="opacity-70">Motivação</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{app.motivacao}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
