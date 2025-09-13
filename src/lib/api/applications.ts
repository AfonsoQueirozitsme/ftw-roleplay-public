import { supabase } from "@/lib/supabase";

/* Tipos */
export type ApplicationRow = {
  id: string;
  created_at: string;
  nome: string;
  email: string;
  discord: string | null;
  personagem: string;
  motivacao: string;
  website: string | null;
  status: "pending" | "approved" | "rejected";
};

export type ListParams = {
  q?: string;
  status?: "all" | "pending" | "approved" | "rejected";
  page?: number;
  limit?: number;
};

/* Lista com filtros e paginação */
export async function listApplications(params: ListParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    // pesquisa em múltiplos campos
    query = query.or(
      [
        `nome.ilike.%${q}%`,
        `email.ilike.%${q}%`,
        `discord.ilike.%${q}%`,
        `personagem.ilike.%${q}%`,
        `motivacao.ilike.%${q}%`,
      ].join(","),
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

/* Obter 1 candidatura */
export async function getApplication(id: string) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ApplicationRow;
}

/* Atualizar estado */
export async function setApplicationStatus(id: string, status: "pending" | "approved" | "rejected") {
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ApplicationRow;
}
