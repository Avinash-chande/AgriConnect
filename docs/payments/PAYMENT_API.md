# AgriConnect Payment API Reference

> Phase 9 — Complete REST API Reference for Payment, Subscription, Refund & Invoice Endpoints

---

## Base URL

```
Development: http://localhost:5000/api/v1
Production:  https://api.yourdomain.com/api/v1
```

## Authentication

All private endpoints require a `Bearer` token in the `Authorization` header:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Plans API

### GET /plans — List All Membership Plans

Lists all active membership plans available on the platform.

**Access:** Public

```http
GET /api/v1/plans
```

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `targetRole` | string | Filter by role: `farmer` or `worker` |
| `currency` | string | Filter by currency (default: `INR`) |

**Response `200`:**
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": {
    "plans": [
      {
        "planId": "farmer_pro_monthly",
        "name": "Farmer Pro (Monthly)",
        "description": "Full power hiring suite with priority placement & AI matching",
        "price": 499,
        "currency": "INR",
        "billingPeriod": "monthly",
        "targetRole": "farmer",
        "features": [
          "Featured Job Posting",
          "AI Recommendations",
          "Advanced Worker Search",
          "Priority Job Visibility",
          "Advanced Analytics",
          "Increased AI Usage",
          "Premium Badge"
        ],
        "isActive": true,
        "sortOrder": 2
      }
    ]
  }
}
```

---

### GET /plans/:planId — Get Single Plan

**Access:** Public

```http
GET /api/v1/plans/farmer_pro_monthly
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "plan": { ... }
  }
}
```

---

## Payment Orders API

### POST /payments/orders — Create Payment Order

Creates a Razorpay order for a selected plan. The amount is resolved **server-side** from the plan database — the client must not send the amount.

**Access:** Private (Authenticated User)

**Rate Limit:** 10 requests / 15 minutes

```http
POST /api/v1/payments/orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "planId": "farmer_pro_monthly",
  "purpose": "subscription",
  "idempotencyKey": "user_123_plan_farmer_pro_monthly_1700000000",
  "notes": {
    "source": "pricing_page"
  }
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `planId` | **Yes** | string | Plan ID from `/plans` endpoint |
| `purpose` | No | string | `subscription` or `job_promotion` |
| `idempotencyKey` | No | string | Unique key to prevent duplicate orders |
| `notes` | No | object | Key-value metadata passed to Razorpay |

**Response `201`:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "orderId": "order_NxxxxxxxxxJ",
    "amount": 49900,
    "currency": "INR",
    "keyId": "rzp_test_xxxxxxxx",
    "planName": "Farmer Pro (Monthly)",
    "planId": "farmer_pro_monthly",
    "paymentId": "64a2f...",
    "prefill": {
      "name": "John Farmer",
      "email": "john@farm.com"
    }
  }
}
```

> **Note:** `amount` is in paise (₹499 → 49900). Your frontend must pass this exact amount to Razorpay checkout. Do not recalculate it.

---

### POST /payments/verify — Verify Payment & Activate Membership

After Razorpay checkout completes, the frontend receives three tokens. Send them to this endpoint for cryptographic signature verification and subscription activation.

**Access:** Private (Authenticated User)

**Rate Limit:** 10 requests / 15 minutes

```http
POST /api/v1/payments/verify
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_NxxxxxxxxxJ",
  "razorpay_payment_id": "pay_NxxxxxxxxxK",
  "razorpay_signature": "abc123def456..."
}
```

**Response `200` (Success):**
```json
{
  "success": true,
  "message": "Payment verified successfully and premium membership activated",
  "data": {
    "verified": true,
    "transactionId": "txn_1700000000_1234",
    "subscription": {
      "plan": "farmer_pro_monthly",
      "status": "active",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-02-01T00:00:00.000Z",
      "autoRenew": true
    },
    "invoice": {
      "invoiceNumber": "INV-202508-4821",
      "amount": 589.02,
      "tax": 89.82,
      "currency": "INR"
    }
  }
}
```

**Response `400` (Signature Mismatch):**
```json
{
  "success": false,
  "message": "Payment signature verification failed. Payment may be fraudulent.",
  "code": "SIGNATURE_MISMATCH"
}
```

---

## Job Promotion Payment API

### POST /payments/promote-job/order — Create Job Promotion Order

Creates a payment order to promote a specific job vacancy.

**Access:** Private (Farmer Only)

```http
POST /api/v1/payments/promote-job/order
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobId": "64a2f...",
  "planId": "job_boost_7day"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Job promotion payment order created successfully",
  "data": {
    "orderId": "order_NxxxxxxxxxZ",
    "amount": 19900,
    "currency": "INR",
    "keyId": "rzp_test_xxxxxxxx"
  }
}
```

---

### POST /payments/promote-job/verify — Verify Job Promotion Payment

```http
POST /api/v1/payments/promote-job/verify
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_NxxxxxxxxxZ",
  "razorpay_payment_id": "pay_NxxxxxxxxxW",
  "razorpay_signature": "def789..."
}
```

---

## Subscription Management API

### GET /payments/subscription — Get Subscription Status

**Access:** Private (Authenticated User)

```http
GET /api/v1/payments/subscription
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "isPremium": true,
    "plan": "farmer_pro_monthly",
    "status": "active",
    "expiresAt": "2025-02-01T00:00:00.000Z",
    "daysRemaining": 28
  }
}
```

---

### GET /payments/subscription/me — Full Subscription Details

Returns complete subscription record with payment history.

**Access:** Private (Authenticated User)

```http
GET /api/v1/payments/subscription/me
Authorization: Bearer <token>
```

---

### POST /payments/subscription/cancel — Cancel Subscription

Cancels subscription at end of current billing period. Premium access is retained until `endDate`.

**Access:** Private (Authenticated User)

```http
POST /api/v1/payments/subscription/cancel
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Subscription cancelled. Premium access will remain active until 2025-02-01.",
  "data": {
    "status": "cancelled",
    "accessUntil": "2025-02-01T00:00:00.000Z"
  }
}
```

---

### POST /payments/subscription/auto-renew — Toggle Auto-Renew

**Access:** Private (Authenticated User)

```http
POST /api/v1/payments/subscription/auto-renew
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "autoRenew": false
}
```

---

## Payment History API

### GET /payments/history — Payment History

Returns paginated payment & transaction history for the current user.

**Access:** Private (Authenticated User)

```http
GET /api/v1/payments/history?page=1&limit=10&status=captured
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10, max: 50) |
| `status` | string | Filter by payment status |
| `startDate` | ISO date | Filter from date |
| `endDate` | ISO date | Filter to date |

