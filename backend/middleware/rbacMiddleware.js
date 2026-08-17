import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AdminRole } from '../models/AdminRole.js';
import { USER_ROLES } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory permission cache to avoid DB lookups on every request.
 * Cache TTL: 5 minutes. Keyed by adminRole ObjectId.
 */
const permissionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get permissions for an admin role (with caching)
 */
const getPermissionsForRole = async (roleId) => {
  if (!roleId) return [];

  const cacheKey = roleId.toString();
  const cached = permissionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  try {
    const role = await AdminRole.findById(roleId).lean();
    if (!role) return [];

    permissionCache.set(cacheKey, {
      permissions: role.permissions || [],
      timestamp: Date.now(),
    });

    return role.permissions || [];
  } catch (err) {
    logger.warn(`[RBAC] Failed to fetch permissions for role ${roleId}: ${err.message}`);
    return [];
  }
};

/**
 * Clear permission cache (call when roles are updated)
 */
export const clearPermissionCache = (roleId = null) => {
  if (roleId) {
    permissionCache.delete(roleId.toString());
  } else {
    permissionCache.clear();
  }
};

/**
 * Middleware: Require user to be an Admin
 */
export const requireAdmin = () => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const roleNormalized = (req.user.role || '').trim().toLowerCase();
    if (roleNormalized !== 'admin') {
      return next(
        new AppError('Access denied. Admin privileges required.', 403)
      );
    }

    if (req.user.isActive === false) {
      return next(
        new AppError('Your admin account has been suspended. Contact a super administrator.', 403)
      );
    }

    next();
  });
};

/**
 * Middleware: Require specific permission(s) on the admin's role
 *
 * Usage:
 *   router.get('/users', protect, requireAdmin(), requirePermission('MANAGE_USERS'), controller)
 *   router.post('/kyc', protect, requireAdmin(), requirePermission('MANAGE_KYC'), controller)
 *
 * Multiple permissions (AND logic — admin must have ALL):
 *   requirePermission('MANAGE_USERS', 'VIEW_ANALYTICS')
 */
export const requirePermission = (...requiredPermissions) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const roleNormalized = (req.user.role || '').trim().toLowerCase();
    if (roleNormalized !== 'admin') {
      return next(
        new AppError('Access denied. Admin privileges required.', 403)
      );
    }

    // SuperAdmin bypass: if user has no adminRole but is Admin role, check if they have all permissions
    // This handles the seeded SuperAdmin who gets all permissions
    const userPermissions = await getPermissionsForRole(req.user.adminRole);

    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      logger.warn(
        `[RBAC] Permission denied for user ${req.user._id} — missing: ${missingPermissions.join(', ')}`
      );
      return next(
        new AppError(
          `Access denied. Missing permission(s): ${missingPermissions.join(', ')}`,
          403
        )
      );
    }

    // Attach permissions to request for downstream use
    req.adminPermissions = userPermissions;
    next();
  });
};
