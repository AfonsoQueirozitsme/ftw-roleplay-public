// src/lib/api/characters.ts
// Helpers to talk with the external MySQL-backed characters service.

type FetchInit = RequestInit & { timeoutMs?: number };

const BASE_URL = (() => {
  const raw = (import.meta as any)?.env?.VITE_CHARACTERS_API_URL as string | undefined;
  if (!raw) return null;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
})();

function requireBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error(
      "A variavel VITE_CHARACTERS_API_URL nao esta definida. Configura o endpoint do servico de personagens."
    );
  }
  return BASE_URL;
}

async function fetchJson<T>(path: string, init: FetchInit = {}): Promise<T> {
  const controller = init.timeoutMs ? new AbortController() : undefined;
  if (controller) {
    setTimeout(() => controller.abort(), init.timeoutMs);
  }
  const response = await fetch(`${requireBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: controller?.signal ?? init.signal,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

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

export async function listCharactersByDiscordId(discordId: string) {
  const params = new URLSearchParams({ discordId });
  return fetchJson<CharacterRecord[]>(`/characters?${params.toString()}`, { timeoutMs: 10000 });
}

export async function getCharacterDetail(characterId: string) {
  return fetchJson<CharacterRecord>(`/characters/${encodeURIComponent(characterId)}`, { timeoutMs: 10000 });
}

export async function performCharacterAction(
  characterId: string,
  action: string,
  payload?: Record<string, unknown>
) {
  return fetchJson<CharacterActionResponse>(`/characters/${encodeURIComponent(characterId)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, payload }),
    timeoutMs: 15000,
  });
}