---

## Invoice API

### GET /payments/invoice/:transactionId — Get Invoice

**Access:** Private (Own invoices only; Admins can access all)

```http
GET /api/v1/payments/invoice/txn_1700000000_1234
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "invoiceNumber": "INV-202508-4821",
      "amount": 589.02,
      "tax": 89.82,
      "currency": "INR",
      "status": "paid",
      "issuedAt": "2025-01-01T00:00:00.000Z",
      "items": [
        {
          "description": "AgriConnect Farmer Pro Membership Subscription",
          "quantity": 1,
          "unitPrice": 499,
          "amount": 499
        }
      ]
    }
  }
}
```

---

### GET /payments/details/:transactionId — Transaction Details

**Access:** Private (Own transactions; Admins can access all)

```http
GET /api/v1/payments/details/txn_1700000000_1234
Authorization: Bearer <token>
```

---

## Refund API

### POST /payments/refund/request — Request a Refund

Submit a refund request for a completed transaction. Subject to admin review.

**Access:** Private (Authenticated User)

**Rate Limit:** 3 requests / 15 minutes

```http
POST /api/v1/payments/refund/request
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "transactionId": "txn_1700000000_1234",
  "reason": "Service not as described"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Refund request submitted successfully. It will be processed after admin review.",
  "data": {
    "refundId": "rfnd_1700000000_5678",
    "amount": 499,
    "currency": "INR",
    "status": "pending"
  }
}
```

---

### GET /payments/refund/my-requests — Get User Refund Requests

**Access:** Private (Authenticated User)

```http
GET /api/v1/payments/refund/my-requests
Authorization: Bearer <token>
```

---

## Admin-Only API

### POST /payments/refund/process — Process Refund (Admin)

**Access:** Private (Admin Only)

```http
POST /api/v1/payments/refund/process
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "refundId": "rfnd_1700000000_5678",
  "action": "approve",
  "notes": "Approved after review"
}
```

| Field | Values | Description |
|---|---|---|
| `action` | `approve` \| `reject` | Approve processes via Razorpay; reject marks as rejected |
| `notes` | string | Optional admin note appended to reason |

---

### GET /payments/refund/all — All Refund Requests (Admin)

**Access:** Private (Admin Only)

```http
GET /api/v1/payments/refund/all?status=pending&page=1
Authorization: Bearer <ADMIN_TOKEN>
```

---

### GET /payments/analytics/admin — Payment Analytics (Admin)

**Access:** Private (Admin Only)

```http
GET /api/v1/payments/analytics/admin
Authorization: Bearer <ADMIN_TOKEN>
```

---

### POST /payments/expiration/run-maintenance — Run Expiration Sweep (Admin)

**Access:** Private (Admin Only)

Runs a server-side sweep to expire all overdue subscriptions and job promotions.

```http
POST /api/v1/payments/expiration/run-maintenance
Authorization: Bearer <ADMIN_TOKEN>
```

---

## Webhook Endpoint

### POST /payments/webhook — Razorpay Webhook Receiver

**Access:** Public (Razorpay servers only, verified via HMAC)

**Important:** This endpoint requires the **raw request body** (not JSON-parsed). Razorpay's HMAC signature is computed against the raw bytes.

```http
POST /api/v1/payments/webhook
X-Razorpay-Signature: sha256=abc123...
Content-Type: application/json
```

Supported events:
- `payment.captured`
- `payment.failed`
- `refund.processed`
- `subscription.cancelled`

---

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "code": "ERROR_CODE",
  "errors": []
}
```

### HTTP Status Codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / validation error |
| `401` | Unauthenticated |
| `403` | Forbidden / premium required |
| `404` | Resource not found |
| `409` | Conflict / duplicate |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

### Payment Error Codes

| Code | Description |
|---|---|
| `INVALID_PLAN` | planId not found or inactive |
| `ORDER_CREATION_FAILED` | Razorpay API error creating order |
| `SIGNATURE_MISMATCH` | HMAC verification failed |
| `WEBHOOK_VERIFICATION_FAILED` | Webhook signature invalid |
| `DUPLICATE_TRANSACTION` | idempotencyKey already processed |
| `REFUND_FAILED` | Razorpay refund API error |
| `SUBSCRIPTION_UPDATE_FAILED` | DB error updating subscription |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PAYMENT_FAILED` | Generic payment failure |

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
