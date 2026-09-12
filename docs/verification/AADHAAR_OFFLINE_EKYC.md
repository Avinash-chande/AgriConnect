# System B: UIDAI Aadhaar Paperless Offline e-KYC Integration

## Overview

System B handles worker identity verification using UIDAI Paperless Offline e-KYC XML files extracted from password-protected ZIP archives using a 4-digit Share Code.

---

## Technical Workflow

1. **In-Memory Payload Loading**: ZIP file payload is read in-memory.
2. **ZIP Bomb Defense**: Enforces 2 MB maximum uncompressed size limit and 5-file entry limit.
3. **Path Traversal Defense**: Filters file entry names to safe basenames.
4. **XXE Defense**: `sanitizeXmlContent` strips `<!DOCTYPE>` and `<!ENTITY>` tags.
5. **Digital Signature Verification**: `verifyXmlSignature` validates RSA-2048 XML digital signatures.
6. **Profile Matching**: Compares user account name against UIDAI XML `Poi` name attribute.
7. **Data Minimization**: Extracts only `referenceId`, `name`, `dob`.
8. **Badge Issuance**: On successful validation, issues `IDENTITY_VERIFIED` badge and updates user `identityVerified = true`.

---

## Zero Aadhaar Storage Guarantee

- **No Aadhaar Number**: UIDAI Paperless Offline e-KYC XML does not contain the 12-digit Aadhaar number.
- **Sanitized Reference ID**: Reference IDs are stored as `XXXX-XXXX-1234`.
- **Zero Raw XML Storage**: Raw XML strings and Share Codes are deleted immediately after in-memory parsing.
- **Zero Log Leakage**: `logSanitizer.js` redacts any accidental aadhaar keywords.
