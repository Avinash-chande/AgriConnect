# Payment & Subscription Financial Oversight

## Payment Features Integration

AgriConnect integrates with Phase 9 Razorpay payment systems:
- **Transaction History**: View payments across jobs, premium subscriptions, and promoted job listings.
- **Refund Management**: Initiate partial or full refunds (`adminPaymentService.processRefund`).
- **Featured Job Promotion**: Admin can feature job listings or extend pro memberships.
- **Revenue Analytics**: Track gross revenue and monthly subscription earnings in `INR`.

---

## Authorization & Secret Isolation

- Payment operations require the `refunds.manage` or `payments.read` permission.
- **Zero Secret Exposure**: Razorpay secret keys, webhook secrets, card numbers, and CVVs are **never exposed** via admin endpoints or stored in database logs. Secrets remain strictly in `.env`.
