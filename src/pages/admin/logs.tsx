import React, { useEffect, useMemo, useState } from "react";
import { listLogs, type LogRow } from "@/lib/api/logs";
import { Spinner } from "@/components/admin/player/player-common";

const LEVELS = [
  { v: "all", label: "Todos" },
  { v: "debug", label: "Debug" },
  { v: "info", label: "Info" },
  { v: "warn", label: "Warn" },
  { v: "error", label: "Error" },
] as const;

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(()=>setD(v), ms); return ()=>clearTimeout(t); }, [v, ms]);
  return d;
}

function Lvl({ level }: { level: LogRow["level"] }) {
  const map: Record<LogRow["level"], string> = {
    debug: "bg-white/10 text-white/70",
    info: "bg-emerald-400/20 text-emerald-200",
    warn: "bg-amber-400/20 text-amber-200",
    error: "bg-rose-400/20 text-rose-200",
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[level]}`}>{level.toUpperCase()}</span>;
}

export default function LogsPage() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [level, setLevel] = useState<"all" | "debug" | "info" | "warn" | "error">("all");
  const [user, setUser] = useState("");             // id ou email (se tiveres view)
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");
  const [requestId, setRequestId] = useState("");
  const [ip, setIp] = useState("");
  const [ctxKey, setCtxKey] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [page, setPage] = useState(1);
  const limit = 25;

  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // modal
  const [open, setOpen] = useState<LogRow | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    listLogs({
      q: dq,
      level,
      user: user.trim() || undefined,
      tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      source: source.trim() || undefined,
      request_id: requestId.trim() || undefined,
      ip: ip.trim() || undefined,
      hasContextKey: ctxKey.trim() || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString()   : undefined,
      page,
      limit,
      dir: "desc",
    })
      .then(res => { if (!alive) return; setRows(res.data); setTotal(res.total); })
      .catch(e => setErro(e?.message ?? "Erro a carregar logs"))
      .finally(()=> alive && setLoading(false));
    return () => { alive = false; };
  }, [dq, level, user, tags, source, requestId, ip, ctxKey, from, to, page]);

  const skeleton = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Logs</h2>
          <p className="text-white/70 text-sm">Filtro avançado por nível, datas, tags, utilizador, IP, source e request id.</p>
        </div>
        <div className="text-sm text-white/60">{total} eventos</div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} placeholder="Pesquisar mensagem / source / IP / request_id…" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <select value={level} onChange={(e)=>{ setLevel(e.target.value as any); setPage(1); }} className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none">
            {LEVELS.map(l => <option key={l.v} value={l.v}>Nível: {l.label}</option>)}
          </select>
          <input value={user} onChange={(e)=>{ setUser(e.target.value); setPage(1); }} placeholder="Utilizador (UUID ou email)" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input value={tags} onChange={(e)=>{ setTags(e.target.value); setPage(1); }} placeholder="Tags (sep. vírgulas)" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={source} onChange={(e)=>{ setSource(e.target.value); setPage(1); }} placeholder="Source" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input value={requestId} onChange={(e)=>{ setRequestId(e.target.value); setPage(1); }} placeholder="Request ID" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input value={ip} onChange={(e)=>{ setIp(e.target.value); setPage(1); }} placeholder="IP" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input value={ctxKey} onChange={(e)=>{ setCtxKey(e.target.value); setPage(1); }} placeholder="Context key" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <div className="flex gap-2">
            <input type="datetime-local" value={from} onChange={(e)=>{ setFrom(e.target.value); setPage(1); }} className="flex-1 rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
            <input type="datetime-local" value={to} onChange={(e)=>{ setTo(e.target.value); setPage(1); }} className="flex-1 rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-white/60">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th>Quando</th><th>Nível</th><th>Mensagem</th><th>Tags</th><th>Source</th><th>Req</th><th>IP</th><th>Utilizador</th><th className="w-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-white/90">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-white/10 animate-pulse">
                    <td className="px-3 py-2"><div className="h-3 w-24 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-14 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-64 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-20 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-24 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-16 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-16 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-28 bg-white/10 rounded" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-10 bg-white/10 rounded" /></td>
                  </tr>
                ))
              ) : rows.map(r => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2">{new Date(r.ts).toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-2"><Lvl level={r.level} /></td>
                  <td className="px-3 py-2 truncate max-w-[40ch]" title={r.message}>{r.message}</td>
                  <td className="px-3 py-2">{(r.tags ?? []).slice(0,3).join(", ")}</td>
                  <td className="px-3 py-2">{r.source ?? "—"}</td>
                  <td className="px-3 py-2">{r.request_id ?? "—"}</td>
                  <td className="px-3 py-2">{r.ip ?? "—"}</td>
                  <td className="px-3 py-2">{r.user_email ?? r.user_id ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs" onClick={()=>setOpen(r)}>Ver</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-white/60">Sem resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 text-sm">
          <div className="text-white/60">Página {page} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1, p-1))} className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15">Anterior</button>
            <button disabled={page>=totalPages || loading} onClick={()=>setPage(p=>Math.min(totalPages, p+1))} className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15">Seguinte</button>
          </div>
        </div>
      </div>

      {erro && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      {/* Modal detalhe */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setOpen(null)} />
          <div className="absolute left-1/2 top-1/2 w-[min(96vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0b0c] text-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Log #{open.id}</div>
              <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15" onClick={()=>setOpen(null)}>Fechar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <Field label="Quando">{new Date(open.ts).toLocaleString("pt-PT")}</Field>
              <Field label="Nível">{open.level.toUpperCase()}</Field>
              <Field label="Source">{open.source ?? "—"}</Field>
              <Field label="Request ID">{open.request_id ?? "—"}</Field>
              <Field label="IP">{open.ip ?? "—"}</Field>
              <Field label="Utilizador">{open.user_email ?? open.user_id ?? "—"}</Field>
            </div>
            <div className="mt-3">
              <div className="text-sm text-white/80 mb-1">Mensagem</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 whitespace-pre-wrap">{open.message}</div>
            </div>
            <div className="mt-3">
              <div className="text-sm text-white/80 mb-1">Contexto (JSON)</div>
              <pre className="rounded-xl border border-white/10 bg-black/50 p-3 overflow-auto text-xs">
                {JSON.stringify(open.context ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
