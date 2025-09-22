// src/admin/DevWork.tsx
// Board melhorado: scroll horizontal só no board, clock com cache local/restore,
// picker de utilizadores, UI gamificada, drag-and-drop entre estados, quick-select,
// progress bar do clock e layout que não sai da viewport.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  listTasks, createTask, updateTask, assignTask,
  getMyActiveSession, clockStart, clockRenew, clockStop,
  type DevTask, type Session
} from "@/lib/api/dev";
import { listStaffUsers, type StaffUser } from "@/lib/api/dev";
import { sound } from "@/lib/sound";

const cx = (...c:(string|false|null|undefined)[])=>c.filter(Boolean).join(" ");

const STATUSES = [
  { key: "backlog", label: "Backlog", emoji: "📝" },
  { key: "in_progress", label: "Em curso", emoji: "🚧" },
  { key: "blocked", label: "Bloqueado", emoji: "⛔" },
  { key: "review", label: "Revisão", emoji: "🔎" },
  { key: "done", label: "Concluído", emoji: "✅" },
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
type Assignee = { user_id: string };

function useToasts() {
  const [toasts, setToasts] = useState<{ id:number; kind:"ok"|"err"|"info"; text:string }[]>([]);
  const seq = useRef(1);
  function show(kind: "ok"|"err"|"info", text: string, ms = 2400) {
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

const initials = (s?: string|null) =>
  (s?.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,2).map(x=>x[0]).join("") || "??").toUpperCase();
const shortName = (s?: string|null) => (s?.includes("@") ? s.split("@")[0] : (s ?? "—"));

/* ——— User Picker (para Head) ——— */
function useDebounce<T>(val:T, ms=250) {
  const [v, setV] = useState(val);
  useEffect(()=>{ const id=setTimeout(()=>setV(val), ms); return ()=>clearTimeout(id); }, [val, ms]);
  return v;
}
function UserPicker({
  value, onToggle, myself,
}:{
  value: { id: string; name: string }[];
  onToggle: (u: StaffUser, has: boolean)=>Promise<void>|void;
  myself?: string|null;
}) {
  const [q, setQ] = useState("");
  const dQ = useDebounce(q, 250);
  const [opts, setOpts] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await listStaffUsers(dQ, 100);
        if (!live) return;
        setOpts(rows);
      } finally { if (live) setLoading(false); }
    })();
    return () => { live=false; };
  }, [dQ]);

  return (
    <div className="rounded-xl border border-white/10 p-2 bg-white/5">
      <div className="flex items-center gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Procurar utilizadores…"
               className="flex-1 rounded-lg bg-black/30 border border-white/10 px-2 py-1 outline-none text-sm" />
        {loading ? <Spinner/> : <span className="text-xs text-white/50">{opts.length}</span>}
      </div>
      <div className="mt-2 max-h-48 overflow-auto space-y-1">
        {opts.map(u => {
          const has = value.some(v => v.id === u.id);
          return (
            <button key={u.id}
              onClick={()=>onToggle(u, has)}
              className={cx("w-full text-left px-2 py-1 rounded-lg text-sm flex items-center gap-2",
                has ? "bg-white text-black" : "bg-white/10 hover:bg-white/15"
              )}>
              <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[10px]">
                {initials(u.name || u.email || u.id)}
              </div>
              <div className="truncate">{shortName(u.name || u.email) }</div>
              {myself===u.id && <span className="ml-auto text-[10px] opacity-60">tu</span>}
            </button>
          );
        })}
        {opts.length===0 && !loading && <div className="text-xs text-white/50 px-1 py-2">Sem resultados.</div>}
      </div>
    </div>
  );
}

