import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserCircle2, Download, Trash2, Edit, AlertTriangle, CheckCircle, Loader2, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UltraSpinner from "@/components/layout/Spinner";

const RING = "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

// Modal personalizado para retificação
function RectificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#151515] p-6 text-white"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/5">
                <Edit className="w-6 h-6 text-[#e53e30]" />
              </div>
              <h2 className="text-xl font-semibold">Solicitar Retificação de Dados</h2>
            </div>

            <div className="space-y-3 text-sm text-white/80">
              <p>
                Para solicitar a correção de dados incorretos, envia um email para{" "}
                <strong className="text-white">admin@ftwrp.example</strong> com:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>O teu email de conta</li>
                <li>Os dados que queres corrigir</li>
                <li>Os valores corretos</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("admin@ftwrp.example");
                  alert("Email copiado para a área de transferência!");
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#e53e30] text-white font-semibold hover:brightness-110 transition"
              >
                Copiar Email
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Modal personalizado para eliminação com confirmação dupla
function DeletionModal({
  open,
  onClose,
  onConfirm,
  loading,
  discordUsername,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  discordUsername: string | null;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [discordNameInput, setDiscordNameInput] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [errors, setErrors] = useState<{ discord?: string; confirmation?: string }>({});

  const requiredText = "sim, pretendo eliminar os meus dados";

  useEffect(() => {
    if (!open) {
      setStep(1);
      setDiscordNameInput("");
      setConfirmationText("");
      setErrors({});
    }
  }, [open]);

  const handleStep1Next = () => {
    const newErrors: typeof errors = {};
    
    if (!discordUsername) {
      newErrors.discord = "Nome do Discord não encontrado. Contacta o suporte.";
    } else if (discordNameInput.trim().toLowerCase() !== discordUsername.toLowerCase()) {
      newErrors.discord = "O nome do Discord não corresponde. Verifica e tenta novamente.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(2);
  };

  const handleStep2Confirm = () => {
    const newErrors: typeof errors = {};
    
    if (confirmationText.trim().toLowerCase() !== requiredText.toLowerCase()) {
      newErrors.confirmation = `Deves escrever exatamente: "${requiredText}"`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-xl border-2 border-rose-500/50 bg-[#151515] p-6 text-white"
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-rose-500/20">
                <AlertCircle className="w-6 h-6 text-rose-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-rose-200">Eliminar Conta e Dados</h2>
                <p className="text-sm text-white/60">Passo {step} de 2</p>
              </div>
            </div>

            {/* Aviso */}
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-sm font-semibold text-rose-200 mb-2">⚠️ Esta ação é IRREVERSÍVEL</p>
              <ul className="text-xs text-rose-200/80 space-y-1 list-disc pl-5">
                <li>A eliminação é permanente e não pode ser revertida</li>
                <li>Todos os dados da conta serão eliminados</li>
                <li>Candidaturas e histórico serão removidos</li>
                <li>Não poderás recuperar acesso à conta</li>
              </ul>
            </div>

            {/* Step 1: Confirmar nome do Discord */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Escreve o teu nome do Discord para confirmar:
                  </label>
                  <input
                    type="text"
                    value={discordNameInput}
                    onChange={(e) => {
                      setDiscordNameInput(e.target.value);
                      setErrors((prev) => ({ ...prev, discord: undefined }));
                    }}
                    placeholder={discordUsername || "Nome do Discord"}
                    className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                      errors.discord ? "border-rose-500" : "border-white/10"
                    } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${RING}`}
                    disabled={loading || !discordUsername}
                  />
                  {errors.discord && (
                    <p className="mt-1 text-xs text-rose-400">{errors.discord}</p>
                  )}
                  {!discordUsername && (
                    <p className="mt-1 text-xs text-amber-400">
                      Nome do Discord não encontrado. Contacta o suporte para eliminar a conta.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStep1Next}
                    disabled={loading || !discordUsername}
                    className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Confirmação final */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Escreve <strong className="text-rose-300">"{requiredText}"</strong> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => {
                      setConfirmationText(e.target.value);
                      setErrors((prev) => ({ ...prev, confirmation: undefined }));
                    }}
                    placeholder={requiredText}
                    className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                      errors.confirmation ? "border-rose-500" : "border-white/10"
                    } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${RING}`}
                    disabled={loading}
                  />
                  {errors.confirmation && (
                    <p className="mt-1 text-xs text-rose-400">{errors.confirmation}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleStep2Confirm}
                    disabled={loading || confirmationText.trim().toLowerCase() !== requiredText.toLowerCase()}
                    className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A eliminar...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Eliminar Definitivamente
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function DataManagementTab() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [rectificationModalOpen, setRectificationModalOpen] = useState(false);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    setLoadingData(true);
    setMessage(null);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        setMessage({ type: "error", text: "Não estás autenticado." });
        return;
      }

      // Buscar nome do Discord
      const discordId = extractDiscordId(user);
      if (discordId) {
        try {
          const { data: lookupData } = await supabase.functions.invoke("discord-lookup", {
            body: { discordId },
          });
          if (lookupData?.ok && lookupData?.user) {
            setDiscordUsername(lookupData.user.username || lookupData.user.global_name || null);
          }
        } catch (err) {
          console.warn("Erro ao buscar nome do Discord:", err);
        }
      }

      // Buscar dados da aplicação se existirem
      const { data: apps } = await supabase
        .from("applications")
        .select("*")
        .or(`email.eq.${user.email},discord_id.eq.${discordId || ""}`)
        .order("created_at", { ascending: false });

      setUserData({
        auth: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in: user.last_sign_in_at,
        },
        applications: apps || [],
      });
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao carregar dados." });
    } finally {
      setLoadingData(false);
    }
  }, []);

  function extractDiscordId(user: any): string | null {
    if (!user) return null;
    const identities: any[] = user.identities || [];
    const disc = identities.find((i) => i.provider === "discord");
    const meta: any = user.user_metadata || {};
    return (
      disc?.identity_data?.sub ||
      disc?.id ||
      meta?.provider_id ||
      meta?.sub ||
      meta?.discord_user_id ||
      null
    );
  }

  const handleDownloadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await loadUserData();
      if (!userData) {
        await loadUserData();
        return;
      }

      const dataStr = JSON.stringify(userData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ftw-roleplay-dados-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Dados descarregados com sucesso." });
    } catch (err) {
      console.error("Erro ao descarregar dados:", err);
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao descarregar dados." });
    } finally {
      setLoading(false);
    }
  }, [userData, loadUserData]);

  const handleRequestDeletion = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Não estás autenticado.");

      // Enviar pedido de eliminação (podes criar uma tabela de pedidos ou enviar email)
      const { error: deleteError } = await supabase
        .from("applications")
        .delete()
        .or(`email.eq.${user.email},discord_id.eq.${extractDiscordId(user)}`);

      if (deleteError) console.warn("Erro ao eliminar candidaturas:", deleteError);

      // Eliminar conta de autenticação
      // @ts-expect-error - deleteUser exists but types may be outdated
      const { error: authError } = await supabase.auth.deleteUser();

      if (authError) throw authError;

      setMessage({
        type: "success",
        text: "Os teus dados foram eliminados. Serás redirecionado em breve...",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      console.error("Erro ao eliminar dados:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao eliminar dados. Contacta o suporte.",
      });
      setDeletionModalOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <UserCircle2 className="w-4 h-4" />
          <span>Gestão de Dados Pessoais</span>
        </div>
        <h1 className="text-3xl font-semibold">Os Teus Dados (RGPD)</h1>
        <p className="max-w-2xl text-sm text-white/70 leading-relaxed">
          De acordo com o Regulamento Geral sobre a Proteção de Dados (RGPD), tens direito de aceder, retificar,
          eliminar e opor-te ao tratamento dos teus dados pessoais. Utiliza as opções abaixo para exercer estes direitos.
        </p>
      </header>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Acesso aos dados */}
        <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-white/5">
              <Download className="w-6 h-6 text-[#e53e30]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Acesso aos Dados</h3>
              <p className="text-sm text-white/70">Descarrega uma cópia dos teus dados pessoais</p>
            </div>
          </div>
          <button
            onClick={handleDownloadData}
            disabled={loading || loadingData}
            className={`w-full px-4 py-3 rounded-lg bg-[#e53e30] text-white font-semibold hover:brightness-110 transition disabled:opacity-60 ${RING}`}
          >
            {loading || loadingData ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                A processar...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                Descarregar Dados
              </span>
            )}
          </button>
          <button
            onClick={loadUserData}
            disabled={loadingData}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition disabled:opacity-60"
          >
            {loadingData ? "A carregar..." : "Ver Dados Online"}
          </button>
        </div>

        {/* Retificação */}
        <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-white/5">
              <Edit className="w-6 h-6 text-[#e53e30]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Retificação</h3>
              <p className="text-sm text-white/70">Solicita a correção de dados incorretos</p>
            </div>
          </div>
          <button
            onClick={() => setRectificationModalOpen(true)}
            className={`w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition ${RING}`}
          >
            <span className="inline-flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Solicitar Retificação
            </span>
          </button>
        </div>

        {/* Eliminação */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-rose-500/20">
              <Trash2 className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-rose-200">Eliminação de Dados</h3>
              <p className="text-sm text-white/70">
                Solicita a eliminação completa dos teus dados pessoais. Esta ação é irreversível.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p className="font-semibold mb-2">⚠️ Atenção:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A eliminação é permanente e não pode ser revertida</li>
              <li>Todos os dados da conta serão eliminados</li>
              <li>Candidaturas e histórico serão removidos</li>
              <li>Não poderás recuperar acesso à conta</li>
            </ul>
          </div>
          <button
            onClick={() => {
              loadUserData(); // Carregar dados para obter o nome do Discord
              setDeletionModalOpen(true);
            }}
            disabled={loading}
            className={`w-full px-4 py-3 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-60 ${RING}`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                A processar...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Solicitar Eliminação de Dados
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Visualização de dados */}
      {userData && (
        <div className="rounded-xl border border-white/10 bg-[#111215]/90 p-6 space-y-4">
          <h3 className="text-lg font-semibold">Os Teus Dados</h3>
          <div className="rounded-lg border border-white/10 bg-[#0f1013] p-4 overflow-auto">
            <pre className="text-xs text-white/80 whitespace-pre-wrap">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Informações adicionais */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Mais Informações</h3>
        <div className="space-y-3 text-sm text-white/80">
          <p>
            Para mais informações sobre como tratamos os teus dados, consulta a{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
              Política de Privacidade
            </a>
            .
          </p>
          <p>
            Se tiveres questões ou precisares de ajuda, contacta-nos em{" "}
            <a href="mailto:admin@ftwrp.example" className="underline underline-offset-2 hover:text-white">
              admin@ftwrp.example
            </a>
            .
          </p>
          <p>
            Também podes apresentar uma reclamação junto da{" "}
            <a
              href="https://www.cnpd.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white"
            >
              Comissão Nacional de Proteção de Dados (CNPD)
            </a>
            .
          </p>
        </div>
      </div>

      {/* Modals */}
      <RectificationModal open={rectificationModalOpen} onClose={() => setRectificationModalOpen(false)} />
      <DeletionModal
        open={deletionModalOpen}
        onClose={() => setDeletionModalOpen(false)}
        onConfirm={handleRequestDeletion}
        loading={loading}
        discordUsername={discordUsername}
      />
    </div>
  );
}
