// src/admin/DevWork.tsx
// Board multi-coluna com scroll horizontal, modos de agrupamento (Estado / Atribuído / Prioridade),
// regras: Head Dev controla tudo; só Head atribui; Dev só vê as suas tarefas;
// Clock in/renew/stop apenas nas tarefas atribuídas (ou se fores Head).
// Drawer com detalhes/edição. Som modular + toasts + debug opcional.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  listTasks, createTask, updateTask, assignTask,
  getMyActiveSession, clockStart, clockRenew, clockStop,
  type DevTask, type Session
} from "@/lib/api/dev";
import { sound } from "@/lib/sound";

const cx = (...c:(string|false|null|undefined)[])=>c.filter(Boolean).join(" ");

type UserMini = { id: string; name: string };
type Assignee = { user_id: string };

const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "Em curso" },
  { key: "blocked", label: "Bloqueado" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluído" },
] as const;
const PRIORITIES: Array<DevTask["priority"]> = ["low","normal","high","urgent"];

function Spinner() { return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />; }

function useIsHead() {
  const [isHead, set] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return set(false);
      const { data } = await supabase.from("staff_perms").select("perms").eq("user_id", user.id).maybeSingle();
      const perms: string[] = data?.perms ?? [];
      set(perms.includes("ftw.management.all") || perms.includes("ftw.dev.head"));
    })();
  }, []);
  return isHead;
}

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

/* ——— Helpers ——— */
const myName = (s?: string|null) => (s?.split("@")[0] ?? "—");
const initials = (s?: string|null) =>
  (s?.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,2).map(x=>x[0]).join("") || "??").toUpperCase();

