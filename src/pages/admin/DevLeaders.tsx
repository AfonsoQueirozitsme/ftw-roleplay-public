// src/pages/Leaderboard.tsx
// Estilo gamificado com pódio animado (Framer Motion), ícones lucide, confetti e
// nomes “limpos” (remove domínio do email). Mantém a tua API getLeaderboard.

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Medal, Flame, Sparkles, Star, Zap } from "lucide-react";
import { getLeaderboard, type LeaderRow } from "@/lib/api/leaderboard";

const cx = (...c:(string|false|null|undefined)[])=>c.filter(Boolean).join(" ");

/* Utils */
function prettyName(s?: string | null, fallback?: string) {
  if (!s || s.trim().length === 0) return fallback ?? "—";
  const base = s.includes("@") ? s.split("@")[0] : s;
  return base;
}
function pct(val: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (val / max) * 100));
}

/* Confetti simpático em emoji (sem libs extra) */
function ConfettiBurst({ run }: { run: boolean }) {
  if (!run) return null;
  const pieces = Array.from({ length: 26 });
  const emojis = ["✨", "🎉", "⭐️", "💫", "🎊", "⚡️"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 0.9 + Math.random() * 0.6;
        const rotate = (Math.random() * 140 - 70).toFixed(0);
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        return (
          <motion.div
            key={i}
            initial={{ y: -40, opacity: 0, rotate: 0 }}
            animate={{ y: "100vh", opacity: [0,1,1,0], rotate }}
            transition={{ duration, delay, ease: "easeOut" }}
            className="absolute text-2xl"
            style={{ left: `${left}%` }}
          >
            {emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

/* Podium super gamificado */
function Podium({ rows }: { rows: LeaderRow[] }) {
  const [first, second, third] = rows;

  const Card = ({
    r,
    place,
  }: {
    r?: LeaderRow;
    place: 1 | 2 | 3;
  }) => {
    const height = place === 1 ? "h-56" : place === 2 ? "h-48" : "h-44";
    const grad =
      place === 1
        ? "from-yellow-300/25 to-amber-500/10 border-amber-300/40"
        : place === 2
        ? "from-zinc-200/25 to-slate-500/10 border-zinc-200/40"
        : "from-orange-300/25 to-rose-500/10 border-orange-300/40";
    const crown = place === 1 ? <Crown className="h-6 w-6" /> : place === 2 ? <Medal className="h-6 w-6" /> : <Trophy className="h-6 w-6" />;

    return (
      <motion.div
        layout
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16, delay: place * 0.05 }}
        className={cx(
          "flex-1 rounded-3xl border p-4 grid relative overflow-hidden",
          "bg-gradient-to-b",
          grad,
          height
        )}
      >
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-3">
          <div className={cx(
            "h-12 w-12 rounded-full grid place-items-center text-sm font-semibold",
            "bg-white/15 ring-2 ring-white/20 backdrop-blur"
          )}>
            {(r?.display_name ? prettyName(r.display_name) : r?.user_id)?.slice(0,2).toUpperCase() ?? "??"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {prettyName(r?.display_name, r?.user_id?.slice(0, 6))}
            </div>
            <div className="text-xs text-white/70">
              {r?.hours_total ?? 0} h · {r?.tasks_done ?? 0} tarefas
            </div>
          </div>
          <div className="ml-auto text-yellow-300 drop-shadow">{crown}</div>
        </div>

        <div className="mt-auto">
          <div className="text-[11px] text-white/60">Minutos</div>
          <div className="text-3xl font-black tracking-tight">{r?.minutes_total ?? 0}</div>
        </div>

        <div className="absolute left-3 top-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
          {place === 1 ? "1º" : place === 2 ? "2º" : "3º"}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const d = await getLeaderboard(period, 100);
        if (!alive) return;
        setRows(d);
        // confetti sempre que trocas de período e há top1
        if (d.length > 0) {
          setConfetti(true);
          setTimeout(() => setConfetti(false), 1200);
        }
      } catch (e:any) {
        if (alive) setErr(e?.message ?? "Falha ao carregar ranking");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [period]);

  const [top3, rest] = useMemo(() => [rows.slice(0,3), rows.slice(3)], [rows]);
  const maxHours = useMemo(() => Math.max(...rows.map(r => Number(r.hours_total) || 0), 1), [rows]);

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white p-4 md:p-6">
      <AnimatePresence>{confetti && <ConfettiBurst run />}</AnimatePresence>

      {/* Header gamificado */}
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Leaderboard de Staff</h1>
            <p className="text-sm text-white/60">
              Horas de trabalho (clock) + tarefas concluídas — {period==="week"?"semana atual":period==="month"?"este mês":"sempre"}.
            </p>
          </div>
        </div>

        {/* Selector com botões tipo “segmented” */}
        <div className="inline-flex items-center rounded-xl overflow-hidden border border-white/10 bg-white/5">
          {(["week","month","all"] as const).map((p) => (
            <button
              key={p}
              onClick={()=>setPeriod(p)}
              className={cx(
                "px-3 py-2 text-sm hover:bg-white/10 transition",
                period===p && "bg-white text-black"
              )}
              title={p==="week"?"Semana":p==="month"?"Mês":"Sempre"}
            >
              {p==="week"?"Semana":p==="month"?"Mês":"Sempre"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse" /> A carregar…
          </div>
        )}
        {err && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {err}
          </div>
        )}

        {!loading && !err && (
          <>
            {/* Pódio */}
            <Podium rows={top3} />

            {/* Destaques rápidos */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-300" />
                <div>
                  <div className="text-xs text-white/60">Maior carga horária</div>
                  <div className="text-lg font-semibold">
                    {top3[0] ? `${prettyName(top3[0].display_name, top3[0].user_id)} · ${top3[0].hours_total} h` : "—"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-300" />
                <div>
                  <div className="text-xs text-white/60">Mais tarefas concluídas</div>
                  <div className="text-lg font-semibold">
                    {rows.slice().sort((a,b)=>b.tasks_done-a.tasks_done)[0]
                      ? `${prettyName(rows.slice().sort((a,b)=>b.tasks_done-a.tasks_done)[0].display_name, rows[0].user_id)} · ${rows.slice().sort((a,b)=>b.tasks_done-a.tasks_done)[0].tasks_done}` 
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                <Zap className="h-5 w-5 text-sky-300" />
                <div>
                  <div className="text-xs text-white/60">Participantes</div>
                  <div className="text-lg font-semibold">{rows.length}</div>
                </div>
              </div>
            </section>

            {/* Tabela gamificada (lista) */}
            <section className="rounded-2xl border border-white/10 bg-white/5">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold">Tabela completa</h2>
                <div className="text-xs text-white/60">Top {rows.length}</div>
              </div>

              <div className="p-3 space-y-2">
                {rows.map((r, i) => {
                  const name = prettyName(r.display_name, r.user_id);
                  const percent = pct(Number(r.hours_total) || 0, maxHours);
                  const medal =
                    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                  return (
                    <motion.div
                      key={r.user_id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.12) }}
                      className={cx(
                        "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2",
                        i < 3 && "ring-1 ring-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cx(
                          "h-8 w-8 rounded-full grid place-items-center text-xs font-semibold",
                          i===0 ? "bg-yellow-300/30 text-yellow-100" :
                          i===1 ? "bg-zinc-200/30 text-zinc-100" :
                          i===2 ? "bg-orange-300/30 text-orange-100" :
                                  "bg-white/10 text-white/80"
                        )}>
                          {(name).slice(0,2).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium truncate">{name}</div>
                            {medal && <span className="text-lg leading-none">{medal}</span>}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                              #{i+1}
                            </span>
                          </div>

                          {/* Barra de horas (normalizada ao topo) */}
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 h-2 rounded bg-white/10 overflow-hidden">
                              <div
                                className={cx(
                                  "h-full",
                                  i===0 ? "bg-gradient-to-r from-yellow-300 to-amber-400" :
                                  i===1 ? "bg-gradient-to-r from-zinc-200 to-slate-400" :
                                  i===2 ? "bg-gradient-to-r from-orange-300 to-red-400" :
                                          "bg-white/70"
                                )}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="text-xs text-white/70 whitespace-nowrap">
                              {r.hours_total} h
                            </div>
                          </div>

                          <div className="mt-1 text-[11px] text-white/60">
                            Tarefas: <b>{r.tasks_done}</b> · Horas: <b>#{r.rank_hours}</b> · Tarefas: <b>#{r.rank_tasks}</b>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {rows.length === 0 && (
                  <div className="px-4 py-6 text-center text-white/60">Sem dados.</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
