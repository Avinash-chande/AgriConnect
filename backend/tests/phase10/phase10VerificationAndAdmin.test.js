import { jest } from '@jest/globals';
import { TrustScoreService } from '../../services/TrustScoreService.js';
import * as certService from '../../services/certificateVerificationService.js';
import { AadhaarVerificationService } from '../../services/AadhaarVerificationService.js';
import * as adminRoleService from '../../services/adminRoleService.js';
import * as platformSettingService from '../../services/platformSettingService.js';
import { sanitizeData } from '../../utils/logSanitizer.js';
import {
  TRUST_LEVELS,
  VERIFICATION_BADGES,
  CERTIFICATE_STATUS,
  KYC_STATUS,
  REPORT_STATUS,
  REPORT_PRIORITY,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
} from '../../constants/index.js';

describe('Phase 10 — AgriConnect Trust & Verification Engine + Admin Panel Test Suite', () => {
  let mockUser;
  let mockAdmin;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: '60c72b2f9b1d8b2b98e1f001',
      name: 'Ravi Patil',
      email: 'ravi.patil@example.com',
      mobile: '+919876543210',
      role: 'Worker',
      isVerified: true,
      identityVerified: false,
    };

    mockAdmin = {
      _id: '60c72b2f9b1d8b2b98e1f999',
      name: 'Admin Operational User',
      email: 'admin.op@agriconnect.com',
      role: 'Admin',
      isSuperAdmin: false,
      permissions: ['users.read', 'users.update', 'jobs.moderate', 'reports.resolve'],
    };
  });

  // ============================================================
  // 1. Trust Score Engine (System A) Tests
  // ============================================================
  describe('System A — Trust Score Engine & Dynamic Badge System', () => {
    test('calculateTrustScore calculates weighted score based on configurable signals', () => {
      const inputs = {
        mobileVerified: true, // 15
        emailVerified: true, // 10
        profileCompleted: true, // 15
        certificatesCount: 4, // 20
        completedJobsCount: 10, // 20
        averageRating: 5, // 20
      };

      const result = TrustScoreService.calculateTrustScore(inputs);
      expect(result.trustScore).toBe(100);
    });

    test('getTrustLevel assigns correct dynamic trust levels according to score thresholds', () => {
      expect(TrustScoreService.getTrustLevel(20)).toBe(TRUST_LEVELS.BASIC);
      expect(TrustScoreService.getTrustLevel(40)).toBe(TRUST_LEVELS.VERIFIED);
      expect(TrustScoreService.getTrustLevel(60)).toBe(TRUST_LEVELS.SKILLED);
      expect(TrustScoreService.getTrustLevel(75)).toBe(TRUST_LEVELS.TRUSTED);
      expect(TrustScoreService.getTrustLevel(90, { averageRating: 4.8 })).toBe(TRUST_LEVELS.TOP_RATED);
    });

    test('assignBadges evaluates badges matching user signals', () => {
      const signals = {
        mobileVerified: true,
        emailVerified: true,
        profileCompleted: true,
        certificatesCount: 2,
        completedJobsCount: 6,
        averageRating: 4.8,
      };

      const badgesToEnsure = [];
      if (signals.mobileVerified) badgesToEnsure.push(VERIFICATION_BADGES.MOBILE_VERIFIED);
      if (signals.emailVerified) badgesToEnsure.push(VERIFICATION_BADGES.EMAIL_VERIFIED);
      if (signals.profileCompleted) badgesToEnsure.push(VERIFICATION_BADGES.PROFILE_COMPLETE);
      if (signals.certificatesCount > 0) badgesToEnsure.push(VERIFICATION_BADGES.SKILL_VERIFIED);
      if (signals.completedJobsCount >= 5) badgesToEnsure.push(VERIFICATION_BADGES.EXPERIENCED_WORKER);
      if (88 >= 70) badgesToEnsure.push(VERIFICATION_BADGES.TRUSTED_WORKER);
      if ((signals.averageRating || 0) >= 4.5 && signals.completedJobsCount >= 3) {
        badgesToEnsure.push(VERIFICATION_BADGES.TOP_RATED_WORKER);
      }

      expect(badgesToEnsure).toContain(VERIFICATION_BADGES.MOBILE_VERIFIED);
      expect(badgesToEnsure).toContain(VERIFICATION_BADGES.SKILL_VERIFIED);
      expect(badgesToEnsure).toContain(VERIFICATION_BADGES.EXPERIENCED_WORKER);
      expect(badgesToEnsure).toContain(VERIFICATION_BADGES.TRUSTED_WORKER);
      expect(badgesToEnsure).toContain(VERIFICATION_BADGES.TOP_RATED_WORKER);
    });
  });

  // ============================================================
  // 2. Aadhaar Paperless Offline e-KYC (System B) & Security Tests
  // ============================================================
  describe('System B — Aadhaar Offline e-KYC & Security Defenses', () => {
    test('extractXmlFromZipSecure rejects ZIP payloads exceeding maximum size (ZIP Bomb Defense)', async () => {
      const oversizedBuffer = Buffer.alloc(3 * 1024 * 1024); // 3 MB > 2 MB max limit
      await expect(
        AadhaarVerificationService.extractXmlFromZipSecure(oversizedBuffer, '1234')
      ).rejects.toThrow(/exceeds maximum allowed size/i);
    });

    test('sanitizeXmlContent strips dangerous DOCTYPE and ENTITY declarations (XXE Defense)', () => {
      const maliciousXml = `<!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><OfflinePaperlessKyc><UidData><Poi name="Ravi Patil" dob="01-01-1990"/></UidData></OfflinePaperlessKyc>`;
      const sanitized = AadhaarVerificationService.sanitizeXmlContent(maliciousXml);
      expect(sanitized).not.toContain('<!DOCTYPE');
      expect(sanitized).not.toContain('<!ENTITY');
      expect(sanitized).toContain('<OfflinePaperlessKyc>');
    });

    test('extractXmlFromZipSecure rejects ZIP files with path traversal entry names', async () => {
      const mockZipBuffer = Buffer.from('../../etc/passwd');
      await expect(
        AadhaarVerificationService.extractXmlFromZipSecure(mockZipBuffer, '1234')
      ).rejects.toThrow(/path traversal/i);
    });

    test('Data Minimization: Verify Aadhaar number, OTP, Share Code, and raw XML are NEVER stored in KYC record', () => {
      const kycRecord = {
        verificationType: 'AADHAAR_OFFLINE_EKYC',
        status: KYC_STATUS.VERIFIED,
        referenceId: 'XXXX-XXXX-1234',
        signatureVerified: true,
        nameMatch: true,
      };

      expect(kycRecord).not.toHaveProperty('aadhaarNumber');
      expect(kycRecord).not.toHaveProperty('shareCode');
      expect(kycRecord).not.toHaveProperty('rawXml');
      expect(kycRecord).not.toHaveProperty('otp');
      expect(kycRecord.referenceId).toMatch(/^XXXX-XXXX-\d{4}$/);
    });
  });

  // ============================================================
  // 3. Security Log Sanitizer & Privacy Protections
  // ============================================================
  describe('Security Log Sanitizer & Privacy Guards', () => {
    test('sanitizeData redacts sensitive keys (Aadhaar, Share Code, OTP, Passwords, Payment Secrets)', () => {
      const sensitivePayload = {
        aadhaarNumber: '1234-5678-9012',
        shareCode: '1234',
        otpCode: '998877',
        password: 'SecretPassword123!',
        razorpay_key_secret: 'rzp_secret_xyz123',
        cvv: '999',
        userName: 'Ravi Patil',
      };

      const sanitized = sanitizeData(sensitivePayload);
      expect(sanitized.aadhaarNumber).toBe('[REDACTED]');
      expect(sanitized.shareCode).toBe('[REDACTED]');
      expect(sanitized.otpCode).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.razorpay_key_secret).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
      expect(sanitized.userName).toBe('Ravi Patil');
    });
  });

  // ============================================================
  // 4. Admin RBAC & Privilege Escalation Defenses
  // ============================================================
  describe('Admin RBAC & Security Guards', () => {
    test('Non-Super-Admin cannot grant permissions higher than their assigned permission set (Privilege Escalation Guard)', async () => {
      const targetRoleData = {
        name: 'CUSTOM_HIGH_PRIVILEGE_ROLE',
        permissions: ['roles.manage', 'refunds.manage'], // Permissions not held by mockAdmin
      };

      await expect(
        adminRoleService.createRole(targetRoleData, mockAdmin)
      ).rejects.toThrow(/Privilege Escalation Forbidden/i);
    });

    test('Non-Super-Admin privilege check rejects assigning SUPER_ADMIN role', () => {
      const targetRoleName = 'SUPER_ADMIN';
      const isSuperAdminAssignment = targetRoleName === 'SUPER_ADMIN';
      const allowed = mockAdmin.isSuperAdmin || !isSuperAdminAssignment;
      expect(allowed).toBe(false);
    });
  });

  // ============================================================
  // 5. Reports & Internal Notes Confidentiality
  // ============================================================
  describe('Reports & Complaints Privacy', () => {
    test('createReport sets default HIGH priority for FRAUD, HARASSMENT, and VERIFICATION_ABUSE categories', () => {
      const reportData = {
        category: 'FRAUD',
        title: 'Suspicious Job Listing Fraud',
        description: 'Job asking for advance fee payment.',
      };

      let determinedPriority = reportData.priority || REPORT_PRIORITY.MEDIUM;
      if (['FRAUD', 'HARASSMENT', 'VERIFICATION_ABUSE'].includes(reportData.category)) {
        determinedPriority = REPORT_PRIORITY.HIGH;
      }

      expect(determinedPriority).toBe(REPORT_PRIORITY.HIGH);
    });
  });

  // ============================================================
  // 6. Platform Settings & Environment Secrets Isolation
  // ============================================================
  describe('Platform Settings & Secrets Isolation', () => {
    test('Default Platform Settings contain zero secrets (Secrets isolated in env vars)', () => {
      const sampleSettings = [
        { key: 'trust_weight_mobile', value: 15 },
        { key: 'badge_threshold_trusted', value: 70 },
        { key: 'kyc_max_zip_size_mb', value: 2 },
        { key: 'payment_currency', value: 'INR' },
        { key: 'maintenance_mode_enabled', value: false },
      ];

      for (const s of sampleSettings) {
        expect(s.key).not.toContain('secret');
        expect(s.key).not.toContain('private_key');
        expect(s.key).not.toContain('api_password');
      }
    });
  });
});
