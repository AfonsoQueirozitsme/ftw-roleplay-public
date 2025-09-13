import { supabase } from "@/lib/supabase";

/**
 * Se criares uma view com o email do utilizador (ex.: v_api_log_events),
 * define VITE_LOGS_TABLE=v_api_log_events para poderes filtrar por user_email.
 * Caso contrário usa a tabela base api_log_events (filtras por user_id).
 */
const LOGS_TABLE = (import.meta as any).env.VITE_LOGS_TABLE || "api_log_events";

export type LogRow = {
  id: number;
  ts: string;                     // timestamp
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: any | null;            // jsonb
  tags: string[] | null;          // text[]
  source: string | null;
  request_id: string | null;
  ip: string | null;
  user_agent: string | null;
  user_id: string | null;
  // opcional na view:
  user_email?: string | null;
};

export type ListLogsParams = {
  q?: string;                     // texto livre (message, request_id, source, ip)
  level?: "all" | "debug" | "info" | "warn" | "error";
  user?: string;                  // user_id (UUID) ou email (se tiveres view)
  tags?: string[];                // contém estes tags
  request_id?: string;
  ip?: string;
  source?: string;
  hasContextKey?: string;         // “existe esta key no context json”
  from?: string;                  // ISO (>=)
  to?: string;                    // ISO (<=)
  page?: number;
  limit?: number;
  dir?: "asc" | "desc";           // por ts
};

export async function listLogs(p: ListLogsParams) {
  const page = Math.max(1, p.page ?? 1);
  const limit = Math.min(200, Math.max(1, p.limit ?? 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase.from(LOGS_TABLE).select("*", { count: "exact" }).order("ts", {
    ascending: (p.dir ?? "desc") === "asc",
  });

  // nível
  if (p.level && p.level !== "all") q = q.eq("level", p.level);

  // datas
  if (p.from) q = q.gte("ts", p.from);
  if (p.to)   q = q.lte("ts", p.to);

  // filtros simples
  if (p.request_id) q = q.ilike("request_id", `%${p.request_id}%`);
  if (p.ip)         q = q.ilike("ip", `%${p.ip}%`);
  if (p.source)     q = q.ilike("source", `%${p.source}%`);

  // texto livre (message + request_id + source + ip)
  if (p.q && p.q.trim()) {
    const s = p.q.trim();
    q = q.or([
      `message.ilike.%${s}%`,
      `request_id.ilike.%${s}%`,
      `source.ilike.%${s}%`,
      `ip.ilike.%${s}%`,
    ].join(","));
  }

  // tags (array contém TODOS os tags fornecidos)
  if (p.tags && p.tags.length) {
    q = q.contains("tags", p.tags);
  }

  // context tem a key X
  if (p.hasContextKey && p.hasContextKey.trim()) {
    // PostgREST consegue fazer contains em jsonb
    const key = p.hasContextKey.trim();
    q = q.contains("context", { [key]: {} });
  }

  // utilizador (UUID ou email se a view tiver user_email)
  if (p.user && p.user.trim()) {
    const u = p.user.trim();
    if (LOGS_TABLE !== "api_log_events") {
      // tentar por email OU id
      q = q.or(`user_email.ilike.%${u}%,user_id.eq.${u}`);
    } else {
      // tabela base só tem user_id
      q = q.eq("user_id", u);
    }
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  return {
    data: (data ?? []) as LogRow[],
    total: count ?? 0,
    page,
    limit,
  };
}
