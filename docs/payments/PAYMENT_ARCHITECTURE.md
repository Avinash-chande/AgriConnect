# AgriConnect Payment Architecture

> Phase 9 — Razorpay-Powered Payment & Subscription Infrastructure

---

## Overview

AgriConnect's payment system is a **server-authoritative**, multi-layer architecture built on [Razorpay](https://razorpay.com). All pricing, verification, and subscription activation happens exclusively on the backend. The client (frontend) is never trusted for amounts or verification decisions.

---

## Core Design Principles

| Principle | Implementation |
|---|---|
| Server-authoritative pricing | Amount is always resolved server-side from the Plan model |
| Cryptographic verification | HMAC-SHA256 signature verified before any subscription activation |
| Idempotency | Duplicate orders and webhook events are safely deduplicated |
| Audit trail | Every transaction, invoice, and refund is stored immutably |
| Secret safety | Secrets never appear in API responses or log output |
| Webhook recovery | Missed client verifications are recovered via webhook fallback |

---

## High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                           │
│                                                                    │
│  1. Select Plan        2. Load Razorpay SDK       4. Razorpay UI  │
│  PricingPage.tsx  ──►  loadRazorpayScript()   ──►  checkout.js    │
│                                                          │         │
│                                                 5. Payment Success │
│  6. POST /verify  ◄────────────────────────────  signature tokens │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                    REST API (Express)
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│                         BACKEND SERVER                             │
│                                                                    │
│  POST /payments/orders                                             │
│    └─► validateCreateOrder   (express-validator)                   │
│    └─► paymentRateLimiter    (10 req / 15min)                      │
│    └─► createPaymentOrderService                                   │
│         ├─ Resolve plan price server-side (never trust client)     │
│         ├─ Check idempotency key                                   │
│         ├─ Create Razorpay order via API                           │
│         └─ Store local Payment document                            │
│                                                                    │
│  POST /payments/verify                                             │
│    └─► verifyRazorpaySignature  (HMAC-SHA256)                      │
│    └─► verifyPaymentService                                        │
│         ├─ Validate ownership (userId must match orderId)          │
│         ├─ Resolve plan details                                    │
│         ├─ Create immutable Transaction record                     │
│         ├─ Upsert Subscription (active, endDate calculated)        │
│         ├─ Update User.isPremium = true                            │
│         ├─ Generate GST Invoice                                    │
│         └─ Dispatch real-time notifications                        │
│                                                                    │
│  POST /payments/webhook   (raw body, HMAC verified)                │
│    └─► verifyWebhookSignature                                      │
│    └─► processRazorpayWebhookService                               │
│         ├─ Idempotency check (WebhookEvent model)                  │
│         ├─ payment.captured  → activate subscription               │
│         ├─ payment.failed    → mark failed + notify                │
│         ├─ refund.processed  → cancel subscription                 │
│         └─ subscription.cancelled → revoke access                  │
└────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │     Razorpay API   │
                    │  (Payment Gateway) │
                    └─────────┬──────────┘
                              │ Webhooks (async events)
                    ┌─────────▼──────────┐
                    │   MongoDB (Atlas)  │
                    │                   │
                    │  Payment          │
                    │  Transaction      │
                    │  Subscription     │
                    │  Invoice          │
                    │  Refund           │
                    │  WebhookEvent     │
                    └───────────────────┘
