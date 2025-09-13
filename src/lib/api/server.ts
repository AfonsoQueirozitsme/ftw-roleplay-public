// src/lib/api/server.ts
import { supabase } from "@/lib/supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/* ---------------- Auth headers ---------------- */
async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return {
    Authorization: `Bearer ${session?.access_token ?? anon}`,
    apikey: anon, // necessário para Functions
    "Content-Type": "application/json",
  };
}

/* ---------------- Fetch helper (com init) ---------------- */
async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const baseHeaders = await authHeaders();
  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init.headers as Record<string, string> | undefined),
    },
  };

  const r = await fetch(url, mergedInit);
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

/* ---------------- Tipos ---------------- */
export type DynamicJson = {
  clients: number;
  sv_maxclients?: string | number;
  hostname?: string;
  [k: string]: any;
};

export type InfoJson = {
  resources?: string[];
  vars?: Record<string, any>;
  server?: string;
  version?: number | string;
  [k: string]: any;
};

/* ---------------- Endpoints públicos (dynamic/info) ---------------- */
export async function getServerDynamic() {
  return fetchJson<DynamicJson>(`${FUNCTIONS_URL}/server/dynamic`);
}

export async function getServerInfo() {
  return fetchJson<InfoJson>(`${FUNCTIONS_URL}/server/info`);
}

/* ---------------- Resources ---------------- */
export async function listResources(params?: { q?: string }) {
  const qs = new URLSearchParams({ q: params?.q ?? "" });
  return fetchJson<{ data: string[]; total: number }>(
    `${FUNCTIONS_URL}/server/resources?${qs.toString()}`
  );
}

export type ResourceActionResponse = {
  ok: boolean;
  command?: string;
  response?: string;
};

export async function startResource(name: string) {
  return fetchJson<ResourceActionResponse>(
    `${FUNCTIONS_URL}/server/resources/${encodeURIComponent(name)}/start`,
    { method: "POST" }
  );
}

export async function stopResource(name: string) {
  return fetchJson<ResourceActionResponse>(
    `${FUNCTIONS_URL}/server/resources/${encodeURIComponent(name)}/stop`,
    { method: "POST" }
  );
}

export async function restartResource(name: string) {
  return fetchJson<ResourceActionResponse>(
    `${FUNCTIONS_URL}/server/resources/${encodeURIComponent(name)}/restart`,
    { method: "POST" }
  );
}

/* ---------------- Vars (opcional) ---------------- */
export async function getServerVars() {
  return fetchJson<{ vars: Record<string, any>; version: number | string | null }>(
    `${FUNCTIONS_URL}/server/vars`
  );
}
