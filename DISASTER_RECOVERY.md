# AgriConnect Disaster Recovery (DR) Plan

This document defines the emergency procedures, incident response workflows, and system recovery plans for AgriConnect in the event of major infrastructure failures, data corruption, or cloud service outages.

---

## 1. Disaster Recovery Targets

- **Target RPO (Recovery Point Objective)**: **< 1 Hour** (Maximum allowable data loss window)
- **Target RTO (Recovery Time Objective)**: **< 2 Hours** (Maximum allowable service downtime)

---

## 2. Disaster Scenarios & Response Runbooks

### Scenario A: Primary Database Corruption or Data Loss
1. **Trigger**: Unintended bulk deletion, database corruption, or malicious activity.
2. **Immediate Action**:
   - Issue emergency maintenance notice on status page.
   - Halt backend API write operations (`SIGTERM` or scale web service to 0 replicas).
3. **Recovery Steps**:
   - Access MongoDB Atlas Console -> Restore from latest Point-in-Time snapshot prior to incident timestamp.
   - Run data integrity verification scripts.
   - Update `MONGODB_URI` environment variable in Render dashboard.
   - Restart backend Web Service (`GET /readiness` should return 200 READY).

### Scenario B: Cloud Region Outage (Render / Vercel Outage)
1. **Trigger**: Complete outage of primary cloud provider region.
2. **Recovery Steps**:
   - **Frontend (Vercel)**: Automatically fails over across Vercel Global Edge Network. If primary domain affected, update DNS CNAME to secondary fallback host.
   - **Backend (Render)**: Spin up backup service instance in secondary region (e.g. Frankfurt or Oregon) using `render.yaml`. Update Vercel `VITE_API_URL` environment variable.

### Scenario C: Redis Cache Failure
1. **Trigger**: Redis cluster offline or network partition.
2. **Automated Non-Blocking Failover**:
   - AgriConnect [redisCacheService.js](file:///e:/Agriconnect/AgriConnect/backend/services/redisCacheService.js) automatically detects disconnection (`ECONNREFUSED`).
   - Switches to in-memory TTL Map fallback with zero process crashes.
   - REST APIs continue serving requests cleanly.

---

## 3. Post-Incident Review Checklist

1. Conduct Root Cause Analysis (RCA) within 24 hours of incident resolution.
2. Verify all user data, payment logs, and verification records against primary database.
3. Update monitoring thresholds and alert rules based on post-incident findings.
