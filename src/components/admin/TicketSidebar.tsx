import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

/* ─────────── Types ─────────── */
type TicketRow = {
  id: string;
  title: string;
  content: string | null;
  user_id: string | null;
  status: "open" | "closed" | "pending" | string;
  created_at?: string | null;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  content: string;
  author: "admin" | "user" | string;
  created_at: string;
};

/* ─────────── UI helpers ─────────── */
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] ${className}`} {...props} />
);

const BellIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} aria-hidden>
    <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
  </svg>
);

export default function TicketSidebar() {
  const [open, setOpen] = useState(false);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const [selected, setSelected] = useState<TicketRow | null>(null);

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [ticketCount, setTicketCount] = useState<number>(0); // ⬅️ contagem de tickets ativos
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement | null>(null);

  /* -------- Carregar lista de tickets quando abrir -------- */
  useEffect(() => {
    if (!open) return;
    void fetchTickets();
  }, [open]);

  /* -------- Contagem leve (open/pending) + realtime sempre ativa -------- */
  useEffect(() => {
    // primeiro fetch ao montar
    void fetchTicketCount();

    // subscrição em tempo real à tabela tickets
    const channel = supabase
      .channel("tickets-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => fetchTicketCount()
      )
      .subscribe();

    // opcional: refresh periódico de segurança (evita drift)
    const interval = setInterval(fetchTicketCount, 30_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  /* -------- Subscrição em tempo real (lista/messages) quando aberto -------- */
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel("tickets-sidebar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => fetchTickets()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_messages",
          filter: selected ? `ticket_id=eq.${selected.id}` : undefined,
        },
        (payload) => {
          if (selected && (payload.new as any)?.ticket_id === selected.id) {
            void fetchMessages(selected.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected?.id]);

  /* -------- Carregar lista de tickets -------- */
  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTickets((data as TicketRow[]) ?? []);
    } catch (e) {
      console.error("Failed to load tickets", e);
      toast({ title: "Erro", description: "Falhou o carregamento dos tickets." });
    } finally {
      setLoadingTickets(false);
    }
  }

  /* -------- Carregar contagem (status abertos/pending) -------- */
  async function fetchTicketCount() {
    try {
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "pending"]);
      if (error) throw error;
      setTicketCount(count ?? 0);
    } catch (e) {
      console.error("Failed to count tickets", e);
      // sem toast para não chatear; isto corre em background
    }
  }

  /* -------- Carregar mensagens do ticket selecionado -------- */
  async function fetchMessages(ticketId: string) {
    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as TicketMessage[]) ?? []);
      // scroll para o fundo
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    } catch (e) {
      console.error("Failed to load messages", e);
      toast({ title: "Erro", description: "Não foi possível carregar as mensagens." });
    } finally {
      setLoadingMsgs(false);
    }
  }

  /* -------- Selecionar ticket -------- */
  const onSelectTicket = async (t: TicketRow) => {
    setSelected(t);
    setReply("");
    await fetchMessages(t.id);
  };

  /* -------- Enviar resposta -------- */
  async function postReply() {
    if (!selected) return;
    const trimmed = reply.trim();
    if (!trimmed) {
      toast({ title: "Escreve a resposta", description: "A mensagem não pode estar vazia." });
      return;
    }

    setSending(true);
    try {
      const payload = {
        ticket_id: selected.id,
        content: trimmed,
        author: "admin",
        created_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from("ticket_messages").insert(payload);
      if (insertErr) throw insertErr;

      // Atualiza estado do ticket para "pending"
      const { error: updErr } = await supabase.from("tickets").update({ status: "pending" }).eq("id", selected.id);
      if (updErr) throw updErr;

      setReply("");
      toast({ title: "Resposta enviada" });
      await fetchMessages(selected.id);
      await fetchTickets();
      await fetchTicketCount();
    } catch (e) {
      console.error("Failed to post reply", e);
      toast({ title: "Erro", description: "Não foi possível enviar a resposta." });
    } finally {
      setSending(false);
    }
  }

  /* -------- Atalhos de teclado (Ctrl/Cmd+Enter) -------- */
  const onReplyKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const isMeta = navigator.platform.toLowerCase().includes("mac") ? e.metaKey : e.ctrlKey;
    if (isMeta && e.key === "Enter") {
      e.preventDefault();
      void postReply();
    }
  };

  /* -------- Badge de estado -------- */
  const statusBadge = (s: string) => {
    const base = "border px-2 py-0.5 text-xs";
    if (s === "open") return `${base} border-[hsl(150_60%_45%)] text-[hsl(150_70%_60%)]`;
    if (s === "pending") return `${base} border-[hsl(40_100%_60%)] text-[hsl(40_100%_60%)]`;
    if (s === "closed") return `${base} border-[hsl(0_0%_50%)] text-[hsl(0_0%_70%)]`;
    return `${base} border-[hsl(0_0%_35%)] text-[hsl(0_0%_70%)]`;
  };

  const userText = (u?: string | null) => u || "Utilizador desconhecido";
  const hasSelection = !!selected;

  /* ─────────── Render ─────────── */
  return (
    <div>
      {/* FAB moderno — só aparece se houver tickets open/pending */}
      {ticketCount > 0 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="group fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 border border-[hsl(7_76%_54%)] bg-[hsl(0_0%_10%)] px-4 py-2 text-[hsl(7_76%_54%)] shadow-lg rounded-none hover:bg-[hsl(0_0%_12%)] focus:outline-none focus:ring-2 focus:ring-[hsl(7_76%_54%)]"
          title="Abrir tickets"
          aria-label="Abrir tickets"
        >
          <BellIcon className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-wide">Tickets</span>
          <span className="ml-1 border border-[hsl(7_76%_54%)] px-1.5 py-0.5 text-xs leading-none">
            {ticketCount}
          </span>
        </button>
      )}

      {/* Sidebar */}
      {open && (
        <div className="fixed right-6 bottom-20 z-50 w-[28rem] max-h-[75vh] overflow-hidden rounded-none border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[hsl(0_0%_18%)] px-4 py-3">
            <h4 className="font-semibold text-white">Tickets recentes</h4>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/70">
                ativos: <span className="text-[hsl(7_76%_54%)] font-semibold">{ticketCount}</span>
              </span>
              <button onClick={() => setOpen(false)} className="text-sm text-white/70 hover:text-white">
                Fechar
              </button>
            </div>
          </div>

          {/* Corpo: 2 colunas */}
          <div className="grid grid-cols-[12rem_1fr]">
            {/* Coluna esquerda — Lista de tickets */}
            <div className="border-r border-[hsl(0_0%_18%)] p-3 overflow-y-auto max-h-[calc(75vh-48px)]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/60">Últimos 20</span>
                <button
                  onClick={() => void fetchTickets()}
                  className="text-xs underline text-[hsl(7_76%_54%)] hover:opacity-90"
                >
                  Atualizar
                </button>
              </div>

              {loadingTickets && <div className="mt-2 text-white/60 text-sm">A carregar…</div>}

              <div className="grid gap-2">
                {tickets.map((t) => {
                  const active = selected?.id === t.id;
                  return (
                    <Card
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className={`cursor-pointer p-2 transition ${
                        active ? "bg-[hsl(0_0%_16%)]" : "hover:bg-[hsl(0_0%_14%)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-white">{t.title}</div>
                          <div className="truncate text-[11px] text-white/60">{userText(t.user_id)}</div>
                        </div>
                        <span className={statusBadge(t.status)}>{t.status}</span>
                      </div>
                    </Card>
                  );
                })}

                {!loadingTickets && tickets.length === 0 && (
                  <div className="text-sm text-white/60">Sem tickets.</div>
                )}
              </div>
            </div>

            {/* Coluna direita — Detalhe */}
            <div className="p-3">
              {!hasSelection && (
                <Card className="p-4 text-sm text-white/70">
                  Seleciona um ticket à esquerda para veres os detalhes e responderes.
                </Card>
              )}

              {hasSelection && selected && (
                <div className="flex h-full flex-col gap-3">
                  {/* Cabeçalho do ticket */}
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-semibold">{selected.title}</div>
                        <div className="text-xs text-white/60">{userText(selected.user_id)}</div>
                        {selected.content && (
                          <div className="mt-2 text-sm text-white/80">{selected.content}</div>
                        )}
                      </div>
                      <span className={statusBadge(selected.status)}>{selected.status}</span>
                    </div>
                  </Card>

                  {/* Lista de mensagens */}
                  <Card className="flex-1 overflow-hidden">
                    <div ref={listRef} className="max-h-[32vh] overflow-y-auto px-3 py-2 space-y-2">
                      {loadingMsgs && <div className="text-sm text-white/60">A carregar mensagens…</div>}

                      {!loadingMsgs && messages.length === 0 && (
                        <div className="text-sm text-white/60">Sem mensagens.</div>
                      )}

                      {messages.map((m) => (
                        <div key={m.id} className="text-sm">
                          <div className="mb-0.5 flex items-center justify-between">
                            <span
                              className={`text-[11px] ${
                                m.author === "admin"
                                  ? "text-[hsl(150_70%_60%)]"
                                  : "text-[hsl(190_100%_80%)]"
                              }`}
                            >
                              {m.author}
                            </span>
                            <span className="text-[10px] text-white/40">
                              {new Date(m.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-2 py-1 text-white/90">
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Responder */}
                  <div className="grid gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={onReplyKeyDown}
                      placeholder="Escreve a tua resposta… (Ctrl/Cmd + Enter para enviar)"
                      className="min-h-[90px] w-full resize-y border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_12%)] p-2 text-white outline-none placeholder:text-white/50 rounded-none"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelected(null)}
                        className="border border-[hsl(0_0%_18%)] px-3 py-1 text-sm text-white/90 hover:bg-[hsl(0_0%_14%)] rounded-none"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => void postReply()}
                        disabled={sending || !reply.trim()}
                        className={`px-3 py-1 text-sm rounded-none ${
                          sending || !reply.trim()
                            ? "border border-[hsl(0_0%_18%)] text-white/50 cursor-not-allowed"
                            : "border border-[hsl(7_76%_54%)] text-[hsl(7_76%_54%)] hover:bg-[hsl(0_0%_14%)]"
                        }`}
                        title="Responder"
                      >
                        {sending ? "A enviar…" : "Responder"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
