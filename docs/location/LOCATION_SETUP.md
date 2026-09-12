# AgriConnect Location System Setup Guide (`LOCATION_SETUP.md`)

## 1. Local Development Setup

### 1.1 Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: v6.0+ (with 2dsphere indexing support)
- **npm**: v9.x or higher

### 1.2 Step-by-Step Installation

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/AgriConnect/AgriConnect.git
   cd AgriConnect

   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   ```

2. **Configure Backend Environment Variables**:
   Copy `.env.example` to `.env` in the `backend/` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

   Ensure location module variables are set:
   ```env
   OSM_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
   NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
   NOMINATIM_USER_AGENT=AgriConnect-Platform/1.0 (contact@agriconnect.com)
   NOMINATIM_TIMEOUT_MS=5000
   OSRM_BASE_URL=https://router.project-osrm.org
   GEOCODING_CACHE_TTL=3600
   ROUTE_CACHE_TTL=86400
   MAX_SEARCH_RADIUS_KM=100
   DEFAULT_SEARCH_RADIUS_KM=25
   LOCATION_PRIVACY_DEFAULT=approximate
   ```

3. **Configure Frontend Environment Variables**:
   Copy `.env.example` to `.env` in the root repository directory:
   ```bash
   cp .env.example .env
   ```

4. **Start Development Servers**:
   - Backend API:
     ```bash
     cd backend
     npm run dev
     ```
   - Frontend Vite Server:
     ```bash
     npm run dev
     ```

---

## 2. Running Automated Tests

Both backend and frontend test suites mock external Nominatim and OSRM network calls to ensure zero external network dependencies during test runs.

### 2.1 Run Backend Phase 8 Tests (Jest)
```bash
cd backend
npm test -- --testPathPattern="phase8" --forceExit
```

### 2.2 Run Frontend Phase 8 Tests (Vitest)
```bash
npm run test:phase8
```

---

## 3. Production Deployment Considerations

When moving from Phase 8 MVP development to high-scale production, public free services (Nominatim, OSRM, OSM tile servers) **must not be used directly in high-concurrency environments** due to public API rate limits and Acceptable Usage Policies.

### 3.1 Upgrading to Self-Hosted Nominatim Geocoding
To handle thousands of geocoding requests without hitting public 1 req/sec rate limits:

1. **Deploy Nominatim Docker Container**:
   ```bash
   docker run -d --name nominatim \
     -p 8080:8080 \
     -e PBF_URL=https://download.geofabrik.de/asia/india-latest.osm.pbf \
     mediagis/nominatim:4.4
   ```
2. **Update Environment Variable**:
   In `backend/.env.production`:
   ```env
   NOMINATIM_BASE_URL=https://geocoding-internal.agriconnect.com
   ```
   No application code changes required!

### 3.2 Upgrading to Self-Hosted OSRM Routing Engine
To support high-frequency driving distance calculations:

1. **Build OSRM India Routing Graph**:
   ```bash
   # Download OSM data for India
   wget https://download.geofabrik.de/asia/india-latest.osm.pbf

   # Extract and prepare routing graph
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-contract /data/india-latest.osrm

   # Launch OSRM server
   docker run -d --name osrm-routing -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm Contracted /data/india-latest.osrm
   ```
2. **Update Environment Variable**:
   In `backend/.env.production`:
   ```env
   OSRM_BASE_URL=https://routing-internal.agriconnect.com
   ```

### 3.3 Upgrading Cache Infrastructure to Redis
The current in-memory cache ([`backend/services/cacheService.js`](file:///e:/Agriconnect/AgriConnect/backend/services/cacheService.js)) can be seamlessly backed by Redis in multi-node production clusters:
- Set `GEOCODING_CACHE_TTL=86400` (24 hours).
- Set `ROUTE_CACHE_TTL=604800` (7 days).
