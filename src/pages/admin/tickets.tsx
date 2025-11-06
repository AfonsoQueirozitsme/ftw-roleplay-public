import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Calendar,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Tag,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TicketRow = {
  id: string;
  title: string;
  content: string | null;
  user_id: string | null;
  status: "open" | "closed" | "pending" | string;
  created_at?: string | null;
  updated_at?: string | null;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  content: string | null;
  author: "admin" | "user" | string;
  created_at: string | null;
};

type UserProfile = {
  id: string;
  email: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos", icon: Tag },
  { value: "open", label: "Abertos", icon: Clock, color: "text-blue-300" },
  { value: "pending", label: "Pendentes", icon: AlertCircle, color: "text-amber-300" },
  { value: "closed", label: "Fechados", icon: CheckCircle, color: "text-gray-300" },
] as const;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const Icon = config.icon || Tag;
  const colorClass =
    status === "open"
      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
      : status === "pending"
        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
        : status === "closed"
          ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
          : "bg-white/10 text-white/70 border-white/20";

  return (
    <Badge variant="outline" className={`${colorClass} flex items-center gap-1.5 px-2 py-0.5`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const { toast } = useToast();

  // Filtros
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
    // Subscrição em tempo real
    const channel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchTickets();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_messages",
          filter: selected ? `ticket_id=eq.${selected.id}` : undefined,
        },
        () => {
          if (selected) {
            fetchMessages(selected.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.id);
      fetchUserProfile(selected.user_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (statusFilter !== "all" || searchQuery.trim()) {
        fetchTickets();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  async function fetchTickets() {
    setLoading(true);
    try {
      let query = supabase.from("tickets").select("*");

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data as TicketRow[]) ?? []);

      // Carregar perfis dos utilizadores
      const userIds = [...new Set((data ?? []).map((t) => t.user_id).filter(Boolean) as string[])];
      if (userIds.length > 0) {
        await fetchUserProfiles(userIds);
      }
    } catch (e: any) {
      console.error("Failed to load tickets", e);
      toast({ title: "Erro", description: e?.message ?? "Não foi possível carregar os tickets" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfiles(userIds: string[]) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, discord_username, discord_avatar")
        .in("id", userIds);

      if (error) throw error;

      const profilesMap = new Map<string, UserProfile>();
      (data ?? []).forEach((profile) => {
        profilesMap.set(profile.id, profile);
      });
      setUserProfiles(profilesMap);
    } catch (e) {
      console.error("Failed to load user profiles", e);
    }
  }

  async function fetchUserProfile(userId: string | null) {
    if (!userId) return;
    if (userProfiles.has(userId)) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, discord_username, discord_avatar")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserProfiles((prev) => new Map(prev).set(userId, data));
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
    }
  }

  async function fetchMessages(ticketId: string) {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as TicketMessage[]) ?? []);
    } catch (e: any) {
      console.error("Failed to load messages", e);
      toast({ title: "Erro", description: "Não foi possível carregar as mensagens" });
    } finally {
      setLoadingMessages(false);
    }
  }

  async function postReply() {
    if (!selected) return;
    const trimmed = reply.trim();
    if (!trimmed) {
      toast({ title: "Mensagem vazia", description: "Escreve uma resposta antes de enviar" });
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

      // Atualizar status do ticket para "pending" se estava "open"
      if (selected.status === "open") {
        const { error: updErr } = await supabase.from("tickets").update({ status: "pending" }).eq("id", selected.id);
        if (updErr) throw updErr;
      }

      setReply("");
      toast({ title: "Resposta enviada", description: "A tua resposta foi enviada com sucesso" });
      await fetchMessages(selected.id);
      await fetchTickets();
    } catch (e: any) {
      console.error("Failed to post reply", e);
      toast({ title: "Erro", description: e?.message ?? "Não foi possível enviar a resposta" });
    } finally {
      setSending(false);
    }
  }

  async function updateTicketStatus(ticketId: string, newStatus: string) {
    try {
      const { error } = await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Estado atualizado", description: `Ticket marcado como ${newStatus}` });
      await fetchTickets();
      if (selected?.id === ticketId) {
        setSelected({ ...selected, status: newStatus });
      }
    } catch (e: any) {
      console.error("Failed to update ticket status", e);
      toast({ title: "Erro", description: e?.message ?? "Não foi possível atualizar o estado" });
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets;
  }, [tickets]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      pending: tickets.filter((t) => t.status === "pending").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    };
  }, [tickets]);

  const selectedProfile = selected?.user_id ? userProfiles.get(selected.user_id) : null;

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets de Suporte</h1>
          <p className="text-sm text-white/60 mt-1">Gerir e responder a tickets de utilizadores</p>
        </div>
        <Button onClick={() => fetchTickets()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Tag className="h-8 w-8 text-white/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300/80">Abertos</p>
                <p className="text-2xl font-bold text-blue-300">{stats.open}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-300/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-300/80">Pendentes</p>
                <p className="text-2xl font-bold text-amber-300">{stats.pending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-300/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-500/10 border-gray-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300/80">Fechados</p>
                <p className="text-2xl font-bold text-gray-300">{stats.closed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-300/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Pesquisar por título ou conteúdo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value as any)}
                      variant={statusFilter === opt.value ? "default" : "outline"}
                      size="sm"
                      className={`gap-2 ${statusFilter === opt.value ? "bg-[#e53e30] hover:bg-[#e53e30]/90" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Tickets */}
        <div className="lg:col-span-2 space-y-3">
          {loading && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Spinner className="mx-auto mb-2" />
                <p className="text-sm text-white/60">A carregar tickets...</p>
              </CardContent>
            </Card>
          )}

          {!loading && filteredTickets.length === 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/60">Nenhum ticket encontrado</p>
              </CardContent>
            </Card>
          )}

          <AnimatePresence>
            {!loading &&
              filteredTickets.map((ticket) => {
                const profile = ticket.user_id ? userProfiles.get(ticket.user_id) : null;
                const isSelected = selected?.id === ticket.id;

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#e53e30]/10 border-[#e53e30]/30 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                      onClick={() => setSelected(ticket)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white truncate">{ticket.title}</h3>
                              <StatusBadge status={ticket.status} />
                            </div>
                            {ticket.content && (
                              <p className="text-sm text-white/70 line-clamp-2 mb-2">{ticket.content}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-white/50">
                              {profile && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3" />
                                  <span>{profile.discord_username || profile.email || "Utilizador"}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(ticket.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        {/* Painel de Detalhes */}
        <div className="lg:col-span-1">
          {!selected ? (
            <Card className="bg-white/5 border-white/10 sticky top-6">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/60">Seleciona um ticket para ver detalhes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sticky top-6">
              {/* Detalhes do Ticket */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-white">{selected.title}</CardTitle>
                    <StatusBadge status={selected.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações do Utilizador */}
                  {selectedProfile && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-3">
                        {selectedProfile.discord_avatar ? (
                          <img
                            src={selectedProfile.discord_avatar}
                            alt="Avatar"
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-white/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {selectedProfile.discord_username || "Utilizador"}
                          </p>
                          {selectedProfile.email && (
                            <p className="text-xs text-white/60 truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {selectedProfile.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conteúdo Original */}
                  {selected.content && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{selected.content}</p>
                    </div>
                  )}

                  {/* Ações Rápidas */}
                  <div className="flex flex-wrap gap-2">
                    {selected.status !== "closed" && (
                      <Button
                        onClick={() => updateTicketStatus(selected.id, "closed")}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Fechar
                      </Button>
                    )}
                    {selected.status === "closed" && (
                      <Button
                        onClick={() => updateTicketStatus(selected.id, "open")}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reabrir
                      </Button>
                    )}
                    {selected.status === "open" && (
                      <Button
                        onClick={() => updateTicketStatus(selected.id, "pending")}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Marcar Pendente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mensagens */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Conversa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {loadingMessages && (
                      <div className="text-center py-4">
                        <Spinner className="mx-auto mb-2" />
                        <p className="text-xs text-white/60">A carregar mensagens...</p>
                      </div>
                    )}

                    {!loadingMessages && messages.length === 0 && (
                      <p className="text-sm text-white/60 text-center py-4">Ainda não há mensagens</p>
                    )}

                    {!loadingMessages &&
                      messages.map((msg) => {
                        const isAdmin = msg.author === "admin";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                isAdmin
                                  ? "bg-[#e53e30]/20 border border-[#e53e30]/30 text-white"
                                  : "bg-white/10 border border-white/20 text-white/90"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                  {isAdmin ? "Admin" : "Utilizador"}
                                </span>
                                <span className="text-xs text-white/50">
                                  {formatDate(msg.created_at)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
              </Card>

              {/* Responder */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Responder</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escreve a tua resposta aqui... (Ctrl/Cmd + Enter para enviar)"
                    className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        postReply();
                      }
                    }}
                  />
                  <Button
                    onClick={postReply}
                    disabled={!reply.trim() || sending}
                    className="w-full gap-2 bg-[#e53e30] hover:bg-[#e53e30]/90"
                  >
                    {sending ? (
                      <>
                        <Spinner />
                        A enviar...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Resposta
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
