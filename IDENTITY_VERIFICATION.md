# System B Identity Verification vs System A Trust Verification

## Architectural Separation Matrix

| Metric / Dimension | System A (Trust & Skill Verification) | System B (Identity Verification) |
| :--- | :--- | :--- |
| **Primary Scope** | Platform reputation, work reliability, agricultural skills | Government identity verification |
| **Verification Method** | Completed jobs, ratings, phone OTP, skill cert uploads | UIDAI Paperless Offline e-KYC (XML + RSA signature) |
| **Output Metric** | 0 – 100 Trust Score + Dynamic Trust Levels | `IDENTITY_VERIFIED` Badge + Masked Reference ID |
| **Government Identity** | **NO** (Contains zero government ID verification) | **YES** (UIDAI Offline e-KYC signature validation) |
| **Data Storage** | Stores certificate title, issuer, issue date | Masked reference ID (`XXXX-XXXX-1234`) only |

---

## Identity Verification Statuses

- **`PENDING`**: e-KYC ZIP uploaded and processing.
- **`VERIFIED`**: Signature verified, name matched, `IDENTITY_VERIFIED` badge active.
- **`MANUAL_REVIEW`**: Discrepancy between account name and XML name queued for verification officer review.
- **`REJECTED`**: Signature invalid or XML corrupted.
- **`RESUBMISSION_REQUIRED`**: Incorrect Share Code provided.
