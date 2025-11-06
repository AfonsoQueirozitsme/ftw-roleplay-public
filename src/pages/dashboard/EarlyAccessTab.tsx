import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { listMyApplications, type ApplicationRow } from "@/lib/api/applications";
import ApplicationForm from "@/components/ApplicationForm";
import { FileText, ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";

const RING = "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string; icon: any }> = {
    pending: {
      label: "Pendente",
      className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: Clock,
    },
    approved: {
      label: "Aprovada",
      className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      icon: CheckCircle,
    },
    rejected: {
      label: "Recusada",
      className: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      icon: XCircle,
    },
  };

  const actualStatus = status || "pending";
  const { label, className, icon: Icon } = config[actualStatus] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default function EarlyAccessTab() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyApplications();
      setApplications(data);
      // Se não houver candidaturas, mostrar o formulário
      if (data.length === 0) {
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
  }, [loadApplications]);

  const hasPending = applications.some((a) => !a.status || a.status === "pending");
  const hasApproved = applications.some((a) => a.status === "approved");

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <FileText className="w-4 h-4" />
          <span>Early Access</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Candidatura Early Access</h1>
            <p className="max-w-2xl text-sm text-white/70 leading-relaxed mt-2">
              Submete a tua candidatura para teres acesso antecipado ao servidor FTW Roleplay.
            </p>
          </div>
          {applications.length > 0 && (
            <button
              onClick={() => navigate("/dashboard/applications")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition ${RING}`}
            >
              Ver todas as candidaturas
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Candidaturas existentes */}
      {!loading && applications.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-6">
            <h2 className="text-lg font-semibold mb-4">As tuas candidaturas</h2>
            <div className="space-y-3">
              {applications.slice(0, 3).map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold truncate">
                        {app.personagem || app.nome || "Candidatura sem nome"}
                      </h3>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-xs text-white/60">
                      Enviada em {app.created_at ? new Date(app.created_at).toLocaleDateString("pt-PT") : "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/dashboard/applications")}
                    className="ml-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
                  >
                    Ver detalhes
                  </button>
                </div>
              ))}
              {applications.length > 3 && (
                <button
                  onClick={() => navigate("/dashboard/applications")}
                  className="w-full py-2 text-sm text-white/70 hover:text-white transition"
                >
                  Ver mais {applications.length - 3} candidatura(s)...
                </button>
              )}
            </div>
          </div>

          {/* Avisos */}
          {hasPending && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200 mb-1">Candidatura em análise</p>
                <p className="text-xs text-amber-200/80">
                  Tens uma candidatura pendente a ser analisada. Serás notificado quando houver uma decisão.
                </p>
              </div>
            </div>
          )}

          {hasApproved && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-200 mb-1">Candidatura aprovada!</p>
                <p className="text-xs text-emerald-200/80">
                  Parabéns! A tua candidatura foi aprovada. Receberás mais informações em breve.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
      {!loading && (applications.length === 0 || !hasPending) && (
        <div>
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
                Criar nova candidatura
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-20 grid place-items-center border border-white/10 bg-[#0f1013] rounded-xl">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-[#e53e30] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/60">A carregar...</p>
          </div>
        </div>
      )}
    </div>
  );
}
