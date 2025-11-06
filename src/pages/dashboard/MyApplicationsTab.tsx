import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { listMyApplications, type ApplicationRow, type Status } from "@/lib/api/applications";
import UltraSpinner from "@/components/layout/Spinner";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Mail,
  MessageSquare,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

const RING = "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

function StatusBadge({ status }: { status: Status | null }) {
  const config = {
    pending: {
      label: "Pendente",
      icon: Clock,
      className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    approved: {
      label: "Aprovada",
      icon: CheckCircle,
      className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    rejected: {
      label: "Recusada",
      icon: XCircle,
      className: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    },
  };

  const actualStatus = (status || "pending") as Status;
  const { label, icon: Icon, className } = config[actualStatus] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-PT", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

function ApplicationCard({ app, onToggleDetails }: { app: ApplicationRow; onToggleDetails: (id: string) => void }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-[#e53e30] flex-shrink-0" />
            <h3 className="text-lg font-semibold truncate">{app.personagem || app.nome || "Sem nome de personagem"}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={app.status || "pending"} />
            <span className="text-xs text-white/50">
              Enviada em {formatDate(app.created_at || null)}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            onToggleDetails(app.id);
          }}
          className={`p-2 rounded-lg border border-white/10 hover:bg-white/5 transition ${RING}`}
          aria-label={showDetails ? "Ocultar detalhes" : "Ver detalhes"}
        >
          {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Detalhes expandidos */}
      {showDetails && (
        <div className="pt-4 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Informações pessoais */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informações Pessoais
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Nome:</span>
                  <span className="text-white/90 font-medium">{app.nome || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Email:</span>
                  <span className="text-white/90 font-medium truncate ml-2">{app.email || "—"}</span>
                </div>
                {app.discord_username && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Discord:</span>
                    <span className="text-white/90 font-medium">@{app.discord_username}</span>
                  </div>
                )}
                {app.discord_id && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Discord ID:</span>
                    <span className="text-white/70 text-xs font-mono">{app.discord_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informações da candidatura */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Detalhes da Candidatura
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Estado:</span>
                  <StatusBadge status={app.status || "pending"} />
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Data de envio:</span>
                  <span className="text-white/90">{formatDate(app.created_at || null)}</span>
                </div>
                {app.updated_at && app.updated_at !== app.created_at && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Última atualização:</span>
                    <span className="text-white/90">{formatDate(app.updated_at || null)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/60">ID:</span>
                  <span className="text-white/70 text-xs font-mono">{app.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Motivação */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Motivação
            </h4>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {app.motivacao || "Sem motivação fornecida."}
            </p>
          </div>

          {/* Mensagens de estado */}
          {(app.status === "pending" || !app.status) && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200 mb-1">Candidatura em análise</p>
                <p className="text-xs text-amber-200/80">
                  A tua candidatura está a ser analisada pela equipa. Serás notificado quando houver uma decisão.
                </p>
              </div>
            </div>
          )}

          {app.status === "approved" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-200 mb-1">Candidatura aprovada!</p>
                <p className="text-xs text-emerald-200/80">
                  Parabéns! A tua candidatura foi aprovada. Receberás mais informações em breve através do email ou Discord.
                </p>
              </div>
            </div>
          )}

          {app.status === "rejected" && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-200 mb-1">Candidatura recusada</p>
                <p className="text-xs text-rose-200/80">
                  A tua candidatura foi recusada. Podes submeter uma nova candidatura no futuro se desejares.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyApplicationsTab() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyApplications();
      setApplications(data);
    } catch (err) {
      console.error("Erro ao carregar candidaturas:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar candidaturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const toggleDetails = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pendingCount = applications.filter((a) => !a.status || a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <FileText className="w-4 h-4" />
          <span>As minhas candidaturas</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Candidaturas</h1>
            <p className="max-w-2xl text-sm text-white/70 leading-relaxed mt-2">
              Visualiza o estado das tuas candidaturas, detalhes enviados e atualizações.
            </p>
          </div>
          <button
            onClick={loadApplications}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-60 ${RING}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </header>

      {/* Estatísticas */}
      {applications.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <FileText className="w-8 h-8 text-white/20" />
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-200/80 uppercase tracking-wider mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-amber-300">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-300/30" />
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-200/80 uppercase tracking-wider mb-1">Aprovadas</p>
                <p className="text-2xl font-bold text-emerald-300">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-300/30" />
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-200 mb-1">Erro ao carregar candidaturas</p>
            <p className="text-xs text-rose-200/80">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-20 grid place-items-center border border-white/10 bg-[#0f1013] rounded-xl">
          <UltraSpinner size={84} label="A carregar candidaturas..." />
        </div>
      )}

      {/* Lista de candidaturas */}
      {!loading && !error && (
        <>
          {applications.length === 0 ? (
            <div className="border border-white/10 bg-[#0f1013] rounded-xl p-10 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 border border-white/12 rounded-full">
                <FileText className="w-7 h-7 text-white/60" />
              </div>
              <h3 className="text-lg font-medium">Nenhuma candidatura encontrada</h3>
              <p className="text-sm text-white/70 max-w-lg mx-auto">
                Ainda não submeteste nenhuma candidatura. Podes criar uma na aba "Early Access".
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <ApplicationCard key={app.id} app={app} onToggleDetails={toggleDetails} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

