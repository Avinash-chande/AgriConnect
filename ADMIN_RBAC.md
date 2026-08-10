# AgriConnect Granular Admin Role-Based Access Control (RBAC)

## Overview

AgriConnect enforces a strict **Least Privilege Role-Based Access Control (RBAC)** architecture to govern administrative operations. Access is managed through 16 granular permissions mapped across 7 predefined administrative roles.

---

## Administrative Roles & Permission Mappings

| Admin Role | Purpose | Mapped Permissions |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Full System Ownership & Security Master | All 16 Permissions (`*`) |
| **`ADMIN`** | Operational Platform Administrator | `users.read`, `users.update`, `users.suspend`, `jobs.read`, `jobs.moderate`, `applications.read`, `applications.moderate`, `verification.read`, `verification.review`, `identity.read`, `identity.review`, `reports.read`, `reports.resolve`, `payments.read`, `refunds.manage`, `analytics.read`, `settings.manage`, `audit.read` |
| **`MODERATOR`** | Community Content Moderation | `jobs.read`, `jobs.moderate`, `applications.read`, `applications.moderate`, `reports.read`, `reports.resolve`, `users.read` |
| **`VERIFICATION_OFFICER`** | Worker Skill & Identity Review | `verification.read`, `verification.review`, `identity.read`, `identity.review`, `users.read` |
| **`SUPPORT_AGENT`** | Customer Support & Dispute Resolution | `users.read`, `reports.read`, `reports.resolve`, `applications.read` |
| **`FINANCE_ADMIN`** | Payment & Refund Administration | `payments.read`, `refunds.manage`, `analytics.read` |
| **`ANALYTICS_ADMIN`** | Business Intelligence & Growth Reporting | `analytics.read` |

---

## Security Defenses

### 1. Privilege Escalation Prevention
- A non-super-admin user **cannot** grant permissions that exceed their own active permission set when creating or updating custom admin roles.
- Non-super-admins **cannot** assign the `SUPER_ADMIN` role to any account.

### 2. Last Super Admin Defense
- The system explicitly prevents deleting, suspending, or demoting the last remaining active `SUPER_ADMIN` user on the platform.

### 3. Middleware Enforcers
- All API routes are protected by `requirePermission(permissionString)`.
- Client-side navigation guards render administrative UI sections conditionally, while the backend middleware performs mandatory authorization checks on every request.
