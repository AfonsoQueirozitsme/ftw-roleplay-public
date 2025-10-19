import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[permissions] Missing Supabase credentials", {
    hasUrl: Boolean(SUPABASE_URL),
    hasKey: Boolean(SUPABASE_ANON_KEY),
  });
  throw new Error("Supabase credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not configured.");
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

type PermissionRow = Database["public"]["Tables"]["permissions"]["Row"];
type RoleRow = Database["public"]["Tables"]["roles"]["Row"];
type RolePermissionRow = Database["public"]["Tables"]["role_permissions"]["Row"];
type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];

type RoleWithPermissions = RoleRow & {
  role_permissions: (RolePermissionRow & {
    permissions: Pick<PermissionRow, "identifier"> | null;
  })[] | null;
};

type JoinedUserRole = UserRoleRow & {
  roles: RoleWithPermissions | null;
};

type CachedPermissions = {
  permissions: string[];
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const permissionsCache = new Map<string, CachedPermissions>();

const debug = (...args: unknown[]) => console.debug("[permissions]", ...args);
const warn = (...args: unknown[]) => console.warn("[permissions]", ...args);
const error = (...args: unknown[]) => console.error("[permissions]", ...args);

const deriveLegacyGroups = (permissions: Set<string>) => {
  const ids = Array.from(permissions);
  let derived = 0;

  if (ids.some((id) => id.startsWith("support."))) {
    permissions.add("group.ftw_support");
    derived += 1;
  }
  if (ids.some((id) => id.startsWith("supervise."))) {
    permissions.add("group.ftw_supervise");
    derived += 1;
  }
  if (ids.some((id) => id.startsWith("admin."))) {
    permissions.add("group.ftw_admin");
    derived += 1;
  }
  if (permissions.has("management.all")) {
    permissions.add("group.ftw_management");
    derived += 1;
  }
  if (ids.some((id) => id.startsWith("bugs."))) {
    permissions.add("group.ftw_bugs");
    derived += 1;
  }

  if (derived > 0) {
    debug("Derived legacy groups", { derived, snapshot: Array.from(permissions) });
  }
};

export const clearPermissionsCache = (userId?: string) => {
  if (userId) {
    permissionsCache.delete(userId);
    debug("Cleared permissions cache for user", { userId });
    return;
  }

  permissionsCache.clear();
  debug("Cleared permissions cache for all users");
};

export async function getUserPermissions(userId: string): Promise<string[]> {
  if (!userId) {
    warn("getUserPermissions invoked without a userId");
    return [];
  }

  const cached = permissionsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    debug("Cache hit", { userId, count: cached.permissions.length });
    return cached.permissions;
  }

  debug("Cache miss, querying Supabase", { userId });

  const { data, error: rolesError } = await supabase
    .from("user_roles")
    .select(
      `
        role_id,
        roles:roles!inner (
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
    .returns<JoinedUserRole[]>();

  if (rolesError) {
    error("Failed to fetch user roles", { userId, rolesError });
    return [];
  }

  if (!data || data.length === 0) {
    warn("User has no roles linked or query returned empty", { userId });
    return [];
  }

  debug("Fetched user roles", { userId, roleCount: data.length });

  const permissionSet = new Set<string>();

  data.forEach((entry, index) => {
    if (!entry.roles) {
      warn("Role record missing for user_role entry", { userId, roleId: entry.role_id, index });
      return;
    }

    const { identifier, id, role_permissions } = entry.roles;
    debug("Processing role", {
      userId,
      roleId: id,
      identifier,
      permissionLinks: role_permissions?.length ?? 0,
    });

    if (!role_permissions || role_permissions.length === 0) {
      warn("Role has no linked permissions", { userId, roleId: id, identifier });
      return;
    }

    role_permissions.forEach((pivot, pivotIndex) => {
      const permId = pivot.permissions?.identifier;
      if (!permId) {
        warn("Permission link missing identifier", { userId, roleId: id, pivotIndex });
        return;
      }
      permissionSet.add(permId);
    });
  });

  if (permissionSet.size === 0) {
    warn("No permissions resolved for user after processing roles", { userId });
  }

  deriveLegacyGroups(permissionSet);

  const resolvedPermissions = Array.from(permissionSet).sort();
  permissionsCache.set(userId, {
    permissions: resolvedPermissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  debug("Resolved permissions", { userId, count: resolvedPermissions.length, permissions: resolvedPermissions });
  return resolvedPermissions;
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  const result = permissions.includes(permission);
  debug("hasPermission", { userId, permission, result });
  return result;
}

export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const result = permissions.some((perm) => userPermissions.includes(perm));
  debug("hasAnyPermission", { userId, requested: permissions, result });
  return result;
}

export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const result = permissions.every((perm) => userPermissions.includes(perm));
  debug("hasAllPermissions", { userId, requested: permissions, result });
  return result;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
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
