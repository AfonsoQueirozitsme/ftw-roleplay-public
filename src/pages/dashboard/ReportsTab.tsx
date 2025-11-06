import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, ArrowLeft } from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner"; // ← spinner FTW

/* ───────────────────────────────
   Types
   ─────────────────────────────── */
type Report = {
  id: string;
  title: string;
  description: string;
  status: "open" | "pending" | "resolved" | "closed";
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
   Constantes de estilo
   ─────────────────────────────── */
const RING =
  "focus:outline-none focus:ring-2 focus:ring-[#e53e30]/70 focus:ring-offset-2 focus:ring-offset-[#151515]";

// utilidade tailwind p/ esconder scrollbars (Firefox + WebKit)
const HIDE_SCROLL = "overflow-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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
function mdToHtml(src: string): string {
  let s = escapeHtml(src);
  s = s.replace(/`([^`]+)`/g, (_m, p1) => `<code class="px-1 py-0.5 bg-[#151515] border border-[#6c6c6c]">${p1}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=([\\s.,;:!?)])|$)/g, (_m, p1, p2) => `${p1}<em>${p2}</em>`);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1</a>`);
  s = s.replace(/^(?:-|\u2022)\s+(.*)$/gm, "• $1");
  s = s.replace(/\n/g, "<br/>");
  return s;
}

/* ───────────────────────────────
   UI helpers
   ─────────────────────────────── */
function StatusChip({ status }: { status: Report["status"] }) {
  const map: Record<Report["status"], { label: string; cls: string }> = {
    open:     { label: "Aberto",    cls: "text-[#fbfbfb] border-[#6c6c6c]" },
    pending:  { label: "Pendente",  cls: "text-[#e53e30] border-[#6c6c6c]" },
    resolved: { label: "Resolvido", cls: "text-[#fbfbfb] border-[#6c6c6c]" },
    closed:   { label: "Fechado",   cls: "text-[#6c6c6c] border-[#6c6c6c]" },
  };
  const C = map[status] ?? map.open;
  return (
    <span className={`px-2 py-0.5 text-xs font-medium border ${C.cls}`}>
      {C.label}
    </span>
  );
}

function InfoRow({ k, v }: { k: string; v: string | undefined | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/10 last:border-b-0">
      <span className="text-xs text-white/60">{k}</span>
      <span className="text-sm text-white/90">{v ?? "—"}</span>
    </div>
  );
}

function ChatBubble({
  side,
  author,
  content,
  isTyping,
}: Message & { side: "left" | "right" }) {
  return (
    <div className={`flex mb-4 ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] px-4 py-3 border rounded-md ${
          side === "right"
            ? "bg-[#e53e30] text-[#151515] border-[#e53e30]"
            : "bg-[#151515] text-[#fbfbfb] border-[#6c6c6c]"
        }`}
      >
        <div className="text-[11px] opacity-70 mb-1 font-medium">{author}</div>
        {isTyping ? (
          <div className="flex gap-1 items-center h-5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[#fbfbfb] opacity-70 animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: mdToHtml(content ?? "") }}
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
  const [aiPending, setAiPending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ─ Data ─ */
  async function load() {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      const arr = (data as Report[]) || [];
      setList(arr);
      if (active) {
        const updated = arr.find((r) => r.id === active.id);
        if (updated) setActive(updated);
      }
    } else {
      console.error("Erro a carregar reports:", error);
    }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  /* ─ Mensagens ─ */
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
    ch.subscribe();
    channelRef.current = ch;
  }

  /* ─ Helpers IA ─ */
  function appendTyping() {
    setMessages((m) => [...m, { author: "Winny 🤖", author_type: "ai", isTyping: true, content: "" }]);
  }
  function dropTyping() {
    setMessages((m) => m.filter((msg) => !msg.isTyping));
  }
  function appendAI(text: string) {
    setMessages((m) => [...m, { author: "Winny 🤖", author_type: "ai", content: text }]);
  }

  async function callReportAI(reportId: string) {
    appendTyping();
    setAiPending(true);
    try {
      const res = await supabase.functions.invoke("report-ai", { body: { report_id: reportId } });
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
      await load();
    } catch (err) {
      console.error("Erro a invocar report-ai:", err);
      dropTyping();
      appendAI("⚠️ Ocorreu um erro inesperado. Tenta de novo mais tarde.");
      setAiPending(false);
    }
  }

  /* ─ Abrir report ─ */
  async function openReport(r: Report, fresh = false) {
    setActive(r);
    setView("detail");
    setAiPending(false);
    await loadMessages(r.id);
    subscribeMessages(r.id);
    if (fresh) await callReportAI(r.id);
  }

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  /* ─ Criar report ─ */
  async function createReport() {
    if (!title.trim() || !desc.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Precisas de estar autenticado.");

      const { data, error } = await supabase
        .from("reports")
        .insert([{
          user_id: user.id,
          title: title.trim(),
          description: desc.trim(),
          category: category.trim() || null,
          severity: severity || "medium",
          status: "open",
        }])
        .select()
        .single();

      if (error) throw error;

      setTitle(""); setDesc(""); setCategory(""); setSeverity("medium");
      setModalOpen(false);

      if (data) {
        setList((prev) => [data as Report, ...prev]);
        await openReport(data as Report, true);
      }
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || "Não foi possível criar o report. Verifica a ligação e volta a tentar.");
    } finally {
      setCreating(false);
    }
  }

  /* ─ Enviar mensagem (frontend) ─ */
  function sendMessage() {
    if (!newMsg.trim()) return;
    const msg = newMsg.trim();
    setMessages((m) => [...m, { author: "Tu", author_type: "user", content: msg }]);
    setNewMsg("");
    // Persistência opcional:
    // if (active?.id) await supabase.from("report_messages").insert({ report_id: active.id, author: "Tu", author_type: "user", content: msg });
  }

  /* ─ Render ─ */
  return (
    <div
      className="w-full bg-[#151515] text-[#fbfbfb] min-h-[100dvh] flex flex-col"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
    >
      <AnimatePresence mode="wait">
        {/* LISTA (full height) */}
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-6 flex-1 min-h-0 ${HIDE_SCROLL}`}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Os teus reports</h2>
              <button
                onClick={() => setModalOpen(true)}
                className={`px-4 py-2 bg-[#e53e30] text-[#151515] font-semibold hover:brightness-95 ${RING}`}
              >
                <PlusCircle className="w-4 h-4 inline-block mr-2" />
                Novo
              </button>
            </div>
  
            {list.length === 0 ? (
              <div className="opacity-80">Ainda não tens reports.</div>
            ) : (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => openReport(r)}
                      className={`w-full text-left p-4 bg-[#151515] border border-[#6c6c6c] hover:bg-[#fbfbfb]/5 transition ${RING}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{r.title}</span>
                        <StatusChip status={r.status} />
                      </div>
                      <div className="text-xs opacity-70 mt-1 line-clamp-1">
                        {r.description}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
  
        {/* DETALHE (layout 2 colunas: chat + info) */}
        {view === "detail" && active && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 min-h-0 grid"
            style={{ gridTemplateColumns: "1fr 340px" }} // 340px sidebar
          >
            {/* Coluna principal (chat) */}
            <div className="flex flex-col min-w-0">
              {/* Header fixo */}
              <div className="flex items-center justify-between gap-3 p-4 border-b border-[#6c6c6c] bg-[#151515]">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setView("list")}
                    className="p-2 hover:bg-[#fbfbfb]/10 border border-transparent hover:border-[#6c6c6c] transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="font-semibold text-lg truncate">{active.title}</div>
                    <div className="text-xs opacity-70 truncate">
                      Código: {active.code ?? "—"} &nbsp;|&nbsp; Categoria: {active.category ?? "—"} &nbsp;|&nbsp; Prioridade: {active.priority ?? "—"}
                    </div>
                  </div>
                </div>
  
                <div className="flex items-center gap-3">
                  {aiPending && (
                    <div className="hidden sm:block">
                      <UltraSpinner size={40} />
                    </div>
                  )}
                  <StatusChip status={active.status} />
                </div>
              </div>
  
              {/* Chat (cresce e faz scroll interno invisível) */}
              <div className={`flex-1 min-h-0 p-5 bg-[#151515] ${HIDE_SCROLL}`}>
                {messages.map((m, i) => (
                  <ChatBubble
                    key={m.id ?? i}
                    side={m.author_type === "user" ? "right" : "left"}
                    author={m.author}
                    content={m.content}
                    isTyping={m.isTyping}
                  />
                ))}
                <div ref={chatEndRef} />
              </div>
  
              {/* Input fixo (sticky com safe-area) */}
              <div className="sticky bottom-0 border-t border-[#6c6c6c] bg-[#151515] p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                {!messages.some((mm) => mm.author_type === "ai") && aiPending && (
                  <div className="text-center text-xs text-[#fbfbfb]/70 mb-2">
                    A tua resposta chegará em alguns segundos…
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Escreve uma mensagem…"
                    className={`flex-1 px-4 py-2 bg-[#151515] border border-[#6c6c6c] text-sm ${RING}`}
                  />
                  <button
                    onClick={sendMessage}
                    className={`px-5 py-2 bg-[#e53e30] text-[#151515] font-semibold hover:brightness-95 ${RING}`}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
  
            {/* Sidebar de informações do ticket (altura total, sem scroll visível) */}
            <aside className="border-l border-[#6c6c6c] bg-[#151515] flex flex-col">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-base font-semibold">Informações do ticket</h3>
              </div>
  
              <div className={`p-4 flex-1 min-h-0 ${HIDE_SCROLL}`}>
                <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <InfoRow k="Estado" v={active.status} />
                  <InfoRow k="Categoria" v={active.category ?? "—"} />
                  <InfoRow k="Severidade" v={active.severity ?? "—"} />
                  <InfoRow k="Prioridade" v={active.priority ?? "—"} />
                  <InfoRow k="Código" v={active.code ?? "—"} />
                  <InfoRow k="Criado em" v={new Date(active.created_at).toLocaleString()} />
                </div>
  
                <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="text-xs text-white/60 mb-2">Descrição</div>
                  <div className="text-sm text-white/90 whitespace-pre-wrap">{active.description}</div>
                </div>
  
                {aiPending && (
                  <div className="mt-4 grid place-items-center">
                    <UltraSpinner size={64} label="A processar…" />
                  </div>
                )}
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
  
      {/* MODAL NOVO REPORT (centered, bloqueia fundo) */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="w-full max-w-md p-6 bg-[#151515] border border-[#6c6c6c] rounded-xl"
            >
              <h3 className="text-lg font-semibold mb-4">Novo Report</h3>
              <div className="space-y-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título"
                  className={`w-full px-4 py-2 bg-[#151515] border border-[#6c6c6c] rounded ${RING}`}
                />
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Descrição detalhada"
                  rows={4}
                  className={`w-full px-4 py-2 bg-[#151515] border border-[#6c6c6c] resize-y rounded ${RING}`}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className={`flex-1 px-4 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition rounded ${RING}`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createReport}
                    disabled={creating}
                    className={`flex-1 px-4 py-2 bg-[#e53e30] text-[#151515] font-semibold hover:brightness-95 disabled:opacity-60 rounded ${RING}`}
                  >
                    {creating ? "A criar…" : "Criar Report"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  
}
