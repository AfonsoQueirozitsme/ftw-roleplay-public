import { supabase } from "@/lib/supabase";

/* Tipos */
export type Status = "pending" | "approved" | "rejected";

export type ApplicationRow = {
  id: string;
  created_at: string;

  nome: string;
  email: string;

  // Coluna legacy (pode vir null)
  discord: string | null;

  // Colunas novas
  discord_id: string | null;
  discord_username: string | null;
  discord_global_name: string | null;
  discord_avatar_url: string | null;
  discord_verified: boolean;
  discord_checked_at: string | null;

  personagem: string;
  motivacao: string;
  website: string | null;

  status: Status;
};

export type ListParams = {
  q?: string;
  status?: "all" | Status;
  page?: number;   // 1-based
  limit?: number;  // default 12, máx. 50
};

/** Colunas explícitas (evita surpresas do "*") */
const COLS =
  "id,created_at,nome,email,discord,personagem,motivacao,website,status,discord_id,discord_username,discord_global_name,discord_avatar_url,discord_verified,discord_checked_at";

/** Lista com filtros e paginação */
export async function listApplications(params: ListParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("applications")
    .select(COLS, { count: "exact", head: false })
    .order("created_at", { ascending: false });

  // Filtro de estado — ignora "all"
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  // Pesquisa em várias colunas
  const q = params.q?.trim();
  if (q) {
    // Atenção: .or exige vírgulas a separar condições
    query = query.or(
      [
        `nome.ilike.%${q}%`,
        `email.ilike.%${q}%`,
        `discord.ilike.%${q}%`,
        `discord_username.ilike.%${q}%`,
        `discord_id.ilike.%${q}%`,
        `personagem.ilike.%${q}%`,
        `motivacao.ilike.%${q}%`,
        `website.ilike.%${q}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;
  return {
    data: (data ?? []) as ApplicationRow[],
    total: count ?? 0,
    page,
    limit,
  };
}

/** Obter 1 candidatura */
export async function getApplication(id: string) {
  const { data, error } = await supabase
    .from("applications")
    .select(COLS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ApplicationRow;
}

/** Atualizar estado */
export async function setApplicationStatus(id: string, status: Status) {
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select(COLS)
    .single();

  if (error) throw error;
  return data as ApplicationRow;
}
