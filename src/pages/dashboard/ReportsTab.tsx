import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  ArrowLeft,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Tag,
  X,
  Send,
  Bot,
  User,
} from "lucide-react";
import UltraSpinner from "@/components/layout/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import * as reportsApi from "@/lib/api/reports";

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
  s = s.replace(/`([^`]+)`/g, (_m, p1) => `<code class="px-1 py-0.5 bg-[#151515] border border-[#6c6c6c] rounded">${p1}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=([\\s.,;:!?)])|$)/g, (_m, p1, p2) => `${p1}<em>${p2}</em>`);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 text-[#e53e30]">$1</a>`);
  s = s.replace(/^(?:-|\u2022)\s+(.*)$/gm, "• $1");
  s = s.replace(/\n/g, "<br/>");
  return s;
}

/* ───────────────────────────────
   UI helpers
   ─────────────────────────────── */
function StatusBadge({ status }: { status: Report["status"] }) {
  const map: Record<Report["status"], { label: string; className: string; icon: any }> = {
    open: { label: "Aberto", className: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Clock },
    pending: { label: "Pendente", className: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: AlertCircle },
    resolved: { label: "Resolvido", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle },
    closed: { label: "Fechado", className: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: XCircle },
  };
  const config = map[status] ?? map.open;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1.5`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function ChatBubble({
  side,
  author,
  author_type,
  content,
  isTyping,
  created_at,
}: Message & { side: "left" | "right" }) {
  return (
    <div className={`flex mb-4 ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div className={`flex gap-3 max-w-[75%] ${side === "right" ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          author_type === "ai" ? "bg-purple-500/20 text-purple-300" : "bg-[#e53e30]/20 text-[#e53e30]"
        }`}>
          {author_type === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-white/80">{author}</span>
            {created_at && (
              <span className="text-xs text-white/50">
                {new Date(created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div
            className={`px-4 py-3 rounded-lg border ${
              side === "right"
                ? "bg-[#e53e30] text-white border-[#e53e30]"
                : "bg-white/5 text-white border-white/10"
            }`}
          >
            {isTyping ? (
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-current opacity-70 animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: mdToHtml(content ?? "") }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────
   Component
   ─────────────────────────────── */
export default function ReportsTab() {
  const { toast } = useToast();
  const [list, setList] = useState<Report[]>([]);
  const [active, setActive] = useState<Report | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Report["status"] | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal
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
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ─ Data ─ */
  async function load() {
    setLoading(true);
    try {
      // Tentar usar a API primeiro, fallback para Supabase direto
      try {
        const data = await reportsApi.listReports();
        setList(data);
        if (active) {
          const updated = data.find((r) => r.id === active.id);
          if (updated) setActive(updated);
        }
      } catch (apiErr) {
        console.warn("API não disponível, usando Supabase direto:", apiErr);
        // Fallback para Supabase direto
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
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
    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  /* ─ Mensagens ─ */
  async function loadMessages(reportId: string) {
    try {
      // Tentar usar a API primeiro
      try {
        const data = await reportsApi.listReportMessages(reportId);
        setMessages(data as Message[]);
      } catch (apiErr) {
        console.warn("API não disponível, usando Supabase direto:", apiErr);
        // Fallback para Supabase direto
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
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !active) return;
    const msg = newMsg.trim();
    setSending(true);

    try {
      // Tentar usar a API primeiro
      try {
        const newMessage = await reportsApi.createReportMessage(active.id, {
          content: msg,
          author_type: "user",
        });
        setMessages((m) => [...m, newMessage as Message]);
        setNewMsg("");
        toast({
          title: "Mensagem enviada",
          description: "A tua mensagem foi enviada com sucesso.",
        });
      } catch (apiErr) {
        console.warn("API não disponível, usando Supabase direto:", apiErr);
        // Fallback para Supabase direto
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Não autenticado");

        const { error } = await supabase.from("report_messages").insert({
          report_id: active.id,
          author: user.email || "Utilizador",
          author_type: "user",
          content: msg,
        });

        if (error) throw error;

        setMessages((m) => [
          ...m,
          {
            author: user.email || "Tu",
            author_type: "user",
            content: msg,
            created_at: new Date().toISOString(),
          },
        ]);
        setNewMsg("");
        toast({
          title: "Mensagem enviada",
          description: "A tua mensagem foi enviada com sucesso.",
        });
      }
    } catch (err: any) {
      console.error("Erro ao enviar mensagem:", err);
      toast({
        title: "Erro",
        description: err.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
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
    if (!title.trim() || !desc.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preenche o título e a descrição.",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      // Tentar usar a API primeiro
      try {
        const newReport = await reportsApi.createReport({
          title: title.trim(),
          description: desc.trim(),
          category: category.trim() || undefined,
          severity: severity || undefined,
        });

        setTitle("");
        setDesc("");
        setCategory("");
        setSeverity("medium");
        setModalOpen(false);

        toast({
          title: "Report criado!",
          description: "O teu report foi criado com sucesso.",
        });

        setList((prev) => [newReport, ...prev]);
        await openReport(newReport, true);
      } catch (apiErr) {
        console.warn("API não disponível, usando Supabase direto:", apiErr);
        // Fallback para Supabase direto
        const { data: { user } } = await supabase.auth.getUser();
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

        setTitle("");
        setDesc("");
        setCategory("");
        setSeverity("medium");
        setModalOpen(false);

        toast({
          title: "Report criado!",
          description: "O teu report foi criado com sucesso.",
        });

        if (data) {
          setList((prev) => [data as Report, ...prev]);
          await openReport(data as Report, true);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro",
        description: err.message || "Não foi possível criar o report. Verifica a ligação e volta a tentar.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  /* ─ Filtros ─ */
  const filteredReports = useMemo(() => {
    return list.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.code && r.code.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [list, statusFilter, categoryFilter, searchQuery]);

  const [apiStats, setApiStats] = useState<reportsApi.ReportStats | null>(null);

  useEffect(() => {
    // Tentar carregar estatísticas da API
    reportsApi
      .getReportStats()
      .then(setApiStats)
      .catch(() => {
        // Fallback para cálculo local
        setApiStats(null);
      });
  }, [list]);

  const stats = useMemo(() => {
    if (apiStats) return apiStats;
    
    // Fallback para cálculo local
    return {
      total: list.length,
      open: list.filter((r) => r.status === "open").length,
      pending: list.filter((r) => r.status === "pending").length,
      resolved: list.filter((r) => r.status === "resolved").length,
      closed: list.filter((r) => r.status === "closed").length,
      byCategory: {} as Record<string, number>,
    };
  }, [list, apiStats]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    list.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats).sort();
  }, [list]);

  /* ─ Render ─ */
  return (
    <div className="space-y-8 text-white" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
      <AnimatePresence mode="wait">
        {/* LISTA */}
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header */}
            <header className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                <MessageSquare className="w-4 h-4" />
                <span>Suporte</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-semibold">Reports & Tickets</h1>
                  <p className="max-w-2xl text-sm text-white/70 leading-relaxed mt-2">
                    Cria e gere os teus reports. A nossa IA Winny ajuda-te a resolver problemas rapidamente.
                  </p>
                </div>
                <Button
                  onClick={() => setModalOpen(true)}
                  className="bg-[#e53e30] hover:bg-[#e53e30]/90 text-white"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Novo Report
                </Button>
              </div>
            </header>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-white/10 bg-[#111215]/90">
                <CardContent className="p-4">
                  <div className="text-xs text-white/60 mb-1">Total</div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className="border-blue-500/30 bg-blue-500/10">
                <CardContent className="p-4">
                  <div className="text-xs text-blue-200/80 mb-1">Abertos</div>
                  <div className="text-2xl font-bold text-blue-300">{stats.open}</div>
                </CardContent>
              </Card>
              <Card className="border-amber-500/30 bg-amber-500/10">
                <CardContent className="p-4">
                  <div className="text-xs text-amber-200/80 mb-1">Pendentes</div>
                  <div className="text-2xl font-bold text-amber-300">{stats.pending}</div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/30 bg-emerald-500/10">
                <CardContent className="p-4">
                  <div className="text-xs text-emerald-200/80 mb-1">Resolvidos</div>
                  <div className="text-2xl font-bold text-emerald-300">{stats.resolved}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-500/30 bg-gray-500/10">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-200/80 mb-1">Fechados</div>
                  <div className="text-2xl font-bold text-gray-300">{stats.closed}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar reports..."
                  className="pl-9 bg-white/5 border-white/10 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de Reports */}
            {loading ? (
              <div className="py-20 grid place-items-center border border-white/10 bg-[#0f1013] rounded-xl">
                <UltraSpinner size={84} label="A carregar reports..." />
              </div>
            ) : filteredReports.length === 0 ? (
              <Card className="border-white/10 bg-[#111215]/90">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum report encontrado</h3>
                  <p className="text-sm text-white/60 mb-4">
                    {list.length === 0
                      ? "Ainda não criaste nenhum report. Cria o teu primeiro report para começares."
                      : "Nenhum report corresponde aos filtros selecionados."}
                  </p>
                  {list.length === 0 && (
                    <Button onClick={() => setModalOpen(true)} className="bg-[#e53e30] hover:bg-[#e53e30]/90">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Criar Primeiro Report
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className="border-white/10 bg-[#111215]/90 hover:border-[#e53e30]/50 cursor-pointer transition-all"
                      onClick={() => openReport(r)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold truncate">{r.title}</h3>
                              <StatusBadge status={r.status} />
                            </div>
                            <p className="text-sm text-white/70 line-clamp-2 mb-3">{r.description}</p>
                            <div className="flex items-center gap-4 flex-wrap text-xs text-white/50">
                              {r.category && (
                                <div className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {r.category}
                                </div>
                              )}
                              {r.code && (
                                <div className="flex items-center gap-1">
                                  <span>#{r.code}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(r.created_at).toLocaleDateString("pt-PT")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
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
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("list")}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold">{active.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-white/60">
                  {active.code && <span>#{active.code}</span>}
                  {active.category && <span>• {active.category}</span>}
                  <span>• {new Date(active.created_at).toLocaleDateString("pt-PT")}</span>
                </div>
              </div>
              <StatusBadge status={active.status} />
            </div>

            {/* Chat e Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat Principal */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-white/10 bg-[#111215]/90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Conversa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mensagens */}
                    <div className={`min-h-[400px] max-h-[600px] ${HIDE_SCROLL} p-4 bg-[#0f1013] rounded-lg`}>
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-white/40">
                          <div className="text-center">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Ainda não há mensagens neste report.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((m, i) => (
                            <ChatBubble
                              key={m.id ?? i}
                              side={m.author_type === "user" ? "right" : "left"}
                              author={m.author}
                              author_type={m.author_type}
                              content={m.content}
                              isTyping={m.isTyping}
                              created_at={m.created_at}
                            />
                          ))}
                          <div ref={chatEndRef} />
                        </>
                      )}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                        placeholder="Escreve uma mensagem..."
                        className="flex-1 bg-white/5 border-white/10 text-white"
                        disabled={sending || aiPending}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMsg.trim() || sending || aiPending}
                        className="bg-[#e53e30] hover:bg-[#e53e30]/90"
                      >
                        {sending ? (
                          <UltraSpinner size={16} />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-4">
                <Card className="border-white/10 bg-[#111215]/90">
                  <CardHeader>
                    <CardTitle>Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Estado:</span>
                        <StatusBadge status={active.status} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Categoria:</span>
                        <span className="text-white/90">{active.category || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Severidade:</span>
                        <span className="text-white/90">{active.severity || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Prioridade:</span>
                        <span className="text-white/90">{active.priority || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Código:</span>
                        <span className="text-white/90 font-mono text-xs">{active.code || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Criado em:</span>
                        <span className="text-white/90 text-xs">
                          {new Date(active.created_at).toLocaleString("pt-PT")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-[#111215]/90">
                  <CardHeader>
                    <CardTitle>Descrição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{active.description}</p>
                  </CardContent>
                </Card>

                {aiPending && (
                  <Card className="border-purple-500/30 bg-purple-500/10">
                    <CardContent className="p-6 text-center">
                      <UltraSpinner size={48} label="Winny está a processar..." />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL NOVO REPORT */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#111215] border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Criar Novo Report</DialogTitle>
            <DialogDescription className="text-white/60">
              Descreve o teu problema ou questão. A nossa IA Winny vai ajudar-te a resolver rapidamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Problema ao conectar ao servidor"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição *</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descreve o problema em detalhe..."
                rows={6}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Técnico, Bug, etc."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severidade</label>
                <Select value={severity || "medium"} onValueChange={(v) => setSeverity(v as any)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 border-white/10 hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={createReport}
                disabled={creating || !title.trim() || !desc.trim()}
                className="flex-1 bg-[#e53e30] hover:bg-[#e53e30]/90"
              >
                {creating ? (
                  <>
                    <UltraSpinner size={16} className="mr-2" />
                    A criar...
                  </>
                ) : (
                  "Criar Report"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
