import * as adminRepo from '../repositories/adminRepository.js';

/**
 * Admin Audit Log Service
 */

export const getAuditLogs = async (query) => {
  return adminRepo.getAuditLogsPaginated(query);
};
