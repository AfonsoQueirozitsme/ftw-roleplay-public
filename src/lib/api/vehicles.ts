import { supabase } from "@/lib/supabase";
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Pesquisa global de veículos (edge function /vehicles?q=...) */
export async function listVehiclesGlobal(q: string): Promise<{ data: Array<{
  id: string; plate: string; model: string; citizenid?: string|null; license?: string|null;
}>}> {
  const qs = new URLSearchParams({ q, limit: "5" });
  const r = await fetch(`${FUNCTIONS_URL}/vehicles?${qs}`, { headers: await authHeaders() });
  if (!r.ok) {
    // se ainda não implementaste /vehicles, devolve vazio para o UI não partir
    if (r.status === 404 || r.status === 401) return { data: [] };
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}
