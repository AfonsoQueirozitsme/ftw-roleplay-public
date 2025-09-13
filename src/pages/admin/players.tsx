import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPlayers, PlayerRow, listOnlinePlayers, PlayerMini } from "@/lib/api/players";

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />
  );
}

function Th({
  label, onClick, active, dir,
}: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:underline ${active ? "text-white" : ""}`}
        title="Ordenar"
      >
        {label}
        {active && <span className="text-xs">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-white/10">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-2">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

/* ------- Online helpers ------- */
const pingClass = (p?: number | null) => {
  if (p == null) return "bg-white/30";
  if (p <= 80) return "bg-emerald-400";
  if (p <= 140) return "bg-amber-300";
  return "bg-rose-400";
};

type OnlineIndex = {
  byLicense: Map<string, PlayerMini>;
  byCitizen: Map<string, PlayerMini>;
  byId: Map<string, PlayerMini>;
  byName: Map<string, PlayerMini>;
};

function buildOnlineIndex(rows: PlayerMini[]): OnlineIndex {
  const byLicense = new Map<string, PlayerMini>();
  const byCitizen = new Map<string, PlayerMini>();
  const byId = new Map<string, PlayerMini>();
  const byName = new Map<string, PlayerMini>();
  for (const p of rows) {
    if (p.license) byLicense.set(p.license, p);
    if (p.citizenid) byCitizen.set(p.citizenid, p);
    if (p.id) byId.set(String(p.id), p);
    if (p.name) byName.set(p.name, p);
  }
  return { byLicense, byCitizen, byId, byName };
}

export default function Players() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [job, setJob] = useState("");
  const [gang, setGang] = useState("");
  const [hasPhone, setHasPhone] = useState<""|"true"|"false">("");
  const [sort, setSort] = useState<{ key: string; dir: "asc"|"desc" }>({ key: "last_updated", dir: "desc" });
  const [page, setPage] = useState(1);
  const limit = 20;

  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string| null>(null);

  // online
  const [online, setOnline] = useState<PlayerMini[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const onlineIndex = useMemo(() => buildOnlineIndex(online), [online]);

  useEffect(() => {
    const run = async () => {
      setLoading(true); setError(null);
      try {
        const { data, total } = await listPlayers({
          q: dq, page, limit, sort: sort.key, dir: sort.dir, job, gang, hasPhone
        });
        setRows(data); setTotal(total);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar players");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dq, page, sort, job, gang, hasPhone]);

  useEffect(() => {
    let timer: number | undefined;
    const loadOnline = async () => {
      try {
        setLoadingOnline(true);
        const data = await listOnlinePlayers();
        setOnline(data);
      } finally {
        setLoadingOnline(false);
      }
    };
    loadOnline();
    timer = window.setInterval(loadOnline, 6000);
    return () => { if (timer) window.clearInterval(timer); };
  }, []);

  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const resetFiltros = () => {
    setQ(""); setJob(""); setGang(""); setHasPhone(""); setPage(1);
  };

  const getOnlineFor = (r: PlayerRow): PlayerMini | null => {
    return (
      (r.license && onlineIndex.byLicense.get(r.license)) ||
      (r.citizenid && onlineIndex.byCitizen.get(r.citizenid)) ||
      onlineIndex.byId.get(String(r.id)) ||
      (r.name && onlineIndex.byName.get(r.name)) ||
      null
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Players</h2>
          <p className="text-white/70 text-sm">Pesquisa avançada e gestão básica.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <span className="inline-flex items-center gap-1">
            {loadingOnline && <Spinner />}
            Online: {online.length}
          </span>
          <span className="inline-flex items-center gap-1">
            {loading && <Spinner />}
            {total} registo{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Nome, citizenid, license, telefone…"
            className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          />
          <input
            value={job}
            onChange={(e) => { setJob(e.target.value); setPage(1); }}
            placeholder="Job (label ou name)"
            className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"
          />
          <input
            value={gang}
            onChange={(e) => { setGang(e.target.value); setPage(1); }}
            placeholder="Gang (label ou name)"
            className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"
          />
          <select
            value={hasPhone}
            onChange={(e) => { setHasPhone(e.target.value as any); setPage(1); }}
            className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"
          >
            <option value="">Telefone: Todos</option>
            <option value="true">Com telefone</option>
            <option value="false">Sem telefone</option>
          </select>
          <button
            onClick={resetFiltros}
            className="rounded-lg border border-white/10 bg-white/10 hover:bg-white/15 text-white px-3 py-2"
            title="Limpar filtros"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Tabela (sem Telefone/Job/Gang) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-white/60">
              <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
                <Th label="Nome" onClick={() => toggleSort("name")} active={sort.key === "name"} dir={sort.dir} />
                <Th label="CitizenID" onClick={() => toggleSort("citizenid")} active={sort.key === "citizenid"} dir={sort.dir} />
                <Th label="License" onClick={() => toggleSort("license")} active={sort.key === "license"} dir={sort.dir} />
                <Th label="Estado" onClick={() => {}} active={false} dir={sort.dir} />
                <Th label="Atualizado" onClick={() => toggleSort("last_updated")} active={sort.key === "last_updated"} dir={sort.dir} />
                <th className="w-1 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="text-white/90">
              {loading && rows.length === 0 && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                </>
              )}

              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-white/60">Sem resultados.</td></tr>
              )}

              {rows.map((p) => {
                const on = getOnlineFor(p);
                return (
                  <tr key={p.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-2 font-medium">
                      <Link to={`/admin/players/${encodeURIComponent(p.id)}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p.citizenid ?? "—"}</td>
                    <td className="px-4 py-2">{p.license ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="inline-flex items-center gap-2">
                        <span className={`inline-block h-1.5 w-6 rounded-full ${pingClass(on?.ping)}`} title={on ? `${on.ping ?? "?"} ms` : "Offline"} />
                        <span className={`text-xs ${on ? "text-emerald-200" : "text-white/60"}`}>
                          {on ? (on.ping != null ? `${on.ping} ms` : "Online") : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{p.lastUpdated ? new Date(p.lastUpdated).toLocaleString("pt-PT") : "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end">
                        <Link
                          to={`/admin/players/${encodeURIComponent(p.id)}`}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                        >
                          Ver / Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé / paginação */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 text-sm">
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
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}
