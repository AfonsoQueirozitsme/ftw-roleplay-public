import { NextRequest, NextResponse } from 'next/server';

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

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      return NextResponse.json(
        { ok: false, error: 'Configuração do Discord não encontrada' },
        { status: 500 }
      );
    }

    // Buscar membro do servidor
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!memberResponse.ok) {
      return NextResponse.json(
        { ok: false, error: 'Membro não encontrado no servidor' },
        { status: 404 }
      );
    }

    const member = await memberResponse.json();

    // Buscar roles do servidor
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    const guild = await guildResponse.json();
    const roles = (member.roles || []).map((roleId: string) => {
      const role = guild.roles?.find((r: any) => r.id === roleId);
      return role
        ? {
            id: role.id,
            name: role.name,
            position: role.position,
          }
        : null;
    }).filter(Boolean);

    return NextResponse.json({
      ok: true,
      profile: {
        username: member.user?.username || null,
        joined_at: member.joined_at || null,
        roles: roles,
        messages_count: null, // Precisa de ser calculado separadamente se necessário
      },
    });
  } catch (error: any) {
    console.error('Erro em discord-guild-stats:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

