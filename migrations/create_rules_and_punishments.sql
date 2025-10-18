-- Migration: create_rules_and_punishments.sql
-- Run this in Supabase SQL editor or psql connected to your database.

-- Sections table for rules
CREATE TABLE IF NOT EXISTS public.rules_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  color text,
  gradient text,
  icon_path text,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Rules table, each rule belongs to a section
CREATE TABLE IF NOT EXISTS public.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.rules_sections(id) ON DELETE CASCADE,
  content text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Punishments table
CREATE TABLE IF NOT EXISTS public.punishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  action_type text NOT NULL,
  duration text NOT NULL,
  notes text,
  category text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Example inserts (based on current UI content)
-- Sections
INSERT INTO public.rules_sections (id, title, subtitle, color, gradient, icon_path, position)
VALUES
  ('00000000-0000-0000-0000-000000000001','General Rules','Fundamentos de convivência para todos os jogadores','text-red-500','from-red-500 to-red-400','M12 2l7 3v6c0 5.25-3.438 9.938-7 11-3.562-1.062-7-5.75-7-11V5l7-3z',0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rules_sections (id, title, subtitle, color, gradient, icon_path, position)
VALUES
  ('00000000-0000-0000-0000-000000000002','Roleplay Rules','Mantém a imersão e o bom senso em todas as interações','text-red-400','from-rose-500 to-red-400','M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zm-8 0c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm0 2c-2.673 0-8 1.337-8 4v2h10v-2c0-2.663-5.327-4-8-4zm8 0c-.486 0-1.036.034-1.624.094 1.942 1.06 3.624 2.725 3.624 4.906v2H24v-2c0-2.663-5.327-4-8-4z',1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rules_sections (id, title, subtitle, color, gradient, icon_path, position)
VALUES
  ('00000000-0000-0000-0000-000000000003','Combat Rules','Combate limpo, justo e com contexto','text-yellow-500','from-yellow-400 to-amber-500','M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v5h2v-5z',2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rules_sections (id, title, subtitle, color, gradient, icon_path, position)
VALUES
  ('00000000-0000-0000-0000-000000000004','Prohibited Actions','Atividades proibidas em qualquer circunstância','text-red-600','from-red-600 to-rose-700','M12 2C6.486 2 2 6.486 2 12c0 2.02.6 3.896 1.627 5.46L17.46 3.627A9.94 9.94 0 0012 2zm8.373 4.54L6.54 20.373A9.94 9.94 0 0012 22c5.514 0 10-4.486 10-10 0-2.02-.6-3.896-1.627-5.46z',3)
ON CONFLICT (id) DO NOTHING;

-- Rules (General section)
INSERT INTO public.rules (section_id, content, position)
VALUES
  ('00000000-0000-0000-0000-000000000001','Respeita todos os jogadores e staff em qualquer momento.',0),
  ('00000000-0000-0000-0000-000000000001','Sem assédio, discriminação ou discurso de ódio.',1),
  ('00000000-0000-0000-0000-000000000001','Usa linguagem adequada em todas as comunicações.',2),
  ('00000000-0000-0000-0000-000000000001','Segue as instruções da staff sem discussões no momento.',3),
  ('00000000-0000-0000-0000-000000000001','Reporta violações pelos canais próprios (ticket Discord ou in-game).',4)
ON CONFLICT DO NOTHING;

-- Example punishments
INSERT INTO public.punishments (code,title,description,action_type,duration,notes,category,position)
VALUES
  ('L-01','Linguagem desadequada pontual','Expressões agressivas ou palavrões ligeiros em momentos isolados.','Aviso','Aviso verbal + nota na ficha',NULL,'Leves',0),
  ('M-01','Metagaming com vantagem','Uso de informação OOC para localizar ou perseguir outro jogador.','Ban','Ban 12h - 24h',NULL,'Médias',0),
  ('G-01','RDM / VDM deliberado','Atacar ou matar sem contexto RP, atropelamentos propositados ou repetidos.','Ban','Ban 3 - 7 dias',NULL,'Graves',0),
  ('E-01','Cheats / software não autorizado','Qualquer forma de hacks, menus externos ou scripts que alterem o jogo.','Ban','Ban permanente',NULL,'Extremas',0)
ON CONFLICT DO NOTHING;
