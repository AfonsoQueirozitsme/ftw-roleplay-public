// shared/permissions.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export type Permission = {
  id: number;
  name: string;
  identifier: string;
  description?: string;
};

export type Role = {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  permissions?: Permission[];
};

export async function getUserPermissions(userId: string): Promise<string[]> {
  // Get user roles with their permissions
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        id,
        identifier,
        role_permissions (
          permissions (
            identifier
          )
        )
      )
    `)
    .eq('user_id', userId);

  if (rolesError || !userRoles) {
    console.error('Error fetching user roles:', rolesError);
    return [];
  }

  // Extract unique permission identifiers
  const permissions = new Set<string>();
  userRoles.forEach(ur => {
    const role = ur.roles;
    if (!role?.role_permissions) return;
    
    role.role_permissions.forEach(rp => {
      if (rp.permissions?.identifier) {
        permissions.add(rp.permissions.identifier);
      }
    });
  });

  // Add derived groups (for backwards compatibility)
  if ([...permissions].some(p => p.startsWith('support.'))) permissions.add('group.ftw_support');
  if ([...permissions].some(p => p.startsWith('supervise.'))) permissions.add('group.ftw_supervise');
  if ([...permissions].some(p => p.startsWith('admin.'))) permissions.add('group.ftw_admin');
  if (permissions.has('management.all')) permissions.add('group.ftw_management');
  if ([...permissions].some(p => p.startsWith('bugs.'))) permissions.add('group.ftw_bugs');

  return [...permissions];
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return userPerms.includes(permission);
}

export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return permissions.some(p => userPerms.includes(p));
}

export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return permissions.every(p => userPerms.includes(p));
}

// Types para tipagem forte no TypeScript
declare global {
  type UserPermissions = {
    // Support permissions
    'support.read': boolean;
    'support.reply': boolean;
    'support.manage': boolean;
    'support.escalate': boolean;

    // Supervision permissions  
    'supervise.basic': boolean;
    'supervise.advanced': boolean;

    // Admin permissions
    'admin.access': boolean;
    'admin.basic': boolean;
    'admin.senior': boolean;
    'admin.head': boolean;

    // Management permissions
    'management.all': boolean;

    // Bug team permissions
    'bugs.read': boolean;
    'bugs.manage': boolean;

    // Legacy group permissions
    'group.ftw_support': boolean;
    'group.ftw_supervise': boolean;
    'group.ftw_admin': boolean;
    'group.ftw_management': boolean;
    'group.ftw_bugs': boolean;
  }
}