/* ——— Componente principal ——— */
export default function DevWork() {
  const isHead = useIsHead();
  const { logs, push } = useLogs();
  const { toasts, show } = useToasts();

  // sessão + identidade
  const [uid, setUid] = useState<string|null>(null);
  const [email, setEmail] = useState<string|null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => {
    setUid(data.user?.id ?? null);
    setEmail(data.user?.email ?? null);
  }); }, []);

  // utilizadores atribuíveis (apenas para Head)
  const [users, setUsers] = useState<UserMini[]>([]);
  useEffect(() => {
    (async () => {
      // tenta profiles → se falhar, cai para staff_perms (só id)
      try {
        const { data, error } = await supabase.from("profiles").select("user_id, display_name").limit(500);
        if (!error && data) {
          setUsers(data.map((r:any)=>({ id:r.user_id, name: r.display_name || r.user_id.slice(0,6) })));
          return;
        }
      } catch {}
      try {
        const { data } = await supabase.from("staff_perms").select("user_id").limit(500);
        setUsers((data ?? []).map((r:any)=>({ id:r.user_id, name: r.user_id.slice(0,6) })));
      } catch { setUsers([]); }
    })();
  }, []);

  // tarefas
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<"status"|"assignee"|"priority">("status");

  async function refreshTasks(tag="refreshTasks") {
    setLoadingTasks(true); setErr(null);
    const t0 = performance.now();
    try {
      const res = await listTasks();
      let list = res.data;
      // Dev (não Head) só vê o que lhe está atribuído
      if (!isHead && uid) {
        list = list.filter(t => (t.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid));
      }
      setTasks(list);
      push("info", tag, "tarefas carregadas", { count: list.length, ms: Math.round(performance.now()-t0) });
    } catch (e:any) {
      setErr(e?.message ?? "Falha a carregar tarefas");
      push("error", tag, "falha a carregar", e);
    } finally {
      setLoadingTasks(false);
    }
  }
  useEffect(() => { refreshTasks(); }, [isHead, uid]);

  // esforço por tarefa (view dev_task_effort)
  type EffortRow = { task_id: string; user_id: string; minutes_total: number };
  const [effort, setEffort] = useState<Record<string, { totalMin: number; myMin: number }>>({});
  useEffect(() => {
    (async () => {
      if (tasks.length === 0) { setEffort({}); return; }
      const ids = tasks.map(t => t.id);
      const { data, error } = await supabase.from("dev_task_effort").select("*").in("task_id", ids);
      if (error) { setEffort({}); return; }
      const byTask: Record<string, { totalMin: number; myMin: number }> = {};
      (data as EffortRow[]).forEach(r => {
        byTask[r.task_id] ||= { totalMin: 0, myMin: 0 };
        byTask[r.task_id].totalMin += r.minutes_total;
        if (r.user_id === uid) byTask[r.task_id].myMin += r.minutes_total;
      });
      setEffort(byTask);
    })();
  }, [tasks, uid]);

  // filtro por texto
  const visibleTasks = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(t =>
      t.title.toLowerCase().includes(s) ||
      (t.description ?? "").toLowerCase().includes(s)
    );
  }, [tasks, q]);

  // agrupamentos → colunas
  type Col = { key: string; title: string; filter: (t:DevTask)=>boolean };
  const columns: Col[] = useMemo(() => {
    if (groupBy === "status") {
      return STATUSES.map(s => ({
        key: `status:${s.key}`,
        title: s.label,
        filter: (t:DevTask) => t.status === s.key,
      }));
    }
    if (groupBy === "priority") {
      return PRIORITIES.map(p => ({
        key: `prio:${p}`,
        title: `Prioridade: ${p}`,
        filter: (t:DevTask) => (t.priority ?? "normal") === p,
      }));
    }
    // groupBy assignee
    if (isHead) {
      // Head: todas as pessoas + “Sem atribuição”
      const cols: Col[] = [
        { key: "ass:none", title: "Sem atribuição", filter: (t:DevTask) => (t.dev_task_assignees ?? []).length === 0 },
        ...users.map(u => ({
          key: `ass:${u.id}`,
          title: myName(u.name),
          filter: (t:DevTask) => (t.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===u.id),
        })),
      ];
      return cols;
    }
    // Dev: só a sua coluna
    return [{
      key: `ass:${uid ?? "me"}`,
      title: "As minhas tarefas",
      filter: (t:DevTask) => (t.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid),
    }];
  }, [groupBy, isHead, users, uid]);

  // estado do drawer
  const [openId, setOpenId] = useState<string|null>(null);
  const openTask = visibleTasks.find(t => t.id === openId) || null;

  // criação de tarefa (só Head)
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<DevTask["priority"]>("normal");
  const [newMaxH, setNewMaxH] = useState<number>(0);
  async function onCreateTask() {
    if (!newTitle.trim()) return show("err","Título obrigatório");
    try {
      const { data } = await createTask({ title: newTitle.trim(), description: newDesc, priority: newPriority, max_hours: newMaxH });
      setNewOpen(false); setNewTitle(""); setNewDesc(""); setNewMaxH(0);
      setTasks(prev => [data, ...prev]); sound.play("success"); show("ok","Tarefa criada");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha a criar"); }
  }

  // ——— Clock ———
  const [session, setSession] = useState<Session|null>(null);
  const [report, setReport] = useState("");
  const [forecast, setForecast] = useState("");
  const [tick, setTick] = useState(0);

  const nextDue = useMemo(() => {
    if (!session) return null;
    const base = new Date(session.last_renewal_at || session.started_at).getTime();
    return new Date(base + 30 * 60 * 1000);
  }, [session]);
  const overdueMs = useMemo(() => !nextDue ? 0 : Date.now() - nextDue.getTime(), [nextDue, tick]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await getMyActiveSession();
      if (!mounted) return;
      setSession(r.session);
    })();
    const id = setInterval(() => setTick(v => v+1), 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);
  useEffect(() => {
    if (!session || !nextDue) return;
    if (nextDue.getTime() - Date.now() <= 0) sound.play("ping");
  }, [nextDue, tick, session]);

  const autoClosedRef = useRef(false);
  useEffect(() => {
    if (!session || autoClosedRef.current) return;
    if (Math.floor(overdueMs/60000) >= 15) {
      autoClosedRef.current = true;
      clockStop(session.id).then(({ session: s }) => {
        setSession(s); show("info","Sessão terminou por inatividade (>15m)");
      }).catch(()=>{});
    }
  }, [overdueMs, session]);

  function pctToNext(): number {
    if (!session || !nextDue) return 0;
    const last = new Date(session.last_renewal_at || session.started_at).getTime();
    const total = 30 * 60 * 1000;
    const done = Math.min(total, Math.max(0, Date.now() - last));
    return Math.round((done / total) * 100);
  }

  async function startClock(task: DevTask) {
    const mine = (task.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid);
    if (!isHead && !mine) { show("err","Não podes dar clock: tarefa não é tua"); return; }
    try {
      const { session } = await clockStart(task.id);
      setSession(session); setReport(""); setForecast(""); sound.play("success"); show("ok","Clock iniciado");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao iniciar"); }
  }
  async function renewClock() {
    if (!session) return;
    try {
      const onTime = nextDue ? Math.abs(Date.now() - nextDue.getTime()) <= 2*60*1000 : false;
      const { session: s } = await clockRenew(session.id, report.trim(), forecast.trim());
      setSession(s); setReport(""); setForecast("");
      sound.play(onTime ? "success" : "ping");
      show(onTime ? "ok" : "info", onTime ? "Renovação em tempo" : "Renovação fora da janela");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao renovar"); }
  }
  async function stopClock() {
    if (!session) return;
    try {
      const { session: s } = await clockStop(session.id, report.trim() ? report.trim() : undefined);
      setSession(s); setReport(""); setForecast(""); sound.play("success"); show("ok","Clock terminado");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao terminar"); }
  }

  // ——— UI ———
  return (
    <div className="space-y-6">
      <Toasts items={toasts} />

      {/* Topbar */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Gestão de Trabalho dos Devs</h2>
          <p className="text-white/60 text-sm">Board com estados, atribuições e prioridades · clock a cada 30 minutos.</p>
          {email && <div className="text-[11px] text-white/40 mt-1">Sessão: {myName(email)}</div>}
        </div>
        <div className="flex items-center gap-2">
          <select value={groupBy} onChange={e=>setGroupBy(e.target.value as any)}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="status">Agrupar por Estado</option>
            <option value="assignee">Agrupar por Atribuído</option>
            <option value="priority">Agrupar por Prioridade</option>
          </select>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filtrar…"
                 className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 outline-none text-sm" />
          {/* Som */}
          <label className="text-xs flex items-center gap-2 ml-2">
            <input type="checkbox" defaultChecked={sound.muted} onChange={(e)=>sound.setMuted(e.target.checked)} />
            Sem som
          </label>
          <input aria-label="Volume" type="range" min={0} max={1} step={0.05}
                 defaultValue={sound.volume} onChange={(e)=>sound.setVolume(Number(e.target.value))}
                 className="w-24" />
          {isHead && (
            <button onClick={()=>setNewOpen(true)} className="px-3 py-2 rounded-lg bg-white text-black text-sm">Nova Tarefa</button>
          )}
        </div>
      </header>

      {/* Clock card */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Clock</div>
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
          <div className="mt-3 text-sm text-white/70">Sem sessão ativa.</div>
        ) : (
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <div className="text-sm space-y-2">
              <div><span className="text-white/60">Tarefa:</span> <strong>{tasks.find(t=>t.id===session.task_id)?.title ?? session.task_id}</strong></div>
              <div><span className="text-white/60">Início:</span> {new Date(session.started_at).toLocaleString()}</div>
              <div><span className="text-white/60">Última renovação:</span> {new Date(session.last_renewal_at).toLocaleString()}</div>
              <div><span className="text-white/60">Próxima:</span> {nextDue?.toLocaleTimeString() ?? "—"}</div>
              <div><span className="text-white/60">Total (m):</span> {session.minutes_total}</div>
              <div className={cx("text-xs", Math.floor(overdueMs/60000) >= 15 ? "text-rose-300":"text-white/60")}>
                {nextDue ? (overdueMs>0 ? `⚠ Atraso: ${Math.floor(overdueMs/60000)}m` : `Faltam: ${Math.max(0, Math.floor((nextDue.getTime()-Date.now())/60000))}m`) : "—"}
              </div>
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
            </div>
          </div>
        )}
      </section>

      {/* Board: colunas horizontais */}
      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
        <div className="min-w-[920px] flex gap-3 p-3">
          {columns.map(col => {
            const items = visibleTasks.filter(col.filter);
            return (
              <div key={col.key} className="w-[min(360px,88vw)] shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{col.title}</h4>
                  <span className="text-xs text-white/60">{items.length}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {items.map(t => {
                    const mine = (t.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid);
                    const eff = effort[t.id] || { totalMin: 0, myMin: 0 };
                    const totalH = Math.round((eff.totalMin/60) * 100) / 100;
                    const myH = Math.round((eff.myMin/60) * 100) / 100;
                    const maxH = Number(t.max_hours ?? 0);
                    const pct = maxH > 0 ? Math.min(100, Math.round((totalH / maxH) * 100)) : 0;
                    const over = maxH > 0 && totalH > maxH;

                    return (
                      <article key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <button className="text-left w-full" onClick={()=>setOpenId(t.id)} title="Abrir detalhes">
                          <div className="font-medium truncate">{t.title}</div>
                          {t.description && <div className="text-xs text-white/60 mt-1 line-clamp-2">{t.description}</div>}
                        </button>
                        {/* Progresso vs max_hours */}
                        {maxH > 0 && (
                          <div className="mt-2">
                            <div className="w-full h-2 rounded bg-white/10 overflow-hidden">
                              <div className={cx("h-full", over ? "bg-rose-300" : "bg-white/70")} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-1 text-[11px] text-white/70">
                              {totalH} / {maxH} h {over && <span className="ml-1 text-rose-300 font-medium">• excedido</span>}
                              {myH > 0 && <span className="ml-2 opacity-80">(tu: {myH} h)</span>}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-white/10">prio: {t.priority ?? "normal"}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/10">estado: {t.status}</span>
                          {mine && <span className="px-2 py-0.5 rounded-full bg-white/10">👤 tua</span>}
                          {t.status === "done" && <span className="px-2 py-0.5 rounded-full bg-emerald-300/20 text-emerald-200">✔ concluída</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={()=>startClock(t)}
                            disabled={(!isHead && !mine) || t.status==="done"}
                            className={cx("px-2 py-1 rounded text-xs",
                              ((!isHead && !mine) || t.status==="done") ? "bg-white/5 text-white/40 cursor-not-allowed"
                                                                        : "bg-white text-black hover:opacity-90")}
                          >
                            Clock
                          </button>
                          {isHead && (
                            <button
                              onClick={async ()=>{
                                const ns = prompt("Novo estado: backlog|in_progress|blocked|review|done", t.status) as DevTask["status"]|null;
                                if (!ns) return;
                                try { await updateTask(t.id, { status: ns }); await refreshTasks("moveStatus"); sound.play("success"); show("ok", "Estado atualizado"); }
                                catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a mover"); }
                              }}
                              className="px-2 py-1 rounded bg-white/10 text-xs border border-white/10"
                            >Mover</button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {items.length===0 && <div className="text-xs text-white/60">Sem tarefas.</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Drawer Detalhes */}
      {openTask && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={()=>setOpenId(null)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-[min(92vw,560px)] bg-[#0b0b0c] border-l border-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tarefa</h3>
              <button onClick={()=>setOpenId(null)} className="px-2 py-1 rounded bg-white/10">Fechar</button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-white/60">Título</label>
                <input
                  defaultValue={openTask.title}
                  onBlur={async (e)=>{
                    const val = e.target.value.trim();
                    if (val && val !== openTask.title) {
                      try { await updateTask(openTask.id, { title: val }); sound.play("success"); show("ok","Título atualizado"); await refreshTasks("updTitle"); }
                      catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar título"); }
                    }
                  }}
                  className="w-full rounded-lg bg-black/30 border border-white/10 p-2 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Descrição</label>
                <textarea
                  defaultValue={openTask.description ?? ""}
                  rows={4}
                  onBlur={async (e)=>{
                    try { await updateTask(openTask.id, { description: e.target.value }); sound.play("success"); show("ok","Descrição atualizada"); await refreshTasks("updDesc"); }
                    catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar descrição"); }
                  }}
                  className="w-full rounded-lg bg-black/30 border border-white/10 p-2 outline-none"
                />
              </div>

              {/* Estado & Prioridade */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-white/60">Estado</label>
                  <select
                    defaultValue={openTask.status}
                    onChange={async (e)=>{
                      try { await updateTask(openTask.id, { status: e.target.value as DevTask["status"] }); sound.play("success"); show("ok","Estado atualizado"); await refreshTasks("updStatus"); }
                      catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar estado"); }
                    }}
                    className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2"
                  >
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60">Prioridade</label>
                  <select
                    defaultValue={openTask.priority ?? "normal"}
                    onChange={async (e)=>{
                      try { await updateTask(openTask.id, { priority: e.target.value as DevTask["priority"] }); sound.play("success"); show("ok","Prioridade atualizada"); await refreshTasks("updPrio"); }
                      catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar prioridade"); }
                    }}
                    className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Max horas */}
              <div>
                <label className="text-xs text-white/60">Horas máx</label>
                <input
                  type="number" min={0} step={0.5} defaultValue={Number(openTask.max_hours ?? 0)}
                  onBlur={async (e)=>{
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    try { await updateTask(openTask.id, { max_hours: v }); sound.play("success"); show("ok","Horas máx atualizadas"); await refreshTasks("updMax"); }
                    catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar"); }
                  }}
                  className="w-full rounded-lg bg-black/30 border border-white/10 p-2 outline-none"
                />
              </div>

              {/* Atribuições (só Head) */}
              <div>
                <label className="text-xs text-white/60">Atribuições</label>
                {isHead ? (
                  <div className="mt-1 space-y-2">
                    <div className="text-xs text-white/60">Seleciona para alternar (adiciona/remove)</div>
                    <div className="flex flex-wrap gap-2">
                      {users.map(u => {
                        const has = (openTask.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===u.id);
                        return (
                          <button
                            key={u.id}
                            onClick={async ()=>{
                              try {
                                await assignTask(openTask.id, u.id, has ? "remove" : "add");
                                sound.play("success");
                                await refreshTasks("assignToggle");
                              } catch (e:any) { sound.play("error"); show("err","Falha a atribuir"); }
                            }}
                            className={cx("px-2 py-1 rounded border text-xs",
                              has ? "bg-white text-black border-white" : "bg-white/10 border-white/10")
                            }
                          >
                            {myName(u.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm">
                    {(openTask.dev_task_assignees ?? []).length === 0
                      ? <span className="text-white/60">Sem atribuição</span>
                      : <div className="flex flex-wrap gap-1">
                          {(openTask.dev_task_assignees ?? []).map((a:Assignee) => {
                            const u = users.find(x => x.id === a.user_id);
                            return <span key={a.user_id} className="px-2 py-0.5 rounded bg-white/10 text-xs">{myName(u?.name ?? a.user_id)}</span>;
                          })}
                        </div>
                    }
                  </div>
                )}
              </div>

              {/* Ações rápidas */}
              <div className="flex items-center gap-2">
                <button
                  onClick={()=>startClock(openTask)}
                  disabled={(!isHead && !(openTask.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid)) || openTask.status==="done"}
                  className={cx("px-3 py-2 rounded-lg text-sm",
                    ((!isHead && !(openTask.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid)) || openTask.status==="done")
                      ? "bg-white/5 text-white/40 cursor-not-allowed"
                      : "bg-white text-black")}
                >
                  Clock nesta tarefa
                </button>
                {session && session.task_id === openTask.id && (
                  <>
                    <button onClick={renewClock} className="px-3 py-2 rounded-lg bg-white text-black text-sm">Renovar</button>
                    <button onClick={stopClock} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Terminar</button>
                  </>
                )}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Debug opcional */}
      <section className="rounded-2xl border border-white/10 bg-white/5">
        <details>
          <summary className="cursor-pointer px-4 py-2 text-sm text-white/70 hover:text-white">Debug (abrir)</summary>
          <div className="p-4 grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 p-3">
              <div className="font-semibold mb-2">Sessão</div>
              <pre className="text-xs whitespace-pre-wrap break-words opacity-90">{JSON.stringify(session, null, 2)}</pre>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <div className="font-semibold mb-2">Timers</div>
              <div>nextDue: {nextDue?.toISOString() ?? "—"}</div>
              <div>overdueMs: {overdueMs}</div>
              <div>pctToNext: {pctToNext()}%</div>
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

      {/* Modal Nova Tarefa (Head) */}
      {newOpen && isHead && (
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
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
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
