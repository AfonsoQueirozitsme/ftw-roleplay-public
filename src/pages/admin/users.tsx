import React, { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

type ManagedUser = {
  auth: User;
  profile: ProfileRow | null;
};

type UserInsights = {
  applications: ApplicationRow[];
  tickets: TicketRow[];
  reports: ReportRow[];
  stats: {
    totalApplications: number;
    openTickets: number;
    reportsTotal: number;
    lastApplication?: string | null;
    lastTicket?: string | null;
  };
};

const Spinner = ({ className = "" }: { className?: string }) => (
  <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />
);

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-PT");
  } catch {
    return value;
  }
}

async function safeSelect<T>(
  fn: () => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  try {
    const { data, error } = await fn();
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.warn("[admin-users] Query fallback", err);
    return [];
  }
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      if (!supabaseAdmin) {
        setError(
          "Configura a variavel VITE_SUPABASE_SERVICE_ROLE (chave de servico) para poderes listar auth.users neste painel."
        );
        setLoading(false);
        return;
      }

      try {
        const [profilesRes, usersRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,email,discord_id,discord_username,discord_avatar,blocked,created_at,updated_at"),
          supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (usersRes.error) throw usersRes.error;

        if (!alive) return;

        const profileMap = new Map((profilesRes.data ?? []).map((row) => [row.id, row as ProfileRow]));
        const users = (usersRes.data?.users ?? []) as User[];

        const enriched = users
          .map<ManagedUser>((auth) => ({
            auth,
            profile: profileMap.get(auth.id) ?? null,
          }))
          .sort((a, b) => {
            const createdA = a.auth.created_at ? new Date(a.auth.created_at).getTime() : 0;
            const createdB = b.auth.created_at ? new Date(b.auth.created_at).getTime() : 0;
            return createdB - createdA;
          });

        setRecords(enriched);
        if (!selectedId && enriched.length > 0) {
          setSelectedId(enriched[0].auth.id);
        }
      } catch (err: any) {
        if (!alive) return;
        console.error("[admin-users] Failed to load users", err);
        setError(err.message ?? "Nao foi possivel carregar utilizadores.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  const selected = useMemo(
    () => (selectedId ? records.find((row) => row.auth.id === selectedId) ?? null : null),
    [records, selectedId]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return records;
    const q = query.trim().toLowerCase();

    return records.filter(({ auth, profile }) => {
      const pieces: string[] = [auth.email ?? "", auth.id ?? ""];
      if (profile) {
        pieces.push(profile.discord_username ?? "");
        pieces.push(profile.discord_id ?? "");
      }
      const metadata = auth.user_metadata ?? {};
      const metaValues = [metadata.full_name, metadata.name, metadata.discord_username]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase());

      return pieces.some((value) => value.toLowerCase().includes(q)) || metaValues.some((value) => value.includes(q));
    });
  }, [records, query]);

  useEffect(() => {
    if (!selected) {
      setInsights(null);
      return;
    }

    let cancelled = false;
    const loadInsights = async () => {
      setInsightsLoading(true);

      const contactEmail = selected.profile?.email ?? selected.auth.email ?? null;

      const [applications, tickets, reports] = await Promise.all([
        contactEmail
          ? safeSelect<ApplicationRow>(async () => {
              const { data, error } = await supabase
                .from("applications")
                .select("id,status,created_at,discord_id,discord_username,email")
                .eq("email", contactEmail)
                .order("created_at", { ascending: false });
              return { data: data as ApplicationRow[] | null, error };
            })
          : Promise.resolve([] as ApplicationRow[]),

        safeSelect<TicketRow>(async () => {
          const { data, error } = await supabase
            .from("tickets")
            .select("id,title,status,created_at,user_id")
            .eq("user_id", selected.auth.id)
            .order("created_at", { ascending: false });
          return { data: data as TicketRow[] | null, error };
        }),

        safeSelect<ReportRow>(async () => {
          const { data, error } = await supabase
            .from("reports")
            .select("id,title,status,created_at,user_id,reporter_id,priority,category")
            .or(`user_id.eq.${selected.auth.id},reporter_id.eq.${selected.auth.id}`)
            .order("created_at", { ascending: false });
          return { data: data as ReportRow[] | null, error };
        }),
      ]);

      if (cancelled) return;

      const stats: UserInsights["stats"] = {
        totalApplications: applications.length,
        openTickets: tickets.filter((ticket) => (ticket.status ?? "").toLowerCase() !== "fechado").length,
        reportsTotal: reports.length,
        lastApplication: applications[0]?.created_at ?? null,
        lastTicket: tickets[0]?.created_at ?? null,
      };

      setInsights({ applications, tickets, reports, stats });
      setInsightsLoading(false);
    };

    loadInsights();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const toggleBlock = async (record: ManagedUser) => {
    const currentlyBlocked = record.profile?.blocked ?? false;
    const confirmMsg = currentlyBlocked ? "Desbloquear conta?" : "Bloquear conta?";
    if (!window.confirm(confirmMsg)) return;

    try {
      let updated: ProfileRow;
      if (record.profile) {
        const { data, error } = await supabase
          .from("profiles")
          .update({ blocked: !currentlyBlocked })
          .eq("id", record.auth.id)
          .select()
          .single();
        if (error) throw error;
        updated = data as ProfileRow;
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            id: record.auth.id,
            email: record.auth.email ?? null,
            blocked: !currentlyBlocked,
          })
          .select()
          .single();
        if (error) throw error;
        updated = data as ProfileRow;
      }

      setRecords((prev) =>
        prev.map((row) => (row.auth.id === record.auth.id ? { ...row, profile: updated } : row))
      );

      toast({
        title: "Sucesso",
        description: currentlyBlocked ? "Conta desbloqueada" : "Conta bloqueada",
      });
    } catch (err: any) {
      console.error("[admin-users] toggleBlock", err);
      toast({
        title: "Erro",
        description: err.message ?? "Nao foi possivel atualizar o estado da conta.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-black/40 p-12 text-center text-white/70">
          A carregar utilizadores...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 p-6 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-amber-400/40 bg-amber-500/20 p-8 text-center text-sm text-amber-50">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-zinc-900 p-6 text-white">
      <header className="max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Utilizadores (auth.users)</h1>
        <p className="mt-2 text-sm text-white/70">
          Consulta contas reais do Supabase Auth e liga dados complementares do perfil publico.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Lista de utilizadores</h2>
                <p className="text-xs uppercase tracking-wide text-white/50">{records.length} registo(s)</p>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrar por email, id ou Discord..."
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <div className="mt-4 space-y-3">
              {filtered.map((rec) => {
                const isActive = rec.auth.id === selectedId;
                const blocked = rec.profile?.blocked ?? false;
                const email = rec.auth.email ?? rec.profile?.email ?? "-";
                const displayName =
                  (rec.auth.user_metadata?.full_name as string | undefined) ??
                  (rec.profile?.discord_username ?? "Sem nome");

                return (
                  <button
                    key={rec.auth.id}
                    type="button"
                    onClick={() => setSelectedId(rec.auth.id)}
                    className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-emerald-400/50 bg-emerald-400/10 text-white"
                        : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{displayName}</div>
                        <div className="text-xs text-white/50">{email}</div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                          blocked
                            ? "border border-rose-500/40 bg-rose-500/20 text-rose-100"
                            : "border border-white/15 bg-white/10 text-white/70"
                        }`}
                      >
                        {blocked ? "Bloqueado" : "Ativo"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/45">
                      <span>ID: {rec.auth.id}</span>
                      {rec.profile?.discord_id && <span>Discord ID: {rec.profile.discord_id}</span>}
                      {rec.auth.last_sign_in_at && <span>Ultimo acesso: {formatDate(rec.auth.last_sign_in_at)}</span>}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                  Nenhum utilizador corresponde ao filtro.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {selected ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {(selected.auth.user_metadata?.full_name as string | undefined) ?? selected.auth.email ?? "Sem nome"}
                  </h2>
                  <p className="text-xs uppercase tracking-wide text-white/50">{selected.auth.id}</p>
                </div>
                <div className="text-right text-sm text-white/70">
                  <div>Criado em: {formatDate(selected.auth.created_at)}</div>
                  <div>Ultimo acesso: {formatDate(selected.auth.last_sign_in_at)}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <div className="text-xs uppercase tracking-wide text-white/50">Email</div>
                  <div className="mt-1 text-lg font-semibold">
                    {selected.auth.email ?? selected.profile?.email ?? "Sem email"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <div className="text-xs uppercase tracking-wide text-white/50">Estado da conta</div>
                  <div className="mt-1 text-lg font-semibold">
                    {selected.profile?.blocked ? "Bloqueado" : "Ativo"}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBlock(selected)}
                    className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs ${
                      selected.profile?.blocked
                        ? "border border-emerald-400/40 text-emerald-100"
                        : "border border-rose-500/40 text-rose-100"
                    } hover:bg-white/10`}
                  >
                    {selected.profile?.blocked ? "Desbloquear" : "Bloquear"}
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <section className="space-y-3">
                  <header className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Candidaturas</h4>
                    <span className="text-xs text-white/50">{insights?.applications.length ?? 0} registo(s)</span>
                  </header>
                  {insightsLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                      <Spinner className="mr-2" /> A carregar dados...
                    </div>
                  ) : insights && insights.applications.length > 0 ? (
                    <ul className="space-y-2">
                      {insights.applications.map((app) => (
                        <li key={app.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>{formatDate(app.created_at)}</span>
                            <span className="uppercase tracking-wide">{app.status ?? "-"}</span>
                          </div>
                          <div className="mt-1 text-white/80">
                            Discord: {app.discord_username ?? app.discord_id ?? "-"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/60">Sem candidaturas associadas.</p>
                  )}
                </section>

                <section className="space-y-3">
                  <header className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Tickets</h4>
                    <span className="text-xs text-white/50">{insights?.tickets.length ?? 0} registo(s)</span>
                  </header>
                  {insightsLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                      <Spinner className="mr-2" /> A carregar dados...
                    </div>
                  ) : insights && insights.tickets.length > 0 ? (
                    <ul className="space-y-2">
                      {insights.tickets.map((ticket) => (
                        <li key={ticket.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>{formatDate(ticket.created_at)}</span>
                            <span className="uppercase tracking-wide">{ticket.status ?? "-"}</span>
                          </div>
                          <div className="mt-1 text-white/80">{ticket.title}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/60">Sem tickets submetidos.</p>
                  )}
                </section>

                <section className="space-y-3">
                  <header className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Reports</h4>
                    <span className="text-xs text-white/50">{insights?.reports.length ?? 0} registo(s)</span>
                  </header>
                  {insightsLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                      <Spinner className="mr-2" /> A carregar dados...
                    </div>
                  ) : insights && insights.reports.length > 0 ? (
                    <ul className="space-y-2">
                      {insights.reports.map((report) => (
                        <li key={report.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>{formatDate(report.created_at)}</span>
                            <span className="uppercase tracking-wide">{report.status ?? "-"}</span>
                          </div>
                          <div className="mt-1 text-white/80">{report.title}</div>
                          <div className="mt-1 text-xs text-white/60">
                            Categoria: {report.category ?? "-"} | Prioridade: {report.priority ?? "-"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/60">Nenhum report associado a este utilizador.</p>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-sm text-white/60">
              Seleciona um utilizador para ver os detalhes.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
