import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials are not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export type Permission = Database["public"]["Tables"]["permissions"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];

type PermissionIdentifier = Permission["identifier"];

type RolePermissionLink = {
  permissions: {
    identifier: PermissionIdentifier | null;
  } | null;
} | null;

type RoleWithPermissions = Role & {
  role_permissions: RolePermissionLink[] | null;
};

type UserRoleRow = {
  role_id: number;
  roles: RoleWithPermissions | null;
};

const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;
const permissionsCache = new Map<string, { expiresAt: number; permissions: string[] }>();

const deriveLegacyGroups = (permissions: Set<string>) => {
  const entries = Array.from(permissions);

  if (entries.some((id) => id.startsWith("support."))) permissions.add("group.ftw_support");
  if (entries.some((id) => id.startsWith("supervise."))) permissions.add("group.ftw_supervise");
  if (entries.some((id) => id.startsWith("admin."))) permissions.add("group.ftw_admin");
  if (permissions.has("management.all")) permissions.add("group.ftw_management");
  if (entries.some((id) => id.startsWith("bugs."))) permissions.add("group.ftw_bugs");
};

export const clearPermissionsCache = (userId?: string) => {
  if (userId) {
    permissionsCache.delete(userId);
    return;
  }
  permissionsCache.clear();
};

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = permissionsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
        role_id,
        roles:roles (
          id,
          identifier,
          role_permissions:role_permissions (
            permissions:permissions (
              identifier
            )
          )
        )
      `
    )
    .eq("user_id", userId)
    .returns<UserRoleRow[]>();

  if (error) {
    console.error("Failed to fetch user permissions:", error);
    return [];
  }

  const permissionSet = new Set<string>();

  data.forEach((userRole) => {
    const role = userRole.roles;
    if (!role?.role_permissions) return;

    role.role_permissions.forEach((link) => {
      const identifier = link?.permissions?.identifier;
      if (identifier) permissionSet.add(identifier);
    });
  });

  deriveLegacyGroups(permissionSet);

  const permissionsArray = Array.from(permissionSet);
  permissionsCache.set(userId, {
    permissions: permissionsArray,
    expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS,
  });

  return permissionsArray;
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return permissions.some((perm) => userPerms.includes(perm));
}

export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return permissions.every((perm) => userPerms.includes(perm));
}

declare global {
  type UserPermissions = {
    "support.read": boolean;
    "support.reply": boolean;
    "support.manage": boolean;
    "support.escalate": boolean;

    "supervise.basic": boolean;
    "supervise.advanced": boolean;

    "admin.access": boolean;
    "admin.basic": boolean;
    "admin.senior": boolean;
    "admin.head": boolean;

    "management.all": boolean;

    "bugs.read": boolean;
    "bugs.manage": boolean;

    "group.ftw_support": boolean;
    "group.ftw_supervise": boolean;
    "group.ftw_admin": boolean;
    "group.ftw_management": boolean;
    "group.ftw_bugs": boolean;
  };
}
