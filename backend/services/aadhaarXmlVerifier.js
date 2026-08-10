import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Pluggable UIDAI Offline XML Digital Signature Verifier
 *
 * DESIGN:
 * - Loads UIDAI public certificate from configurable path (UIDAI_CERT_PATH env var)
 * - When UIDAI rotates certificates, update the .cer file — no code changes needed
 * - Returns { valid: boolean, error?: string }
 *
 * COMPLIANCE:
 * - Uses Node.js crypto for XML digital signature verification
 * - Does NOT call any UIDAI API
 * - Does NOT store or transmit OTP/biometric
 * - Raw XML is processed in-memory only, never persisted
 */

/**
 * Load UIDAI public certificate for signature verification
 * @returns {string|null} PEM-formatted certificate or null if not configured
 */
const loadUidaiCertificate = () => {
  const certPath = process.env.UIDAI_CERT_PATH;

  if (!certPath) {
    logger.warn('[AadhaarVerifier] UIDAI_CERT_PATH not configured. Signature verification disabled.');
    return null;
  }

  try {
    const resolvedPath = path.resolve(certPath);
    if (!fs.existsSync(resolvedPath)) {
      logger.error(`[AadhaarVerifier] UIDAI certificate not found at: ${resolvedPath}`);
      return null;
    }

    const certContent = fs.readFileSync(resolvedPath, 'utf-8');

    // If it's a DER-encoded .cer, convert to PEM
    if (!certContent.includes('-----BEGIN CERTIFICATE-----')) {
      const derBuffer = fs.readFileSync(resolvedPath);
      const base64Cert = derBuffer.toString('base64');
      return `-----BEGIN CERTIFICATE-----\n${base64Cert.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
    }

    return certContent;
  } catch (err) {
    logger.error(`[AadhaarVerifier] Failed to load UIDAI certificate: ${err.message}`);
    return null;
  }
};

/**
 * Extract the signature value and signed content from UIDAI Offline XML
 * The Offline KYC XML uses XML-DSig (XML Digital Signature) format.
 *
 * @param {string} xmlContent - Raw XML string
 * @returns {{ signedInfo: string, signatureValue: string } | null}
 */
const extractSignatureComponents = (xmlContent) => {
  try {
    // Extract SignatureValue
    const sigValueMatch = xmlContent.match(/<SignatureValue[^>]*>([\s\S]*?)<\/SignatureValue>/i);
    if (!sigValueMatch) return null;

    const signatureValue = sigValueMatch[1].replace(/\s/g, '');

    // Extract the SignedInfo block (canonical form)
    const signedInfoMatch = xmlContent.match(/<SignedInfo[^>]*>([\s\S]*?)<\/SignedInfo>/i);
    if (!signedInfoMatch) return null;

    const signedInfo = `<SignedInfo>${signedInfoMatch[1]}</SignedInfo>`;

    return { signedInfo, signatureValue };
  } catch (err) {
    logger.error(`[AadhaarVerifier] Failed to extract signature components: ${err.message}`);
    return null;
  }
};

/**
 * Verify the digital signature of a UIDAI Offline e-KYC XML document
 *
 * @param {string} xmlContent - Raw XML content (processed in-memory only)
 * @returns {{ valid: boolean, error?: string }}
 */
export const verifyXmlSignature = (xmlContent) => {
  try {
    if (!xmlContent || typeof xmlContent !== 'string') {
      return { valid: false, error: 'Invalid XML content provided' };
    }

    const certificate = loadUidaiCertificate();

    if (!certificate) {
      // If certificate is not configured, return a clear status
      // In production, this should be configured; in dev, allow manual review
      return {
        valid: false,
        error: 'UIDAI certificate not configured. Manual review required.',
      };
    }

    const sigComponents = extractSignatureComponents(xmlContent);
    if (!sigComponents) {
      return { valid: false, error: 'Could not extract digital signature from XML' };
    }

    // Verify signature using UIDAI public key
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(sigComponents.signedInfo);

    const isValid = verifier.verify(certificate, sigComponents.signatureValue, 'base64');

    return { valid: isValid, error: isValid ? undefined : 'Digital signature verification failed' };
  } catch (err) {
    logger.error(`[AadhaarVerifier] Signature verification error: ${err.message}`);
    return { valid: false, error: `Verification error: ${err.message}` };
  }
};

/**
 * Compute SHA-256 hash of XML content for integrity tracking
 * @param {string} xmlContent
 * @returns {string} Hex-encoded hash
 */
export const hashXmlContent = (xmlContent) => {
  return crypto.createHash('sha256').update(xmlContent, 'utf-8').digest('hex');
};

/**
 * Extract non-PII reference data from UIDAI Offline XML
 * Returns ONLY masked reference ID and name for matching — NO full Aadhaar, no address, no biometric
 *
 * @param {string} xmlContent
 * @returns {{ referenceId: string, nameForMatching: string }}
 */
export const extractNonPiiData = (xmlContent) => {
  try {
    // Extract referenceId (last 4 digits masked format)
    const refIdMatch = xmlContent.match(/referenceId="([^"]+)"/i) ||
                       xmlContent.match(/uid="([^"]+)"/i);
    let referenceId = '';
    if (refIdMatch) {
      const rawId = refIdMatch[1].replace(/\s/g, '');
      // Mask all but last 4 digits
      referenceId = rawId.length > 4
        ? 'XXXX-XXXX-' + rawId.slice(-4)
        : rawId;
    }

    // Extract name for matching (NOT stored permanently)
    const nameMatch = xmlContent.match(/name="([^"]+)"/i) ||
                      xmlContent.match(/<name>([^<]+)<\/name>/i);
    const nameForMatching = nameMatch ? nameMatch[1].trim() : '';

    return { referenceId, nameForMatching };
  } catch (err) {
    logger.error(`[AadhaarVerifier] Failed to extract non-PII data: ${err.message}`);
    return { referenceId: '', nameForMatching: '' };
  }
};