```

---

## Data Models

### Payment
Tracks each Razorpay order lifecycle from `created` → `captured`/`failed`/`refunded`.

```
Payment {
  orderId         string   // Razorpay order ID (order_xxx)
  paymentId       string   // Razorpay payment ID (pay_xxx)
  user            ObjectId
  provider        'razorpay'
  amount          number   // In rupees
  currency        string   // 'INR'
  status          enum     // created|pending|authorized|captured|failed|refunded|partially_refunded|cancelled
  purpose         string   // 'subscription' | 'job_promotion'
  metadata        object   // planId, planName, idempotencyKey
  paidAt          Date
}
```

### Transaction
Immutable ledger entry created after successful payment or refund. Never modified after creation.

```
Transaction {
  transactionId       string   // txn_xxx (our internal ID)
  user                ObjectId
  payment             ObjectId
  type                enum     // payment | refund
  amount              number
  currency            string
  status              enum     // pending | success | failed | refunded
  razorpayPaymentId   string
  razorpayOrderId     string
  razorpaySignature   string
  gatewayResponse     object
}
```

### Subscription
Tracks premium membership state for each user.

```
Subscription {
  user                    ObjectId
  plan                    string   // planId
  status                  enum     // active | expired | cancelled | paused | pending
  startDate               Date
  endDate                 Date
  autoRenew               boolean
  providerSubscriptionId  string   // Razorpay payment ID
  cancelledAt             Date
}
```

### Invoice
Auto-generated GST-compliant invoice after every successful payment.

```
Invoice {
  invoiceNumber   string   // INV-202608-XXXX
  user            ObjectId
  transaction     ObjectId
  amount          number   // Total incl. 18% GST
  tax             number   // 18% GST amount
  currency        string
  items           Array<LineItem>
  status          enum     // issued | paid | void
  issuedAt        Date
}
```

### Refund

```
Refund {
  refundId          string   // rfnd_xxx
  providerRefundId  string   // Razorpay refund ID
  payment           ObjectId
  transaction       ObjectId
  user              ObjectId
  amount            number
  currency          string
  reason            string
  status            enum     // pending | processed | failed | rejected
}
```

### WebhookEvent
Idempotency store for Razorpay webhook events. Prevents duplicate processing.

```
WebhookEvent {
  eventId   string   // unique per event
  event     string   // payment.captured, payment.failed, etc.
  payload   object   // sanitized event data
  status    enum     // processed | ignored | failed
}
```

---

## Module Breakdown

| Module | File | Responsibility |
|---|---|---|
| Config | `backend/config/paymentConfig.js` | Env validation, secret management |
| Config | `backend/config/razorpay.js` | Razorpay SDK init, HMAC helpers |
| Service | `backend/services/paymentService.js` | All payment business logic |
| Service | `backend/services/webhookService.js` | Webhook event handlers |
| Service | `backend/services/invoiceService.js` | Invoice generation & download |
| Service | `backend/services/planService.js` | Plan resolution & pricing |
| Service | `backend/services/expirationService.js` | Subscription expiration sweeps |
| Controller | `backend/controllers/paymentController.js` | HTTP request handlers |
| Controller | `backend/controllers/webhookController.js` | Webhook endpoint handler |
| Routes | `backend/routes/paymentRoutes.js` | API route definitions |
| Routes | `backend/routes/planRoutes.js` | Plan listing routes |
| Middleware | `backend/middleware/premiumMiddleware.js` | `requirePremiumAccess` guard |
| Validators | `backend/validators/paymentValidator.js` | Request validation rules |
| Utils | `backend/utils/paymentError.js` | Typed payment errors |
| Utils | `backend/utils/logSanitizer.js` | Secret redaction in logs |
| Constants | `backend/constants/paymentPlans.js` | Default plan data |
| Constants | `backend/constants/paymentErrorCodes.js` | Error code registry |
| Constants | `backend/constants/index.js` | Status enums |

---

## Payment Flow Sequence

```
User clicks "Upgrade"
        │
        ▼
[Frontend] POST /api/v1/payments/orders
  body: { planId: "farmer_pro_monthly" }
        │
        ▼
[Backend] Resolve plan price server-side (Rs.499)
[Backend] Check idempotency / active pending order
[Backend] Call Razorpay Orders API → receive order_xxx
[Backend] Save Payment document (status: created)
[Backend] Return { orderId, amount: 49900, keyId, currency }
        │
        ▼
[Frontend] Open Razorpay Checkout with orderId + keyId
[User] Completes UPI / Card / Netbanking / Wallet payment
[Razorpay] Returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
[Frontend] POST /api/v1/payments/verify
  body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
[Backend] HMAC-SHA256 verify signature
[Backend] Activate Subscription (endDate = now + 30 days)
[Backend] Update User.isPremium = true
[Backend] Generate Invoice (INV-202608-XXXX)
[Backend] Dispatch PREMIUM_ACTIVATED notification
[Backend] Return { verified: true, subscription, invoice }
        │
        ▼
[Frontend] Show success modal
[Razorpay] Concurrently fires webhook → /payments/webhook
  (server-side fallback for missed client verifications)
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /payments/orders` | 10 requests | 15 minutes |
| `POST /payments/verify` | 10 requests | 15 minutes |
| `POST /payments/refund/request` | 3 requests | 15 minutes |
| `POST /payments/webhook` | 50 requests | 1 minute |

---

## Environment Separation

| Variable | Development | Test | Production |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_*` fallback | mock fallback | `rzp_live_*` (required) |
| `RAZORPAY_ENVIRONMENT` | `development` | `test` | `production` |
| Signature verification | Strict | Mock signatures accepted | Strict |
| Razorpay SDK | Mock instance | Mock instance | Live SDK |
| Startup crash on bad secrets | Warning only | Warning only | Throws error, exits |

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
