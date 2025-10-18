-- Create the permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    identifier VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    identifier VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the role_permissions junction table
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- Create the user_roles junction table
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Insert default permissions
INSERT INTO permissions (name, identifier, description) VALUES
('Access Admin Panel', 'admin.access', 'Can access the admin panel'),
('Manage Users', 'users.manage', 'Can manage user accounts'),
('Manage Roles', 'roles.manage', 'Can manage roles and permissions'),
('Manage Applications', 'applications.manage', 'Can manage player applications'),
('View Logs', 'logs.view', 'Can view server logs'),
('Manage Resources', 'resources.manage', 'Can manage server resources'),
('Manage Vehicles', 'vehicles.manage', 'Can manage vehicle database'),
('View Analytics', 'analytics.view', 'Can view server analytics'),
('Manage Settings', 'settings.manage', 'Can manage server settings');

-- Insert default roles
INSERT INTO roles (name, identifier, description) VALUES
('Administrator', 'admin', 'Full system access'),
('Moderator', 'mod', 'Moderation capabilities'),
('Support', 'support', 'Basic support capabilities');

-- Assign permissions to Administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.identifier = 'admin';

-- Assign moderation permissions to Moderator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.identifier = 'mod'
AND p.identifier IN ('admin.access', 'users.manage', 'applications.manage', 'logs.view', 'vehicles.manage');

-- Assign basic permissions to Support role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.identifier = 'support'
AND p.identifier IN ('admin.access', 'logs.view', 'applications.manage');