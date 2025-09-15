import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, ArrowLeft } from "lucide-react";

/* ───────────────────────────────
   Types
   ─────────────────────────────── */
type Report = {
  id: string;
  title: string;
  description: string;
  status: string;
  severity?: string | null;
  category?: string | null;
  priority?: string | null;
  code?: string | null;
  created_at: string;
};

type Message = {
  id?: string;
  author: string;
  author_type: "user" | "ai";
  content: string;
  isTyping?: boolean;
  created_at?: string;
};

/* ───────────────────────────────
   Markdown utils (seguro)
   ─────────────────────────────── */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * mdToHtml: conversor leve de markdown → HTML
 * - **bold**, *italic*, `code`
 * - links [texto](https://)
 * - \n → <br/>
 * Ordem importa: escapamos HTML primeiro, depois aplicamos regras.
 */
function mdToHtml(src: string): string {
  let s = escapeHtml(src);

  // inline code: `code`
  s = s.replace(/`([^`]+)`/g, (_m, p1) => `<code class="px-1 py-0.5 rounded bg-black/40 border border-white/10">${p1}</code>`);

  // bold: **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // italic: *text*
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=([\s.,;:!?)])|$)/g, (_m, p1, p2) => `${p1}<em>${p2}</em>`);

  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1</a>`);

  // simple lists: "- x" ou "• x" → mantém como linha com bullet (não cria <ul> para manter layout bubble)
  s = s.replace(/^(?:-|\u2022)\s+(.*)$/gm, "• $1");

  // newlines
  s = s.replace(/\n/g, "<br/>");

  return s;
}

/* ───────────────────────────────
   UI helpers
   ─────────────────────────────── */
