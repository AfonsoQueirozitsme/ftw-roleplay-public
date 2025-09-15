import React, { useEffect, useMemo, useState } from "react";
import { listApplications, setApplicationStatus, getApplication, type ApplicationRow } from "@/lib/api/applications";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/admin/player/player-common";
import { UserCircle2, ShieldCheck, CheckCircle, XCircle, HelpCircle } from "lucide-react";

const STATUS_OPTS = [
  { v: "all", label: "Todos" },
  { v: "pending", label: "Pendente" },
  { v: "approved", label: "Aprovada" },
  { v: "rejected", label: "Recusada" },
] as const;

type GuildRole = { id: string; name: string; position: number };
type GuildStats = {
  user_id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
  created_at_from_snowflake: string | null;
  joined_at: string | null;
  roles: GuildRole[];
  messages_count: number | null;
};

function Badge({ status }: { status: ApplicationRow["status"] }) {
  const map: Record<ApplicationRow["status"], string> = {
    pending: "bg-amber-400/20 text-amber-200",
    approved: "bg-emerald-400/20 text-emerald-200",
    rejected: "bg-rose-400/20 text-rose-200",
  };
  const label: Record<ApplicationRow["status"], string> = {
    pending: "Pendente",
    approved: "Aprovada",
    rejected: "Recusada",
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[status]}`}>{label[status]}</span>;
}

function discordCreatedFromSnowflake(id?: string | null) {
  if (!id) return null;
  try {
    const ms = (BigInt(id) >> 22n) + 1420070400000n;
    return new Date(Number(ms));
  } catch {
    return null;
  }
}

function daysSince(iso?: string | null) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default function Candidaturas() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [openData, setOpenData] = useState<ApplicationRow | null>(null);
  const [openLoading, setOpenLoading] = useState(false);
  const [stats, setStats] = useState<GuildStats | null>(null);

  useEffect(() => {
    setLoading(true);
    listApplications({ status: "all", page: 1, limit: 50 })
      .then((res) => setRows(res.data))
      .catch((e) => setErro(e?.message ?? "Erro a carregar candidaturas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!openId) return;
    setOpenLoading(true);
    setStats(null);
    getApplication(openId)
      .then(async (d) => {
        setOpenData(d);
        if (d.discord_id) {
          try {
            const { data, error } = await supabase.functions.invoke("discord-guild-stats", {
              body: { discordId: d.discord_id },
            });
            if (error) console.error(error);
            if (data?.ok && data.profile) setStats(data.profile as GuildStats);
          } catch (err) {
            console.warn("discord-guild-stats falhou:", err);
          }
        }
      })
      .finally(() => setOpenLoading(false));
  }, [openId]);

  const skeleton = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  function computeTrustScore(app: ApplicationRow, s: GuildStats | null) {
    let score = 0;
    const parts: string[] = [];

    const created = discordCreatedFromSnowflake(app.discord_id);
    const accDays = created ? Math.floor((Date.now() - created.getTime()) / 86400000) : 0;
    const accPts = Math.min(30, Math.floor(accDays / 60));
    if (created) { score += accPts; parts.push(`Conta Discord: ${accDays} dias (+${accPts})`); }

    if (app.discord_verified) { score += 10; parts.push("Discord verificado (+10)"); }

    if (s?.joined_at) {
      const joinDays = daysSince(s.joined_at);
      const tenureBase = Math.floor(joinDays / 20);
      const tenurePts = Math.min(50, tenureBase * 2);
      score += tenurePts;
      parts.push(`Tempo no servidor: ${joinDays} dias (+${tenurePts})`);
    }

    if (typeof s?.messages_count === "number") {
      const msgPts = Math.min(20, Math.floor((s.messages_count || 0) / 50));
      score += msgPts; parts.push(`Atividade: ${s.messages_count} msgs (+${msgPts})`);
    }

    if (s?.roles?.length) {
      const rolePts = Math.min(10, s.roles.length * 2);
      const hasHigh = s.roles.some((r) => r.position >= 10);
      score += rolePts; parts.push(`Cargos: ${s.roles.length} (+${rolePts})`);
      if (hasHigh) { score += 10; parts.push("Tem cargo de posição alta (+10)"); }
    }

    const motLen = (app.motivacao || "").trim().split(/\s+/).filter(Boolean).length;
    const motPts = Math.min(10, Math.floor(motLen / 30));
    score += motPts; parts.push(`Motivação: ${motLen} palavras (+${motPts})`);

    score = Math.max(0, Math.min(100, score));
    let rec: "approve" | "waitlist" | "reject" = "waitlist";
    if (score >= 65) rec = "approve";
    else if (score < 45) rec = "reject";

    return { score, parts, rec };
  }

  // ordenar pendentes primeiro, depois aprovadas, depois reprovadas
  function statusWeight(s: ApplicationRow["status"]) {
    if (s === "pending") return 0;
    if (s === "approved") return 1;
    if (s === "rejected") return 2;
    return 3;
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sa = statusWeight(a.status);
      const sb = statusWeight(b.status);
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows]);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Candidaturas</h2>
          <p className="text-white/70 text-sm">Tabela + perfil com métricas de servidor (via Edge Function).</p>
        </div>
        <div className="text-sm text-white/60">{sortedRows.length} registo{sortedRows.length === 1 ? "" : "s"}</div>
      </header>

      {erro && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="p-3">Foto</th>
              <th className="p-3">Discord</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Data</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              skeleton.map((i) => (
                <tr key={i} className="border-t border-white/10">
                  <td colSpan={5} className="p-4 text-center"><Spinner /></td>
                </tr>
              ))
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-white/60">Sem resultados.</td></tr>
            ) : (
              sortedRows.map((app) => (
                <tr key={app.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-3">
                    {app.discord_avatar_url ? (
                      <img src={app.discord_avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                    ) : (
                      <UserCircle2 className="w-8 h-8 text-white/40" />
                    )}
                  </td>
                  <td className="p-3">{app.discord_username ? `@${app.discord_username}` : (app.discord_id ?? "—")}</td>
                  <td className="p-3"><Badge status={app.status} /></td>
                  <td className="p-3">{new Date(app.created_at).toLocaleString("pt-PT")}</td>
                  <td className="p-3 text-right">
                    <button className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20" onClick={() => setOpenId(app.id)}>Ver</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setOpenId(null); setOpenData(null); setStats(null); }} />
          <div className="relative w-full max-w-[920px] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0b0c] text-white p-6">
            {!openData || openLoading ? (
              <div className="flex items-center gap-2"><Spinner /> A carregar…</div>
            ) : (
              <ProfileDetails
                app={openData}
                stats={stats}
                onClose={() => { setOpenId(null); setOpenData(null); setStats(null); }}
                onStatus={async (next) => {
                  await setApplicationStatus(openData.id, next);
                  setOpenData({ ...openData, status: next });
                  setRows((r) => r.map((x) => (x.id === openData.id ? { ...x, status: next } : x)));
                }}
                computeTrust={computeTrustScore}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileDetails({
  app,
  stats,
  onClose,
  onStatus,
  computeTrust,
}: {
  app: ApplicationRow;
  stats: GuildStats | null;
  onClose: () => void;
  onStatus: (next: ApplicationRow["status"]) => Promise<void>;
  computeTrust: (a: ApplicationRow, s: GuildStats | null) => { score: number; parts: string[]; rec: "approve" | "waitlist" | "reject" };
}) {
  const created = discordCreatedFromSnowflake(app.discord_id);
  const { score, parts, rec } = computeTrust(app, stats);
  const RecIcon = rec === "approve" ? CheckCircle : rec === "reject" ? XCircle : HelpCircle;
  const recClass = rec === "approve" ? "text-emerald-400" : rec === "reject" ? "text-rose-400" : "text-amber-300";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {app.discord_avatar_url ? (
            <img src={app.discord_avatar_url} alt="avatar" className="w-16 h-16 rounded-full" />
          ) : (
            <UserCircle2 className="w-16 h-16 text-white/40" />
          )}
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">{app.discord_global_name || app.discord_username || app.nome}</div>
            <div className="text-white/60 text-sm truncate">{app.discord_username ? `@${app.discord_username}` : (app.discord_id ?? "—")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={app.status} />
          <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={onClose}>Fechar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Conta criada">{created ? created.toLocaleDateString("pt-PT") : "—"}</Metric>
        <Metric label="Tempo no servidor">{stats?.joined_at ? `${daysSince(stats.joined_at)} dias` : "—"}</Metric>
        <Metric label="Mensagens enviadas">{typeof stats?.messages_count === "number" ? stats!.messages_count : "—"}</Metric>
        <Metric label="Cargos">{stats?.roles?.length ? `${stats.roles.length}` : "—"}</Metric>
      </div>
      {stats?.roles?.length ? (
        <div className="text-xs text-white/60 -mt-2">{rolesSummary(stats.roles)}</div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Dados">
          <Field label="Nome">{app.nome}</Field>
          <Field label="Email">{app.email}</Field>
          <Field label="Website">{app.website || "—"}</Field>
        </Card>
        <Card title="Personagem & motivação">
          <Field label="Personagem">{app.personagem}</Field>
          <Field label="Motivação"><div className="whitespace-pre-wrap">{app.motivacao}</div></Field>
        </Card>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${score >= 70 ? "text-emerald-400" : score < 50 ? "text-rose-400" : "text-amber-300"}`}>{score}</div>
          <div className="text-sm">
            <div className={`flex items-center gap-1 ${recClass}`}><RecIcon className="w-4 h-4" /> {rec === "approve" ? "Recomendação: Aprovar" : rec === "reject" ? "Recomendação: Reprovar" : "Recomendação: A rever"}</div>
            <ul className="mt-1 list-disc list-inside text-white/70">
              {parts.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="ml-auto flex gap-2">
            {app.status !== "approved" && <button className="px-3 py-2 rounded bg-emerald-400/90 text-black hover:opacity-90" onClick={() => onStatus("approved")}>Aprovar</button>}
            {app.status !== "pending" && <button className="px-3 py-2 rounded bg-white/10 hover:bg-white/15" onClick={() => onStatus("pending")}>Repor p/ pendente</button>}
            {app.status !== "rejected" && <button className="px-3 py-2 rounded bg-rose-400/90 text-black hover:opacity-90" onClick={() => onStatus("rejected")}>Reprovar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function rolesSummary(roles: GuildRole[]) {
  const sorted = [...roles].sort((a, b) => b.position - a.position);
  const top = sorted[0];
  const high = roles.filter((r) => r.position >= 10).length;
  return `Mais alto: ${top.name} (pos ${top.position}). ${high} cargo${high === 1 ? "" : "s"} alto${high === 1 ? "" : "s"}.`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="font-semibold mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-white/60 mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}
