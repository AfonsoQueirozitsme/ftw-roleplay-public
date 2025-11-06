import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { listMyApplications, type ApplicationRow, type Status } from "@/lib/api/applications";
import ApplicationForm from "@/components/dashboard/ApplicationForm";
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
  Plus,
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
        <div className="pt-4 border-t border-white/10 space-y-4">
          {/* Informações pessoais */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                Informações Pessoais
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Nome:</span>
                  <span className="text-white/90">{app.nome || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Email:</span>
                  <span className="text-white/90">{app.email || "—"}</span>
                </div>
                {app.discord_username && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Discord:</span>
                    <span className="text-white/90">@{app.discord_username}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2 mb-3">
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
                <div className="flex justify-between">
                  <span className="text-white/60">ID:</span>
                  <span className="text-white/70 text-xs font-mono">{app.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personagem e motivação */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" />
              Personagem & Motivação
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-white/60">Nome da Personagem:</span>
                <p className="text-sm text-white/90 mt-1">{app.personagem || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-white/60">Motivação:</span>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap mt-1">
                  {app.motivacao || "Sem motivação fornecida."}
                </p>
              </div>
            </div>
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
                  Parabéns! A tua candidatura foi aprovada. Receberás mais informações em breve.
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
                  A tua candidatura foi recusada. Podes submeter uma nova candidatura se desejares.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Tab = "new" | "list";

export default function EarlyAccessTab() {
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyApplications();
      setApplications(data);
      // Se não houver candidaturas, mostrar o formulário na tab "new"
      if (data.length === 0) {
        setActiveTab("new");
        setShowForm(true);
      }
    } catch (err) {
      console.error("Erro ao carregar candidaturas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handleSubmitted = useCallback(() => {
    setShowForm(false);
    void loadApplications();
    setActiveTab("list"); // Mudar para a tab de lista após submissão
  }, [loadApplications]);

  const handleToggleDetails = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const pendingCount = applications.filter((a) => !a.status || a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <FileText className="w-4 h-4" />
          <span>Early Access</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Candidatura Early Access</h1>
          <p className="max-w-2xl text-sm text-white/70 leading-relaxed mt-2">
            Submete a tua candidatura para teres acesso antecipado ao servidor FTW Roleplay.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("new")}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "new"
                ? "text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            Nova Candidatura
            {activeTab === "new" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e53e30]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "list"
                ? "text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            As Minhas Candidaturas
            {applications.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/10">
                {applications.length}
              </span>
            )}
            {activeTab === "list" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e53e30]" />
            )}
          </button>
        </div>
            </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-20 grid place-items-center border border-white/10 bg-[#0f1013] rounded-xl">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-[#e53e30] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/60">A carregar...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Tab: Nova Candidatura */}
          {activeTab === "new" && (
            <div className="space-y-6">
              {showForm ? (
                <ApplicationForm onSubmitted={handleSubmitted} />
              ) : (
                <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-8 text-center space-y-4">
                  <FileText className="w-12 h-12 text-white/40 mx-auto" />
                  <h3 className="text-lg font-semibold">Nova candidatura</h3>
                  <p className="text-sm text-white/70">
                    {applications.length === 0
                      ? "Ainda não submeteste nenhuma candidatura."
                      : "Podes submeter uma nova candidatura."}
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e53e30] text-white font-semibold hover:brightness-110 transition ${RING}`}
                  >
                    <Plus className="w-4 h-4" />
                    Criar nova candidatura
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab: As Minhas Candidaturas */}
          {activeTab === "list" && (
            <div className="space-y-6">
              {/* Estatísticas */}
              {applications.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-4 text-center">
                    <div className="text-2xl font-bold text-amber-300">{pendingCount}</div>
                    <div className="text-xs text-white/60 mt-1">Pendentes</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-300">{approvedCount}</div>
                    <div className="text-xs text-white/60 mt-1">Aprovadas</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-4 text-center">
                    <div className="text-2xl font-bold text-rose-300">{rejectedCount}</div>
                    <div className="text-xs text-white/60 mt-1">Recusadas</div>
            </div>
            </div>
              )}

              {/* Lista de candidaturas */}
              {applications.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-12 text-center space-y-4">
                  <FileText className="w-16 h-16 text-white/20 mx-auto" />
                  <h3 className="text-lg font-semibold">Ainda não submeteste candidaturas</h3>
                  <p className="text-sm text-white/60">
                    Vai à tab "Nova Candidatura" para submeteres a tua primeira candidatura.
                  </p>
              <button
                    onClick={() => setActiveTab("new")}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e53e30] text-white font-semibold hover:brightness-110 transition ${RING}`}
                  >
                    <Plus className="w-4 h-4" />
                    Criar Candidatura
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {applications.length} {applications.length === 1 ? "candidatura" : "candidaturas"}
                    </h3>
                    <button
                      onClick={() => loadApplications()}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </button>
                  </div>
                  {applications.map((app) => (
                    <ApplicationCard key={app.id} app={app} onToggleDetails={handleToggleDetails} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
  );
}
