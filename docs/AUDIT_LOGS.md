# Immutable Administrative Security Audit Logs

## System Architecture

All administrative actions on AgriConnect write an immutable audit log entry to the `AuditLog` collection.

---

## Logged Record Schema

- `admin` / `actor`: ObjectId ref `User`
- `action`: Event identifier string (e.g. `USER_SUSPENDED`, `CERTIFICATE_APPROVED`, `IDENTITY_VERIFICATION_PASSED`)
- `resource` & `resourceId`: Target entity kind and ObjectId
- `timestamp`: Date timestamp
- `ipAddress` / `IP`: Client IP address
- `userAgent`: HTTP User Agent header
- `metadata` / `details`: Sanitized JSON payload

---

## Immutability Protection

- Mongoose pre-hooks on `AuditLog` explicitly block deletion calls (`deleteOne`, `deleteMany`, `findOneAndDelete`, `remove`).
- Audit log records are permanent, append-only security documents.
