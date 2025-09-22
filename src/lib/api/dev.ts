// src/lib/api/dev.ts
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Endpoints (Edge Functions)                                         */
/* ------------------------------------------------------------------ */
const ROOT = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const BASE_DEV_WORK = `${ROOT}/functions/v1/dev-work`;
const BASE_FUNCTIONS = `${ROOT}/functions/v1`;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token ?? ANON}`,
    apikey: ANON,
    "Content-Type": "application/json",
  };
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init.headers as any) };
  const r = await fetch(url, { ...init, headers });
  const text = await r.text().catch(() => "");
  if (!r.ok) {
    // tenta extrair mensagem útil
    try {
      const j = JSON.parse(text);
      const msg = j?.message || j?.error || text || `HTTP ${r.status}`;
      throw new Error(msg);
    } catch {
      throw new Error(text || `HTTP ${r.status}`);
    }
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export type DevTask = {
  id: string;
  title: string;
  description?: string | null;
  status: "backlog" | "in_progress" | "blocked" | "review" | "done" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  due_at?: string | null;
  max_hours?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  dev_task_assignees?: { user_id: string }[];
};

export type Session = {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  last_renewal_at: string;
  ended_at: string | null;
  minutes_total: number;
  end_reason: string | null;
  last_report?: string | null;
  last_forecast?: string | null;
};

export type StaffUser = {
  id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
};

/* ------------------------------------------------------------------ */
/* Dev Work: Tasks                                                    */
/* ------------------------------------------------------------------ */
export async function listTasks(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<{ data: DevTask[] }>(`${BASE_DEV_WORK}/tasks${qs}`);
}

export async function createTask(input: Partial<DevTask> & { assignees?: string[] }) {
  return fetchJson<{ data: DevTask }>(`${BASE_DEV_WORK}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTask(id: string, patch: Partial<DevTask>) {
  return fetchJson<{ data: DevTask }>(`${BASE_DEV_WORK}/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function assignTask(id: string, user_id: string, action: "add" | "remove" = "add") {
  return fetchJson<{ ok: true }>(`${BASE_DEV_WORK}/tasks/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: JSON.stringify({ user_id, action }),
  });
}

/* ------------------------------------------------------------------ */
/* Dev Work: Clock                                                    */
/* ------------------------------------------------------------------ */
export async function getMyActiveSession() {
  return fetchJson<{ session: Session | null }>(`${BASE_DEV_WORK}/clock/me`);
}

export async function clockStart(task_id: string) {
  return fetchJson<{ session: Session }>(`${BASE_DEV_WORK}/clock/start`, {
    method: "POST",
    body: JSON.stringify({ task_id }),
  });
}

export async function clockRenew(session_id: string, report: string, forecast: string) {
  return fetchJson<{ session: Session }>(`${BASE_DEV_WORK}/clock/renew`, {
    method: "POST",
    body: JSON.stringify({ session_id, report, forecast }),
  });
}

export async function clockStop(session_id: string, report?: string) {
  return fetchJson<{ session: Session }>(`${BASE_DEV_WORK}/clock/stop`, {
    method: "POST",
    body: JSON.stringify({ session_id, report }),
  });
}

/* ------------------------------------------------------------------ */
/* Staff directory (Head only)                                        */
/* ------------------------------------------------------------------ */
export async function listStaffUsers(q = "", limit = 200): Promise<StaffUser[]> {
  const res = await fetchJson<{ data: StaffUser[] }>(`${BASE_FUNCTIONS}/dev-users`, {
    method: "POST",
    body: JSON.stringify({ q, limit }),
  });
  return res.data;
}
