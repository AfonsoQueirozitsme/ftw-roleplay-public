// src/admin/DevWork.tsx
// UX fluída, regras corretas (só podes dar clock em tarefas atribuídas a ti ou se fores gestão),
// som modular, debug visível, toasts, progresso vs horas máx e autoclose > 15m.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  listTasks, createTask, updateTask, assignTask,
  getMyActiveSession, clockStart, clockRenew, clockStop,
  type DevTask, type Session
} from "@/lib/api/dev";
import { sound } from "@/lib/sound";

const cx = (...c: (string|false|null|undefined)[]) => c.filter(Boolean).join(" ");
const statuses = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "Em curso" },
  { key: "blocked", label: "Bloqueado" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluído" },
] as const;

function Spinner() { return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />; }

// ———————————————————————————————————————————————————————————————————————————
// Permissões
function useIsManager() {
  const [isMgr, set] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return set(false);
      const { data } = await supabase.from("staff_perms").select("perms").eq("user_id", user.id).maybeSingle();
      const perms: string[] = data?.perms ?? [];
      set(perms.includes("ftw.management.all") || perms.includes("ftw.dev.head"));
    })();
  }, []);
  return isMgr;
}

// ———————————————————————————————————————————————————————————————————————————
// Debug & Toasts
type LogEntry = { ts: string; level: "info"|"warn"|"error"; where: string; msg: string; extra?: any };
function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  function push(level: LogEntry["level"], where: string, msg: string, extra?: any) {
    const e: LogEntry = { ts: new Date().toISOString(), level, where, msg, extra };
    setLogs(l => [e, ...l].slice(0, 200));
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[${where}] ${msg}`, extra ?? "");
  }
  return { logs, push };
}

function useToasts() {
  const [toasts, setToasts] = useState<{ id:number; kind:"ok"|"err"|"info"; text:string }[]>([]);
  const seq = useRef(1);
  function show(kind: "ok"|"err"|"info", text: string, ms = 2500) {
    const id = seq.current++;
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }
  return { toasts, show };
}

function Toasts({ items }:{items:{id:number;kind:"ok"|"err"|"info";text:string}[]}) {
  return (
    <div className="fixed right-3 bottom-3 z-50 space-y-2 w-[min(92vw,360px)]">
      {items.map(t => (
        <div key={t.id}
             className={cx("rounded-xl px-3 py-2 text-sm shadow border",
               t.kind==="ok" && "bg-emerald-500/15 border-emerald-500/30 text-emerald-100",
               t.kind==="err" && "bg-rose-500/15 border-rose-500/30 text-rose-100",
               t.kind==="info" && "bg-white/10 border-white/15 text-white")}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ———————————————————————————————————————————————————————————————————————————
// Esforço por tarefa (view dev_task_effort)
type EffortRow = { task_id: string; user_id: string; minutes_total: number };

// ———————————————————————————————————————————————————————————————————————————
// Página
export default function DevWork() {
  const isMgr = useIsManager();
  const { logs, push } = useLogs();
  const { toasts, show } = useToasts();

  // Identidade
  const [uid, setUid] = useState<string|null>(null);
  const [email, setEmail] = useState<string|null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => {
    setUid(data.user?.id ?? null);
    setEmail(data.user?.email ?? null);
  }); }, []);

  // ===== Tasks =====
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [filter, setFilter] = useState<string>("");
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  // esforço (total & meu)
  const [effort, setEffort] = useState<Record<string, { totalMin: number; myMin: number }>>({});

  async function refreshTasks(tag = "refreshTasks") {
    const t0 = performance.now();
    setLoadingTasks(true); setErr(null);
    try {
      const res = await listTasks();
      setTasks(res.data);
      push("info", tag, "tarefas carregadas", { count: res.data.length, ms: Math.round(performance.now()-t0) });
    } catch (e:any) {
      setErr(e?.message ?? "Falha a carregar tarefas");
      push("error", tag, "falha a carregar tarefas", e);
      show("err", "Falha a carregar tarefas");
    } finally {
      setLoadingTasks(false);
    }
  }
  useEffect(() => { refreshTasks(); }, []);

  // carregar esforço (view dev_task_effort)
  async function reloadEffort(tag = "reloadEffort") {
    if (tasks.length === 0) { setEffort({}); return; }
    const t0 = performance.now();
    const ids = tasks.map(t => t.id);
    const { data, error } = await supabase.from("dev_task_effort").select("*").in("task_id", ids);
    if (error) {
      push("warn", tag, "falha a carregar esforço", error);
      return setEffort({});
    }
    const byTask: Record<string, { totalMin: number; myMin: number }> = {};
    (data as EffortRow[]).forEach(r => {
      byTask[r.task_id] ||= { totalMin: 0, myMin: 0 };
      byTask[r.task_id].totalMin += r.minutes_total;
      if (r.user_id === uid) byTask[r.task_id].myMin += r.minutes_total;
    });
    setEffort(byTask);
    push("info", tag, "esforço carregado", { tasks: Object.keys(byTask).length, ms: Math.round(performance.now()-t0) });
  }
  useEffect(() => { reloadEffort(); }, [tasks, uid]);

  const canWorkOn = (t: DevTask) => {
    const mine = (t.dev_task_assignees ?? []).some(a => a.user_id === uid);
    return isMgr || mine;
  };

  const filteredTasks = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return tasks.filter(t => {
      if (onlyMine && !canWorkOn(t)) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    });
  }, [tasks, filter, onlyMine, isMgr, uid]);

  const grouped = useMemo(() => {
    const base: Record<string, DevTask[]> = Object.fromEntries(statuses.map(s => [s.key, []]));
    filteredTasks.forEach(t => (base[t.status] ||= []).push(t));
    return base;
  }, [filteredTasks]);

  // Criar tarefa
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<DevTask["priority"]>("normal");
  const [newMaxH, setNewMaxH] = useState<number>(0);

  async function onCreateTask() {
    if (!newTitle.trim()) return alert("Título obrigatório");
    try {
      const t0 = performance.now();
      const { data } = await createTask({ title: newTitle.trim(), description: newDesc, priority: newPriority, max_hours: newMaxH });
      setNewOpen(false); setNewTitle(""); setNewDesc(""); setNewMaxH(0);
      setTasks(prev => [data, ...prev]);
      await reloadEffort("createTask->reloadEffort");
      push("info", "createTask", "tarefa criada", { id: data.id, ms: Math.round(performance.now()-t0) });
      sound.play("success"); show("ok", "Tarefa criada");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao criar"); push("error", "createTask", "falha", e); }
  }

  // Atribuir (quick)
  async function toggleAssign(task: DevTask, me: string) {
    const assigned = (task.dev_task_assignees ?? []).some(a => a.user_id === me);
    const verb = assigned ? "remove" : "add";
    const t0 = performance.now();
    try {
      await assignTask(task.id, me, verb);
      push("info", "assignTask", `${verb} OK`, { task: task.id, user: me, ms: Math.round(performance.now()-t0) });
      show("ok", assigned ? "Removido da tarefa" : "Atribuído à tarefa");
      sound.play("success");
      await refreshTasks("assignTask->refreshTasks");
    } catch (e:any) {
      push("error", "assignTask", "falhou", e);
      show("err", "Falha ao atribuir"); sound.play("error");
    }
  }

  // ===== Clock =====
  const [session, setSession] = useState<Session|null>(null);
  const [report, setReport] = useState("");
  const [forecast, setForecast] = useState("");
  const [tick, setTick] = useState(0);

  // gamificação: combo de renovações “em tempo”
  const [combo, setCombo] = useState<number>(() => Number(localStorage.getItem("dw:combo") || 0));
  const [bestCombo, setBestCombo] = useState<number>(() => Number(localStorage.getItem("dw:best") || 0));

  const nextDue = useMemo(() => {
    if (!session) return null;
    const base = new Date(session.last_renewal_at || session.started_at).getTime();
    return new Date(base + 30 * 60 * 1000);
  }, [session]);

  const overdueMs = useMemo(() => {
    if (!nextDue) return 0;
    return Date.now() - nextDue.getTime();
  }, [nextDue, tick]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await getMyActiveSession();
      if (!mounted) return;
      setSession(r.session);
      if (r.session) push("info", "boot", "sessão ativa detectada", r.session);
    })();
    const id = setInterval(() => setTick(v => v+1), 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // aviso sonoro no zero
  useEffect(() => {
    if (!session || !nextDue) return;
    const now = Date.now();
    const diff = nextDue.getTime() - now;
    if (diff <= 0) sound.play("ping");
  }, [nextDue, tick, session]);

  // autoclose no UI (o backend também fecha com cron)
  const autoClosedRef = useRef(false);
  useEffect(() => {
    if (!session || autoClosedRef.current) return;
    const overdueMin = Math.floor(overdueMs/60000);
    if (overdueMin >= 15) {
      autoClosedRef.current = true;
      clockStop(session.id).then(({ session: s }) => {
        setSession(s);
        show("info", "Sessão terminou por inatividade (> 15m)");
        push("warn", "auto-close", "sessão terminada por inatividade", s);
      }).catch(e => {
        push("error", "auto-close", "falha a terminar", e);
      });
    }
  }, [overdueMs, session, push, show]);

  async function startClock(task_id: string) {
    try {
      const task = tasks.find(t => t.id === task_id);
      if (!task) return show("err", "Tarefa não encontrada");
      if (!canWorkOn(task)) {
        show("err", "Não podes dar clock: tarefa não está atribuída a ti");
        return;
      }
      const t0 = performance.now();
      const { session } = await clockStart(task_id);
      setSession(session);
      setReport(""); setForecast("");
      setCombo(0); localStorage.setItem("dw:combo", "0");
      autoClosedRef.current = false;
      await reloadEffort("startClock->reloadEffort");
      push("info", "startClock", "iniciado", { task_id, ms: Math.round(performance.now()-t0) });
      sound.play("success"); show("ok", "Sessão iniciada");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao iniciar"); push("error", "startClock", "falha", e); }
  }

  async function renewClock() {
    if (!session) return;
    try {
      // janela “em tempo”: de 2 min antes a 2 min depois do due
      let onTime = false;
      if (nextDue) {
        const delta = Date.now() - nextDue.getTime(); // + = atrasado
        onTime = Math.abs(delta) <= 2*60*1000;
      }
      const t0 = performance.now();
      const { session: s } = await clockRenew(session.id, report.trim(), forecast.trim());
      setSession(s); setReport(""); setForecast("");
      await reloadEffort("renewClock->reloadEffort");
      if (onTime) {
        const c = combo + 1;
        setCombo(c); localStorage.setItem("dw:combo", String(c));
        if (c > bestCombo) { setBestCombo(c); localStorage.setItem("dw:best", String(c)); }
        sound.play("success"); show("ok", `Renovação registada (combo ${combo+1})`);
      } else {
        setCombo(0); localStorage.setItem("dw:combo", "0");
        sound.play("ping"); show("info", "Renovação fora da janela");
      }
      push("info", "renewClock", "renovado", { ms: Math.round(performance.now()-t0), onTime });
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao renovar"); push("error", "renewClock", "falha", e); }
  }

  async function stopClock() {
    if (!session) return;
    try {
      const t0 = performance.now();
      const { session: s } = await clockStop(session.id, report.trim() ? report.trim() : undefined);
      setSession(s); setReport(""); setForecast(""); setCombo(0); localStorage.setItem("dw:combo", "0");
      await reloadEffort("stopClock->reloadEffort");
      push("info", "stopClock", "terminado", { ms: Math.round(performance.now()-t0) });
      sound.play("success"); show("ok", "Sessão terminada");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao terminar"); push("error", "stopClock", "falha", e); }
  }

  // UI helpers
  function pctToNext(): number {
    if (!session || !nextDue) return 0;
    const last = new Date(session.last_renewal_at || session.started_at).getTime();
    const total = 30 * 60 * 1000;
    const done = Math.min(total, Math.max(0, Date.now() - last));
    return Math.round((done / total) * 100);
  }

  // ———————————————————————————————————————————————————————————————————————————
  return (
    <div className="space-y-6">
      <Toasts items={toasts} />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Gestão de Trabalho dos Devs</h2>
          <p className="text-white/60 text-sm">Tarefas, anexos e relógio com renovação a cada 30 minutos.</p>
          {email && <div className="text-[11px] text-white/40 mt-1">Sessão: {email}</div>}
        </div>
        <div className="flex items-center gap-3">
          {/* Som */}
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" defaultChecked={sound.muted} onChange={(e)=>sound.setMuted(e.target.checked)} />
            Sem som
          </label>
          <input aria-label="Volume" type="range" min={0} max={1} step={0.05}
                 defaultValue={sound.volume} onChange={(e)=>sound.setVolume(Number(e.target.value))}
                 className="w-28" />
          {/* Filtros */}
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)} />
            Só as minhas
          </label>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar…"
                 className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 outline-none" />
          {isMgr && (
            <button onClick={()=>setNewOpen(true)} className="px-3 py-2 rounded-lg bg-white text-black text-sm">Nova Tarefa</button>
          )}
        </div>
      </div>

      {/* Clock */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Clock</h3>
            {session && (
              <div className="text-xs flex items-center gap-2">
                <span className={cx("px-2 py-0.5 rounded-full",
                  Math.floor(overdueMs/60000) >= 15 ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
                )}>
                  {Math.floor(overdueMs/60000) >= 15 ? "Atraso > 15m (pode fechar)" : "Sessão ativa"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10">Combo: <b>{combo}</b> · Melhor: <b>{bestCombo}</b></span>
              </div>
            )}
          </div>
          {session && (
            <div title="Progresso até à próxima renovação (30m)"
                 className="h-8 w-8 rounded-full"
                 style={{
                   background: `conic-gradient(white ${pctToNext()}%, rgba(255,255,255,0.15) ${pctToNext()}%)`,
                   WebkitMask: "radial-gradient(circle at center, transparent 55%, #000 56%)",
                   mask: "radial-gradient(circle at center, transparent 55%, #000 56%)",
                 }}
            />
          )}
        </div>

        {!session ? (
          <div className="mt-3">
            <label className="text-sm text-white/70">Inicia numa tarefa atribuída a ti:</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredTasks.filter(t => canWorkOn(t) && t.status !== "done").slice(0, 24).map(t => (
                <button key={t.id} onClick={()=>startClock(t.id)}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">
                  {t.title}
                </button>
              ))}
              {filteredTasks.every(t => !canWorkOn(t)) && (
                <div className="text-xs text-white/50">Não tens tarefas atribuídas. Atribui-te numa tarefa para começares.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <div className="text-sm space-y-2">
              <div><span className="text-white/60">Tarefa:</span> <strong>{tasks.find(t=>t.id===session.task_id)?.title ?? session.task_id}</strong></div>
              <div><span className="text-white/60">Início:</span> {new Date(session.started_at).toLocaleString()}</div>
              <div><span className="text-white/60">Última renovação:</span> {new Date(session.last_renewal_at).toLocaleString()}</div>
              <div><span className="text-white/60">Próxima renovação:</span> {nextDue?.toLocaleTimeString() ?? "—"}</div>
              <div><span className="text-white/60">Total (m):</span> {session.minutes_total}</div>
              <div className="text-white/60">Estado: {session.ended_at ? "terminada" : "ativa"}</div>
            </div>
            <div>
              <label className="text-xs text-white/60">Relatório (últimos 30 min)</label>
              <textarea value={report} onChange={e=>setReport(e.target.value)} rows={3}
                        className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2 outline-none" />
              <label className="text-xs text-white/60 mt-2 block">Previsão (próximos 30 min)</label>
              <textarea value={forecast} onChange={e=>setForecast(e.target.value)} rows={2}
                        className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2 outline-none" />
              <div className="mt-2 flex items-center gap-2">
                <button onClick={renewClock} className="px-3 py-2 rounded-lg bg-white text-black text-sm">Renovar</button>
                <button onClick={stopClock} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Terminar</button>
              </div>
              <div className={cx("mt-2 text-xs", overdueMs>0 ? "text-rose-300" : "text-white/60")}>
                {nextDue ? (overdueMs>0 ? `⚠ Atraso: ${Math.floor(overdueMs/60000)}m ${Math.floor((overdueMs%60000)/1000)}s` :
                  `Faltam: ${Math.floor((nextDue.getTime()-Date.now())/60000)}m`) : "—"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Kanban */}
      <section className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {statuses.map(col => (
          <div key={col.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{col.label}</h4>
              <span className="text-xs text-white/60">{(grouped[col.key] ?? []).length}</span>
            </div>
            <div className="mt-2 space-y-2">
              {(grouped[col.key] ?? []).map(t => {
                const mine = (t.dev_task_assignees ?? []).some(a => a.user_id === uid);
                const eff = effort[t.id] || { totalMin: 0, myMin: 0 };
                const totalH = Math.round((eff.totalMin/60) * 100) / 100;
                const myH = Math.round((eff.myMin/60) * 100) / 100;
                const maxH = Number(t.max_hours ?? 0);
                const pct = maxH > 0 ? Math.min(100, Math.round((totalH / maxH) * 100)) : 0;
                const over = maxH > 0 && totalH > maxH;

                const startDisabled = !(isMgr || mine) || t.status === "done";
                const startTitle = startDisabled
                  ? (t.status === "done" ? "Tarefa concluída" : "Atribui-te a esta tarefa para iniciar o clock")
                  : "Iniciar clock nesta tarefa";

                return (
                  <article key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="font-medium">{t.title}</div>
                    {t.description && <div className="text-xs text-white/60 mt-1 line-clamp-3">{t.description}</div>}

                    {/* Progresso vs max_hours */}
                    {maxH > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-2 rounded bg-white/10 overflow-hidden">
                          <div className={cx("h-full", over ? "bg-rose-300" : "bg-white/70")} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-white/70">
                          Progresso: {totalH} / {maxH} h {over && <span className="ml-1 text-rose-300 font-medium">• excedido</span>}
                          {myH > 0 && <span className="ml-2 opacity-80">(tu: {myH} h)</span>}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {uid && (
                        <button onClick={()=>toggleAssign(t, uid)}
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs">
                          {mine ? "Remover de mim" : "Atribuir a mim"}
                        </button>
                      )}
                      <button
                        onClick={()=>startClock(t.id)}
                        disabled={startDisabled}
                        title={startTitle}
                        className={cx("px-2 py-1 rounded text-xs",
                          startDisabled ? "bg-white/5 text-white/40 cursor-not-allowed"
                                        : "bg-white text-black hover:opacity-90")}
                      >
                        Clock nesta tarefa
                      </button>
                      {isMgr && (
                        <button onClick={async ()=>{
                          const ns = prompt("Novo estado: backlog|in_progress|blocked|review|done", t.status) as DevTask["status"]|null;
                          if (!ns) return;
                          try { await updateTask(t.id, { status: ns }); await refreshTasks("moveStatus->refreshTasks"); sound.play("success"); show("ok", "Estado atualizado"); }
                          catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha a mover"); push("error","moveStatus","falha",e); }
                        }} className="px-2 py-1 rounded bg-white/10 text-xs border border-white/10">Mover</button>
                      )}
                      {/* badges */}
                      {pct >= 100 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-300/20 text-amber-200">🏅 meta atingida</span>}
                      {t.status === "done" && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-300/20 text-emerald-200">✔ concluída</span>}
                      {mine && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10">👤 tua</span>}
                    </div>
                  </article>
                );
              })}
              {loadingTasks && <div className="text-xs text-white/60"><Spinner /> A carregar…</div>}
              {err && <div className="text-xs text-rose-300">{err}</div>}
            </div>
          </div>
        ))}
      </section>

      {/* Debug */}
      <section className="rounded-2xl border border-white/10 bg-white/5">
        <details>
          <summary className="cursor-pointer px-4 py-2 text-sm text-white/70 hover:text-white">Debug (abre para ver logs, sessão e métricas)</summary>
          <div className="p-4 grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 p-3">
              <div className="font-semibold mb-2">Sessão atual</div>
              <pre className="text-xs whitespace-pre-wrap break-words opacity-90">{JSON.stringify(session, null, 2)}</pre>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <div className="font-semibold mb-2">Timers</div>
              <div>tick: {tick}</div>
              <div>nextDue: {nextDue?.toISOString() ?? "—"}</div>
              <div>overdueMs: {overdueMs}</div>
              <div>pctToNext: {pctToNext()}%</div>
              <div>combo: {combo} / best: {bestCombo}</div>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <div className="font-semibold mb-2">Logs ({logs.length})</div>
              <div className="max-h-56 overflow-auto text-xs space-y-2">
                {logs.slice(0,50).map((l,i)=>(
                  <div key={i} className={cx("rounded p-2",
                    l.level==="error" && "bg-rose-500/10",
                    l.level==="warn" && "bg-amber-500/10",
                    l.level==="info" && "bg-white/5",
                  )}>
                    <div className="opacity-60">{l.ts} • {l.level} • {l.where}</div>
                    <div>{l.msg}</div>
                    {l.extra && <pre className="opacity-80 whitespace-pre-wrap break-words">{JSON.stringify(l.extra, null, 2)}</pre>}
                  </div>
                ))}
                {logs.length===0 && <div className="opacity-60">Sem logs.</div>}
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Modal Nova Tarefa */}
      {newOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
          <div className="w-[min(92vw,640px)] rounded-2xl border border-white/10 bg-[#0b0b0c] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nova Tarefa</h3>
              <button onClick={()=>setNewOpen(false)} className="px-2 py-1 rounded bg-white/10">Fechar</button>
            </div>
            <div className="mt-3 space-y-3">
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Título"
                     className="w-full rounded-lg bg-black/30 border border-white/10 p-2 outline-none" />
              <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} rows={4} placeholder="Descrição"
                        className="w-full rounded-lg bg-black/30 border border-white/10 p-2 outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-white/60">Prioridade</label>
                  <select value={newPriority} onChange={e=>setNewPriority(e.target.value as any)}
                          className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2">
                    <option value="low">low</option>
                    <option value="normal">normal</option>
                    <option value="high">high</option>
                    <option value="urgent">urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60">Horas máx</label>
                  <input type="number" min={0} step={0.5} value={newMaxH} onChange={e=>setNewMaxH(Number(e.target.value))}
                         className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={()=>setNewOpen(false)} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Cancelar</button>
                <button onClick={onCreateTask} className="px-3 py-2 rounded-lg bg-white text-black">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
