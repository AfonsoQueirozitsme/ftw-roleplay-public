import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

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
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-PT");
  } catch {
    return value;
  }
}

async function safeSelect<T>(fn: () => Promise<{ data: T[] | null; error: any }>): Promise<T[]> {
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
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,created_at,discord_id,discord_username,discord_avatar,blocked,updated_at")
          .order("created_at", { ascending: false });
        if (!alive) return;
        if (error) throw error;
        setProfiles(data ?? []);
      } catch (err) {
        console.error("Failed to fetch profiles", err);
        if (alive) setProfiles([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return profiles;
    const q = query.toLowerCase();
    return profiles.filter((profile) =>
      (profile.email ?? "").toLowerCase().includes(q) ||
      (profile.discord_username ?? "").toLowerCase().includes(q) ||
      (profile.discord_id ?? "").toLowerCase().includes(q) ||
      profile.id.toLowerCase().includes(q)
    );
  }, [profiles, query]);

  useEffect(() => {
    if (!selected) {
      setInsights(null);
      return;
    }

    let cancelled = false;
    const loadInsights = async () => {
      setInsightsLoading(true);
      const [applications, tickets, reports] = await Promise.all([
        selected.email
          ? safeSelect(() =>
              supabase
                .from("applications")
                .select("id,status,created_at,discord_id,discord_username,email")
                .eq("email", selected.email)
                .order("created_at", { ascending: false })
            )
          : Promise.resolve([] as ApplicationRow[]),
        safeSelect(() =>
          supabase
            .from("tickets")
            .select("id,title,status,created_at,user_id")
            .eq("user_id", selected.id)
            .order("created_at", { ascending: false })
        ),
        safeSelect(() =>
          supabase
            .from("reports")
            .select("id,title,status,created_at,user_id,reporter_id,priority,category")
            .or(`user_id.eq.${selected.id},reporter_id.eq.${selected.id}`)
            .order("created_at", { ascending: false })
        ),
      ]);

      if (cancelled) return;

      const stats = {
        totalApplications: applications.length,
        openTickets: tickets.filter((t) => (t.status ?? "").toLowerCase() !== "closed").length,
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

  async function toggleBlock(profile: ProfileRow) {
    const confirmMsg = profile.blocked ? "Desbloquear conta?" : "Bloquear conta?";
    if (!confirm(confirmMsg)) return;

    try {
      const payload = { blocked: !profile.blocked };
      const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (error) throw error;
      setProfiles((prev) =>
        prev.map((row) => (row.id === profile.id ? { ...row, blocked: !profile.blocked } : row))
      );
      if (selected?.id === profile.id) {
        setSelected({ ...profile, blocked: !profile.blocked });
      }
      toast({
        title: "Sucesso",
        description: profile.blocked ? "Conta desbloqueada" : "Conta bloqueada",
      });
    } catch (err) {
      console.error("Failed to toggle block", err);
      toast({ title: "Erro", description: "Falha ao alterar o estado da conta" });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Utilizadores</h2>
          <p className="text-sm text-white/60">
            Lista de perfis e relatório consolidado por utilizador.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar por email, Discord ou ID..."
          className="w-full max-w-md rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Spinner /> A carregar utilizadores...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center text-white/60">
          Sem resultados para este filtro.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            {filtered.map((profile) => {
              const isActive = selected?.id === profile.id;
              return (
                <div
                  key={profile.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-emerald-400/50 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">
                        {profile.discord_username ?? profile.email ?? profile.id}
                      </div>
                      <div className="text-xs text-white/60">{profile.email ?? "—"}</div>
                      <div className="text-xs text-white/50">Criado: {formatDate(profile.created_at)}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                        profile.blocked
                          ? "border border-rose-500/40 bg-rose-500/20 text-rose-100"
                          : "border border-white/15 bg-white/10 text-white/70"
                      }`}
                    >
                      {profile.blocked ? "Bloqueado" : "Ativo"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setSelected(profile)}
                      className="flex-1 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                    >
                      {isActive ? "Selecionado" : "Relatório"}
                    </button>
                    <button
                      onClick={() => toggleBlock(profile)}
                      className={`rounded-xl px-3 py-1.5 text-xs ${
                        profile.blocked
                          ? "border border-emerald-400/40 text-emerald-100"
                          : "border border-rose-500/40 text-rose-100"
                      } hover:bg-white/10`}
                    >
                      {profile.blocked ? "Desbloquear" : "Bloquear"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="min-h-[420px] rounded-3xl border border-white/10 bg-[#070716] p-6 text-white shadow-[0_32px_70px_rgba(3,4,20,0.55)]">
            {!selected ? (
              <div className="h-full grid place-items-center text-sm text-white/60">
                Seleciona um utilizador para ver o relatório detalhado.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {selected.discord_username ?? selected.email ?? selected.id}
                    </h3>
                    <p className="text-xs text-white/60">
                      ID: <span className="font-mono text-white/70">{selected.id}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selected.discord_avatar ? (
                      <img
                        src={selected.discord_avatar}
                        alt="avatar"
                        className="h-12 w-12 rounded-full border border-white/20"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-white/50">
                        —
                      </div>
                    )}
                    <button
                      onClick={() => setSelected(null)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="text-xs text-white/50 uppercase tracking-wide">Email</div>
                    <div className="text-white/80">{selected.email ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="text-xs text-white/50 uppercase tracking-wide">Discord ID</div>
                    <div className="text-white/80 font-mono">{selected.discord_id ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="text-xs text-white/50 uppercase tracking-wide">Criado</div>
                    <div className="text-white/80">{formatDate(selected.created_at)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="text-xs text-white/50 uppercase tracking-wide">Atualizado</div>
                    <div className="text-white/80">{formatDate(selected.updated_at)}</div>
                  </div>
                </div>

                {insightsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Spinner /> A compilar relatório...
                  </div>
                ) : insights ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wide text-white/50">Candidaturas</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {insights.stats.totalApplications}
                        </div>
                        <div className="text-xs text-white/60">
                          Última: {formatDate(insights.stats.lastApplication)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wide text-white/50">Tickets abertos</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {insights.stats.openTickets}
                        </div>
                        <div className="text-xs text-white/60">
                          Último: {formatDate(insights.stats.lastTicket)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wide text-white/50">Reports relacionados</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {insights.stats.reportsTotal}
                        </div>
                        <div className="text-xs text-white/60">Inclui submissões e envolvimentos</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wide text-white/50">Estado da conta</div>
                        <div className="mt-1 text-lg font-semibold">
                          {selected.blocked ? "Bloqueado" : "Ativo"}
                        </div>
                        <button
                          onClick={() => toggleBlock(selected)}
                          className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs ${
                            selected.blocked
                              ? "border border-emerald-400/40 text-emerald-100"
                              : "border border-rose-500/40 text-rose-100"
                          } hover:bg-white/10`}
                        >
                          {selected.blocked ? "Desbloquear" : "Bloquear"}
                        </button>
                      </div>
                    </div>

                    <section className="space-y-3">
                      <header className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Candidaturas</h4>
                        <span className="text-xs text-white/50">
                          {insights.applications.length} registo(s)
                        </span>
                      </header>
                      {insights.applications.length === 0 ? (
                        <p className="text-sm text-white/60">Sem candidaturas associadas.</p>
                      ) : (
                        <ul className="space-y-2">
                          {insights.applications.map((app) => (
                            <li
                              key={app.id}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between text-xs text-white/60">
                                <span>{formatDate(app.created_at)}</span>
                                <span className="uppercase tracking-wide">{app.status ?? "—"}</span>
                              </div>
                              <div className="mt-1 text-white/80">
                                Discord: {app.discord_username ?? app.discord_id ?? "—"}
                              </div>
                              {app.personagem && (
                                <div className="mt-1 text-xs text-white/60">Personagem: {app.personagem}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="space-y-3">
                      <header className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Tickets</h4>
                        <span className="text-xs text-white/50">
                          {insights.tickets.length} registo(s)
                        </span>
                      </header>
                      {insights.tickets.length === 0 ? (
                        <p className="text-sm text-white/60">Sem tickets submetidos.</p>
                      ) : (
                        <ul className="space-y-2">
                          {insights.tickets.map((ticket) => (
                            <li
                              key={ticket.id}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between text-xs text-white/60">
                                <span>{formatDate(ticket.created_at)}</span>
                                <span className="uppercase tracking-wide">{ticket.status ?? "—"}</span>
                              </div>
                              <div className="mt-1 text-white/80">{ticket.title}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="space-y-3">
                      <header className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Reports</h4>
                        <span className="text-xs text-white/50">
                          {insights.reports.length} registo(s)
                        </span>
                      </header>
                      {insights.reports.length === 0 ? (
                        <p className="text-sm text-white/60">
                          Nenhum report associado a este utilizador.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {insights.reports.map((report) => (
                            <li
                              key={report.id}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between text-xs text-white/60">
                                <span>{formatDate(report.created_at)}</span>
                                <span className="uppercase tracking-wide">{report.status ?? "—"}</span>
                              </div>
                              <div className="mt-1 text-white/80">{report.title}</div>
                              <div className="mt-1 text-xs text-white/60">
                                Categoria: {report.category ?? "—"} • Prioridade: {report.priority ?? "—"}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                ) : (
                  <p className="text-sm text-white/60">
                    Não foi possível obter dados adicionais para este utilizador.
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
