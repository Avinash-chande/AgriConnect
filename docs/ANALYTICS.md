# Real-Time Telemetry & System Analytics Engine

## Performance & Aggregation Strategy

Admin Analytics & Telemetry run as single-pass MongoDB `$facet` aggregation pipelines (`adminDashboardRepository.js` and `adminAnalyticsService.js`):
- **User Growth Trends**: 30-day daily signup aggregation.
- **Job Posting Growth & Hiring Conversion**: Monthly job and hire metrics.
- **Trust Score Distribution**: System A score histograms (`0-20`, `21-40`, `41-60`, `61-80`, `81-100`).
- **Revenue Analytics**: Gross platform volume and monthly Pro subscription income.

---

## 30-Second TTL Caching

Telemetry endpoints use an in-memory TTL cache (`CACHE_TTL_MS = 30000`) to deliver instant dashboard rendering while preventing database load spikes under frequent auto-refreshes.
