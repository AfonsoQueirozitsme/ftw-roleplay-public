import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listResources,
  startResource,
  stopResource,
  restartResource,
  getServerInfo,
} from "@/lib/api/server";

/* --------------- Utils --------------- */
function useDebounced<T>(value: T, delay = 300) {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDeb(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return deb;
}
function useLocalStorageState<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV] as const;
}
function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}
type Toast = { id: string; type: "success" | "error" | "info"; msg: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, push };
}
function Confirm({
  open, title, desc, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  onConfirm, onClose, busy = false,
}: {
  open: boolean; title: string; desc?: string;
  confirmLabel?: string; cancelLabel?: string; busy?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0b0c] text-white p-5">
        <div className="text-lg font-semibold mb-1">{title}</div>
        {desc && <div className="text-sm text-white/70 mb-4">{desc}</div>}
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button className="px-3 py-2 rounded-lg bg-white text-black hover:opacity-90 text-sm disabled:opacity-60" onClick={onConfirm} disabled={busy}>
            {busy ? "A executar…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-white/10 border border-white/10">{children}</span>;
}
function SkeletonRow() {
  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3"><div className="h-4 w-56 bg-white/10 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 bg-white/10 rounded animate-pulse ml-auto" /></td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-2">
          <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

function categoryFor(name: string): { key: string; label: string } {
    const n = name.toLowerCase();
    const map: { test: RegExp; key: string; label: string }[] = [
      { test: /^(qbx_|qz-|ps-)/, key: "framework", label: "Framework / Core" },
      { test: /^(ftw|ftwrp|ftw_)/, key: "ftw", label: "FTW - Core/Recursos" },
      { test: /^(ox_|ox-)/, key: "ox", label: "OX (Lib/Inv/Fuel)" },
      { test: /(hud|ui|tablet|scoreboard|idcard|chat|radial)/i, key: "ui", label: "Interface / HUD" },
      // ---- FIX AQUI (substitui a linha problemática por esta):
      { test: /(garage|vehicle|car|fuel|plate|tuning|imports|speeds|bike|gta)/i, key: "vehicles", label: "Veículos" },
      { test: /(job|duty|police|prison|dispatch|bank|heist|robbery|drugs|hunting|fishing|trucker|delivery)/i, key: "jobs", label: "Jobs / Atividades" },
      { test: /(gabz|map|mlo|ipl|interior|k4mb1)/i, key: "mapping", label: "Mapeamentos / Interiores" },
      { test: /(lib|utils|core|base|smallresources)/i, key: "libs", label: "Libs / Utilitários" },
    ];
    for (const r of map) if (r.test.test(n)) return { key: r.key, label: r.label };
    return { key: "outros", label: "Outros" };
  }
  
function prefixOf(name: string) {
  return name.includes("-") ? name.split("-")[0] : (name.includes("_") ? name.split("_")[0] : name);
}

/* --------------- Página --------------- */
type SortDir = "asc" | "desc";
type Action = "start" | "stop" | "restart";

export default function ResourcesPage() {
  // filtros / opções
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [useRegex, setUseRegex] = useLocalStorageState<boolean>("res.regex", false);
  const [auto, setAuto] = useLocalStorageState<number>("res.auto", 0);
  const [sortDir, setSortDir] = useLocalStorageState<SortDir>("res.sort", "asc");
  const [groupByPrefix, setGroupByPrefix] = useLocalStorageState<boolean>("res.groupby", true);
  const filterRef = useRef<HTMLInputElement>(null);

  // dados
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // seleção / favoritos
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pins, setPins] = useLocalStorageState<Record<string, true>>("res.pins", {});

  // ações & confirmações
  const [confirm, setConfirm] = useState<{ action: Action; names: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyRow, setBusyRow] = useState<Record<string, Action | undefined>>({}); // row-level spinner

  const { toasts, push } = useToasts();

  const fetchInfo = async () => {
    const info = await getServerInfo();
    const rset = new Set<string>((info.resources ?? []).map(String));
    setRunning(rset);
  };

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const [{ data }, _] = await Promise.all([listResources({ q: dq }), fetchInfo()]);
      const sorted = [...data].sort((a, b) => sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a));
      setNames(sorted);
      setLastFetched(Date.now());
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar resources");
    } finally {
      setLoading(false);
    }
  };

  // inicial e quando filtros mudam
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [dq, sortDir]);

  // auto refresh
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(refresh, auto * 1000);
    return () => clearInterval(id);
  }, [auto]);

  // atalhos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "r") { e.preventDefault(); refresh(); }
      if (e.key === "/") { e.preventDefault(); filterRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // regex
  const regexErr = useMemo(() => {
    if (!useRegex || !dq.trim()) return null;
    try { new RegExp(dq.trim(), "i"); return null; }
    catch (e: any) { return String(e?.message ?? "regex inválida"); }
  }, [dq, useRegex]);

  const filtered = useMemo(() => {
    if (regexErr) return [];
    if (!dq.trim()) return names;
    if (!useRegex) {
      const s = dq.trim().toLowerCase();
      return names.filter((n) => n.toLowerCase().includes(s));
    }
    const re = new RegExp(dq.trim(), "i");
    return names.filter((n) => re.test(n));
  }, [names, dq, useRegex, regexErr]);

  // categorização + agrupamento por prefixo
  type Group = { catKey: string; catLabel: string; prefix?: string; items: string[] };
  const groups = useMemo(() => {
    const cats = new Map<string, { label: string; items: string[] }>();
    for (const n of filtered) {
      const c = categoryFor(n);
      if (!cats.has(c.key)) cats.set(c.key, { label: c.label, items: [] });
      cats.get(c.key)!.items.push(n);
    }
    const out: Group[] = [];
    for (const [ckey, { label, items }] of cats) {
      if (groupByPrefix) {
        const pref = new Map<string, string[]>();
        for (const n of items) {
          const p = prefixOf(n);
          if (!pref.has(p)) pref.set(p, []);
          pref.get(p)!.push(n);
        }
        const pinned = items.filter((n) => !!pins[n]);
        if (pinned.length) out.push({ catKey: ckey, catLabel: label + " · ★", prefix: "_pinned", items: pinned });
        for (const [p, arr] of Array.from(pref.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
          const body = arr.filter((n) => !pins[n]);
          if (body.length) out.push({ catKey: ckey, catLabel: label, prefix: p, items: body });
        }
      } else {
        const pinned = items.filter((n) => !!pins[n]);
        if (pinned.length) out.push({ catKey: ckey, catLabel: label + " · ★", items: pinned });
        const body = items.filter((n) => !pins[n]);
        if (body.length) out.push({ catKey: ckey, catLabel: label, items: body });
      }
    }
    // ordena por label e prefixo
    return out.sort((a, b) => (a.catLabel + (a.prefix ?? "")).localeCompare(b.catLabel + (b.prefix ?? "")));
  }, [filtered, groupByPrefix, pins]);

  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);
  const selectedList = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const isRunning = (name: string) => running.has(name);

  async function waitForState(name: string, targetRunning: boolean, timeoutMs = 25000, tickMs = 800) {
    const start = Date.now();
    let stable = 0;
    while (Date.now() - start < timeoutMs) {
      await fetchInfo();
      const ok = isRunning(name) === targetRunning;
      if (ok) {
        stable++;
        if (stable >= 2) return true; // 2 ticks seguidos para garantir
      } else {
        stable = 0;
      }
      await new Promise((r) => setTimeout(r, tickMs));
    }
    return false;
  }

  const rowAction = async (name: string, action: Action) => {
    try {
      setBusyRow((m) => ({ ...m, [name]: action }));
      if (action === "start") await startResource(name);
      if (action === "stop") await stopResource(name);
      if (action === "restart") await restartResource(name);

      // esperar conclusão visual
      if (action === "start") {
        const ok = await waitForState(name, true);
        push({ type: ok ? "success" : "error", msg: ok ? `START concluído: ${name}` : `START pode não ter concluído: ${name}` });
      } else if (action === "stop") {
        const ok = await waitForState(name, false);
        push({ type: ok ? "success" : "error", msg: ok ? `STOP concluído: ${name}` : `STOP pode não ter concluído: ${name}` });
      } else {
        // restart: espera ficar running
        const ok = await waitForState(name, true);
        push({ type: ok ? "success" : "error", msg: ok ? `RESTART concluído: ${name}` : `RESTART pode não ter concluído: ${name}` });
      }
    } catch (e: any) {
      push({ type: "error", msg: e?.message ?? `Falha ao executar ${action}` });
    } finally {
      setBusyRow((m) => ({ ...m, [name]: undefined }));
      setTimeout(refresh, 600);
    }
  };

  const runBulk = async (action: Action, list: string[]) => {
    if (list.length === 0) return;
    setBusy(true);
    try {
      for (const n of list) {
        setBusyRow((m) => ({ ...m, [n]: action }));
        if (action === "start") await startResource(n);
        if (action === "stop") await stopResource(n);
        if (action === "restart") await restartResource(n);
      }
      // simples: depois de enviar todos, poll geral
      const target = action === "stop" ? false : true;
      const start = Date.now();
      while (Date.now() - start < 25000) {
        await fetchInfo();
        const ok = list.every((n) => isRunning(n) === target);
        if (ok) break;
        await new Promise((r) => setTimeout(r, 900));
      }
      push({ type: "success", msg: `${action.toUpperCase()} enviado para ${list.length} recurso(s)` });
      setSelected({});
    } catch (e: any) {
      push({ type: "error", msg: e?.message ?? `Falha em operação ${action}` });
    } finally {
      setBusy(false);
      setBusyRow({});
      setTimeout(refresh, 600);
    }
  };

  const togglePin = (name: string) => setPins((prev) => {
    const next = { ...prev };
    if (next[name]) delete next[name];
    else next[name] = true;
    return next;
  });

  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2));
      push({ type: "success", msg: "Lista copiada para a área de transferência" });
    } catch { push({ type: "error", msg: "Não foi possível copiar" }); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Resources</h2>
          <p className="text-white/60 text-sm">
            {filtered.length} de {names.length} · {running.size} em execução
            {lastFetched ? <> · Atualizado há {Math.max(0, Math.floor((Date.now() - lastFetched) / 1000))}s</> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={auto}
            onChange={(e) => setAuto(Number(e.target.value))}
            className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
            title="Auto-refresh"
          >
            <option value={0}>Auto: off</option>
            <option value={5}>Auto: 5s</option>
            <option value={10}>Auto: 10s</option>
            <option value={30}>Auto: 30s</option>
          </select>
          <button
            onClick={refresh}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm inline-flex items-center gap-2"
            title="Atualizar (R)"
          >
            {loading ? <Spinner /> : "Atualizar"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <input
              ref={filterRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={useRegex ? "Regex p/ filtrar…" : "Filtrar por nome… (/ para focar)"}
              className={`flex-1 rounded-lg border ${regexErr ? "border-rose-400/50 focus:ring-rose-400/40" : "border-white/10 focus:ring-white/20"} bg-black/30 text-white px-3 py-2 outline-none focus:ring-2`}
            />
            <label className="inline-flex items-center gap-2 text-xs text-white/80 px-2">
              <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} /> Regex
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-white/80 px-2">
              <input type="checkbox" checked={groupByPrefix} onChange={(e) => setGroupByPrefix(e.target.checked)} /> Prefixo
            </label>
            <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">
              Ordenar: {sortDir.toUpperCase()}
            </button>
            <button onClick={copyJSON} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Exportar JSON</button>
          </div>

          <div className="flex items-center gap-2">
            {Object.values(selected).some(Boolean) ? (
              <>
                <Badge>{Object.values(selected).filter(Boolean).length} selecionado(s)</Badge>
                <button
                  onClick={() => runBulk("start", Object.keys(selected).filter((k) => selected[k]))}
                  className="px-3 py-2 rounded-lg bg-emerald-400/90 text-black hover:opacity-90 text-sm disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? <span className="inline-flex items-center gap-2"><Spinner />Start</span> : "Start"}
                </button>
                <button
                  onClick={() => setConfirm({ action: "restart", names: Object.keys(selected).filter((k) => selected[k]) })}
                  className="px-3 py-2 rounded-lg bg-amber-300/90 text-black hover:opacity-90 text-sm disabled:opacity-60"
                  disabled={busy}
                >
                  Restart
                </button>
                <button
                  onClick={() => setConfirm({ action: "stop", names: Object.keys(selected).filter((k) => selected[k]) })}
                  className="px-3 py-2 rounded-lg bg-rose-400/90 text-black hover:opacity-90 text-sm disabled:opacity-60"
                  disabled={busy}
                >
                  Stop
                </button>
                <button onClick={() => setSelected({})} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Limpar</button>
              </>
            ) : (
              <div className="text-sm text-white/60">Sem seleção</div>
            )}
          </div>
        </div>

        {regexErr && (
          <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Regex inválida: {regexErr}
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-white/60">
              <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
                <th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={filtered.length > 0 && filtered.every((n) => !!selected[n])}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setSelected((prev) => {
                        const next = { ...prev };
                        for (const n of filtered) next[n] = v;
                        return next;
                      });
                    }}
                  />
                </th>
                <th>Estado</th>
                <th>Resource</th>
                <th>Fav</th>
                <th className="w-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-white/90">
              {loading && filtered.length === 0 && Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/60">Sem resources.</td></tr>
              )}

              {/* render por categoria/prefixo */}
              {groups.map(({ catKey, catLabel, prefix, items }) => (
                <React.Fragment key={`${catKey}:${prefix ?? "_all"}`}>
                  <tr className="bg-white/[0.04]">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every((n) => !!selected[n])}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setSelected((prev) => {
                            const next = { ...prev };
                            for (const n of items) next[n] = v;
                            return next;
                          });
                        }}
                        aria-label={`Selecionar grupo ${catLabel}${prefix ? " - " + prefix : ""}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-white/60" colSpan={4}>
                      <span className="uppercase tracking-wide">{catLabel}</span>
                      {prefix ? <span className="text-white/40"> · {prefix}</span> : null}
                      <span className="text-white/40"> · {items.length}</span>
                    </td>
                  </tr>

                  {items.map((name) => {
                    const runningNow = isRunning(name);
                    const isSel = !!selected[name];
                    const pinned = !!pins[name];
                    const rowBusy = !!busyRow[name];

                    return (
                      <tr key={name} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={(e) => setSelected((prev) => ({ ...prev, [name]: e.target.checked }))}
                            aria-label={`Selecionar ${name}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                rowBusy
                                  ? "bg-amber-300 animate-pulse"
                                  : runningNow
                                  ? "bg-emerald-400"
                                  : "bg-white/30"
                              }`}
                              title={rowBusy ? "Em operação…" : runningNow ? "A correr" : "Parado"}
                            />
                            <span className="text-xs text-white/70">
                              {rowBusy
                                ? (busyRow[name] === "restart" ? "A reiniciar…" : busyRow[name] === "start" ? "A iniciar…" : "A parar…")
                                : runningNow ? "Running" : "Stopped"}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span title={name}>{name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className={`px-2 py-1 rounded ${pinned ? "bg-white text-black" : "bg-white/10 hover:bg-white/15"} text-xs`}
                            onClick={() => togglePin(name)}
                            title={pinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          >
                            ★
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg bg-emerald-400/90 text-black hover:opacity-90 disabled:opacity-60"
                              onClick={() => rowAction(name, "start")}
                              disabled={rowBusy}
                            >
                              {rowBusy && busyRow[name] === "start" ? <span className="inline-flex items-center gap-2"><Spinner />Start</span> : "Start"}
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg bg-amber-300/90 text-black hover:opacity-90 disabled:opacity-60"
                              onClick={() => rowAction(name, "restart")}
                              disabled={rowBusy}
                            >
                              {rowBusy && busyRow[name] === "restart" ? <span className="inline-flex items-center gap-2"><Spinner />Restart</span> : "Restart"}
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg bg-rose-400/90 text-black hover:opacity-90 disabled:opacity-60"
                              onClick={() => setConfirm({ action: "stop", names: [name] })}
                              disabled={rowBusy}
                            >
                              {rowBusy && busyRow[name] === "stop" ? <span className="inline-flex items-center gap-2"><Spinner />Stop</span> : "Stop"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-lg text-sm shadow-lg border ${
              t.type === "success"
                ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                : t.type === "error"
                ? "bg-rose-500/20 text-rose-100 border-rose-400/30"
                : "bg-white/10 text-white border-white/20"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Confirmações perigosas */}
      <Confirm
        open={!!confirm}
        title={
          confirm?.action === "stop"
            ? "Parar resource(s)?"
            : confirm?.action === "restart"
            ? "Reiniciar resource(s)?"
            : "Iniciar resource(s)?"
        }
        desc={confirm ? `Operação: ${confirm.action.toUpperCase()} · ${confirm.names.length} item(s)` : ""}
        confirmLabel={confirm?.action === "stop" ? "Parar" : confirm?.action === "restart" ? "Reiniciar" : "Iniciar"}
        onClose={() => setConfirm(null)}
        busy={busy}
        onConfirm={async () => {
          if (!confirm) return;
          await runBulk(confirm.action, confirm.names);
          setConfirm(null);
        }}
      />

      {/* Erros globais */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}
