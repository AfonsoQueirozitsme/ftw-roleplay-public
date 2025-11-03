// /src/lib/api/characters.ts
// Agora usa Supabase Edge Functions (igual a players.ts) em vez de um serviço MySQL externo.

import { supabase } from "@/lib/supabase";

/* =========================
   Config + Auth headers
========================= */
type FetchInit = RequestInit & { timeoutMs?: number };

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` as const;

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  return {
    Authorization: `Bearer ${session?.access_token ?? anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  };
}

/* =========================
   Helpers
========================= */
async function fetchJson<T>(url: string, init: FetchInit = {}): Promise<T> {
  const controller = init.timeoutMs ? new AbortController() : undefined;
  if (controller) {
    setTimeout(() => controller.abort(), init.timeoutMs);
  }
  const res = await fetch(url, {
    ...init,
    signal: controller?.signal ?? init.signal,
  });
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

/* =========================
   Tipos (compatíveis com o módulo antigo)
========================= */
export type CharacterRecord = {
  id: string;
  name: string;
  avatar_url?: string | null;
  job?: string | null;
  job_grade?: string | number | null;
  gang?: string | null;
  cash?: number | null;
  bank?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_played?: string | null;
  [extra: string]: unknown;
};

export type CharacterActionResponse = {
  success: boolean;
  message?: string;
};

// Alinha com o que a tua Edge Function /players devolve (players.ts)
type PlayerRow = {
  id: string;
  citizenid: string | null;
  license: string | null;
  name: string;
  phone: string | null;
  job: string | null;
  gang: string | null;
  lastUpdated: string | null;
  lastLoggedOut: string | null;
  // campos adicionais que possam existir
  [k: string]: unknown;
};

/* =========================
   Mapper Player -> Character
========================= */
function mapPlayerToCharacter(p: PlayerRow): CharacterRecord {
  return {
    id: p.id,
    name: p.name,
    job: p.job ?? null,
    job_grade: (p as any)?.job_grade ?? null, // se a função devolver
    gang: p.gang ?? null,
    cash: (p as any)?.cash ?? null,
    bank: (p as any)?.bank ?? null,
    avatar_url: (p as any)?.avatar_url ?? null,
    metadata: (p as any)?.metadata ?? null,
    created_at: (p as any)?.created_at ?? null,
    updated_at: p.lastUpdated ?? (p as any)?.updated_at ?? null,
    last_played: p.lastLoggedOut ?? (p as any)?.last_played ?? null,
    // preserva restantes campos (útil se já os usas noutros sítios)
    ...p,
  };
}

/* =========================
   API pública (assinaturas iguais às existentes)
========================= */

/**
 * Lista personagens por Discord ID.
 * Implementa a mesma ideia do serviço antigo, mas via Edge Function /players.
 * A tua função /players deve aceitar ?discordId=... ou usar q=... para pesquisar por discord.
 */
export async function listCharactersByDiscordId(discordId: string) {
  const headers = await authHeaders();

  // Preferir um parâmetro dedicado se a tua Edge Function o suportar
  const qs = new URLSearchParams({
    discordId, // 👉 se a tua /players suportar este filtro específico, mantém
    page: "1",
    limit: "50",
    sort: "last_updated",
    dir: "desc",
  });

  // Se a tua função não suportar discordId diretamente, troca a linha acima por:
  // const qs = new URLSearchParams({ q: discordId, page: "1", limit: "50" });

  const url = `${FUNCTIONS_URL}/players?${qs.toString()}`;
  const payload = await fetchJson<{ data: PlayerRow[]; total?: number }>(url, {
    headers,
    timeoutMs: 12000,
  });

  return (payload.data ?? []).map(mapPlayerToCharacter);
}

/**
 * Detalhe de uma personagem (player).
 * Mapeia o retorno de /players/:id para CharacterRecord.
 */
export async function getCharacterDetail(characterId: string) {
  const headers = await authHeaders();
  const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(characterId)}`;
  const payload = await fetchJson<{ data: PlayerRow }>(url, {
    headers,
    timeoutMs: 12000,
  });
  return mapPlayerToCharacter(payload.data);
}

/**
 * Executa uma ação sobre a personagem (ex.: dar dinheiro, setar job, etc.).
 * Precisa de uma Edge Function /players/:id/actions que trate do "action" e "payload".
 */
export async function performCharacterAction(
  characterId: string,
  action: string,
  payload?: Record<string, unknown>
) {
  const headers = await authHeaders();
  const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(characterId)}/actions`;
  return fetchJson<CharacterActionResponse>(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, payload }),
    timeoutMs: 15000,
  });
}
