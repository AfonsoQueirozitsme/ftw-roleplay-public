import { supabase } from "@/lib/supabase";

/* Tipos */
export type Status = "pending" | "approved" | "rejected";

export type ApplicationRow = {
  id: string;
  created_at: string | null;
  updated_at: string | null;

  nome: string | null;
  email: string | null;

  // Colunas Discord
  discord_id: string | null;
  discord_username: string | null;

  personagem: string | null;
  motivacao: string | null;
  user_id: string | null;

  status: Status | null;
};

export type ListParams = {
  q?: string;
  status?: "all" | Status;
  page?: number;   // 1-based
  limit?: number;  // default 12, máx. 50
};

/** Colunas explícitas (evita surpresas do "*") - apenas campos que existem na tabela */
const COLS =
  "id,created_at,updated_at,nome,email,personagem,motivacao,status,discord_id,discord_username,user_id";

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
        `discord_username.ilike.%${q}%`,
        `discord_id.ilike.%${q}%`,
        `personagem.ilike.%${q}%`,
        `motivacao.ilike.%${q}%`,
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

/** Lista candidaturas do utilizador atual (por user_id ou email) */
export async function listMyApplications() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // Buscar por user_id ou email
  let query = supabase
    .from("applications")
    .select(COLS)
    .order("created_at", { ascending: false });

  // Tentar primeiro por user_id
  if (user.id) {
    query = query.eq("user_id", user.id);
  } else if (user.email) {
    // Fallback para email
    query = query.eq("email", user.email);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar candidaturas:", error);
    // Se falhar por user_id, tentar por email
    if (user.email) {
      const { data: emailData, error: emailError } = await supabase
        .from("applications")
        .select(COLS)
        .eq("email", user.email)
        .order("created_at", { ascending: false });
      
      if (emailError) throw emailError;
      return (emailData ?? []) as ApplicationRow[];
    }
    throw error;
  }

  return (data ?? []) as ApplicationRow[];
}