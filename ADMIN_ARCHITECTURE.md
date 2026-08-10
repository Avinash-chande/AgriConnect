# AgriConnect Admin Control Center & Telemetry Architecture

## Executive Overview

The **AgriConnect Admin Architecture** provides real-time system operational telemetry, granular administrative role-based access control (RBAC), Dual-Verification workflows (System A Trust & System B Aadhaar e-KYC), content moderation, financial oversight, immutable security audit trails, and dynamic platform configuration.

---

## High-Level System Architecture

```mermaid
graph TD
    A["Admin User (Web Client)"] -->|JWT Auth + RBAC Header| B["Express API Gateway"]
    B -->|requirePermission Middleware| C["RBAC Guard"]
    C -->|auditAction Middleware| D["Audit Logger"]
    
    B --> E["Admin Controllers"]
    
    E --> F1["Dashboard Telemetry Service"]
    E --> F2["User Management Service"]
    E --> F3["Job Moderation Service"]
    E --> F4["Application Monitor Service"]
    E --> F5["Trust & Badge Service (System A)"]
    E --> F6["Skill Certificate Service (System A)"]
    E --> F7["Aadhaar e-KYC Service (System B)"]
    E --> F8["Reports & Complaints Service"]
    E --> F9["Payment & Refund Admin Service"]
    E --> F10["Platform Settings Service"]
    
    F1 --> G["MongoDB Atlas Database ($facet Aggregations)"]
    D --> H["Immutable AuditLog Store"]
    F7 --> I["UIDAI Offline e-KYC Verifier (In-Memory Only)"]
```

---

## Architectural Principles

1. **Dual-Verification Decoupling**:
   - **System A (Trust & Skill Verification)**: Evaluates platform activity, profile completeness, user ratings, completed work history, and agricultural skill certificates. Produces a 0–100 Trust Score and dynamic trust levels (`BASIC`, `VERIFIED`, `SKILLED`, `TRUSTED`, `TOP_RATED`).
   - **System B (Identity Verification)**: Processes UIDAI Paperless Offline e-KYC ZIP files in-memory to verify user identity. Issues the `IDENTITY_VERIFIED` badge.
   - **CRITICAL**: System A Trust Score is **NOT** a government identity verification metric.

2. **Least Privilege & Role Isolation**:
   - Administrative endpoints strictly enforce granular permission checks (e.g., `users.read`, `jobs.moderate`, `verification.review`, `refunds.manage`).

3. **Data Minimization & Zero Secrets Storage**:
   - Aadhaar numbers, Share Codes, OTPs, biometrics, and raw XML are **never stored** in the database or log files.
   - API secrets, Razorpay keys, and JWT secrets remain strictly isolated in environment variables (`.env`).

4. **Telemetry Caching & Performance**:
   - High-throughput admin dashboards use single-pass MongoDB `$facet` aggregation pipelines combined with a 30-second TTL in-memory cache to prevent database load spikes.
