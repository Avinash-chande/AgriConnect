# AgriConnect Premium Membership Guide

> Phase 9 — Premium Plans, Feature Access, Subscription Lifecycle & Access Control

---

## Overview

AgriConnect Premium is a tiered subscription system that unlocks advanced features for Farmers and Workers on the platform. Premium membership is managed through Razorpay payments and enforced server-side using the `requirePremiumAccess` middleware.

---

## Membership Plans

### Farmer Plans

| Plan | Price | Period | Plan ID |
|---|---|---|---|
| Farmer Free | ₹0 | Lifetime | `free_farmer` |
| Farmer Pro (Monthly) | ₹499 | Monthly (30 days) | `farmer_pro_monthly` |
| Farmer Pro (Annual) | ₹4,790 | Yearly (365 days) | `farmer_pro_yearly` |

Annual plan saves **~20%** compared to monthly billing (₹4,790 vs ₹5,988/year).

### Worker Plans

| Plan | Price | Period | Plan ID |
|---|---|---|---|
| Worker Free | ₹0 | Lifetime | `free_worker` |
| Worker Pro (Monthly) | ₹199 | Monthly (30 days) | `worker_pro_monthly` |
| Worker Pro (Annual) | ₹1,890 | Yearly (365 days) | `worker_pro_yearly` |

---

## Premium Features by Plan

### Farmer Pro Features

| Feature | Free | Pro Monthly | Pro Annual |
|---|---|---|---|
| Job Postings | Up to 3 | Unlimited | Unlimited |
| Featured Job Posting | ❌ | ✅ | ✅ |
| AI Recommendations | Basic | Full | Full |
| Advanced Worker Search | ❌ | ✅ | ✅ |
| Priority Job Visibility | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |
| Increased AI Usage | ❌ | ✅ | ✅ |
| Premium Badge | ❌ | ✅ | ✅ |
| Dedicated Farm Manager Support | ❌ | ❌ | ✅ |
| Annual Discount Savings | — | — | ✅ 20% |

### Worker Pro Features

| Feature | Free | Pro Monthly | Pro Annual |
|---|---|---|---|
| Job Applications | Standard | Priority | Top Priority |
| Job Discovery | Basic map | Full map | Full map |
| Priority in Search Results | ❌ | ✅ | ✅ (Top Ranked) |
| Direct Contact Access | ❌ | ✅ | ✅ |
| SMS Job Alerts | ❌ | ✅ | ✅ |
| Increased AI Usage | ❌ | ✅ | ✅ |
| Premium Badge | ❌ | ✅ | ✅ |
| AI Resume Booster | ❌ | ❌ | ✅ |
| Skills Certification | ❌ | ❌ | ✅ |
| Annual Discount Savings | — | — | ✅ 20% |

---

## Subscription Lifecycle

```
                    ┌──────────────┐
                    │   PENDING    │  ← Order created, payment not yet completed
                    └──────┬───────┘
                           │ Payment captured
                    ┌──────▼───────┐
                    │    ACTIVE    │  ← Premium features unlocked
                    └──┬───────┬───┘
                       │       │
         User cancels  │       │  endDate reached
                    ┌──▼────┐ ┌▼──────────┐
                    │CANCEL-│ │  EXPIRED  │  ← Features locked
                    │LED    │ └──────┬────┘
                    └──┬────┘        │  Renewal payment
                       │             │
            If within  │  ┌──────────▼───┐
            grace      │  │   ACTIVE     │  ← Renewed
            period:    │  └──────────────┘
            access     │
            continues  │
                    ┌──▼────┐
                    │GRACE  │  ← 3-day window after endDate
                    │PERIOD │
                    └───────┘
```

### Status Definitions

| Status | Description | Premium Access |
|---|---|---|
| `active` | Subscription is paid and within valid dates | ✅ Full access |
| `cancelled` | User cancelled; valid until `endDate` | ✅ Until endDate |
| `expired` | Past `endDate` + grace period | ❌ Locked |
| `paused` | Manually paused (admin action) | ❌ Locked |
| `pending` | Payment initiated, not captured | ❌ Locked |

---

## Grace Period

After a subscription's `endDate`, users are granted a **3-day grace period** during which premium features remain accessible. This handles scenarios like:
- Renewal payment is processing
- Auto-renewal delay
- User intends to renew but hasn't yet

During the grace period:
- A response header `X-Subscription-Grace-Period: true` is added to all API responses
- The frontend should display a renewal reminder banner
- After 3 days, access is fully revoked and status is set to `expired`

---

## Protecting Premium Routes

