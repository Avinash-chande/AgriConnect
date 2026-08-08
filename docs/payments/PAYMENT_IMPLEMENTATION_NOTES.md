# AgriConnect — Payment Implementation Notes

> Internal developer reference for the Phase 9 payment system implementation

---

## Test Mode vs Production Mode

This is the most critical distinction in the payment system. Understanding the difference prevents costly mistakes.

---

### What Changes Between Modes

| Aspect | Test Mode | Production Mode |
|---|---|---|
| Razorpay Key ID | `rzp_test_*` | `rzp_live_*` |
| Real money charged | ❌ No | ✅ Yes |
| Test card numbers | ✅ Accepted | ❌ Not accepted |
| Webhook IPs | Razorpay test servers | Razorpay live servers |
| Razorpay Dashboard | Test section | Live section |
| Startup crash on bad config | ❌ Warning | ✅ Yes, throws |
| `NODE_ENV` | `development` or `test` | `production` |
| `RAZORPAY_ENVIRONMENT` | `development`, `test`, or `sandbox` | `production` or `live` |

---

### Test Mode Setup (Development)

In test mode, no real money is ever charged. All test payments are simulated by Razorpay.

**`.env` for test mode:**
```env
NODE_ENV=development
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_test_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
RAZORPAY_ENVIRONMENT=development
PAYMENT_CURRENCY=INR
PREMIUM_MONTHLY_PLAN_ID=farmer_pro_monthly
PREMIUM_YEARLY_PLAN_ID=farmer_pro_yearly
```

**Test payment cards (Razorpay test mode only):**

```
Visa:       4111 1111 1111 1111
MasterCard: 5267 3181 8797 5449
Rupay:      6366 9900 0121 0002
Expiry:     Any future date (e.g. 12/26)
CVV:        Any 3 digits (e.g. 123)
OTP/2FA:    Use "success" to approve, "failure" to decline

UPI (success): success@razorpay
UPI (failure): failure@razorpay

Netbanking: Select any bank → choose "success" scenario
```

**Automated tests (Vitest/Jest):**

In `NODE_ENV=test`, the Razorpay SDK is replaced by a mock instance that:
- Returns valid mock order IDs (`order_mock_xxx`)
- Accepts any HMAC signature as valid
- Simulates payment success/failure deterministically
- Never makes network calls

---

### Production Mode Setup

**Pre-flight checklist:**

```
[ ] Razorpay KYC verification complete
[ ] Live API keys obtained from Razorpay Dashboard (Live Mode)
[ ] Live webhook URL registered with HTTPS
[ ] RAZORPAY_WEBHOOK_SECRET is unique and min 12 chars
[ ] RAZORPAY_KEY_SECRET is min 16 chars
[ ] NODE_ENV=production in deployment environment
[ ] RAZORPAY_ENVIRONMENT=production
[ ] No placeholder values in any RAZORPAY_* variables
[ ] .env file is NOT committed to git
[ ] Secrets stored in environment manager (e.g. Vercel, Railway, AWS SSM)
[ ] SSL/TLS certificate active on API domain
[ ] Webhook retry monitoring in place
```

**Startup behaviour:**

In `NODE_ENV=production`, `getValidatedPaymentConfig()` validates every secret. If any are missing or contain placeholder values, the server **throws an error and refuses to start**. This is intentional — it prevents deploying with misconfigured payment infrastructure.

```
❌ [PaymentConfig] Startup Configuration Errors:
   [PROD] RAZORPAY_KEY_SECRET is missing, placeholder, or insecure in production.
   [PROD] RAZORPAY_ENVIRONMENT must be set to "production" or "live" when NODE_ENV is production.

UnhandledPromiseRejection: Production Environment Validation Failed: ...
```

---

## Idempotency Implementation

### Order Creation

The `idempotencyKey` parameter prevents double-charging when users submit the order form multiple times:

```javascript
// Recommended idempotencyKey format (client-generated):
`${userId}_${planId}_${Math.floor(Date.now() / 60000)}`
// Changes every 60 seconds — prevents duplicates within the same minute
```

If a payment order already exists for the same `idempotencyKey` with status `created`:
- The existing order details are returned (no new Razorpay order is created)
- The user can complete payment on the existing order

### Webhook Events

Every Razorpay webhook event has a unique `eventId`. Before processing, the backend:
1. Checks `WebhookEvent.findOne({ eventId })`
2. If found → returns `200 OK` without reprocessing
3. If not found → processes and stores the event

This prevents double subscription activation even when Razorpay retries delivery.

---

## Error Handling Reference

### Payment Error Codes

