import * as settingRepo from '../repositories/platformSettingRepository.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY, PLATFORM_SETTING_CATEGORY } from '../constants/index.js';

/**
 * Default Seed Configurations (Zero Secrets — Secrets Stay in Env Vars)
 */
const DEFAULT_SETTINGS = [
  // 1. Trust Score Rules
  { key: 'trust_weight_mobile', value: 15, type: 'number', category: 'trust_score', description: 'Trust score points for verified mobile number' },
  { key: 'trust_weight_email', value: 10, type: 'number', category: 'trust_score', description: 'Trust score points for verified email address' },
  { key: 'trust_weight_profile', value: 15, type: 'number', category: 'trust_score', description: 'Trust score points for complete profile' },
  { key: 'trust_weight_certificates', value: 20, type: 'number', category: 'trust_score', description: 'Trust score points for verified skill certificates' },
  { key: 'trust_weight_completed_jobs', value: 20, type: 'number', category: 'trust_score', description: 'Trust score points for completed work history' },
  { key: 'trust_weight_farmer_ratings', value: 20, type: 'number', category: 'trust_score', description: 'Trust score points for 4.5+ average rating' },

  // 2. Badge Thresholds
  { key: 'badge_threshold_verified', value: 30, type: 'number', category: 'badges', description: 'Minimum Trust Score for VERIFIED level' },
  { key: 'badge_threshold_skilled', value: 50, type: 'number', category: 'badges', description: 'Minimum Trust Score for SKILLED level' },
  { key: 'badge_threshold_trusted', value: 70, type: 'number', category: 'badges', description: 'Minimum Trust Score for TRUSTED level' },
  { key: 'badge_threshold_top_rated', value: 85, type: 'number', category: 'badges', description: 'Minimum Trust Score for TOP_RATED level' },

  // 3. Certificate Rules
  { key: 'cert_max_file_size_mb', value: 10, type: 'number', category: 'certificates', description: 'Maximum certificate upload file size in MB' },
  { key: 'cert_admin_manual_review', value: true, type: 'boolean', category: 'certificates', description: 'Require admin manual review for all certificates' },

  // 4. Identity Verification Settings
  { key: 'kyc_max_zip_size_mb', value: 2, type: 'number', category: 'identity', description: 'Maximum Aadhaar Offline e-KYC ZIP payload size in MB' },
  { key: 'kyc_require_signature_validation', value: true, type: 'boolean', category: 'identity', description: 'Enforce digital signature verification on e-KYC XML' },

  // 5. Job Rules
  { key: 'job_max_active_per_farmer', value: 20, type: 'number', category: 'jobs', description: 'Maximum active jobs allowed per farmer' },
  { key: 'job_auto_expiry_days', value: 30, type: 'number', category: 'jobs', description: 'Days before inactive job listing auto-expires' },

  // 6. Application Rules
  { key: 'app_max_active_per_worker', value: 10, type: 'number', category: 'applications', description: 'Maximum concurrent active applications per worker' },
  { key: 'app_allow_withdrawal', value: true, type: 'boolean', category: 'applications', description: 'Allow workers to withdraw applications' },

  // 7. AI Limits
  { key: 'ai_daily_prompt_limit', value: 50, type: 'number', category: 'ai_limits', description: 'Maximum AI assistant queries per user per day' },
  { key: 'ai_max_tokens_per_req', value: 1000, type: 'number', category: 'ai_limits', description: 'Maximum tokens per AI query' },

  // 8. Notification Settings
  { key: 'notif_socket_broadcast_enabled', value: true, type: 'boolean', category: 'notifications', description: 'Enable real-time Socket.IO notification push' },
  { key: 'notif_email_alerts_enabled', value: true, type: 'boolean', category: 'notifications', description: 'Enable transactional email notifications' },

  // 9. Payment Settings (NO SECRETS)
  { key: 'payment_currency', value: 'INR', type: 'string', category: 'payments', description: 'Base platform currency code' },
  { key: 'payment_platform_fee_percent', value: 2, type: 'number', category: 'payments', description: 'Platform commission fee percentage' },

  // 10. Premium Settings
  { key: 'premium_trial_duration_days', value: 7, type: 'number', category: 'premium', description: 'Free trial duration in days for Pro membership' },

  // 11. Maintenance Mode
  { key: 'maintenance_mode_enabled', value: false, type: 'boolean', category: 'maintenance', description: 'Global maintenance mode lock switch' },
  { key: 'maintenance_announcement_message', value: 'AgriConnect is under scheduled maintenance. Systems will return shortly.', type: 'string', category: 'maintenance', description: 'Global maintenance announcement banner text' },

  // 12. Verification Settings
  { key: 'verification_require_govt_id_for_top_rated', value: true, type: 'boolean', category: 'verification', description: 'Require System B Identity Verification for TOP_RATED badge' },
];

/**
 * Ensure default settings are seeded on initial query
 */

export const getSettings = async (category = null) => {
  const count = await PlatformSetting.countDocuments();
  if (count === 0) {
    await PlatformSetting.insertMany(DEFAULT_SETTINGS);
  }

  if (category) {
    return settingRepo.getByCategory(category);
  }
  return settingRepo.getAll();
};

export const getSettingByKey = async (key) => {
  const setting = await settingRepo.getByKey(key);
  if (!setting) throw new AppError(`Setting with key '${key}' not found`, 404);
  return setting;
};

export const updateSetting = async (key, value, adminUser) => {
  const setting = await settingRepo.getByKey(key);
  if (!setting) throw new AppError(`Setting with key '${key}' not found`, 404);

  // Type validation
  if (setting.type === 'boolean' && typeof value !== 'boolean') {
    throw new AppError(`Value for '${key}' must be a boolean`, 400);
  }
  if (setting.type === 'number' && typeof value !== 'number') {
    throw new AppError(`Value for '${key}' must be a number`, 400);
  }

  const updatedSetting = await settingRepo.updateByKey(key, value, adminUser._id);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'PLATFORM_SETTING_UPDATED',
    status: 'SUCCESS',
    details: { key, previousValue: setting.value, newValue: value },
    resource: { kind: 'PlatformSetting', id: updatedSetting._id },
    category: AUDIT_CATEGORY.SETTINGS,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return updatedSetting;
};

export const bulkUpdateSettings = async (settingsArray, adminUser) => {
  const updatedResults = [];
  for (const s of settingsArray) {
    if (s.key && s.value !== undefined) {
      const res = await updateSetting(s.key, s.value, adminUser);
      updatedResults.push(res);
    }
  }
  return updatedResults;
};
