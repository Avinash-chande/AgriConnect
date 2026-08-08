# AgriConnect Payment Setup Guide

> Phase 9 — Developer Setup for Razorpay Integration

---

## Prerequisites

- Node.js 18+ with ESM support
- MongoDB (local or Atlas)
- A [Razorpay account](https://razorpay.com) (free for test mode)
- Backend running on Express (AgriConnect Phase 9+)

---

## 1. Create a Razorpay Account

### Test Mode (No real money)
1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Navigate to **Settings → API Keys**
3. Generate a **Test Key** pair:
   - Key ID: starts with `rzp_test_`
   - Key Secret: a long random string
4. You can make unlimited test payments — no real money is charged

### Production Mode (Live payments)
1. Complete Razorpay KYC business verification
2. Navigate to **Settings → API Keys → Live Mode**
3. Generate **Live Key** pair:
   - Key ID: starts with `rzp_live_`
   - Key Secret: treat this like a database password

> **IMPORTANT**: Never use live keys in development or commit them to git.

---

## 2. Environment Variable Configuration

Copy the template from `.env.example` and create `.env`:

```bash
# From the /backend directory
cp .env.example .env
```

### Development `.env` (Test Mode)

```env
# Phase 9: Razorpay Payment Configuration
NODE_ENV=development
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_test_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
RAZORPAY_ENVIRONMENT=development
PAYMENT_CURRENCY=INR
PREMIUM_MONTHLY_PLAN_ID=farmer_pro_monthly
PREMIUM_YEARLY_PLAN_ID=farmer_pro_yearly
```

### Test (CI/CD) `.env.test`

```env
NODE_ENV=test
RAZORPAY_KEY_ID=rzp_test_mock_key
RAZORPAY_KEY_SECRET=mock_secret_key_for_testing_32chars
RAZORPAY_WEBHOOK_SECRET=mock_webhook_secret_for_testing
RAZORPAY_ENVIRONMENT=test
PAYMENT_CURRENCY=INR
PREMIUM_MONTHLY_PLAN_ID=farmer_pro_monthly
PREMIUM_YEARLY_PLAN_ID=farmer_pro_yearly
```

> In test mode, the Razorpay SDK is automatically replaced with a **mock instance** that simulates orders, payments, and refunds without any API calls.

### Production `.env` (Live Mode)

```env
NODE_ENV=production
RAZORPAY_KEY_ID=rzp_live_REAL_KEY_ID
RAZORPAY_KEY_SECRET=REAL_KEY_SECRET_MINIMUM_16_CHARS
RAZORPAY_WEBHOOK_SECRET=REAL_WEBHOOK_SECRET_MINIMUM_12_CHARS
RAZORPAY_ENVIRONMENT=production
PAYMENT_CURRENCY=INR
PREMIUM_MONTHLY_PLAN_ID=farmer_pro_monthly
PREMIUM_YEARLY_PLAN_ID=farmer_pro_yearly
```

> **Production validation**: The server will **refuse to start** if any of the above are missing, placeholder values, or insecure in production mode.

---

## 3. Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | Razorpay Key ID. Use `rzp_test_*` for test, `rzp_live_*` for production |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay Key Secret. Used for HMAC-SHA256 payment signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay Webhook Secret. Verifies that webhook events come from Razorpay |
| `RAZORPAY_ENVIRONMENT` | Yes | One of: `development`, `test`, `sandbox`, `live`, `production` |
| `PAYMENT_CURRENCY` | Yes | ISO 4217 currency code. Default: `INR` |
| `PREMIUM_MONTHLY_PLAN_ID` | Yes | Plan ID for monthly subscription. Default: `farmer_pro_monthly` |
| `PREMIUM_YEARLY_PLAN_ID` | Yes | Plan ID for yearly subscription. Default: `farmer_pro_yearly` |

---

## 4. Webhook Setup

### Local Development (using ngrok)

Razorpay webhooks need a public URL to reach your local server.

```bash
# Install ngrok
npm install -g ngrok

# Start your backend
npm run dev

# In another terminal, expose port 5000
ngrok http 5000
```

Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok.io`) and register it in Razorpay:

1. Dashboard → **Settings → Webhooks**
2. Add webhook URL: `https://abc123.ngrok.io/api/v1/payments/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
   - `subscription.cancelled`
4. Set a **Webhook Secret** and copy it to `RAZORPAY_WEBHOOK_SECRET` in your `.env`

### Production

Register your actual production URL:
```
https://api.yourdomain.com/api/v1/payments/webhook
```

---

## 5. Seed Default Plans

After configuring your environment, seed the database with the default membership plans:

```bash
# Make sure server is running and MongoDB is connected
curl -X POST http://localhost:5000/api/v1/plans/seed \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

This seeds 6 plans:
- `free_farmer` — ₹0 lifetime (farmer)
- `farmer_pro_monthly` — ₹499/month
- `farmer_pro_yearly` — ₹4790/year
- `free_worker` — ₹0 lifetime (worker)
- `worker_pro_monthly` — ₹199/month
- `worker_pro_yearly` — ₹1890/year

---

## 6. Frontend Configuration

The frontend reads `VITE_RAZORPAY_KEY_ID` from environment:

```env
# frontend/.env or root .env
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

> **Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in the frontend environment.** The Key ID is the only Razorpay credential safe to expose publicly.

---

## 7. Startup Validation

The backend validates all payment environment variables **before starting the HTTP server**. If any are invalid:

- **Development/Test**: Logs a warning and uses safe fallbacks
- **Production**: Throws an error and **refuses to start**

Example startup log on successful validation (development):

```
⚠️ [PaymentConfig] Running in development with fallback/test Razorpay keys.
🚀 AgriConnect Backend API running in [development] mode on port 5000
```

---

## 8. Test Razorpay Cards

Use these test credentials in the Razorpay checkout modal during development:

| Payment Method | Test Value |
|---|---|
| Card Number | `4111 1111 1111 1111` |
| Expiry | Any future date |
| CVV | Any 3 digits |
| UPI ID | `success@razorpay` |
| Netbanking | Select any bank → "Success" |

> These test credentials only work with `rzp_test_*` keys. They have no real-world financial effect.

---

## 9. Verify Setup

Run the backend test suite to confirm payment integration is working:

```bash
cd backend

# Run all payment tests
npm test -- --testPathPattern="tests/(createPaymentOrder|verifyPaymentApi|webhookApi|planApi|phase9)"
```

Expected: All tests pass with mocked Razorpay API.

---

*Last updated: Phase 9 — AgriConnect v1.0.0*
