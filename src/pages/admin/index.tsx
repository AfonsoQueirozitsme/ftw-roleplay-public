import React, { useEffect, useMemo, useState } from "react";
import { getServerDynamic } from "@/lib/api/server";

type Kpi = { label: string; value: string; diff?: number };

const KpiCard: React.FC<Kpi> = ({ label, value, diff }) => {
  const isPos = (diff ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {typeof diff === "number" && (
        <div className={`mt-2 text-xs ${isPos ? "text-emerald-300" : "text-rose-300"}`}>
          {isPos ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

const Sparkline: React.FC<{ series: number[] }> = ({ series }) => {
  const max = Math.max(...series, 1);
  return (
    <div className="h-24 w-full rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="h-full flex items-end gap-1">
        {series.map((v, i) => (
          <div key={i} className="flex-1 bg-white/70 rounded-t" style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
    </div>
  );
};

function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}

export default function Dashboard() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");

  const kpis = useMemo<Kpi[]>(
    () => [
      { label: "Utilizadores ativos", value: "1 284", diff: +6.3 },
      { label: "Sessões (hoje)", value: "3 971", diff: +2.1 },
      { label: "Taxa de erro", value: "0.28%", diff: -0.05 },
      { label: "Tempo médio sessão", value: "6m 42s", diff: +0.9 },
    ],
    []
  );

  const series = useMemo(() => {
    if (range === "24h") return [6, 8, 7, 9, 12, 11, 13, 10, 14, 15, 12, 18, 16, 19, 17, 20];
    if (range === "30d") return [8, 12, 9, 14, 11, 16, 13, 12, 18, 17, 19, 15, 22, 20, 21, 24, 23, 25, 27, 26];
    return [5, 7, 6, 9, 8, 10, 12, 9, 11, 13, 12, 15];
  }, [range]);

  // ---- FiveM dynamic.json
  const [dyn, setDyn] = useState<{ clients: number; max: number; hostname?: string } | null>(null);
  const [loadingDyn, setLoadingDyn] = useState(false);
  const [errDyn, setErrDyn] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoadingDyn(true); setErrDyn(null);
        const j = await getServerDynamic();
        const maxRaw = (j.sv_maxclients ?? j.sv_maxClients ?? j.maxclients ?? 0);
        const max = typeof maxRaw === "string" ? parseInt(maxRaw, 10) || 0 : Number(maxRaw) || 0;
        const clients = Number(j.clients ?? 0);
        if (alive) setDyn({ clients, max, hostname: j.hostname });
      } catch (e: any) {
        if (alive) setErrDyn(e?.message ?? "Falha ao obter estado do servidor");
      } finally {
        if (alive) setLoadingDyn(false);
      }
    };
    load();
    const id = setInterval(load, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Dashboard</h2>
          <p className="text-white/60 text-sm">Visão geral do sistema.</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* KPIs genéricos */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </section>

      {/* Estado do servidor (FiveM) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Sessões / tráfego</h3>
            <div className="text-xs text-white/60">sparkline</div>
          </div>
          <Sparkline series={series} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Estado do servidor</h3>
            {loadingDyn && <Spinner />}
          </div>
          {errDyn ? (
            <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{errDyn}</div>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Hostname</span>
                <span className="font-medium">{dyn?.hostname ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Online</span>
                <span className="font-medium">{dyn ? `${dyn.clients} / ${dyn.max}` : "—"}</span>
              </div>
              <div className="pt-2">
                <a
                  href="/admin/recursos"
                  className="inline-block px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
                >
                  Ver Recursos & Metas
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
