import React, { useEffect, useMemo, useState } from "react";
import { listApplications, setApplicationStatus, getApplication, type ApplicationRow } from "@/lib/api/applications";
import { Spinner } from "@/components/admin/player/player-common";

const STATUS_OPTS = [
  { v: "all", label: "Todos" },
  { v: "pending", label: "Pendente" },
  { v: "approved", label: "Aprovada" },
  { v: "rejected", label: "Recusada" },
] as const;

function useDebounced<T>(val: T, ms = 300) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

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

export default function Candidaturas() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal detalhe
  const [openId, setOpenId] = useState<string | null>(null);
  const [openData, setOpenData] = useState<ApplicationRow | null>(null);
  const [openLoading, setOpenLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    listApplications({ q: dq, status, page, limit })
      .then(res => { if (!alive) return; setRows(res.data); setTotal(res.total); })
      .catch(e => setErro(e?.message ?? "Erro a carregar candidaturas"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [dq, status, page]);

  useEffect(() => {
    if (!openId) return;
    let alive = true;
    setOpenLoading(true);
    getApplication(openId)
      .then(d => { if (!alive) return; setOpenData(d); })
      .catch(() => {/* ignora, já tens resumo em lista */})
      .finally(() => alive && setOpenLoading(false));
    return () => { alive = false; };
  }, [openId]);

  const rel = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diffMs / 86400000);
    if (d <= 0) {
      const h = Math.max(0, Math.floor(diffMs / 3600000));
      if (h <= 0) {
        const m = Math.max(0, Math.floor(diffMs / 60000));
        return `há ${m} min`;
      }
      return `há ${h} h`;
    }
    return `há ${d} dia${d > 1 ? "s" : ""}`;
  };

  async function mutateStatus(id: string, next: ApplicationRow["status"]) {
    const prev = rows.slice();
    setRows(r => r.map(x => x.id === id ? { ...x, status: next } : x)); // otimista
    try {
      await setApplicationStatus(id, next);
    } catch (e: any) {
      setRows(prev); // rollback
      alert(e?.message ?? "Falha a atualizar estado.");
    }
  }

  const skeleton = useMemo(() => Array.from({ length: limit }, (_, i) => i), [limit]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Candidaturas</h2>
          <p className="text-white/70 text-sm">Gestão de candidaturas (filtros, estados e revisão).</p>
        </div>
        <div className="text-sm text-white/60">{total} registo{total === 1 ? "" : "s"}</div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
            className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none"
          >
            {STATUS_OPTS.map(o => <option key={o.v} value={o.v}>Estado: {o.label}</option>)}
          </select>
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Pesquisar nome, email, discord, personagem…"
            className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none min-w-[260px]"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? skeleton.map(i => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-40 bg-white/10 rounded" />
                  <div className="h-4 w-16 bg-white/10 rounded" />
                </div>
                <div className="h-3 w-24 bg-white/10 rounded mt-2" />
                <div className="h-8 w-full bg-white/10 rounded mt-3" />
              </div>
            ))
          : rows.map((app) => (
              <div key={app.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate" title={app.nome}>{app.nome}</div>
                  <Badge status={app.status} />
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {app.email} · {app.discord || "sem discord"} · {rel(app.created_at)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/15"
                    onClick={() => setOpenId(app.id)}
                  >
                    Ver
                  </button>
                  {app.status !== "approved" && (
                    <button
                      className="px-3 py-1.5 text-xs rounded bg-emerald-400/90 text-black hover:opacity-90"
                      onClick={() => mutateStatus(app.id, "approved")}
                    >
                      Aprovar
                    </button>
                  )}
                  {app.status !== "rejected" && (
                    <button
                      className="px-3 py-1.5 text-xs rounded bg-rose-400/90 text-black hover:opacity-90"
                      onClick={() => mutateStatus(app.id, "rejected")}
                    >
                      Recusar
                    </button>
                  )}
                  {app.status !== "pending" && (
                    <button
                      className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/15"
                      onClick={() => mutateStatus(app.id, "pending")}
                    >
                      Repor p/ Pend.
                    </button>
                  )}
                </div>
              </div>
            ))}

        {!loading && rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-white/10 bg-black/20 p-6 text-center text-white/60">
            Sem resultados.
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="text-white/60">Página {page} de {totalPages}</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15"
          >
            Anterior
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15"
          >
            Seguinte
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {erro}
        </div>
      )}

      {/* Modal Ver */}
      {openId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setOpenId(null); setOpenData(null); }} />
          <div className="absolute left-1/2 top-1/2 w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0b0c] text-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Candidatura</h3>
              <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15" onClick={() => { setOpenId(null); setOpenData(null); }}>
                Fechar
              </button>
            </div>

            {!openData ? (
              <div className="flex items-center gap-2 text-white/70"><Spinner/> A carregar…</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nome">{openData.nome}</Field>
                  <Field label="Email">{openData.email}</Field>
                  <Field label="Discord">{openData.discord || "—"}</Field>
                  <Field label="Website">{openData.website || "—"}</Field>
                  <Field label="Estado"><Badge status={openData.status} /></Field>
                  <Field label="Enviada">{new Date(openData.created_at).toLocaleString("pt-PT")}</Field>
                </div>

                <div>
                  <div className="text-sm text-white/80 mb-1">Personagem</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 whitespace-pre-wrap">
                    {openData.personagem}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-white/80 mb-1">Motivação</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 whitespace-pre-wrap">
                    {openData.motivacao}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {openData.status !== "approved" && (
                    <button
                      className="px-3 py-2 rounded bg-emerald-400/90 text-black hover:opacity-90"
                      onClick={async () => {
                        await mutateStatus(openData.id, "approved");
                        setOpenData({ ...openData, status: "approved" });
                      }}
                    >
                      Aprovar
                    </button>
                  )}
                  {openData.status !== "rejected" && (
                    <button
                      className="px-3 py-2 rounded bg-rose-400/90 text-black hover:opacity-90"
                      onClick={async () => {
                        await mutateStatus(openData.id, "rejected");
                        setOpenData({ ...openData, status: "rejected" });
                      }}
                    >
                      Recusar
                    </button>
                  )}
                  {openData.status !== "pending" && (
                    <button
                      className="px-3 py-2 rounded bg-white/10 hover:bg-white/15"
                      onClick={async () => {
                        await mutateStatus(openData.id, "pending");
                        setOpenData({ ...openData, status: "pending" });
                      }}
                    >
                      Repor para pendente
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Reaproveito o <Field> simples */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