function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Aberto", cls: "bg-sky-500/20 text-sky-200" },
    pending: { label: "Pendente", cls: "bg-amber-500/20 text-amber-200" },
    resolved: { label: "Resolvido", cls: "bg-emerald-500/20 text-emerald-200" },
    closed: { label: "Fechado", cls: "bg-zinc-500/20 text-zinc-200" },
  };
  const C = map[status] ?? map.open;
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${C.cls}`}>
      {C.label}
    </span>
  );
}

function ChatBubble({
  side,
  author,
  text,
  isTyping,
}: Message & { side: "left" | "right" }) {
  return (
    <div className={`flex mb-4 ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-md ${
          side === "right"
            ? "bg-red-500 text-black rounded-br-none"
            : "bg-indigo-500/20 text-white border border-indigo-400/30 rounded-bl-none"
        }`}
      >
        <div className="text-[11px] opacity-70 mb-1 font-medium">{author}</div>
        {isTyping ? (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: mdToHtml(text ?? "") }}
          />
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────
   Component
   ─────────────────────────────── */
export default function ReportsTab() {
  const [list, setList] = useState<Report[]>([]);
  const [active, setActive] = useState<Report | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Novo report
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<Report["severity"]>("medium");

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [aiPending, setAiPending] = useState(false); // “A tua resposta chegará…”
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Realtime subscription ref para limpar ao trocar de report
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ───────────────────────────────
     Data
     ─────────────────────────────── */
  async function load() {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setList((data as Report[]) || []);
      if (active) {
        const updated = (data as Report[])?.find((r) => r.id === active.id);
        if (updated) setActive(updated);
      }
    } else {
      console.error("Erro a carregar reports:", error);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  /* ───────────────────────────────
     Mensagens (carregar + realtime)
     ─────────────────────────────── */
  async function loadMessages(reportId: string) {
    const { data, error } = await supabase
      .from("report_messages")
      .select("id, author, author_type, content, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro a carregar mensagens:", error);
      return;
    }
    setMessages((data as Message[]) || []);
  }

  function subscribeMessages(reportId: string) {
    // limpar subscrição anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`report_messages_${reportId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_messages", filter: `report_id=eq.${reportId}` },
        (payload: any) => {
          const row = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: row.id,
              author: row.author,
              author_type: row.author_type,
              content: row.content,
              created_at: row.created_at,
            },
          ]);
        }
      );

    ch.subscribe(() => { /* noop */ });
    channelRef.current = ch;
  }

  /* ───────────────────────────────
     Helpers IA
     ─────────────────────────────── */
  function appendTyping() {
    setMessages((m) => [
      ...m,
      { author: "Winny 🤖", author_type: "ai", isTyping: true, content: "" },
    ]);
  }
  function dropTyping() {
    setMessages((m) => m.filter((msg) => !msg.isTyping));
  }
  function appendAI(text: string) {
    setMessages((m) => [
      ...m,
      { author: "Winny 🤖", author_type: "ai", content: text },
    ]);
  }

  async function callReportAI(reportId: string) {
    appendTyping();
    setAiPending(true);

    try {
      const res = await supabase.functions.invoke("report-ai", {
        body: { report_id: reportId },
      });

      dropTyping();

      if (!res || (res as any).error || !res.data) {
        appendAI("⚠️ Erro ao contactar a Winny. Tenta novamente mais tarde.");
        setAiPending(false);
        return;
      }

      const d = res.data as any;

      if (d.triage && Array.isArray(d.hints)) {
        const listText = d.hints.map((h: string, i: number) => `${i + 1}. ${h}`).join("\n");
        appendAI(`${d.message || "Tenta estes passos rápidos:"}\n\n${listText}`);
      } else {
        const main = d.main_team ?? "—";
        const sub = d.subteam ?? "—";
        const prio = d.priority ?? d.severity ?? "—";
        appendAI(`✅ O teu report foi encaminhado para **${main} → ${sub}** (prioridade ${prio}).`);
      }

      setAiPending(false);
      await load(); // refresca metadados do report
    } catch (err) {
      console.error("Erro a invocar report-ai:", err);
      dropTyping();
      appendAI("⚠️ Ocorreu um erro inesperado. Tenta de novo mais tarde.");
      setAiPending(false);
    }
  }

  /* ───────────────────────────────
     Abrir report
     ─────────────────────────────── */
  async function openReport(r: Report, fresh = false) {
    setActive(r);
    setView("detail");
    setAiPending(false);

    await loadMessages(r.id);
    subscribeMessages(r.id);

    if (fresh) {
      await callReportAI(r.id);
    }
  }

  // limpar subscrições ao desmontar
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  /* ───────────────────────────────
     Criar report
     ─────────────────────────────── */
  async function createReport() {
    if (!title.trim() || !desc.trim()) return;

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Precisas de estar autenticado.");

      const { data, error } = await supabase
        .from("reports")
        .insert([
          {
            user_id: user.id,
            title: title.trim(),
            description: desc.trim(),
            category: category.trim() || null,
            severity: severity || "medium",
            status: "open",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // limpar modal
      setTitle("");
      setDesc("");
      setCategory("");
      setSeverity("medium");
      setModalOpen(false);

      if (data) {
        setList((prev) => [data as Report, ...prev]);
        await openReport(data as Report, true);
      }
    } catch (err) {
      console.error(err);
      alert(
        (err as any)?.message ||
          "Não foi possível criar o report. Verifica a ligação e volta a tentar."
      );
    } finally {
      setCreating(false);
    }
  }

  /* ───────────────────────────────
     Enviar mensagem manual (frontend)
     ─────────────────────────────── */
  function sendMessage() {
    if (!newMsg.trim()) return;
    setMessages((m) => [
      ...m,
      { author: "Tu", author_type: "user", content: newMsg.trim() },
    ]);
    setNewMsg("");
    // Para persistir também:
    // if (active?.id) {
    //   supabase.from("report_messages").insert({
    //     report_id: active.id,
    //     author: "Tu",
    //     author_type: "user",
    //     content: newMsg.trim(),
    //   });
    // }
  }

  /* ───────────────────────────────
     Render
     ─────────────────────────────── */
  return (
    <div className="h-screen w-full flex flex-col">
      <AnimatePresence mode="wait">
        {/* LISTA */}
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-6 flex-1 min-h-0 overflow-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Os teus reports</h2>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-red-500 text-black rounded-xl flex items-center gap-2 font-semibold hover:brightness-95"
              >
                <PlusCircle className="w-4 h-4" /> Novo
              </button>
            </div>

            {list.length === 0 ? (
              <div className="opacity-70">Ainda não tens reports.</div>
            ) : (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => openReport(r)}
                      className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{r.title}</span>
                        <StatusChip status={r.status} />
                      </div>
                      <div className="text-xs opacity-70 line-clamp-1">
                        {r.description}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {/* DETALHE */}
        {view === "detail" && active && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-screen flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("list")}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="font-semibold text-lg">{active.title}</div>
                  <div className="text-xs opacity-60">
                    Código: {active.code ?? "—"} | Categoria:{" "}
                    {active.category ?? "—"} | Prioridade:{" "}
                    {active.priority ?? "—"}
                  </div>
                </div>
              </div>
              <StatusChip status={active.status} />
            </div>

            {/* Chat (scroll) */}
            <div className="flex-1 min-h-0 overflow-auto p-5 bg-black/20">
              {messages.map((m, i) => (
                <ChatBubble
                  key={m.id ?? i}
                  side={m.author_type === "user" ? "right" : "left"}
                  author={m.author}
                  text={m.content}
                  isTyping={m.isTyping}
                />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input fixo no fundo */}
            <div className="border-t border-white/10 bg-black/40 p-4">
              {!messages.some((mm) => mm.author_type === "ai") && aiPending && (
                <div className="text-center text-xs text-white/70 mb-2">
                  A tua resposta chegará em alguns segundos…
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Escreve uma mensagem…"
                  className="flex-1 px-4 py-2 rounded-lg bg-black/30 border border-white/15 text-sm"
                />
                <button
                  onClick={sendMessage}
                  className="px-5 py-2 bg-red-500 text-black rounded-lg font-semibold hover:brightness-95"
                >
                  Enviar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL NOVO REPORT */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6 bg-white/10 border border-white/15 backdrop-blur-xl shadow-xl"
            >
              <h3 className="text-lg font-semibold mb-4">Novo Report</h3>
              <div className="space-y-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título"
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/15"
                />
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Descrição detalhada"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/15 resize-y"
                />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Categoria (opcional)"
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/15"
                />
                <select
                  value={severity || "medium"}
                  onChange={(e) =>
                    setSeverity(e.target.value as Report["severity"])
                  }
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/15"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
                <button
                  onClick={createReport}
                  disabled={creating}
                  className="w-full px-4 py-2 bg-red-500 text-black rounded-lg font-semibold hover:brightness-95 disabled:opacity-60"
                >
                  {creating ? "A criar…" : "Criar Report"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
