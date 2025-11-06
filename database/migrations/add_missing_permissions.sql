-- Migration: Adicionar permissões em falta
-- Data: 2024

-- Adicionar novas permissões necessárias
INSERT INTO permissions (name, identifier, description) VALUES
('Manage Players', 'players.manage', 'Can manage player accounts and data'),
('View Players', 'players.view', 'Can view player information'),
('Manage Content', 'content.manage', 'Can manage content (images, news, events, player-info)'),
('Manage Server', 'server.manage', 'Can manage server resources and txAdmin'),
('Dev Work', 'dev.work', 'Can access development work section'),
('Dev Lead', 'dev.lead', 'Can access development leaders section')
ON CONFLICT (identifier) DO NOTHING;

-- Atualizar role admin para ter todas as permissões (incluindo as novas)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.identifier = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

