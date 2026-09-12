# AgriConnect Security Hardening & Zero-Leakage Controls

## Executive Security Summary

AgriConnect implements complete security hardening across all application layers, protecting user privacy, preventing broken access control (IDOR), mitigating injection attacks, and enforcing strict data minimization.

---

## Security Controls & Defense Implementation

### 1. Data Minimization & Privacy Protection
- **No Aadhaar Storage**: Raw XML, Aadhaar numbers, Share Codes, OTPs, and biometrics are **never stored** in database records, log files, or Socket.IO notification streams.
- **Masked Reference IDs**: e-KYC reference IDs are permanently sanitized to `XXXX-XXXX-1234`.
- **Private Document Access**: Skill certificate documents require explicit owner/admin authorization (`getCertificateDocumentSecure`). Public profile views omit raw documents.

### 2. Broken Access Control & IDOR Prevention
- Ownership validation (`isOwner || isAdmin`) is enforced on all resource endpoints (user profiles, certificate downloads, job applications, payment invoices).

### 3. XML & ZIP Payload Security
- **ZIP Bomb Defense**: Maximum uncompressed ZIP payload size capped at 2 MB; maximum ZIP file entries capped at 5 files.
- **XXE Attack Defense**: `sanitizeXmlContent` strips `<!DOCTYPE>` and `<!ENTITY>` declarations prior to parsing.
- **Path Traversal Defense**: Enforces strict `path.basename()` extraction on ZIP file entries.

### 4. Injection & Sanitization Guards
- **NoSQL Injection**: Express mongo sanitize strips `$` operator parameters. Mongoose schema validation enforces strict type coercion.
- **Log Sanitization**: `logSanitizer.js` redacts `aadhaar`, `shareCode`, `rawXml`, `otp`, `password`, `cvv`, and API secrets from winston logger outputs.

### 5. Environment Secrets Isolation
- API Keys, Razorpay Secrets, JWT Keys, and Webhook Passwords remain strictly in environment variables (`.env`). No database setting or audit log record stores secret credentials.