| Code | HTTP | When It Occurs |
|---|---|---|
| `INVALID_PLAN` | 400 | Plan ID not found or inactive |
| `ORDER_CREATION_FAILED` | 502 | Razorpay API returned error creating order |
| `PAYMENT_FAILED` | 400 | Generic payment failure |
| `SIGNATURE_MISMATCH` | 400 | HMAC-SHA256 verification failed on /verify |
| `WEBHOOK_VERIFICATION_FAILED` | 400 | Invalid signature on webhook request |
| `NETWORK_TIMEOUT` | 503 | Razorpay API timeout |
| `PROVIDER_UNAVAILABLE` | 503 | Razorpay API unreachable |
| `DUPLICATE_TRANSACTION` | 409 | idempotencyKey already processed |
| `REFUND_FAILED` | 502 | Razorpay refund API returned error |
| `DATABASE_FAILURE` | 500 | MongoDB operation failed |
| `INVOICE_GENERATION_FAILED` | 500 | PDF or DB error during invoice creation |
| `SUBSCRIPTION_UPDATE_FAILED` | 500 | Subscription upsert failed |
| `UNAUTHORIZED_ACCESS` | 403 | Insufficient role/plan |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable description for display",
  "code": "SIGNATURE_MISMATCH"
}
```

### Frontend Handling

Map error codes to user-friendly messages:

```javascript
const ERROR_MESSAGES = {
  SIGNATURE_MISMATCH: 'Payment could not be verified. Please contact support.',
  ORDER_CREATION_FAILED: 'Unable to create payment order. Please try again.',
  INVALID_PLAN: 'The selected plan is no longer available.',
  RATE_LIMIT_EXCEEDED: 'Too many payment attempts. Please wait and try again.',
  DUPLICATE_TRANSACTION: 'This payment has already been processed.',
};
```

---

## Environment Variables — Complete Reference

| Variable | Required | Default (Dev) | Production Requirement |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | `rzp_test_agriconnect_key_2026` | `rzp_live_*`, non-placeholder |
| `RAZORPAY_KEY_SECRET` | Yes | `agriconnect_rzp_secret_key_2026_dev` | Non-placeholder, min 16 chars |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | `agriconnect_webhook_secret_2026` | Non-placeholder, min 12 chars |
| `RAZORPAY_ENVIRONMENT` | Yes | `development` | `production` or `live` |
| `PAYMENT_CURRENCY` | Yes | `INR` | Valid 3-letter ISO code |
| `PREMIUM_MONTHLY_PLAN_ID` | Yes | `farmer_pro_monthly` | Non-placeholder string |
| `PREMIUM_YEARLY_PLAN_ID` | Yes | `farmer_pro_yearly` | Non-placeholder string |

**Validation rules (from `paymentConfig.js`):**

- Placeholder detection: values containing `your_`, `placeholder`, `change_me`, `example`, `dummy`, `xxxx` are treated as insecure
- `RAZORPAY_ENVIRONMENT` must be one of: `development`, `test`, `sandbox`, `live`, `production`
- `PAYMENT_CURRENCY` must match regex `/^[A-Z]{3}$/i`
- In production: Key Secret must be ≥16 chars, Webhook Secret must be ≥12 chars

---

## Security Checklist

### Development
- [ ] `rzp_test_*` keys only
- [ ] `.env` is in `.gitignore`
- [ ] No secrets hardcoded in source files
- [ ] Webhook tested via ngrok

### Pre-Production
- [ ] Full test suite passes (`npm test`)
- [ ] Webhook signature verification tested
- [ ] `NODE_ENV=production` startup validation passes without errors
- [ ] Rate limiting verified
- [ ] Log output reviewed for secret leaks

### Production
- [ ] `rzp_live_*` keys only in production environment
- [ ] Secrets stored in secure environment manager (not in `.env` file on server)
- [ ] HTTPS enforced on all API routes
- [ ] Webhook endpoint HMAC verified
- [ ] Failed webhook monitoring enabled
- [ ] Admin endpoints restricted by `authorize('Admin')` middleware
- [ ] Refund approval requires admin action (no self-approval)

---

## Production Deployment Notes

### Environment Variable Management

Store secrets in your cloud provider's secret manager, not in flat files:

- **Vercel**: Environment Variables settings panel (encrypted at rest)
- **Railway**: Variables tab in project settings
- **AWS**: Systems Manager Parameter Store or Secrets Manager
- **Heroku**: Config Vars in app settings

Never export secrets to logs or error tracking tools (e.g. Sentry). The log sanitizer handles Winston logs automatically, but manually verify that any third-party error tracking integration does not capture payment-related request bodies.

### Health Check

Verify payment system is operational after deployment:

```bash
# 1. Check plans are seeded
curl https://api.yourdomain.com/api/v1/plans

# 2. Check subscription status endpoint (requires valid JWT)
curl -H "Authorization: Bearer <token>" \
  https://api.yourdomain.com/api/v1/payments/subscription

# 3. Send test webhook event from Razorpay Dashboard
# Dashboard → Settings → Webhooks → "Send Test Event"
# Expect: 200 OK response
```

### Razorpay Dashboard Monitoring

After deployment, monitor:
- **Payments → All Payments**: Real-time capture status
- **Webhooks → Webhook Events**: Delivery status and failures
- **Refunds**: All refund requests and statuses
- **Analytics**: Revenue trends, success rates

---

## Testing Guide

### Run Backend Payment Tests

```bash
cd backend
npm test

# Run specific test suites
npm test -- tests/createPaymentOrderApi.test.js
npm test -- tests/verifyPaymentApi.test.js
npm test -- tests/webhookApi.test.js
npm test -- tests/planApi.test.js
npm test -- tests/phase9EnvironmentConfig.test.js
```

### Key Test Scenarios Covered

| Test Suite | Scenarios |
|---|---|
| `createPaymentOrderApi` | Valid order creation, invalid planId, rate limit, duplicate idempotency key |
| `verifyPaymentApi` | Valid verification, signature mismatch, missing fields |
| `webhookApi` | Valid events, duplicate events, invalid signatures, unknown events |
| `planApi` | List plans, get by ID, filter by role |
| `phase9EnvironmentConfig` | Placeholder detection, production validation, secret redaction |

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