/* ——— Componente principal ——— */
export default function DevWork() {
  const isHead = useIsHead();
  const { toasts, show } = useToasts();

  // identidade
  const [uid, setUid] = useState<string|null>(null);
  const [email, setEmail] = useState<string|null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => {
    setUid(data.user?.id ?? null);
    setEmail(data.user?.email ?? null);
  }); }, []);

  // tarefas
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<"status"|"assignee"|"priority">("status");

  async function refreshTasks() {
    setLoadingTasks(true); setErr(null);
    try {
      const res = await listTasks();
      let t = res.data;
      // dev normal só vê as suas
      if (!isHead && uid) t = t.filter(T => (T.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid));
      setTasks(t);
    } catch (e:any) {
      setErr(e?.message ?? "Falha a carregar tarefas");
    } finally { setLoadingTasks(false); }
  }
  useEffect(() => { refreshTasks(); }, [isHead, uid]);

  // esforço (view)
  type EffortRow = { task_id: string; user_id: string; minutes_total: number };
  const [effort, setEffort] = useState<Record<string, { totalMin: number; myMin: number }>>({});
  useEffect(() => {
    (async () => {
      if (tasks.length === 0) { setEffort({}); return; }
      const ids = tasks.map(t => t.id);
      const { data } = await supabase.from("dev_task_effort").select("*").in("task_id", ids);
      const by: Record<string, { totalMin: number; myMin: number }> = {};
      (data as EffortRow[] ?? []).forEach(r => {
        by[r.task_id] ||= { totalMin: 0, myMin: 0 };
        by[r.task_id].totalMin += r.minutes_total;
        if (r.user_id === uid) by[r.task_id].myMin += r.minutes_total;
      });
      setEffort(by);
    })();
  }, [tasks, uid]);

  // filtro texto
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(t => t.title.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s));
  }, [tasks, q]);

  // colunas (assignee/status/priority)
  type Col = { key: string; title: string; emoji?: string; filter: (t:DevTask)=>boolean };
  const [allUsers, setAllUsers] = useState<StaffUser[]>([]);
  useEffect(() => { if (isHead) listStaffUsers("",200).then(setAllUsers).catch(()=>{}); }, [isHead]);
  const columns: Col[] = useMemo(() => {
    if (groupBy === "status") {
      return STATUSES.map(s => ({ key:`st:${s.key}`, title:s.label, emoji:s.emoji, filter: (t)=>t.status===s.key }));
    }
    if (groupBy === "priority") {
      return PRIORITIES.map(p => ({ key:`pr:${p}`, title:`Prioridade: ${p}`, filter:(t)=> (t.priority??"normal")===p }));
    }
    if (isHead) {
      const cols: Col[] = [{ key:"ass:none", title:"Sem atribuição", filter:(t)=> (t.dev_task_assignees??[]).length===0 }];
      for (const u of allUsers) {
        cols.push({ key:`ass:${u.id}`, title: shortName(u.name||u.email)||u.id.slice(0,6), filter:(t)=> (t.dev_task_assignees??[]).some(a=>a.user_id===u.id) });
      }
      return cols;
    }
    return [{ key:`ass:me`, title:"As minhas tarefas", filter:(t)=> (t.dev_task_assignees??[]).some(a=>a.user_id===uid) }];
  }, [groupBy, isHead, allUsers, uid]);

  // criação (Head)
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

  // drawer
  const [openId, setOpenId] = useState<string|null>(null);
  const openTask = visible.find(t => t.id === openId) || null;

  // CLOCK ——— persistência local
  const [session, setSession] = useState<Session|null>(null);
  const [draftReport, setDraftReport] = useState("");
  const [draftForecast, setDraftForecast] = useState("");
  const [tick, setTick] = useState(0);
  const [reconciling, setReconciling] = useState(false);

  // load from server + cache
  useEffect(() => {
    let live = true;
    (async () => {
      const local = localStorage.getItem("dw:session");
      const localObj: Session|undefined = local ? JSON.parse(local) : undefined;

      const r = await getMyActiveSession().catch(()=>({ session:null }));
      if (!live) return;

      if (r.session) {
        setSession(r.session);
        localStorage.setItem("dw:session", JSON.stringify(r.session));
        const key = `dw:draft:${r.session.id}`;
        const d = JSON.parse(localStorage.getItem(key) || "{}");
        setDraftReport(d.report ?? "");
        setDraftForecast(d.forecast ?? "");
      } else if (localObj?.id) {
        setSession(localObj);
        setReconciling(true);
        const key = `dw:draft:${localObj.id}`;
        const d = JSON.parse(localStorage.getItem(key) || "{}");
        setDraftReport(d.report ?? "");
        setDraftForecast(d.forecast ?? "");
        let tries = 0;
        const poll = setInterval(async () => {
          tries++;
          const rr = await getMyActiveSession().catch(()=>({ session:null }));
          if (rr.session || tries > 12) {
            clearInterval(poll);
            setReconciling(false);
            if (rr.session) {
              setSession(rr.session);
              localStorage.setItem("dw:session", JSON.stringify(rr.session));
            } else {
              setSession(null);
              localStorage.removeItem("dw:session");
            }
          }
        }, 10000);
      } else {
        setSession(null);
      }
    })();
    const id = setInterval(()=>setTick(v=>v+1), 1000);
    return ()=>{ live=false; clearInterval(id); };
  }, []);

  // persist drafts
  useEffect(() => {
    const sid = session?.id;
    if (!sid) return;
    const key = `dw:draft:${sid}`;
    const payload = { report: draftReport, forecast: draftForecast };
    localStorage.setItem(key, JSON.stringify(payload));
  }, [draftReport, draftForecast, session?.id]);

  const nextDue = useMemo(() => {
    if (!session) return null;
    const base = new Date(session.last_renewal_at || session.started_at).getTime();
    return new Date(base + 30*60*1000);
  }, [session]);
  const totalMs = 30*60*1000;
  const elapsedMs = useMemo(() => {
    if (!session) return 0;
    const base = new Date(session.last_renewal_at || session.started_at).getTime();
    return Math.min(totalMs, Math.max(0, Date.now() - base));
  }, [session, tick]);
  const overdueMs = useMemo(() => !nextDue ? 0 : Date.now() - nextDue.getTime(), [nextDue, tick]);

  useEffect(() => {
    if (!session || !nextDue) return;
    if (nextDue.getTime() - Date.now() <= 0) sound.play("ping");
  }, [nextDue, tick, session]);

  const pctToNext = Math.round((elapsedMs/totalMs)*100);
  const remainMs = Math.max(0, totalMs - elapsedMs);
  const mm = String(Math.floor(remainMs/60000)).padStart(2,"0");
  const ss = String(Math.floor((remainMs%60000)/1000)).padStart(2,"0");

  async function startClock(task: DevTask) {
    const mine = (task.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid);
    if (!isHead && !mine) { show("err","Não podes dar clock: tarefa não é tua"); return; }
    try {
      const { session } = await clockStart(task.id);
      setSession(session); setDraftReport(""); setDraftForecast("");
      localStorage.setItem("dw:session", JSON.stringify(session));
      sound.play("success"); show("ok","Clock iniciado");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao iniciar"); }
  }
  async function renewClock() {
    if (!session) return;
    try {
      const onTime = nextDue ? Math.abs(Date.now()-nextDue.getTime()) <= 2*60*1000 : false;
      const { session: s } = await clockRenew(session.id, draftReport.trim(), draftForecast.trim());
      setSession(s); setDraftReport(""); setDraftForecast("");
      localStorage.setItem("dw:session", JSON.stringify(s));
      sound.play(onTime ? "success" : "ping");
      show(onTime ? "ok" : "info", onTime ? "Renovação em tempo" : "Renovação fora da janela");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao renovar"); }
  }
  async function stopClock() {
    if (!session) return;
    try {
      const { session: s } = await clockStop(session.id, draftReport.trim() ? draftReport.trim() : undefined);
      setSession(s);
      localStorage.setItem("dw:session", JSON.stringify(s));
      sound.play("success"); show("ok","Clock terminado");
    } catch (e:any) { sound.play("error"); show("err", e?.message ?? "Falha ao terminar"); }
  }

  // ——— Drag & Drop (status only) ———
  const [dragId, setDragId] = useState<string|null>(null);
  const [dragCol, setDragCol] = useState<string|null>(null);
  const isStatusGrouping = groupBy === "status";
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOverCol(e: React.DragEvent, colKey: string) {
    if (!isStatusGrouping || !dragId) return;
    e.preventDefault();
    setDragCol(colKey);
  }
  async function onDropCol(e: React.DragEvent, colKey: string) {
    if (!isStatusGrouping) return;
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragCol(null); setDragId(null);
    if (!id) return;
    const t = tasks.find(x=>x.id===id);
    if (!t) return;
    const mine = (t.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid);
    if (!(isHead || mine)) { show("err","Sem permissão para mover esta tarefa"); return; }
    const newStatus = colKey.startsWith("st:") ? (colKey.slice(3) as DevTask["status"]) : t.status;
    if (newStatus === t.status) return;
    try {
      await updateTask(t.id, { status: newStatus });
      setTasks(prev => prev.map(p => p.id===t.id ? { ...p, status: newStatus } : p));
      sound.play("success"); show("ok","Estado atualizado");
    } catch (e:any) {
      sound.play("error"); show("err", e?.message ?? "Falha ao mover");
    }
  }

  // quick status select (sem prompt)
  function QuickStatus({ task }: { task: DevTask }) {
    const mine = (task.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid);
    const can = isHead || mine;
    return (
      <select
        aria-label="Alterar estado"
        disabled={!can}
        value={task.status}
        onChange={async (e)=>{
          const ns = e.target.value as DevTask["status"];
          try {
            await updateTask(task.id, { status: ns });
            setTasks(prev => prev.map(p => p.id===task.id ? { ...p, status: ns } : p));
            sound.play("success"); show("ok","Estado atualizado");
          } catch (err:any) { sound.play("error"); show("err", err?.message ?? "Falha ao atualizar estado"); }
        }}
        className={cx("px-2 py-1 rounded text-[11px] border",
          can ? "bg-white/10 border-white/20" : "bg-white/5 text-white/40 cursor-not-allowed")}
      >
        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    );
  }

  // ——— UI ———
  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex flex-col gap-4">
      <Toasts items={toasts} />

      {/* GAMIFIED HEADER (fixo) */}
      <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-600/20 via-fuchsia-600/20 to-rose-600/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white text-black grid place-items-center font-bold">
            {initials(shortName(email))}
          </div>
          <div>
            <div className="font-semibold">{shortName(email)}</div>
            <div className="text-xs text-white/70">Painel de Trabalho · {isHead ? "Head Dev" : "Dev"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={groupBy} onChange={e=>setGroupBy(e.target.value as any)}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="status">Por Estado</option>
            <option value="assignee">Por Atribuído</option>
            <option value="priority">Por Prioridade</option>
          </select>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filtrar…"
                 className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 outline-none text-sm" />
          {isHead && (
            <button onClick={()=>setNewOpen(true)} className="px-3 py-2 rounded-lg bg-white text-black text-sm">+ Nova</button>
          )}
        </div>
      </header>

      {/* CLOCK (fixo, dentro da viewport, sem scroll horizontal) */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2">⏱️ Clock {reconciling && <span className="text-xs text-amber-300">· a reconciliar…</span>}</div>
          {session && (
            <div
              title="Progresso até à próxima renovação (30m)"
              className="h-8 w-8 rounded-full"
              style={{
                background: `conic-gradient(white ${pctToNext}%, rgba(255,255,255,0.15) ${pctToNext}%)`,
                WebkitMask: "radial-gradient(circle at center, transparent 55%, #000 56%)",
                mask: "radial-gradient(circle at center, transparent 55%, #000 56%)",
              }}
            />
          )}
        </div>

        {/* Barra linear do clock + tempo restante */}
        {session && (
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${pctToNext}%` }} />
            </div>
            <div className="mt-1 text-xs text-white/70">Faltam: <b>{mm}:{ss}</b></div>
          </div>
        )}

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
              <textarea value={draftReport} onChange={e=>setDraftReport(e.target.value)} rows={3}
                        className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2 outline-none" />
              <label className="text-xs text-white/60 mt-2 block">Previsão (próximos 30 min)</label>
              <textarea value={draftForecast} onChange={e=>setDraftForecast(e.target.value)} rows={2}
                        className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2 outline-none" />
              <div className="mt-2 flex items-center gap-2">
                <button onClick={renewClock} className="px-3 py-2 rounded-lg bg-white text-black text-sm">Renovar</button>
                <button onClick={stopClock} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Terminar</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* BOARD — só o board tem scroll horizontal, fica dentro da viewport */}
      <section
        className="rounded-2xl border border-white/10 bg-white/5 flex-1 min-h-0"
        style={{ /* ocupa o resto do ecrã; só o interior scrolla horizontalmente */
          display: "flex", flexDirection: "column"
        }}
      >
        <div className="overflow-x-auto overflow-y-hidden flex-1">
          <div className="min-w-[980px] flex gap-3 p-3 snap-x snap-mandatory h-full">
            {columns.map(col => {
              const items = visible.filter(col.filter);
              const isDropHot = isStatusGrouping && dragCol === col.key;
              return (
                <div key={col.key}
                     onDragOver={(e)=>onDragOverCol(e, col.key)}
                     onDrop={(e)=>onDropCol(e, col.key)}
                     className={cx(
                       "w-[320px] md:w-[360px] shrink-0 snap-start rounded-2xl border bg-white/[0.03] p-3 flex flex-col",
                       "border-white/10",
                       isDropHot && "border-white/40 bg-white/[0.06]"
                     )}
                     style={{ height: "100%" }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span>{("emoji" in col ? (col as any).emoji : undefined) ?? "📦"}</span>{col.title}
                    </h4>
                    <span className="text-xs text-white/60">{items.length}</span>
                  </div>

                  <div className="mt-2 space-y-2 overflow-y-auto pr-1" style={{ flex: 1 }}>
                    {items.map(t => {
                      const mine = (t.dev_task_assignees ?? []).some((a:Assignee)=>a.user_id===uid);
                      const eff = effort[t.id] || { totalMin: 0, myMin: 0 };
                      const totalH = Math.round((eff.totalMin/60) * 100) / 100;
                      const myH = Math.round((eff.myMin/60) * 100) / 100;
                      const maxH = Number(t.max_hours ?? 0);
                      const pct = maxH > 0 ? Math.min(100, Math.round((totalH / maxH) * 100)) : 0;
                      const over = maxH > 0 && totalH > maxH;

                      return (
                        <article
                          key={t.id}
                          draggable={isStatusGrouping && (isHead || mine)}
                          onDragStart={(e)=>onDragStart(e, t.id)}
                          className={cx(
                            "rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-3 hover:border-white/20 transition",
                            dragId===t.id && "opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <button className="text-left w-full" onClick={()=>setOpenId(t.id)} title="Abrir detalhes">
                              <div className="font-medium truncate">{t.title}</div>
                              {t.description && <div className="text-xs text-white/60 mt-1 line-clamp-2">{t.description}</div>}
                            </button>
                            {/* Quick status sem prompt */}
                            {groupBy==="status" && <QuickStatus task={t} />}
                          </div>

                          {maxH > 0 && (
                            <div className="mt-2">
                              <div className="w-full h-2 rounded bg-white/10 overflow-hidden">
                                <div className={cx("h-full", over ? "bg-rose-300" : "bg-white")}
                                     style={{ width: `${pct}%` }} />
                              </div>
                              <div className="mt-1 text-[11px] text-white/70">
                                {totalH} / {maxH} h
                                {myH > 0 && <span className="ml-2 opacity-80">(tu: {myH} h)</span>}
                                {over && <span className="ml-2 text-rose-300 font-medium">• excedido</span>}
                              </div>
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="px-2 py-0.5 rounded-full bg-white/10">prio: {t.priority ?? "normal"}</span>
                            <span className="px-2 py-0.5 rounded-full bg-white/10">estado: {t.status}</span>
                            {mine && <span className="px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-100">👤 tua</span>}
                            {t.status === "done" && <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100">✔ concluída</span>}
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
                            {/* Mover (sem prompt): dropdown inline quando não estás em "status" */}
                            {groupBy!=="status" && (isHead || mine) && (
                              <QuickStatus task={t} />
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
        </div>
      </section>

      {/* Drawer Detalhes */}
      {openTask && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={()=>setOpenId(null)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-[min(92vw,620px)] bg-[#0b0b0c] border-l border-white/10 p-4 overflow-y-auto">
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
                      try { await updateTask(openTask.id, { title: val }); sound.play("success"); show("ok","Título atualizado"); await refreshTasks(); }
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
                    try { await updateTask(openTask.id, { description: e.target.value }); sound.play("success"); show("ok","Descrição atualizada"); await refreshTasks(); }
                    catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar descrição"); }
                  }}
                  className="w-full rounded-lg bg-black/30 border border-white/10 p-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-white/60">Estado</label>
                  <select
                    defaultValue={openTask.status}
                    onChange={async (e)=>{
                      try { await updateTask(openTask.id, { status: e.target.value as DevTask["status"] }); sound.play("success"); show("ok","Estado atualizado"); await refreshTasks(); }
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
                      try { await updateTask(openTask.id, { priority: e.target.value as DevTask["priority"] }); sound.play("success"); show("ok","Prioridade atualizada"); await refreshTasks(); }
                      catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar prioridade"); }
                    }}
                    className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60">Horas máx</label>
                  <input
                    type="number" min={0} step={0.5} defaultValue={Number(openTask.max_hours ?? 0)}
                    onBlur={async (e)=>{
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      try { await updateTask(openTask.id, { max_hours: v }); sound.play("success"); show("ok","Horas máx atualizadas"); await refreshTasks(); }
                      catch(e:any){ sound.play("error"); show("err", e?.message ?? "Falha a atualizar"); }
                    }}
                    className="w-full mt-1 rounded-lg bg-black/30 border border-white/10 p-2"
                  />
                </div>
              </div>

              {/* Atribuições */}
              <div>
                <label className="text-xs text-white/60 block mb-1">Atribuições</label>
                {isHead ? (
                  <UserPicker
                    value={(openTask.dev_task_assignees ?? []).map((a:Assignee)=>({
                      id: a.user_id,
                      name: allUsers.find(u=>u.id===a.user_id)?.name || a.user_id
                    }))}
                    myself={uid}
                    onToggle={async (u, has) => {
                      try {
                        await assignTask(openTask.id, u.id, has ? "remove" : "add");
                        sound.play("success");
                        await refreshTasks();
                      } catch (e:any) { sound.play("error"); show("err","Falha a atribuir"); }
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(openTask.dev_task_assignees ?? []).map((a:Assignee) => {
                      const u = allUsers.find(x => x.id === a.user_id);
                      return <span key={a.user_id} className="px-2 py-0.5 rounded bg-white/10 text-xs">
                        {shortName(u?.name || u?.email || a.user_id)}
                      </span>;
                    })}
                    {(openTask.dev_task_assignees ?? []).length===0 && <span className="text-sm text-white/60">Sem atribuição</span>}
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

      {/* Modal Nova Tarefa */}
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

      {/* Erros */}
      {err && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-200">{err}</div>}
    </div>
  );
}
