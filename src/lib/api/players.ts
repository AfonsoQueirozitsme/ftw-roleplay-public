// src/lib/api/players.ts
import { supabase } from "@/lib/supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// headers para chamar Edge Functions
async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  return {
    Authorization: `Bearer ${session?.access_token ?? anon}`,
    apikey: anon, // importante para o Supabase Edge
    "Content-Type": "application/json",
  };
}

/* ---------- Tipos ---------- */
export type PlayerRow = {
  id: string;
  citizenid: string | null;
  license: string | null;
  name: string;
  phone: string | null;
  job: string | null;
  gang: string | null;
  lastUpdated: string | null;
  lastLoggedOut: string | null;
};

export type PropertyRow = {
  id: string;
  label?: string | null;
  address?: string | null;
  type?: string | null;
  owned_at?: string | null;
};

export type VehicleRow = {
  id: string;
  plate: string;
  model: string;
  garage?: string | null;
  fuel?: number | null;
  engine?: number | null;
  body?: number | null;
  stored?: boolean | null;
};

export type BankInfo = {
  balances: Record<string, number>; // ex.: { cash: 100, bank: 25000, crypto: 0, vip_coins: 10 }
};

export type TransactionRow = {
  id: string;
  ts: string;
  type: string;
  amount: number;
  desc?: string | null;
  balance_after?: number | null;
};

/* ---------- Helpers ---------- */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/* ---------- Listagem / detalhe / patch ---------- */
export async function listPlayers(params: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  dir?: "asc" | "desc";
  job?: string;
  gang?: string;
  hasPhone?: "true" | "false" | "";
}) {
  const qs = new URLSearchParams({
    q: params.q ?? "",
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
    sort: params.sort ?? "last_updated",
    dir: params.dir ?? "desc",
    job: params.job ?? "",
    gang: params.gang ?? "",
    hasPhone: params.hasPhone ?? "",
  });
  const headers = await authHeaders();
  return fetchJson<{ data: PlayerRow[]; total: number; page: number; limit: number }>(
    `${FUNCTIONS_URL}/players?${qs.toString()}`,
    { headers }
  );
}

export async function getPlayer(ref: string) {
  const headers = await authHeaders();
  return fetchJson<{ data: any }>(`${FUNCTIONS_URL}/players/${encodeURIComponent(ref)}`, {
    headers,
  });
}

export async function patchPlayer(id: string, patch: Record<string, any>) {
  const headers = await authHeaders();
  return fetchJson<{ data: any }>(`${FUNCTIONS_URL}/players/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });
}

/* ---------- Endpoints aninhados (abas) ---------- */
export async function listPlayerProperties(playerId: string) {
  const headers = await authHeaders();
  const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(playerId)}/properties`;
  return fetchJson<{ data: PropertyRow[] }>(url, { headers });
}

export async function listPlayerVehicles(playerId: string) {
  const headers = await authHeaders();
  const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(playerId)}/vehicles`;
  return fetchJson<{ data: VehicleRow[] }>(url, { headers });
}

export async function getPlayerBank(playerId: string) {
  const headers = await authHeaders();
  const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(playerId)}/bank`;
  return fetchJson<{ data: BankInfo }>(url, { headers });
}

export async function listPlayerTransactions(
  playerId: string,
  p?: { q?: string; type?: string; page?: number; limit?: number }
) {
  const headers = await authHeaders();
  const qs = new URLSearchParams({
    q: p?.q ?? "",
    type: p?.type ?? "",
    page: String(p?.page ?? 1),
    limit: String(p?.limit ?? 20),
  });
  const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(playerId)}/transactions?${qs.toString()}`;
  return fetchJson<{ data: TransactionRow[]; total: number; page: number; limit: number }>(url, {
    headers,
  });
}

/* ---------- Online (via Edge Function /online -> proxy do FiveM players.json) ---------- */
export type PlayerMini = {
  id: string;
  name: string;
  citizenid?: string | null; // pode não vir do FiveM
  license?: string | null;
  steam?: string | null;
  discord?: string | null;
  ping?: number | null;
};

/**
 * Lista de players online.
 * Requer a Edge Function `online` (que faz proxy para http://91.99.83.236:30120/players.json).
 */
export async function listOnlinePlayers(): Promise<PlayerMini[]> {
  const headers = await authHeaders();
  const url = `${FUNCTIONS_URL}/online`;
  const r = await fetch(url, { headers });
  if (!r.ok) {
    // fallback elegante: devolve [] em 401/404 para não partir o layout
    if (r.status === 401 || r.status === 404) return [];
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const j = await r.json();
  return (j?.data ?? []) as PlayerMini[];
}
