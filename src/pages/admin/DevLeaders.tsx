// src/pages/Leaderboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getLeaderboard, type LeaderRow } from "@/lib/api/leaderboard";

const cx = (...c:(string|false|null|undefined)[])=>c.filter(Boolean).join(" ");

function Podium({ rows }: { rows: LeaderRow[] }) {
  const [first, second, third] = rows;
  const Card = ({ r, place }:{ r?: LeaderRow; place: 1|2|3 }) => {
    if (!r) return <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 h-40" />;
    const h = place === 1 ? "h-48" : place === 2 ? "h-44" : "h-40";
    const crown = place === 1 ? "👑" : place === 2 ? "🥈" : "🥉";
    return (
      <div className={cx("flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 grid", h)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center text-sm">
            {r.display_name?.slice(0,2).toUpperCase() ?? "??"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{r.display_name ?? r.user_id.slice(0,6)}</div>
            <div className="text-xs text-white/60">{r.hours_total} h · {r.tasks_done} tarefas</div>
          </div>
          <div className="ml-auto text-xl">{crown}</div>
        </div>
        <div className="mt-auto">
          <div className="text-xs text-white/60">Minutos</div>
          <div className="text-2xl font-bold">{r.minutes_total}</div>
        </div>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card r={second} place={2} />
      <Card r={first} place={1} />
      <Card r={third} place={3} />
    </div>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<"week"|"month"|"all">("week");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { setLoading(true); setErr(null);
        const d = await getLeaderboard(period, 100);
        if (alive) setRows(d);
      } catch (e:any) { if (alive) setErr(e?.message ?? "Falha ao carregar ranking"); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [period]);

  const [top3, rest] = useMemo(() => [rows.slice(0,3), rows.slice(3)], [rows]);

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white p-4 md:p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leaderboard de Staff</h1>
          <p className="text-sm text-white/60">Horas de trabalho (clock) e tarefas concluídas — {period==="week"?"semana atual":period==="month"?"este mês":"sempre"}.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e=>setPeriod(e.target.value as any)}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="week">Semana</option>
            <option value="month">Mês</option>
            <option value="all">Sempre</option>
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {loading && <div className="text-white/70">A carregar…</div>}
        {err && <div className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-200">{err}</div>}

        {!loading && !err && (
          <>
            <Podium rows={top3} />

            <section className="rounded-2xl border border-white/10 bg-white/5">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold">Tabela completa</h2>
                <div className="text-xs text-white/60">Top {rows.length}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-white/60">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Staff</th>
                      <th className="px-4 py-2">Horas</th>
                      <th className="px-4 py-2">Tarefas</th>
                      <th className="px-4 py-2">Ranking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((r, i) => (
                      <tr key={r.user_id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-2">{i+4}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs">
                              {(r.display_name ?? r.user_id).slice(0,2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{r.display_name ?? r.user_id}</div>
                              <div className="text-xs text-white/60 truncate">{r.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-36 h-2 rounded bg-white/10 overflow-hidden">
                              <div className="h-full bg-white/70" style={{ width: `${Math.min(100, (r.hours_total/ (top3[0]?.hours_total||1)) * 100)}%` }} />
                            </div>
                            <span>{r.hours_total} h</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">{r.tasks_done}</td>
                        <td className="px-4 py-2 text-xs text-white/70">
                          horas: #{r.rank_hours} · tarefas: #{r.rank_tasks}
                        </td>
                      </tr>
                    ))}
                    {rest.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-white/60">Sem dados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
