# AgriConnect Payment Security Guide

> Phase 9 — Security Architecture, Threat Model & Best Practices

---

## Overview

This document covers every security control in AgriConnect's payment system. It is intended for developers, security reviewers, and DevOps teams deploying the payment infrastructure.

---

## 1. Secret Management

### Never Commit Secrets

The following environment variables must **never appear in source code**, git history, CI logs, or any team communication channel:

- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- Any `*_SECRET` or `*_KEY_SECRET` variable

### Verification

```bash
# Check that .env is gitignored
cat .gitignore | grep ".env"

# Scan for potential secret leaks
git grep -i "rzp_live"
git grep -i "key_secret"
```

### Secret Rotation

- Rotate Razorpay keys **immediately** if they appear in any log, error message, or public location
- Razorpay Dashboard → Settings → API Keys → Regenerate
- Update production environment variables and restart the server within 5 minutes

---

## 2. HMAC-SHA256 Payment Signature Verification

Every payment verification is protected by a cryptographic signature that **cannot be forged** without the `RAZORPAY_KEY_SECRET`.

### How It Works

```
signature = HMAC_SHA256(
  key     = RAZORPAY_KEY_SECRET,
  message = razorpay_order_id + "|" + razorpay_payment_id
)
```

The computed signature is compared against `razorpay_signature` using a **timing-safe comparison** (`crypto.timingSafeEqual`) to prevent timing attacks.

### Attack Prevention

| Attack | Prevention |
|---|---|
| Forged payment confirmation | Signature fails without Key Secret |
| Replay attack | orderId is unique per session; deduplication in DB |
| Amount tampering | Amount is resolved server-side; frontend value ignored |
| Man-in-the-middle | TLS/HTTPS enforced; signature still required |
| Timing attack on signature | `crypto.timingSafeEqual` used for comparison |

---

## 3. Webhook Security

### HMAC Signature Verification

Every incoming Razorpay webhook is verified against the `RAZORPAY_WEBHOOK_SECRET`:

```
webhookSignature = HMAC_SHA256(
  key     = RAZORPAY_WEBHOOK_SECRET,
  message = raw_request_body_bytes
)
```

This requires capturing the **raw bytes** before any JSON parsing. The Express middleware uses `express.raw({ type: 'application/json' })` on the webhook route.

### Idempotency Protection

Every webhook event is stored in `WebhookEvent` collection before processing:

```
1. Receive event with eventId
2. Check if WebhookEvent exists for eventId
   → If yes: return 200 OK (duplicate, skip processing)
   → If no: insert WebhookEvent (status: processing)
3. Process event
4. Update WebhookEvent (status: processed)
```

This ensures that even if Razorpay retries (up to 3 times), the subscription is activated exactly once.

### Webhook Allowlist

In production, only allow inbound requests from Razorpay IP ranges at the network/firewall level. Current Razorpay webhook IP ranges are published in their documentation.

### Rate Limiting

The webhook endpoint has a dedicated rate limiter:
- **50 requests per minute** — absorbs burst retries from Razorpay
- Applied **before** signature verification to prevent resource exhaustion

---

## 4. Log Sanitization

The `logSanitizer.js` utility automatically redacts all payment-related secrets from every log output using Winston's custom format.

### Redacted Keys

```
razorpay_key_id
razorpay_key_secret
razorpay_webhook_secret
razorpay_signature
razorpay_payment_id (partial)
key_secret
webhook_secret
```

### How It Works

```javascript
// ANY log containing these values is automatically redacted
logger.info({ razorpay_key_secret: 'MY_SECRET' });
// Output: { razorpay_key_secret: '[REDACTED]' }

logger.info('key_secret=abc123');
// Output: 'key_secret=[REDACTED]'
```

### Safe Configuration Logging

Use `getSanitizedConfig()` when logging payment config state:

```javascript
import { paymentConfig } from './config/paymentConfig.js';

logger.info('Payment config', paymentConfig.getSanitizedConfig());
// Output: { RAZORPAY_KEY_ID: 'rzp_test_xxx', RAZORPAY_KEY_SECRET: '[REDACTED]', ... }
```

---

## 5. Environment Validation at Startup

`getValidatedPaymentConfig()` runs at server startup and enforces:

### Development & Test
- Warns if placeholder/default values are detected
- Falls back to safe test defaults
- Server starts normally with a warning log

### Production (Strict)
- `RAZORPAY_KEY_ID` must not be a placeholder and must start with `rzp_live_` or be non-empty
- `RAZORPAY_KEY_SECRET` must be present and ≥16 characters
- `RAZORPAY_WEBHOOK_SECRET` must be present and ≥12 characters
- `RAZORPAY_ENVIRONMENT` must be `production` or `live`
- `PREMIUM_MONTHLY_PLAN_ID` and `PREMIUM_YEARLY_PLAN_ID` must be explicitly set

