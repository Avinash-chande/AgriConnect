import { AuditLog } from '../models/AuditLog.js';
import { sanitizeData } from '../utils/logSanitizer.js';
import { logger } from '../utils/logger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Log Audit Trail Entry (supports Phase 10 extended fields)
 */
export const logAuditEvent = async ({
  actor = null,
  admin = null,
  action,
  ipAddress = '',
  IP = '',
  userAgent = '',
  status = 'SUCCESS',
  details = {},
  metadata = {},
  resource = undefined,
  resourceId = null,
  category = AUDIT_CATEGORY.ADMIN,
  severity = AUDIT_SEVERITY.INFO,
}) => {
  try {
    const actorId = actor?._id || actor || admin?._id || admin || null;
    const clientIp = ipAddress || IP || '';
    const mergedDetails = { ...details, ...metadata };
    const sanitizedDetails = sanitizeData(mergedDetails);

    const logEntry = {
      actor: actorId,
      admin: actorId,
      action,
      ipAddress: clientIp,
      IP: clientIp,
      userAgent: userAgent || '',
      status,
      details: sanitizedDetails,
      metadata: sanitizedDetails,
      category,
      severity,
    };

    // Add resource linking
    if (resource && resource.id) {
      logEntry.resource = {
        kind: resource.kind || null,
        id: resource.id,
      };
      logEntry.resourceId = resource.id;
    } else if (resourceId) {
      logEntry.resourceId = resourceId;
    }

    await AuditLog.create(logEntry);

    logger.info(`[AuditLog] ${action} - status:${status} - category:${category} - severity:${severity} - actor:${actorId || 'system'}`);
  } catch (err) {
    logger.warn(`[AuditLog] Failed to log audit event ${action}: ${err.message}`);
  }
};
