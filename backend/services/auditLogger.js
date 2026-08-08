import { AuditLog } from '../models/AuditLog.js';
import { sanitizeData } from '../utils/logSanitizer.js';
import { logger } from '../utils/logger.js';

/**
 * Log Financial & Payment Audit Trail Entry
 */
export const logAuditEvent = async ({ actor = null, action, ipAddress = '', status = 'SUCCESS', details = {} }) => {
  try {
    const sanitizedDetails = sanitizeData(details);

    await AuditLog.create({
      actor: actor?._id || actor || null,
      action,
      ipAddress,
      status,
      details: sanitizedDetails,
    });

    logger.info(`[AuditLog] ${action} - status:${status} - actor:${actor?._id || actor || 'system'}`);
  } catch (err) {
    logger.warn(`[AuditLog] Failed to log audit event ${action}: ${err.message}`);
  }
};
