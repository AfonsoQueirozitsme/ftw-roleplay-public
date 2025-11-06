import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { UserCircle2, Download, Trash2, Edit, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner";

const RING = "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

export default function DataManagementTab() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

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

      // Buscar dados da aplicação se existirem
      const { data: apps } = await supabase
        .from("applications")
        .select("*")
        .or(`email.eq.${user.email},discord_id.eq.${extractDiscordId(user)}`)
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
    const confirmed = window.confirm(
      "Tens a certeza que queres solicitar a eliminação dos teus dados?\n\n" +
      "Esta ação irá:\n" +
      "- Eliminar a tua conta de autenticação\n" +
      "- Eliminar todas as candidaturas associadas\n" +
      "- Eliminar todos os dados pessoais\n\n" +
      "Esta ação é IRREVERSÍVEL. Podes continuar?"
    );

    if (!confirmed) return;

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
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestRectification = useCallback(async () => {
    setMessage(null);
    const email = prompt(
      "Para solicitar a retificação de dados, envia um email para admin@ftwrp.example com:\n" +
      "- O teu email de conta\n" +
      "- Os dados que queres corrigir\n" +
      "- Os valores corretos\n\n" +
      "Ou escreve aqui o teu email para copiares:"
    );
    if (email) {
      navigator.clipboard.writeText("admin@ftwrp.example");
      setMessage({ type: "success", text: "Email copiado para a área de transferência." });
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
            onClick={handleRequestRectification}
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
            onClick={handleRequestDeletion}
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
    </div>
  );
}

