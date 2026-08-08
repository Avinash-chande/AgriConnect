# AgriConnect Payment Webhooks Guide

> Phase 9 — Razorpay Webhook Configuration, Event Handling & Idempotency

---

## Overview

Webhooks are **asynchronous HTTP notifications** sent by Razorpay to your server when payment events occur. They serve as the authoritative source of truth for payment state, even when the frontend user closes the browser before completing the payment flow.

AgriConnect uses webhooks as a **redundant recovery layer** — the primary activation path goes through `POST /payments/verify`, but webhooks handle edge cases where the client doesn't call verify (e.g. network drop, browser crash, ad blocker).

---

## Webhook Endpoint

```
POST /api/v1/payments/webhook
```

**Important:** This endpoint:
- Does **not** require a JWT (it's called by Razorpay servers)
- Requires the **raw request body** before JSON parsing for HMAC verification
- Has a **dedicated rate limiter** (50 req/min) independent from other endpoints
- Returns `200 OK` for all processed or duplicate events (to stop Razorpay retrying)

---

## Setting Up Webhooks

### Step 1: Get Your Webhook URL

**Development (ngrok):**
```
https://abc123.ngrok.io/api/v1/payments/webhook
```

**Production:**
```
https://api.yourdomain.com/api/v1/payments/webhook
```

### Step 2: Register in Razorpay Dashboard

1. Login to [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Navigate to **Settings → Webhooks**
3. Click **Add New Webhook**
4. Enter your webhook URL
5. Set a **Webhook Secret** (generate a strong random string, min 12 chars):
   ```bash
   # Generate a secure webhook secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
6. Select the following events:
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `refund.processed`
   - ✅ `subscription.cancelled` (if using Razorpay subscriptions)
7. Copy the Webhook Secret into your `.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=your_generated_secret_here
   ```

### Step 3: Test Webhook Delivery

From the Razorpay dashboard, use "Send Test Webhook" to simulate events and verify your server responds with `200 OK`.

---

## HMAC Signature Verification

Every webhook request includes an `x-razorpay-signature` header. The server verifies it before processing any event:

```
webhookSignature = HMAC_SHA256(
  key     = RAZORPAY_WEBHOOK_SECRET,
  message = raw_request_body_bytes
)
```

**Critical:** The signature is computed against the **raw bytes**, not the parsed JSON. The backend uses `express.raw({ type: 'application/json' })` on this route specifically.

If verification fails, the server returns `400 Bad Request` and logs a warning. The event is **not processed**.

---

## Supported Events

### `payment.captured`

Triggered when a payment is successfully captured (funds deducted from customer).

**Behaviour:**
1. Find the `Payment` document by `orderId`
2. If not found: Create a recovery Payment document from webhook data
3. If found: Update status to `captured`, record `paymentId`
4. Create `Transaction` document (immutable)
5. If `planId` in metadata: Activate/upsert `Subscription`
6. Update `User.isPremium = true`, set `subscriptionExpiresAt`
7. Generate GST `Invoice`
8. Dispatch `PREMIUM_ACTIVATED` notification

**Idempotency:** If this event fires twice, the subscription upsert is idempotent. The invoice generator checks for existing invoices by transactionId.

```json
{
  "event": "payment.captured",
  "entity": {
    "id": "pay_NxxxxxxxxxK",
    "order_id": "order_NxxxxxxxxxJ",
    "amount": 49900,
    "currency": "INR",
    "status": "captured",
    "notes": {
      "userId": "64a2f...",
      "planId": "farmer_pro_monthly"
    }
  }
}
```

---

### `payment.failed`

Triggered when a payment attempt fails (insufficient funds, card declined, timeout).

**Behaviour:**
1. Find `Payment` document by `orderId`
2. Update status to `failed`
3. Dispatch `PAYMENT_FAILED` notification to user

```json
{
  "event": "payment.failed",
  "entity": {
    "id": "pay_NxxxxxxxxxX",
    "order_id": "order_NxxxxxxxxxJ",
    "status": "failed",
    "error_code": "BAD_REQUEST_ERROR",
    "error_description": "Payment failed due to insufficient funds"
  }
}
```

---

### `refund.processed`

Triggered when Razorpay completes processing a refund.

**Behaviour:**
1. Find `Refund` document by `providerRefundId` or `notes.refundId`
2. Update refund status to `processed`
3. Update `Payment` status to `refunded` or `partially_refunded`
4. Dispatch `REFUND_PROCESSED` notification to user

```json
{
  "event": "refund.processed",
  "entity": {
    "id": "rfnd_NxxxxxxxxxR",
    "payment_id": "pay_NxxxxxxxxxK",
    "amount": 49900,
    "status": "processed"
  }
}
```

---

### `subscription.cancelled`

Triggered if using Razorpay's native subscription product.

**Behaviour:**
1. Find `Subscription` by `providerSubscriptionId`
2. Set status to `cancelled`
3. Update `User.isPremium = false`
4. Dispatch cancellation notification

---

## Idempotency

Every webhook event is deduplicated using the `WebhookEvent` MongoDB collection.

### Flow

```
Receive event (eventId = entity.id)
│
▼
SELECT WebhookEvent WHERE eventId = entity.id
│
├─ FOUND → status: 'processed'
│    → Return 200 OK (skip duplicate)
│
├─ FOUND → status: 'processing'
│    → Return 200 OK (concurrent duplicate, skip)
│
└─ NOT FOUND
     → INSERT WebhookEvent (status: processing)
     → Run event handler
     → UPDATE WebhookEvent (status: processed)
     → Return 200 OK
```

### Why This Matters

Razorpay retries webhook delivery up to **3 times** if the server doesn't respond `200 OK` within 5 seconds. Without idempotency, a subscription could be activated or a refund processed multiple times.

---

## Error Handling

### Handler Errors

If an event handler throws an error:
1. The `WebhookEvent` is marked `status: failed`
2. The error is logged with full context
3. The endpoint still returns `200 OK` to stop Razorpay from retrying (since retrying won't fix code/DB errors)
4. Alerts should be set up in production monitoring to catch `status: failed` webhook events

### Verification Failure

If HMAC signature verification fails:
- Return `400 Bad Request`
- Log: `[WebhookService] Webhook signature verification failed`
- **Do not** return `200 OK` — this may be an unauthorized request

### Unknown Events

Events not in the handler dictionary are logged as `ignored` and return `200 OK`. No processing occurs.

---

## Webhook Retry Policy

Razorpay retries failed webhook deliveries (5xx or no response) with exponential backoff:
- Attempt 1: Immediately
- Attempt 2: 30 minutes later
- Attempt 3: 2 hours later

If all 3 attempts fail, the event is not retried further. Check Razorpay Dashboard → Webhooks → Failed Events for manual replay.

---

## Local Webhook Testing with ngrok

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Expose local server
ngrok http 5000

# Copy HTTPS URL, e.g. https://abc123.ngrok.io
# Register: https://abc123.ngrok.io/api/v1/payments/webhook in Razorpay Dashboard

# Test with curl (simulate Razorpay sending an event)
curl -X POST https://abc123.ngrok.io/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <computed_hmac>" \
  -d '{"event":"payment.captured","entity":{...}}'
```

---

## Monitoring

In production, monitor for:

1. **Failed webhook events**: `WebhookEvent.find({ status: 'failed' })`
2. **Unprocessed payments**: `Payment.find({ status: 'created', createdAt: { $lt: Date.now() - 1h } })`
3. **Webhook endpoint error rate**: Alert if `4xx` responses from `/payments/webhook` exceed threshold

---

## Webhook vs Client Verification

| Aspect | Client (`POST /verify`) | Webhook |
|---|---|---|
| Triggered by | User's browser | Razorpay servers |
| Timing | Immediately after payment | Up to 30s after payment |
| Reliability | May fail (network, browser close) | Reliable, retried by Razorpay |
| Primary path | Yes | Fallback/recovery |
| Requires JWT | Yes | No (uses HMAC) |
| Idempotent | Yes (orderId check) | Yes (WebhookEvent) |

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