**Violation behaviour:** Server throws an unhandled error, logs all violations, and exits. This prevents running production with insecure configuration.

---

## 6. Server-Side Amount Authority

**The frontend never determines payment amounts.**

```javascript
// CORRECT: Backend resolves price from database
const plan = await Plan.findOne({ planId });
const amountPaise = Math.round(plan.price * 100); // e.g. 499 * 100 = 49900

// The Razorpay order is created with this server-resolved amount
const razorpayOrder = await razorpay.orders.create({
  amount: amountPaise,
  currency: 'INR',
  ...
});
```

Even if an attacker sends a tampered amount in the request body, it is ignored. The backend resolves the plan price independently from the database.

---

## 7. Authentication & Authorization

### Premium Access Guard

The `requirePremiumAccess()` middleware verifies subscription status directly from MongoDB — it does not rely solely on the `isPremium` boolean flag on the User model.

```javascript
// Checks:
// 1. Is user authenticated?
// 2. Does a Subscription document exist?
// 3. Is subscription status active or cancelled-within-period?
// 4. Is the current date within startDate...endDate + grace period?
// 5. Does the plan match the required plan tier?
```

### Grace Period

After subscription `endDate`, users have a **3-day grace period** during which premium features remain accessible. This handles renewal edge cases. A response header `X-Subscription-Grace-Period: true` signals grace period mode to the frontend.

### Role Authorization

Admin-only endpoints use `authorize('Admin')` middleware that checks `req.user.role`:

- `POST /payments/refund/process`
- `GET /payments/refund/all`
- `POST /payments/expiration/run-maintenance`
- `GET /payments/analytics/admin`

---

## 8. Input Validation

All payment request bodies are validated by `express-validator` before reaching service layer:

```
POST /payments/orders
  └─ planId       required, non-empty string
  └─ purpose      optional string
  └─ idempotencyKey  optional string
  └─ notes        optional object

POST /payments/verify
  └─ razorpay_order_id   required, non-empty string
  └─ razorpay_payment_id required, non-empty string
  └─ razorpay_signature  required, non-empty string
```

Invalid requests are rejected with `400 Bad Request` before any database or Razorpay API interaction.

---

## 9. Rate Limiting

Rate limiting prevents brute-force attacks and API abuse:

| Endpoint Group | Limit | Window |
|---|---|---|
| Payment orders & verification | 10 requests | 15 minutes |
| Refund requests | 3 requests | 15 minutes |
| Webhook endpoint | 50 requests | 1 minute |

Rate limits are enforced per IP address. In production, ensure that `trust proxy` is configured correctly if running behind a load balancer.

---

## 10. Database Security

### Immutable Transactions

`Transaction` documents are **never updated** after creation. Refunds create a new `Transaction` document of type `refund` rather than modifying the original.

### User Ownership Checks

Every data-fetching service verifies the requesting user owns the resource:

```javascript
// Example: Invoice access
const invoice = await Invoice.findOne({
  transaction: txnDoc._id,
  user: userId  // must match authenticated user
});
if (!invoice) throw new AppError('Invoice not found or access denied.', 404);
```

Admins bypass ownership checks via role check.

---

## 11. HTTPS & Transport Security

- **All API communication must use HTTPS in production**
- Use TLS 1.2+ only
- Set security headers via `helmet` middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000`
- The Razorpay SDK communicates with `api.razorpay.com` over HTTPS with certificate validation

---

## 12. Error Handling & Information Disclosure

Payment errors use typed codes (`PAYMENT_ERROR_CODES`) that are **safe to return to the client**. Stack traces are never returned in production responses.

```javascript
// Safe client-facing error
{
  "success": false,
  "message": "Payment signature verification failed.",
  "code": "SIGNATURE_MISMATCH"
}

// NOT included in production response:
// - Stack traces
// - Internal function names
// - Database query details
// - Raw Razorpay error messages
```

---

## Threat Model Summary

| Threat | Control |
|---|---|
| Fake payment confirmation | HMAC-SHA256 signature required |
| Replay attacks | idempotencyKey + orderId uniqueness |
| Price manipulation | Server-side plan price resolution |
| Webhook spoofing | HMAC webhook secret verification |
| Duplicate webhook processing | WebhookEvent idempotency table |
| Secret exposure in logs | Winston log sanitizer |
| Unauthorized premium access | DB-verified subscription middleware |
| Brute force payment | Rate limiting (10/15min) |
| Mass refund abuse | Refund rate limit (3/15min) |
| Admin action abuse | Role-based `authorize('Admin')` middleware |
| Insecure production config | Startup validation + server exit |

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
