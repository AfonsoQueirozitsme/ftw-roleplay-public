// /src/lib/api/characters.ts
// Agora usa Supabase Edge Functions (igual a players.ts) em vez de um serviço MySQL externo.
// Mantém a API de /players e filtra localmente pelo campo players.discordid.

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

/** Normaliza formatos comuns de Discord ID: "discord:123", "<@123>", "<@!123>" → "123" */
function normDiscordId(x: string | null | undefined): string | null {
  if (!x) return null;
  const s = String(x).trim();
  // Não converte para lowercase porque Discord IDs são numéricos
  const normalized = s.replace(/^discord:/i, "").replace(/^<@!?/, "").replace(/>$/, "").trim();
  // Valida que é um número válido (Discord IDs são 17-19 dígitos)
  if (!/^\d{17,19}$/.test(normalized)) {
    console.warn("Discord ID inválido após normalização:", x, "→", normalized);
    return null;
  }
  return normalized;
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
  discordid?: string | null; // campo usado para filtragem
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
    job_grade: (p as any)?.job_grade ?? null,
    gang: p.gang ?? null,
    cash: (p as any)?.cash ?? null,
    bank: (p as any)?.bank ?? null,
    avatar_url: (p as any)?.avatar_url ?? null,
    metadata: (p as any)?.metadata ?? null,
    created_at: (p as any)?.created_at ?? null,
    updated_at: p.lastUpdated ?? (p as any)?.updated_at ?? null,
    last_played: p.lastLoggedOut ?? (p as any)?.last_played ?? null,
    // preserva restantes campos
    ...p,
  };
}

/* =========================
   Paginação local (buscar tudo)
========================= */

/**
 * Busca todas as páginas de /players.
 * - Respeita { data, total } se a função expuser 'total'.
 * - Caso não exponha 'total', para quando a página vier com menos registos do que 'limit'.
 */
async function fetchAllPlayers(limit = 200): Promise<PlayerRow[]> {
  const headers = await authHeaders();
  let page = 1;
  const all: PlayerRow[] = [];
  let total: number | undefined;
  const maxPages = 50; // Limite de segurança para evitar loops infinitos

  try {
    while (page <= maxPages) {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: "last_updated",
        dir: "desc",
      });

      const url = `${FUNCTIONS_URL}/players?${qs.toString()}`;
      const res = await fetchJson<{ data: PlayerRow[]; total?: number }>(url, {
        headers,
        timeoutMs: 15000,
      });

      const batch = res.data ?? [];
      if (batch.length === 0) break; // Sem mais dados

      all.push(...batch);

      if (res.total && total === undefined) total = res.total;

      // Condições de parada
      if (batch.length < limit) break; // chegou à última página
      if (total && all.length >= total) break;

      page += 1;
    }

    return all;
  } catch (err) {
    console.error("Erro ao buscar players:", err);
    // Retorna o que conseguiu buscar até agora em vez de falhar completamente
    if (all.length > 0) {
      console.warn(`Retornando ${all.length} players parcialmente carregados`);
      return all;
    }
    throw new Error(err instanceof Error ? err.message : "Falha ao buscar players");
  }
}

/* =========================
   API pública (assinaturas iguais às existentes)
========================= */

/**
 * Lista personagens por Discord ID.
 * Tenta primeiro usar um endpoint específico se disponível, caso contrário busca todas as páginas.
 */
export async function listCharactersByDiscordId(discordId: string) {
  const target = normDiscordId(discordId);
  if (!target) {
    console.warn("Discord ID inválido:", discordId);
    return [];
  }

  try {
    // Tenta primeiro buscar diretamente por discordid se a API suportar
    const headers = await authHeaders();
    const directUrl = `${FUNCTIONS_URL}/players?discordid=${encodeURIComponent(target)}`;
    
    try {
      const directRes = await fetchJson<{ data: PlayerRow[] }>(directUrl, {
        headers,
        timeoutMs: 10000,
      });
      
      if (directRes.data && Array.isArray(directRes.data) && directRes.data.length > 0) {
        return directRes.data.map(mapPlayerToCharacter);
      }
    } catch (directErr) {
      // Se o endpoint direto não funcionar, continua com a busca completa
      console.debug("Busca direta por discordid não disponível, usando busca completa:", directErr);
    }

    // Fallback: busca todas as páginas e filtra localmente
    const players = await fetchAllPlayers(200);
    const filtered = players.filter((p) => {
      const did = normDiscordId((p as any)?.discordid);
      return did === target;
    });

    return filtered.map(mapPlayerToCharacter);
  } catch (err) {
    console.error("Erro ao buscar personagens por Discord ID:", err);
    throw new Error(err instanceof Error ? err.message : "Falha ao carregar personagens");
  }
}

/**
 * Detalhe de uma personagem (player).
 * Mapeia o retorno de /players/:id para CharacterRecord.
 */
export async function getCharacterDetail(characterId: string) {
  if (!characterId) {
    throw new Error("characterId é obrigatório");
  }

  try {
    const headers = await authHeaders();
    const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(characterId)}`;
    const payload = await fetchJson<{ data: PlayerRow }>(url, {
      headers,
      timeoutMs: 12000,
    });
    
    if (!payload.data) {
      throw new Error("Personagem não encontrada");
    }
    
    return mapPlayerToCharacter(payload.data);
  } catch (err) {
    console.error("Erro ao buscar detalhes da personagem:", err);
    throw err instanceof Error ? err : new Error("Falha ao carregar detalhes da personagem");
  }
}

/**
 * Executa uma ação sobre a personagem (ex.: dar dinheiro, setar job, etc.).
 * Requer uma Edge Function /players/:id/actions.
 */
export async function performCharacterAction(
  characterId: string,
  action: string,
  payload?: Record<string, unknown>
) {
  if (!characterId || !action) {
    throw new Error("characterId e action são obrigatórios");
  }

  try {
    const headers = await authHeaders();
    const url = `${FUNCTIONS_URL}/players/${encodeURIComponent(characterId)}/actions`;
    const response = await fetchJson<CharacterActionResponse>(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, payload }),
      timeoutMs: 15000,
    });
    
    if (!response.success) {
      throw new Error(response.message || "Ação falhou");
    }
    
    return response;
  } catch (err) {
    console.error("Erro ao executar ação na personagem:", err);
    throw err instanceof Error ? err : new Error("Falha ao executar ação");
  }
}
