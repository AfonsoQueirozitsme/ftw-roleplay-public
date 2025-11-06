// src/lib/api/reports.ts
// Cliente API para Reports e Mensagens
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type Report = {
  id: string;
  title: string;
  description: string;
  status: "open" | "pending" | "resolved" | "closed";
  severity?: string | null;
  category?: string | null;
  priority?: string | null;
  code?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type ReportMessage = {
  id: string;
  report_id: string;
  author: string;
  author_type: "user" | "ai";
  content: string;
  created_at: string;
};

export type ReportStats = {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  byCategory: Record<string, number>;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
};

// Helper para fazer requisições autenticadas
async function fetchWithAuth<T>(url: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Não autenticado");
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || "Erro na API");
  }

  return data.data as T;
}

/* ───────────────────────────────
   Reports
   ─────────────────────────────── */

export async function listReports(params?: {
  status?: Report["status"];
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Report[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.category) queryParams.append("category", params.category);
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.offset) queryParams.append("offset", String(params.offset));

  const url = `/api/reports${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  return fetchWithAuth<Report[]>(url);
}

export async function getReport(id: string): Promise<Report> {
  return fetchWithAuth<Report>(`/api/reports/${id}`);
}

export async function createReport(data: {
  title: string;
  description: string;
  category?: string;
  severity?: string;
  priority?: string;
}): Promise<Report> {
  return fetchWithAuth<Report>("/api/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateReport(
  id: string,
  updates: Partial<Pick<Report, "title" | "description" | "status" | "category" | "severity" | "priority">>
): Promise<Report> {
  return fetchWithAuth<Report>(`/api/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/* ───────────────────────────────
   Mensagens
   ─────────────────────────────── */

export async function listReportMessages(reportId: string): Promise<ReportMessage[]> {
  return fetchWithAuth<ReportMessage[]>(`/api/reports/${reportId}/messages`);
}

export async function createReportMessage(
  reportId: string,
  data: {
    content: string;
    author_type?: "user" | "ai";
  }
): Promise<ReportMessage> {
  return fetchWithAuth<ReportMessage>(`/api/reports/${reportId}/messages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ───────────────────────────────
   Estatísticas
   ─────────────────────────────── */

export async function getReportStats(): Promise<ReportStats> {
  return fetchWithAuth<ReportStats>("/api/reports/stats");
}

/* ───────────────────────────────
   Health Check
   ─────────────────────────────── */

export async function checkApiHealth(): Promise<{ success: boolean; message: string; timestamp: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) throw new Error("API não está disponível");
    return await response.json();
  } catch (err) {
    throw new Error("Não foi possível conectar à API");
  }
}

