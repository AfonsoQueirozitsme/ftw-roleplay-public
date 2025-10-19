import type { Database } from '@/types/database';

/**
 * Re-export Database type
 */
export type { Database };

/**
 * Base entity types from the database
 */
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type RolePermissionRow = Database['public']['Tables']['role_permissions']['Row'];
export type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];

/**
 * Extended types for data relations
 */
export type RoleWithPermissions = Role & {
  permissions?: Permission[];
  role_permissions?: Array<RolePermissionRow & {
    permissions: Pick<Permission, keyof Permission> | null;
  }> | null;
};

/**
 * Joined types for complex queries
 */
export type JoinedUserRole = UserRoleRow & {
  roles: RoleWithPermissions | null;
};

/**
 * Cache-related types
 */
export type CachedPermissions = {
  permissions: string[];
  expiresAt: number;
};

/**
 * Type aliases for core functions
 */
export type ClearCache = (userId?: string) => void;
export type GetPermissions = (userId: string) => Promise<string[]>;
export type HasPermission = (userId: string, permission: string) => Promise<boolean>;
export type HasAnyPermission = (userId: string, permissions: string[]) => Promise<boolean>;
export type HasAllPermissions = (userId: string, permissions: string[]) => Promise<boolean>;

/**
 * Global permission map
 */
declare global {
  interface UserPermissions {
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