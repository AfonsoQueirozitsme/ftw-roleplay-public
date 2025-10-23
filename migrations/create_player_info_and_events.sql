  -- Migration: create_player_info_and_events.sql
  -- Run this in Supabase SQL editor or psql connected to your database.

  -- Player area informational posts
  CREATE TABLE IF NOT EXISTS public.player_info_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    published_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS player_info_posts_published_at_idx ON public.player_info_posts (published_at DESC);

  INSERT INTO public.player_info_posts (title, content, tags, published_at)
  VALUES
    (
      'Como funciona o Early Access',
      'O **Early Access** dá-te entrada faseada ao FTW Roleplay.
  - Slots são **limitados**.
  - A candidatura é avaliada por critérios de **comportamento**, **RP** e **histórico**.
  Sugestão: prepara **backstory**, lê as *regras principais* e garante que tens o **Discord** verificado.',
      ARRAY['early-access','guia','início'],
      NOW() - INTERVAL '45 days'
    ),
    (
      'Requisitos técnicos e performance',
      'Para uma experiência estável:
  - Ligações **estáveis** (> 20 Mbps)
  - FPS: ideal > **60**
  - Fecha apps pesadas antes de entrar.
  Problemas? Vê o típico **Troubleshooting** ou abre um `Report`.',
      ARRAY['performance','técnico'],
      NOW() - INTERVAL '42 days'
    ),
    (
      'Economia, empregos e empresas',
      'A economia é **progressiva**: começa com **tarefas base** e evolui para **empregos especializados**.
  Empresas **player-owned** abrem em *waves*.
  Lê o *roadmap* de carreiras e evita *powergaming* / *metagaming*.',
      ARRAY['economia','gameplay'],
      NOW() - INTERVAL '38 days'
    ),
    (
      'Polícia, crime e equilíbrio',
      'A polícia segue *guidelines* de **proporcionalidade**.
  Gangues têm limites por **slot** e **tempo de resposta**.
  Objetivo: **tensão** sem perder **realismo**. Denúncias? Usa o separador **Reports**.',
      ARRAY['polícia','crime','equilíbrio'],
      NOW() - INTERVAL '35 days'
    ),
    (
      'FAQs e Troubleshooting',
      '**Não consigo ligar?** Limpa cache do FiveM e reinicia o Discord.
  **Crashou?** Verifica drivers e reduz *textures*.
  **Ban appeals?** Só via **Reports**.
  Mais dúvidas? Junta-te ao Discord em #suporte.',
      ARRAY['faq','ajuda'],
      NOW() - INTERVAL '30 days'
    ),
    (
      'Calendário de eventos e wipes',
      'Eventos semanais **PVE/PVP** e *mini-arcs* RP.
  **Wipes** só por necessidade de equilíbrio, sempre com **aviso**.
  Consulta o calendário no **dashboard** e no **Discord**.',
      ARRAY['eventos','wipes','cronograma'],
      NOW() - INTERVAL '25 days'
    )
  ON CONFLICT DO NOTHING;

  -- Calendar events
  CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    location text,
    tags text[] DEFAULT ARRAY[]::text[],
    starts_at timestamptz NOT NULL,
    ends_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at DESC);

  INSERT INTO public.events (title, description, location, tags, starts_at, ends_at)
  VALUES
    (
      'Corrida nocturna de estreia',
      'Evento PVP controlado com regras especiais e transmissão em direto.',
      'Downtown Vinewood',
      ARRAY['pvp','corrida'],
      date_trunc('month', now()) + INTERVAL '7 days' + INTERVAL '21 hours',
      date_trunc('month', now()) + INTERVAL '7 days' + INTERVAL '23 hours'
    ),
    (
      'Operação policial conjunta',
      'Briefing multi-unidade com simulação de assalto e treino de resposta rápida.',
      'HQ Polícia',
      ARRAY['polícia','treino'],
      date_trunc('month', now()) + INTERVAL '12 days' + INTERVAL '18 hours',
      date_trunc('month', now()) + INTERVAL '12 days' + INTERVAL '20 hours'
    ),
    (
      'Mercado clandestino RP',
      'Encontro organizado com vendedores e compradores, foco em narrativa.',
      'Local secreto',
      ARRAY['roleplay','economia'],
      date_trunc('month', now()) + INTERVAL '18 days' + INTERVAL '22 hours',
      NULL
    )
  ON CONFLICT DO NOTHING;
