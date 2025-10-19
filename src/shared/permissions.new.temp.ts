// Re-export types and core functionality
export type { Permission, Role } from './permissions.types';
export { clearPermissionsCache, getUserPermissions, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions.core';

// For import compatibility - old code may still import from here directly
import {
  clearPermissionsCache as clearCache,
  getUserPermissions as getPerms,
  hasPermission as hasPerm,
  hasAnyPermission as hasAnyPerm,
  hasAllPermissions as hasAllPerms,
} from './permissions.core';

export {
  clearCache,
  getPerms,
  hasPerm,
  hasAnyPerm,
  hasAllPerms,
};