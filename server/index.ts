// server/index.ts
// Servidor Express para API de Reports e Mensagens
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente do Supabase não configuradas!");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Middleware de autenticação (opcional, para endpoints protegidos)
async function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação necessário" });
  }

  const token = authHeader.substring(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Token inválido" });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Erro ao verificar token" });
  }
}

/* ───────────────────────────────
   Endpoints de Reports
   ─────────────────────────────── */

// GET /api/reports - Listar reports
app.get("/api/reports", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status, category, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Erro ao listar reports:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao listar reports",
    });
  }
});

// GET /api/reports/:id - Obter report específico
app.get("/api/reports/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Report não encontrado",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Erro ao obter report:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao obter report",
    });
  }
});

// POST /api/reports - Criar novo report
app.post("/api/reports", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, category, severity, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: "Título e descrição são obrigatórios",
      });
    }

    const { data, error } = await supabase
      .from("reports")
      .insert([
        {
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category: category?.trim() || null,
          severity: severity || "medium",
          priority: priority || null,
          status: "open",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Report criado com sucesso",
    });
  } catch (err: any) {
    console.error("Erro ao criar report:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao criar report",
    });
  }
});

// PATCH /api/reports/:id - Atualizar report
app.patch("/api/reports/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;

    // Verificar se o report pertence ao utilizador
    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Report não encontrado",
      });
    }

    const { data, error } = await supabase
      .from("reports")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: "Report atualizado com sucesso",
    });
  } catch (err: any) {
    console.error("Erro ao atualizar report:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao atualizar report",
    });
  }
});

/* ───────────────────────────────
   Endpoints de Mensagens
   ─────────────────────────────── */

// GET /api/reports/:reportId/messages - Listar mensagens de um report
app.get("/api/reports/:reportId/messages", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { reportId } = req.params;

    // Verificar se o report pertence ao utilizador
    const { data: report } = await supabase
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report não encontrado",
      });
    }

    const { data, error } = await supabase
      .from("report_messages")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Erro ao listar mensagens:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao listar mensagens",
    });
  }
});

// POST /api/reports/:reportId/messages - Criar nova mensagem
app.post("/api/reports/:reportId/messages", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { reportId } = req.params;
    const { content, author_type = "user" } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: "Conteúdo da mensagem é obrigatório",
      });
    }

    // Verificar se o report pertence ao utilizador
    const { data: report } = await supabase
      .from("reports")
      .select("id, status")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report não encontrado",
      });
    }

    // Verificar se o report está fechado
    if (report.status === "closed") {
      return res.status(400).json({
        success: false,
        error: "Não é possível adicionar mensagens a um report fechado",
      });
    }

    const { data, error } = await supabase
      .from("report_messages")
      .insert([
        {
          report_id: reportId,
          author: user.email || user.id,
          author_type: author_type === "ai" ? "ai" : "user",
          content: content.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Atualizar status do report para "pending" se estava "open"
    if (report.status === "open") {
      await supabase
        .from("reports")
        .update({ status: "pending" })
        .eq("id", reportId);
    }

    res.status(201).json({
      success: true,
      data,
      message: "Mensagem criada com sucesso",
    });
  } catch (err: any) {
    console.error("Erro ao criar mensagem:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao criar mensagem",
    });
  }
});

/* ───────────────────────────────
   Endpoints de Estatísticas
   ─────────────────────────────── */

// GET /api/reports/stats - Estatísticas dos reports do utilizador
app.get("/api/reports/stats", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;

    const { data: reports, error } = await supabase
      .from("reports")
      .select("status, category")
      .eq("user_id", user.id);

    if (error) throw error;

    const stats = {
      total: reports?.length || 0,
      open: reports?.filter((r) => r.status === "open").length || 0,
      pending: reports?.filter((r) => r.status === "pending").length || 0,
      resolved: reports?.filter((r) => r.status === "resolved").length || 0,
      closed: reports?.filter((r) => r.status === "closed").length || 0,
      byCategory: {} as Record<string, number>,
    };

    reports?.forEach((r) => {
      const cat = r.category || "Sem categoria";
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    console.error("Erro ao obter estatísticas:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao obter estatísticas",
    });
  }
});

/* ───────────────────────────────
   Health Check
   ─────────────────────────────── */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API está operacional",
    timestamp: new Date().toISOString(),
  });
});

/* ───────────────────────────────
   Error Handler
   ─────────────────────────────── */

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
  });
});

/* ───────────────────────────────
   Start Server
   ─────────────────────────────── */

app.listen(PORT, () => {
  console.log(`🚀 Servidor API rodando em http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/reports`);
  console.log(`   GET    /api/reports/:id`);
  console.log(`   POST   /api/reports`);
  console.log(`   PATCH  /api/reports/:id`);
  console.log(`   GET    /api/reports/:reportId/messages`);
  console.log(`   POST   /api/reports/:reportId/messages`);
  console.log(`   GET    /api/reports/stats`);
});

