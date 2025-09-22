// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getServerDynamic,
  getServerInfo,
  listResources,
  getServerVars,
  type DynamicJson,
  type InfoJson,
} from "@/lib/api/server";

/* =========================
 * Utilitários
 * ========================= */
type LatencySample = { t: number; ms: number; ok: boolean; status?: number; error?: string };
type EndpointKey = "dynamic" | "info" | "resources" | "vars";

function percentile(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}
function fmtMs(ms: number) {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
function fmtTime(ts?: number | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString();
}
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* =========================
 * UI: Elementos base
 * ========================= */
function Badge({ ok, text }: { ok: boolean; text?: string }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        ok ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
      )}
      title={text}
    >
      <span className={classNames("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-rose-400")} />
      {text ?? (ok ? "OK" : "Erro")}
    </span>
  );
}
function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}

/* Pequeno gráfico de linhas SVG para séries de latência */
function LineChart({ points, height = 80 }: { points: number[]; height?: number }) {
  const n = points.length;
  const max = Math.max(...points, 1);
  const d = points
    .map((v, i) => {
      const x = (i / Math.max(1, n - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.9} />
    </svg>
  );
}

/* Pequeno gráfico de barras */
function Bars({ series, height = 96 }: { series: number[]; height?: number }) {
  const max = Math.max(...series, 1);
  return (
    <div className="h-24 w-full rounded-xl border border-white/10 bg-white/5 p-2" style={{ height }}>
      <div className="h-full flex items-end gap-1">
        {series.map((v, i) => (
          <div
            key={i}
            className="flex-1 bg-white/70 rounded-t"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${v}`}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================
 * Dashboard
 * ========================= */
export default function Dashboard() {
  /* Range e dados fictícios para os KPIs genéricos */
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const kpis = useMemo(
    () => [
      { label: "Utilizadores ativos", value: "1 284", diff: +6.3 },
      { label: "Sessões (hoje)", value: "3 971", diff: +2.1 },
      { label: "Taxa de erro app", value: "0,28%", diff: -0.05 },
      { label: "Tempo médio sessão", value: "6m 42s", diff: +0.9 },
    ],
    []
  );
  const trafficSeries = useMemo(() => {
    if (range === "24h") return [6, 8, 7, 9, 12, 11, 13, 10, 14, 15, 12, 18, 16, 19, 17, 20];
    if (range === "30d") return [8, 12, 9, 14, 11, 16, 13, 12, 18, 17, 19, 15, 22, 20, 21, 24, 23, 25, 27, 26];
    return [5, 7, 6, 9, 8, 10, 12, 9, 11, 13, 12, 15];
  }, [range]);

  /* Estado: FiveM dynamic + info + resources + vars */
  const [dyn, setDyn] = useState<{ clients: number; max: number; hostname?: string } | null>(null);
  const [info, setInfo] = useState<InfoJson | null>(null);
  const [vars, setVars] = useState<Record<string, any>>({});
  const [resources, setResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  /* Latências por endpoint + histórico */
  const [latHist, setLatHist] = useState<Record<EndpointKey, LatencySample[]>>({
    dynamic: [],
    info: [],
    resources: [],
    vars: [],
  });
  const maxSamples = 60; // guarda últimos 60

  /* Helper para cronometrar chamadas e guardar latência */
  async function measure<T>(key: EndpointKey, fn: () => Promise<T>): Promise<T | null> {
    const t0 = performance.now();
    try {
      const out = await fn();
      const ms = performance.now() - t0;
      setLatHist((prev) => {
        const arr = [...(prev[key] ?? []), { t: Date.now(), ms, ok: true, status: 200 }];
        return { ...prev, [key]: arr.slice(-maxSamples) };
      });
      return out;
    } catch (e: any) {
      const ms = performance.now() - t0;
      const msg = typeof e?.message === "string" ? e.message : "Erro desconhecido";
      setLatHist((prev) => {
        const arr = [...(prev[key] ?? []), { t: Date.now(), ms, ok: false, status: 500, error: msg }];
        return { ...prev, [key]: arr.slice(-maxSamples) };
      });
      setErrors((x) => [msg, ...x].slice(0, 10));
      return null;
    }
  }

  /* Polling */
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!alive) return;
      setLoading(true);
      const jDyn = await measure("dynamic", async () => {
        const j = await getServerDynamic();
        const maxRaw = (j as DynamicJson).sv_maxclients ?? (j as any).sv_maxClients ?? (j as any).maxclients ?? 0;
        const max = typeof maxRaw === "string" ? parseInt(maxRaw, 10) || 0 : Number(maxRaw) || 0;
        const clients = Number((j as DynamicJson).clients ?? 0);
        const hostname = (j as any).hostname as string | undefined;
        return { clients, max, hostname };
      });
      if (jDyn && alive) setDyn(jDyn);

      const jInfo = await measure("info", () => getServerInfo());
      if (jInfo && alive) setInfo(jInfo);

      const jVars = await measure("vars", async () => {
        const x = await getServerVars();
        return x.vars ?? {};
      });
      if (jVars && alive) setVars(jVars);

      const jRes = await measure("resources", async () => {
        const r = await listResources();
        return r.data ?? [];
      });
      if (jRes && alive) setResources(jRes);

      if (alive) {
        setLastUpdated(Date.now());
        setLoading(false);
      }
    };

    // primeira carga + intervalos
    load();
    const id = window.setInterval(load, 6000); // 6 s
    pollRef.current = id as unknown as number;

    return () => {
      alive = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* KPIs em cima de dados reais */
  const onlineStr = dyn ? `${dyn.clients} / ${dyn.max || "?"}` : "—";
  const occupancy = dyn && dyn.max > 0 ? Math.min(100, Math.round((dyn.clients / dyn.max) * 100)) : 0;
  const hostname = dyn?.hostname ?? "—";
  const resCount = resources.length;

  /* Estatísticas de latência por endpoint */
  function statsFor(key: EndpointKey) {
    const s = latHist[key] ?? [];
    const ok = s.filter((x) => x.ok).map((x) => x.ms);
    const last = s[s.length - 1];
    const p50 = percentile(ok, 50);
    const p95 = percentile(ok, 95);
    const succ = s.length ? Math.round((s.filter((x) => x.ok).length / s.length) * 100) : 0;
    return { last, p50, p95, succ, series: s.slice(-30).map((x) => x.ms) };
  }
  const S = {
    dynamic: statsFor("dynamic"),
    info: statsFor("info"),
    resources: statsFor("resources"),
    vars: statsFor("vars"),
  };

  /* Série combinada de latências (média móvel) para o gráfico global */
  const latGlobal = useMemo(() => {
    // média das últimas amostras sincronizadas
    const len = Math.max(latHist.dynamic.length, latHist.info.length, latHist.resources.length, latHist.vars.length);
    const arr: number[] = [];
    for (let i = Math.max(0, len - 30); i < len; i++) {
      const vals = [
        latHist.dynamic[i]?.ms,
        latHist.info[i]?.ms,
        latHist.resources[i]?.ms,
        latHist.vars[i]?.ms,
      ].filter((x) => typeof x === "number") as number[];
      if (vals.length) arr.push(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    return arr;
  }, [latHist]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Dashboard</h2>
          <p className="text-white/60 text-sm">
            Visão geral dos serviços e do servidor FiveM.{" "}
            <span className="ml-1 text-xs">{lastUpdated ? `Atualizado às ${fmtTime(lastUpdated)}` : ""}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Spinner />}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* KPIs genéricos (mock) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{k.value}</div>
            {"diff" in k && typeof k.diff === "number" && (
              <div className={`mt-2 text-xs ${k.diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {k.diff >= 0 ? "▲" : "▼"} {Math.abs(k.diff).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Tráfego mock + Latência Global real */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Sessões / tráfego</h3>
            <div className="text-xs text-white/60">amostra</div>
          </div>
          <Bars series={trafficSeries} height={110} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Latência global (média)</h3>
            <span className="text-xs text-white/60">{latGlobal.length ? fmtMs(latGlobal[latGlobal.length - 1]) : "—"}</span>
          </div>
          <div className="text-white/70">
            <LineChart points={latGlobal.length ? latGlobal : [0]} height={96} />
          </div>
          <p className="mt-2 text-xs text-white/60">Média das latências de dynamic, info, resources e vars (últimas 30 amostras).</p>
        </div>
      </section>

      {/* Estado do servidor (FiveM) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Estado do servidor</h3>
            <Badge ok={!!dyn} text={dyn ? "Online" : "Desconhecido"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Hostname</div>
              <div className="text-lg font-semibold">{hostname}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Jogadores online</div>
              <div className="text-lg font-semibold">{onlineStr}</div>
              <div className="mt-2 h-2 w-full rounded bg-white/10 overflow-hidden">
                <div className="h-full bg-white/70" style={{ width: `${occupancy}%` }} />
              </div>
              <div className="mt-1 text-xs text-white/60">{occupancy}% ocupação</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Recursos carregados</div>
              <div className="text-lg font-semibold">{resCount}</div>
              <div className="mt-1 text-xs text-white/60">Ver todos na área de Administração</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Ping endpoints</h3>
            {loading && <Spinner />}
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {([
              ["dynamic", S.dynamic] as const,
              ["info", S.info] as const,
              ["resources", S.resources] as const,
              ["vars", S.vars] as const,
            ]).map(([name, st]) => (
              <div key={name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge ok={!!st.last?.ok} text={st.last?.ok ? "OK" : st.last ? (st.last.error || "Erro") : "—"} />
                  <span className="text-white/80">{name}</span>
                </div>
                <div className="flex items-center gap-3 text-white/70">
                  <span className="text-xs">últ.: {st.last ? fmtMs(st.last.ms) : "—"}</span>
                  <span className="text-xs">p50: {fmtMs(st.p50)}</span>
                  <span className="text-xs">p95: {fmtMs(st.p95)}</span>
                  <span className="text-xs">{st.succ}% sucesso</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <LineChart
              points={[
                ...(S.dynamic.series.length ? [S.dynamic.series[S.dynamic.series.length - 1]] : []),
                ...(S.info.series.length ? [S.info.series[S.info.series.length - 1]] : []),
                ...(S.resources.series.length ? [S.resources.series[S.resources.series.length - 1]] : []),
                ...(S.vars.series.length ? [S.vars.series[S.vars.series.length - 1]] : []),
              ]}
              height={60}
            />
          </div>
        </div>
      </section>

      {/* Tabela detalhada de endpoints */}
      <section className="rounded-2xl border border-white/10 bg-white/5">
        <div className="p-4 flex items-center justify-between">
          <h3 className="font-semibold">Detalhe de endpoints (últimas amostras)</h3>
          <button
            onClick={() => window.location.reload()}
            className="text-xs rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2"
            title="Recarregar página"
          >
            Recarregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="px-4 py-2">Endpoint</th>
                <th className="px-4 py-2">Último</th>
                <th className="px-4 py-2">p50</th>
                <th className="px-4 py-2">p95</th>
                <th className="px-4 py-2">% Sucesso</th>
                <th className="px-4 py-2">Série</th>
                <th className="px-4 py-2">Último erro</th>
              </tr>
            </thead>
            <tbody>
              {(["dynamic", "info", "resources", "vars"] as EndpointKey[]).map((k) => {
                const st = (S as any)[k] as ReturnType<typeof statsFor>;
                const lastError = [...(latHist[k] ?? [])].reverse().find((x) => !x.ok)?.error;
                return (
                  <tr key={k} className="border-t border-white/10">
                    <td className="px-4 py-2 font-medium text-white">{k}</td>
                    <td className="px-4 py-2">{st.last ? fmtMs(st.last.ms) : "—"}</td>
                    <td className="px-4 py-2">{fmtMs(st.p50)}</td>
                    <td className="px-4 py-2">{fmtMs(st.p95)}</td>
                    <td className="px-4 py-2">{st.succ}%</td>
                    <td className="px-4 py-2 w-64">
                      <div className="text-white/70">
                        <LineChart points={st.series.length ? st.series : [0]} height={40} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-white/70">{lastError ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Últimos erros */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Últimos erros (API)</h3>
          <span className="text-xs text-white/60">{errors.length} registos</span>
        </div>
        {errors.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">Sem erros recentes.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {errors.map((e, i) => (
              <li key={i} className="rounded border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-200">
                {e}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
