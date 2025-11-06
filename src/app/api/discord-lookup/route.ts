import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { discordId } = await request.json();

    if (!discordId) {
      return NextResponse.json(
        { ok: false, error: 'Discord ID é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { ok: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar dados do Discord via API do Discord
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    if (!DISCORD_BOT_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'Configuração do Discord não encontrada' },
        { status: 500 }
      );
    }

    const discordResponse = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!discordResponse.ok) {
      return NextResponse.json(
        { ok: false, error: 'Utilizador Discord não encontrado' },
        { status: 404 }
      );
    }

    const discordUser = await discordResponse.json();

    // Calcular data de criação do snowflake
    const snowflake = BigInt(discordId);
    const timestamp = Number((snowflake >> 22n) + 1420070400000n);
    const created_at_from_snowflake = new Date(timestamp).toISOString();

    return NextResponse.json({
      ok: true,
      user: {
        id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name || null,
        avatar_url: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null,
        created_at_from_snowflake,
      },
    });
  } catch (error: any) {
    console.error('Erro em discord-lookup:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

