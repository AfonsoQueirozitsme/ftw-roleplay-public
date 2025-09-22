// src/lib/api/dev.ts
import { supabase } from "@/lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-work`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return {
    Authorization: `Bearer ${session?.access_token ?? anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  };
}
async function fetchJson<T>(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...(init||{}), headers: { ...(await authHeaders()), ...(init.headers||{}) } });
  if (!r.ok) throw new Error(await r.text().catch(()=>`HTTP ${r.status}`));
  return r.json() as Promise<T>;
}

/* Tasks */
export type DevTask = {
  id: string;
  title: string;
  description?: string;
  status: "backlog"|"in_progress"|"blocked"|"review"|"done"|"archived";
  priority: "low"|"normal"|"high"|"urgent";
  due_at?: string|null;
  max_hours?: number|null;
  created_by?: string|null;
  created_at: string;
  updated_at: string;
  dev_task_assignees?: { user_id: string }[];
};

export async function listTasks(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<{ data: DevTask[] }>(`${BASE}/tasks${qs}`);
}
export async function createTask(input: Partial<DevTask> & { assignees?: string[] }) {
  return fetchJson<{ data: DevTask }>(`${BASE}/tasks`, { method: "POST", body: JSON.stringify(input) });
}
export async function updateTask(id: string, patch: Partial<DevTask>) {
  return fetchJson<{ data: DevTask }>(`${BASE}/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export async function assignTask(id: string, user_id: string, action: "add"|"remove" = "add") {
  return fetchJson<{ ok: true }>(`${BASE}/tasks/${encodeURIComponent(id)}/assign`, { method: "POST", body: JSON.stringify({ user_id, action }) });
}

/* Clock */
export type Session = {
  id: string; task_id: string; user_id: string;
  started_at: string; last_renewal_at: string; ended_at: string|null;
  minutes_total: number; end_reason: string|null;
  last_report?: string|null; last_forecast?: string|null;
};

export async function getMyActiveSession() {
  return fetchJson<{ session: Session|null }>(`${BASE}/clock/me`);
}
export async function clockStart(task_id: string) {
  return fetchJson<{ session: Session }>(`${BASE}/clock/start`, { method: "POST", body: JSON.stringify({ task_id }) });
}
export async function clockRenew(session_id: string, report: string, forecast: string) {
  return fetchJson<{ session: Session }>(`${BASE}/clock/renew`, { method: "POST", body: JSON.stringify({ session_id, report, forecast }) });
}
export async function clockStop(session_id: string, report?: string) {
  return fetchJson<{ session: Session }>(`${BASE}/clock/stop`, { method: "POST", body: JSON.stringify({ session_id, report }) });
}
