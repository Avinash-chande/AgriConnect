import * as roleRepo from '../repositories/adminRoleRepository.js';
import { User } from '../models/User.js';
import { clearPermissionCache } from '../middleware/rbacMiddleware.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import {
  AUDIT_CATEGORY,
  AUDIT_SEVERITY,
  USER_ROLES,
  ADMIN_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from '../constants/index.js';

/**
 * Admin Role & Permission Management Service
 */

export const getRoles = async () => {
  return roleRepo.getAll();
};

export const getRoleById = async (roleId) => {
  const role = await roleRepo.findById(roleId);
  if (!role) throw new AppError('Role not found', 404);
  return role;
};

/**
 * Privilege Escalation Guard
 */
const validatePermissionsEscalation = (requestedPermissions, adminUser) => {
  if (adminUser.isSuperAdmin || adminUser.email === 'admin@agriconnect.com') {
    return; // Super admin possesses all permissions
  }

  const userPerms = new Set(adminUser.permissions || []);
  for (const perm of requestedPermissions) {
    if (!userPerms.has(perm)) {
      throw new AppError(`Privilege Escalation Forbidden: You do not possess permission '${perm}' and cannot grant it.`, 403);
    }
  }
};

export const createRole = async (roleData, adminUser) => {
  const { name, permissions, description } = roleData;

  // Prevent privilege escalation
  validatePermissionsEscalation(permissions || [], adminUser);

  const existing = await roleRepo.findByName(name);
  if (existing) {
    throw new AppError(`Role with name '${name}' already exists`, 400);
  }

  const role = await roleRepo.create({
    name,
    permissions: permissions || [],
    description: description || '',
    isSystem: false,
  });

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_ROLE_CREATED',
    status: 'SUCCESS',
    details: { roleId: role._id, name, permissions },
    resource: { kind: 'AdminRole', id: role._id },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return role;
};

export const updateRole = async (roleId, updateData, adminUser) => {
  const role = await roleRepo.findById(roleId);
  if (!role) throw new AppError('Role not found', 404);

  if (updateData.permissions) {
    validatePermissionsEscalation(updateData.permissions, adminUser);
  }

  const updatedRole = await roleRepo.updateById(roleId, updateData);
  clearPermissionCache(roleId);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_ROLE_UPDATED',
    status: 'SUCCESS',
    details: { roleId, name: updatedRole.name, updatedFields: Object.keys(updateData) },
    resource: { kind: 'AdminRole', id: roleId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return updatedRole;
};

export const deleteRole = async (roleId, adminUser) => {
  const role = await roleRepo.findById(roleId);
  if (!role) throw new AppError('Role not found', 404);
  if (role.isSystem) throw new AppError('System default roles cannot be deleted', 400);

  // Check if any admin user is assigned to this role
  const assignedCount = await User.countDocuments({ adminRole: roleId });
  if (assignedCount > 0) {
    throw new AppError(`Cannot delete role '${role.name}'. It is currently assigned to ${assignedCount} admin user(s).`, 400);
  }

  await roleRepo.deleteById(roleId);
  clearPermissionCache(roleId);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_ROLE_DELETED',
    status: 'SUCCESS',
    details: { roleId, name: role.name },
    resource: { kind: 'AdminRole', id: roleId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return { message: `Role '${role.name}' deleted successfully` };
};

export const assignRoleToUser = async (userId, roleId, adminUser) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const role = await roleRepo.findById(roleId);
  if (!role) throw new AppError('Admin role not found', 404);

  // Prevent privilege escalation: Only SUPER_ADMIN can assign SUPER_ADMIN role
  if (role.name === ADMIN_ROLES.SUPER_ADMIN && !adminUser.isSuperAdmin && adminUser.email !== 'admin@agriconnect.com') {
    throw new AppError('Forbidden: Only a SUPER_ADMIN can assign the SUPER_ADMIN role.', 403);
  }

  // Prevent demoting the last remaining active SUPER_ADMIN
  if (user.isSuperAdmin || user.email === 'admin@agriconnect.com') {
    if (role.name !== ADMIN_ROLES.SUPER_ADMIN) {
      const superAdminCount = await User.countDocuments({
        role: 'Admin',
        isActive: true,
        isDeleted: { $ne: true },
      });
      if (superAdminCount <= 1) {
        throw new AppError('Forbidden: Cannot demote the last remaining active SUPER_ADMIN account.', 400);
      }
    }
  }

  user.adminRole = role._id;
  await user.save();

  clearPermissionCache(role._id);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_ROLE_ASSIGNED',
    status: 'SUCCESS',
    details: { targetUser: userId, roleId, roleName: role.name },
    resource: { kind: 'User', id: userId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return user;
};
