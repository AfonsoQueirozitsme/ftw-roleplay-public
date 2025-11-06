import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const q = searchParams.get('q') || '';
    const discordid = searchParams.get('discordid');

    // Se houver discordid, buscar diretamente
    if (discordid) {
      // Implementar busca por discordid se necessário
      // Por agora, retornar vazio
      return NextResponse.json({ data: [] });
    }

    // Buscar players (implementação simplificada - adaptar conforme necessário)
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('players').select('*', { count: 'exact' });

    if (q) {
      query = query.or(`name.ilike.%${q}%,citizenid.ilike.%${q}%,license.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Erro em /api/players:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

