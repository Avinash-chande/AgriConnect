import { User } from '../models/User.js';
import * as adminRepo from '../repositories/adminRepository.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Admin User Management Service
 */

export const getUsers = async (query) => {
  return adminRepo.getUsersPaginated(query);
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select('-password -refreshToken -otpCode -otpExpiresAt')
    .populate('adminRole', 'name permissions')
    .populate('trustVerificationId')
    .lean();

  if (!user) throw new AppError('User not found', 404);
  return user;
};

export const updateUser = async (userId, updateData, adminUser) => {
  // Prevent modifying own role
  if (userId === adminUser._id.toString() && updateData.role) {
    throw new AppError('Cannot modify your own role', 400);
  }

  const allowedFields = ['name', 'email', 'mobile', 'role', 'isActive'];
  const sanitized = {};
  for (const key of allowedFields) {
    if (updateData[key] !== undefined) sanitized[key] = updateData[key];
  }

  const user = await User.findByIdAndUpdate(userId, sanitized, {
    new: true,
    runValidators: true,
  }).select('-password -refreshToken -otpCode -otpExpiresAt');

  if (!user) throw new AppError('User not found', 404);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'USER_UPDATED',
    status: 'SUCCESS',
    details: { targetUser: userId, changes: Object.keys(sanitized) },
    resource: { kind: 'User', id: userId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return user;
};

export const suspendUser = async (userId, adminUser) => {
  if (userId === adminUser._id.toString()) {
    throw new AppError('Cannot suspend your own account', 400);
  }

  // Prevent suspending the last remaining Super Admin
  const targetUserObj = await User.findById(userId).populate('adminRole');
  if (targetUserObj && (targetUserObj.isSuperAdmin || targetUserObj.adminRole?.name === 'SUPER_ADMIN' || targetUserObj.email === 'admin@agriconnect.com')) {
    const activeSuperCount = await User.countDocuments({
      role: 'Admin',
      isActive: true,
      isDeleted: { $ne: true },
    });
    if (activeSuperCount <= 1) {
      throw new AppError('Forbidden: Cannot suspend the last remaining active SUPER_ADMIN account.', 400);
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  ).select('-password -refreshToken -otpCode -otpExpiresAt');

  if (!user) throw new AppError('User not found', 404);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'USER_SUSPENDED',
    status: 'SUCCESS',
    details: { targetUser: userId, userName: user.name },
    resource: { kind: 'User', id: userId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return user;
};

export const activateUser = async (userId, adminUser) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: true },
    { new: true }
  ).select('-password -refreshToken -otpCode -otpExpiresAt');

  if (!user) throw new AppError('User not found', 404);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'USER_ACTIVATED',
    status: 'SUCCESS',
    details: { targetUser: userId, userName: user.name },
    resource: { kind: 'User', id: userId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return user;
};

export const deleteUser = async (userId, adminUser) => {
  if (userId === adminUser._id.toString()) {
    throw new AppError('Cannot delete your own account', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  await user.softDelete();

  await logAuditEvent({
    actor: adminUser._id,
    action: 'USER_DELETED',
    status: 'SUCCESS',
    details: { targetUser: userId, userName: user.name, role: user.role },
    resource: { kind: 'User', id: userId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.CRITICAL,
  });

  return { message: 'User soft-deleted successfully' };
};

/**
 * Fetch Complete User Overview for Admin Inspection
 */
export const getUserOverview = async (userId) => {
  const user = await User.findById(userId)
    .select('-password -refreshToken -otpCode -otpExpiresAt -aadhaarNumber -shareCode')
    .populate('adminRole', 'name permissions')
    .populate('trustVerificationId')
    .lean();

  if (!user) throw new AppError('User not found', 404);

  // Parallel fetch related entity summaries
  const [identityKyc, jobs, applications, reports, subscription] = await Promise.all([
    import('../models/IdentityVerification.js').then((m) =>
      m.IdentityVerification.findOne({ user: userId }).select('-rawXml').lean()
    ),
    import('../models/Job.js').then((m) =>
      m.Job.find({ farmer: userId, isDeleted: { $ne: true } })
        .select('title category dailyWage status createdAt')
        .limit(10)
        .lean()
    ),
    import('../models/Application.js').then((m) =>
      m.Application.find({ worker: userId, isDeleted: { $ne: true } })
        .populate('job', 'title status dailyWage')
        .select('job status createdAt')
        .limit(10)
        .lean()
    ),
    import('../models/Report.js').then((m) =>
      m.Report.find({
        $or: [{ reporter: userId }, { reportedUser: userId }],
        isDeleted: { $ne: true },
      })
        .select('title category priority status createdAt')
        .limit(10)
        .lean()
    ),
    import('../models/Subscription.js').then((m) =>
      m.Subscription.findOne({ user: userId, status: 'active' })
        .populate('plan')
        .lean()
    ),
  ]);

  return {
    user,
    trustProfile: user.trustVerificationId || null,
    identityKyc: identityKyc || null,
    jobs: jobs || [],
    applications: applications || [],
    reports: reports || [],
    subscription: subscription || null,
  };
};
