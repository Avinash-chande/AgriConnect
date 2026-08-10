import { logAuditEvent } from '../services/auditLogger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Express middleware factory for automatic audit logging on admin actions.
 * Non-blocking: audit log is fire-and-forget so it doesn't slow down the response.
 *
 * Usage:
 *   router.patch('/users/:id/suspend', protect, requireAdmin(), auditAction('USER_SUSPENDED', 'admin', 'warning'), controller)
 *
 * @param {string} action - Action identifier (e.g., 'USER_SUSPENDED', 'KYC_REVIEWED')
 * @param {string} category - Audit category from AUDIT_CATEGORY
 * @param {string} severity - Severity level from AUDIT_SEVERITY
 */
export const auditAction = (
  action,
  category = AUDIT_CATEGORY.ADMIN,
  severity = AUDIT_SEVERITY.INFO
) => {
  return (req, res, next) => {
    // Capture original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Fire-and-forget audit log after response is prepared
      const status = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';

      // Sanitize request body — remove sensitive fields
      const sanitizedBody = { ...req.body };
      delete sanitizedBody.password;
      delete sanitizedBody.otp;
      delete sanitizedBody.shareCode;
      delete sanitizedBody.aadhaarNumber;
      delete sanitizedBody.xmlContent;
      delete sanitizedBody.rawXml;

      const details = {
        method: req.method,
        path: req.originalUrl,
        params: req.params,
        body: Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
        responseStatus: res.statusCode,
        severity,
      };

      // Determine resource from route params
      const resource = {};
      if (req.params.id) {
        resource.id = req.params.id;
      }
      if (req.params.userId) {
        resource.kind = 'User';
        resource.id = req.params.userId;
      }

      logAuditEvent({
        actor: req.user?._id || null,
        action,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        status,
        details,
        resource: resource.id ? resource : undefined,
        category,
        severity,
      }).catch(() => {
        // Silently ignore audit log failures — they're non-critical
      });

      return originalJson(body);
    };

    next();
  };
};