### Basic Premium Guard

```javascript
import { requirePremium } from '../middleware/premiumMiddleware.js';

// Any active subscription grants access
router.get('/premium-feature', protect, requirePremium, controller);
```

### Plan-Specific Guard

```javascript
import { requirePremiumAccess } from '../middleware/premiumMiddleware.js';

// Only farmer_pro_yearly allowed
router.get('/farm-manager', protect, requirePremiumAccess('farmer_pro_yearly'), controller);

// Multiple plans allowed
router.get('/analytics', protect, requirePremiumAccess(['farmer_pro_monthly', 'farmer_pro_yearly']), controller);
```

### Custom Grace Period

```javascript
// Override default 3-day grace period to 7 days for specific routes
router.get('/feature', protect, requirePremiumAccess([], { gracePeriodDays: 7 }), controller);
```

---

## How Premium Access Is Verified

The `requirePremiumAccess` middleware queries MongoDB directly — it does **not** rely solely on the `isPremium` boolean flag, which can become stale.

```
Request arrives at protected route
│
▼
1. Is req.user present?  → No: 401 Unauthorized
│
▼
2. Subscription.findOne({ user: userId })
   → No subscription: 403 PREMIUM_REQUIRED
│
▼
3. startDate <= now?
   → Future start: 403 SUBSCRIPTION_PENDING
│
▼
4. Is plan in allowedPlans?
   → Wrong tier: 403 PLAN_INSUFFICIENT
│
▼
5. Is now <= endDate?
   → Yes: GRANT ACCESS
   → Is now <= endDate + graceMs?
     → Yes: GRANT ACCESS (grace period mode)
     → No: 403 SUBSCRIPTION_EXPIRED
```

### Error Codes Returned

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Not logged in |
| `PREMIUM_REQUIRED` | 403 | No subscription found |
| `SUBSCRIPTION_PENDING` | 403 | startDate is in the future |
| `PLAN_INSUFFICIENT` | 403 | Wrong plan tier |
| `SUBSCRIPTION_EXPIRED` | 403 | Past endDate + grace |
| `SUBSCRIPTION_CANCELLED` | 403 | Cancelled and expired |
| `SUBSCRIPTION_PAUSED` | 403 | Admin-paused |

---

## User Journey: Upgrading to Premium

### Step 1: Browse Plans
```
GET /api/v1/plans?targetRole=farmer
→ Returns all available plans with prices and features
```

### Step 2: Create Payment Order
```
POST /api/v1/payments/orders
Body: { planId: "farmer_pro_monthly" }
→ Returns { orderId, amount: 49900, keyId, ... }
```

### Step 3: Complete Payment
User opens Razorpay checkout widget with the returned `orderId` and `keyId`. Completes payment via UPI, card, netbanking, or wallet.

### Step 4: Verify Payment
```
POST /api/v1/payments/verify
Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
→ Activates premium membership immediately
→ Returns subscription details + invoice
```

### Step 5: Access Premium Features
```
User.isPremium = true
Subscription.status = "active"
Subscription.endDate = now + 30 days
Premium routes now accessible
```

---

## Managing Subscription

### Cancel Subscription
```
POST /api/v1/payments/subscription/cancel

→ Sets status = "cancelled"
→ Access continues until endDate
→ No refund issued automatically (user must request via refund API)
```

### Toggle Auto-Renew
```
POST /api/v1/payments/subscription/auto-renew
Body: { autoRenew: true/false }

→ Enables/disables auto-renewal for next billing cycle
```

### Check Subscription Status
```
GET /api/v1/payments/subscription

→ Returns: { isPremium, plan, status, expiresAt, daysRemaining }
```

---

## Subscription Expiration Maintenance

A server-side maintenance sweep runs via admin trigger to expire overdue subscriptions:

```
POST /api/v1/payments/expiration/run-maintenance
Authorization: Bearer <ADMIN_TOKEN>
```

This sweep:
1. Queries all subscriptions with `endDate < now`
2. Sets `status = expired`
3. Sets `User.isPremium = false`
4. Sends expiration notifications

In production, this should be scheduled as a daily cron job or triggered on a set interval.

---

## Invoice on Activation

Every successful premium activation generates an invoice:

- **Invoice Number**: `INV-YYYYMM-XXXX` (e.g. `INV-202508-4821`)
- **Tax**: 18% GST applied (Indian agricultural platform)
- **Line Item**: `AgriConnect [Plan Name] Subscription`
- **Status**: `paid`

Invoice is accessible at:
```
GET /api/v1/payments/invoice/:transactionId
```

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
