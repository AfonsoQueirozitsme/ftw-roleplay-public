import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { report_id } = await request.json();

    if (!report_id) {
      return NextResponse.json(
        { error: 'report_id é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar o report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report não encontrado' },
        { status: 404 }
      );
    }

    // Buscar mensagens do report
    const { data: messages } = await supabase
      .from('report_messages')
      .select('*')
      .eq('report_id', report_id)
      .order('created_at', { ascending: true });

    // Lógica simplificada de triagem (podes melhorar com IA real)
    const content = `${report.title} ${report.description} ${messages?.map((m: any) => m.content).join(' ') || ''}`.toLowerCase();

    // Detectar palavras-chave para triagem
    const isUrgent = /ban|banido|kick|kickado|hack|cheat|exploit/i.test(content);
    const isSupport = /ajuda|help|suporte|não sei|como/i.test(content);
    const isBug = /bug|erro|não funciona|quebrado/i.test(content);

    if (isUrgent) {
      return NextResponse.json({
        triage: true,
        hints: [
          'Report marcado como urgente',
          'Verificar logs do servidor',
          'Contactar staff imediatamente',
        ],
        message: 'Este report requer atenção imediata.',
      });
    }

    if (isSupport) {
      return NextResponse.json({
        main_team: 'Support',
        subteam: 'Geral',
        priority: 'Média',
        severity: 'Normal',
      });
    }

    if (isBug) {
      return NextResponse.json({
        main_team: 'Development',
        subteam: 'Bugs',
        priority: 'Alta',
        severity: 'Bug',
      });
    }

    // Default
    return NextResponse.json({
      main_team: 'Support',
      subteam: 'Geral',
      priority: 'Baixa',
      severity: 'Normal',
    });
  } catch (error: any) {
    console.error('Erro em report-ai:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

