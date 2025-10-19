// permissions.ts - re-exports only
export * from './permissions.types';
export { supabase } from './supabase';

export {
  clearPermissionsCache,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './permissions.core';

// Convenience aliases
// (Intentionally no additional aliases here to avoid duplicate identifier issues)
export { clearPermissionsCache as clearCache, getUserPermissions as getPerms } from './permissions.core';
