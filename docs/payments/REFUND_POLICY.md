# AgriConnect Refund Policy

> Phase 9 — Refund Eligibility, Process & Timelines

---

## Overview

AgriConnect processes refunds through Razorpay's payment gateway. All refund requests are subject to admin review before being submitted to Razorpay for processing.

---

## Eligibility

### When a Refund is Available

| Situation | Eligible |
|---|---|
| Technical failure during payment (double charge) | ✅ Yes |
| Subscription activated but features unavailable | ✅ Yes |
| Request within 24 hours of purchase | ✅ Yes (at admin discretion) |
| Duplicate purchase of same plan | ✅ Yes |
| Dissatisfied with service (subjective) | At admin discretion |

### When a Refund is NOT Available

| Situation | Eligible |
|---|---|
| More than 7 days after purchase | ❌ No |
| Premium features have been actively used | ❌ No |
| Violation of Terms of Service | ❌ No |
| Job promotion orders (once promotion has started) | ❌ No |
| Free plan (no payment was made) | ❌ No |

---

## Refund Process

### Step 1: User Submits Request

The user submits a refund request through the API:

```
POST /api/v1/payments/refund/request
Authorization: Bearer <token>
Body: {
  "transactionId": "txn_1700000000_1234",
  "reason": "Double charged for same subscription"
}
```

- Request is immediately saved with status `pending`
- User receives a confirmation notification
- Refund ID is returned (e.g. `rfnd_1700000000_5678`)
- Rate limit: **3 requests per 15 minutes** to prevent abuse

### Step 2: Admin Review

An admin reviews the request via the admin panel or API:

```
GET /api/v1/payments/refund/all?status=pending
Authorization: Bearer <ADMIN_TOKEN>
```

The admin can:
- View the original transaction and payment details
- Check user's subscription usage history
- Approve or reject the request

### Step 3: Admin Decision

#### Approve

```
POST /api/v1/payments/refund/process
Authorization: Bearer <ADMIN_TOKEN>
Body: {
  "refundId": "rfnd_1700000000_5678",
  "action": "approve",
  "notes": "Approved: Technical billing error confirmed"
}
```

This submits the refund to Razorpay's API immediately. The amount is transferred back to the user's original payment source (card/bank/UPI).

#### Reject

```
POST /api/v1/payments/refund/process
Authorization: Bearer <ADMIN_TOKEN>
Body: {
  "refundId": "rfnd_1700000000_5678",
  "action": "reject",
  "notes": "Rejected: Premium features have been actively used for 5+ days"
}
```

The rejection note is appended to the refund record and a notification is sent to the user.

---

## Refund Status Lifecycle

```
User submits request
        │
        ▼
    [PENDING]   ← Awaiting admin review
        │
   ┌────┴────┐
   │         │
[PROCESSED] [REJECTED]
   │
   └─► Razorpay processes payment to user's source
```

| Status | Description |
|---|---|
| `pending` | Request submitted, under admin review |
| `processed` | Admin approved; Razorpay refund initiated |
| `rejected` | Admin declined; no payment returned |
| `failed` | Razorpay API error during processing; retry may be needed |

---

## Timelines

| Stage | Expected Duration |
|---|---|
| Request submission | Instant |
| Admin review | 1–2 business days |
| Razorpay processing (after approval) | Instant API call |
| Credit to customer's payment source | 5–7 business days |
| UPI refunds | 1–2 business days |
| Card refunds | 5–7 business days |
| Net banking refunds | 3–5 business days |

> **Note:** Refund credit timelines are controlled by banks and Razorpay, not by AgriConnect.

---

## Partial Refunds

The system supports partial refunds. If a user paid ₹499 and is eligible for a partial credit (e.g. ₹249 for half-month unused):

1. Admin approves with a custom amount via Razorpay Dashboard (direct)
2. Or the admin uses the API with the adjusted amount
3. The `Payment` status is updated to `partially_refunded`
4. A new `Transaction` of type `refund` is created for the partial amount

---

## How Refunds Affect Subscriptions

When a **full refund** is processed:

1. `Payment.status` → `refunded`
2. `Subscription.status` → `cancelled` (via webhook or admin action)
3. `User.isPremium` → `false`
4. Premium access is revoked immediately

When a **partial refund** is processed:

1. `Payment.status` → `partially_refunded`
2. Subscription remains active (access not revoked)
3. The partial amount is credited without affecting remaining subscription days

---

## User Refund History

Users can view all their refund requests:

```
GET /api/v1/payments/refund/my-requests
Authorization: Bearer <token>
```

Response includes status, amount, timestamps, and admin notes.

---

## Developer Notes

### Razorpay Refund API

When an admin approves a refund, the backend calls:

```javascript
const razorpayRefund = await razorpay.payments.refund(razorpayPaymentId, {
  amount: amountPaise,    // in paise
  notes: {
    refundId: refund.refundId,
    reason: refund.reason,
    processedByAdmin: adminUser._id.toString(),
  },
});
```

The `providerRefundId` (Razorpay's `rfnd_xxx` ID) is stored in the `Refund` document for traceability.

### Refund Transaction

Every processed refund creates an immutable `Transaction` document:

```json
{
  "transactionId": "txn_rfnd_1700000000_1234",
  "type": "refund",
  "amount": 499,
  "currency": "INR",
  "status": "refunded"
}
```

This ensures the complete financial ledger is preserved.

---

## Contact for Disputes

For payment disputes outside the normal refund flow:

- Email: support@agriconnect.in
- Razorpay Payment ID (from invoice or payment history) must be provided
- Include the AgriConnect transaction ID

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
