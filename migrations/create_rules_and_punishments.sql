-- Migration: create_rules_and_punishments.sql
-- Run this in Supabase SQL editor or psql connected to your database.

DROP TABLE IF EXISTS public.rules CASCADE;
DROP TABLE IF EXISTS public.rule_categories CASCADE;
DROP TABLE IF EXISTS public.rules_sections CASCADE;

CREATE TABLE public.rule_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE public.rules (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.rule_categories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

INSERT INTO public.rule_categories (name, description) VALUES
  ('Geral', 'Regras gerais do servidor'),
  ('Polícia', 'Regras específicas para policiais'),
  ('Criminosos', 'Regras para atividades ilegais')
ON CONFLICT DO NOTHING;

INSERT INTO public.rules (category_id, title, description, "order", active) VALUES
  (1, 'Respeito', 'Respeite todos os jogadores.', 1, TRUE),
  (1, 'Sem cheats', 'É proibido uso de cheats ou exploits.', 2, TRUE),
  (2, 'Uso de armas', 'Policiais só podem usar armas em serviço.', 1, TRUE),
  (3, 'Assaltos', 'Assaltos devem ser planejados e realistas.', 1, TRUE)
ON CONFLICT DO NOTHING;

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

INSERT INTO public.punishments (code,title,description,action_type,duration,notes,category,position)
VALUES
  ('L-01','Linguagem desadequada pontual','Expressões agressivas ou palavrões ligeiros em momentos isolados.','Aviso','Aviso verbal + nota na ficha',NULL,'Leves',0),
  ('M-01','Metagaming com vantagem','Uso de informação OOC para localizar ou perseguir outro jogador.','Ban','Ban 12h - 24h',NULL,'Médias',0),
  ('G-01','RDM / VDM deliberado','Atacar ou matar sem contexto RP, atropelamentos propositados ou repetidos.','Ban','Ban 3 - 7 dias',NULL,'Graves',0),
  ('E-01','Cheats / software não autorizado','Qualquer forma de hacks, menus externos ou scripts que alterem o jogo.','Ban','Ban permanente',NULL,'Extremas',0)
ON CONFLICT DO NOTHING;