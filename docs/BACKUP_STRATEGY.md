# AgriConnect Production Backup Strategy

This document outlines the backup policy, continuous data protection (CDP), snapshot retention schedules, and restoration procedures for the AgriConnect MongoDB database and persistent storage.

---

## 1. Key Recovery Objectives

| Metric | Target Objective | Technical Implementation |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 1 Hour** | Continuous Oplog Tailing & 6-Hour Automated Cluster Snapshots |
| **Recovery Time Objective (RTO)** | **< 2 Hours** | Automated MongoDB Atlas Point-in-Time Restore (PITR) |

---

## 2. MongoDB Atlas Automated Backup Schedule

AgriConnect uses MongoDB Atlas Continuous Cloud Backups with localized geographic redundancy:

| Backup Type | Frequency | Retention Period | Storage Target |
| :--- | :--- | :--- | :--- |
| **Point-In-Time (PITR) Oplog** | Continuous (Every 1 min) | 7 Days | Continuous Cloud Storage |
| **Automated Snapshots** | Every 6 Hours | 7 Days | Multi-Region AWS S3 |
| **Daily Snapshots** | Once Daily (00:00 UTC) | 30 Days | Multi-Region AWS S3 |
| **Weekly Snapshots** | Every Sunday | 90 Days | Offsite Cold Storage |
| **Monthly Snapshots** | First Day of Month | 12 Months | Compliance Archival Vault |

---

## 3. Database Restoration Process

### Step 3.1: Point-In-Time Recovery (PITR) Procedure
To restore the database to an exact timestamp (e.g. 5 minutes before an incident):

1. Navigate to **MongoDB Atlas Console** -> **Database Deployments**.
2. Select target cluster (`agriconnect-prod`) -> Click **...** -> **Restore from Backup**.
3. Choose **Point-in-Time Restore**.
4. Select the exact date and UTC timestamp down to the second.
5. Choose target options:
   - **Restore to New Cluster** (Recommended for zero-downtime validation): Creates `agriconnect-restored-prod`.
   - **In-Place Overwrite**: Overwrites current cluster (Requires maintenance window).
6. Verify collection integrity and point application `MONGODB_URI` to restored cluster.

---

## 4. Pre-Deployment Data Protection Rules

- **Zero Credential Exposure**: Backup access keys, AWS S3 secrets, and Atlas API tokens are managed strictly via cloud secrets management and never committed to source control.
- **Automated Verification**: Restoration dry-runs are executed quarterly in staging environments to validate backup integrity.
