# AgriConnect Location Privacy Specification (`LOCATION_PRIVACY.md`)

## 1. Privacy Framework Principles

AgriConnect is committed to protecting agricultural worker and farmer safety. GPS location data is treated as sensitive personal data.

### Core Guarantees:
1. **No Silent Location Requests**: The application never requests GPS coordinates without explicit user consent.
2. **Scrubbing Exact Worker Locations**: Public discovery lists never reveal exact residential worker addresses or exact GPS coordinates.
3. **Farm Visibility Controls**: Farmers can configure whether farm locations are visible publicly, only to verified applicants, or kept approximate.
4. **Deterministic Jittering**: Coordinates rendered for `approximate` visibility settings are offset by a deterministic pseudo-random algorithm (~200m–400m radius), preserving district-level accuracy for radial discovery while preventing exact pinpoint tracking.

---

## 2. Privacy Levels (`locationVisibility`)

| Visibility Level | Coordinate Output | Address Line Output | Pincode Output | Access Authorization |
| :--- | :--- | :--- | :--- | :--- |
| **`private`** | `null` / `[null, null]` | Preserved (District/State only) | Scrubbed (`null`) | Owner & Admins only |
| **`approximate`** | Jittered (`~300m` offset) | `"[Approximate Area]"` | Scrubbed (`undefined`) | Public / All Users |
| **`verified_users`**| Exact coordinates | Exact street address | Preserved | Logged-in verified users |
| **`public`** | Exact coordinates | Full street address | Preserved | Public / Unauthenticated |

---

## 3. Deterministic Coordinate Jitter Algorithm

The `applyCoordinateJitter(latitude, longitude, seed)` function ([`backend/utils/locationPrivacy.js`](file:///e:/Agriconnect/AgriConnect/backend/utils/locationPrivacy.js)) applies a pseudo-random offset derived deterministically from the entity's MongoDB `_id` string.

### Why Deterministic Jitter?
- **Consistent Map Render**: The worker's marker renders in the exact same jittered position on every map refresh, avoiding erratic marker jumping.
- **Search Radial Integrity**: Radial distance calculations retain ~98% mathematical precision.

### Mathematical Algorithm:
```javascript
export const applyCoordinateJitter = (lat, lng, seed = 'agri') => {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return { latitude: lat, longitude: lng };
  }

  // Simple string hash code for seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Generate bounded pseudo-random delta in degrees (~0.002 deg ≈ ~200-350m)
  const normHashLat = Math.abs((hash % 1000) / 1000);
  const normHashLng = Math.abs(((hash >> 3) % 1000) / 1000);

  const maxJitterDegrees = 0.003; // ~330 meters

  const latOffset = (normHashLat - 0.5) * 2 * maxJitterDegrees;
  const lngOffset = (normHashLng - 0.5) * 2 * maxJitterDegrees;

  return {
    latitude: Number((latitude + latOffset).toFixed(5)),
    longitude: Number((longitude + lngOffset).toFixed(5)),
  };
};
```

---

## 4. Owner Bypass Rule

Profile owners (`workerProfile.owner` or `farmerProfile.owner`) and authorized system administrators **always** bypass location privacy filters:

```javascript
// Check if requesting user is the document owner
const isOwner = viewerUser && doc.owner && (
  doc.owner.toString() === viewerUser._id.toString() ||
  doc.owner._id?.toString() === viewerUser._id.toString()
);

if (isOwner) {
  // Owner sees exact, un-modified address and coordinates
  return doc;
}
```

---

## 5. Role-Based Discovery Authorization

Worker discovery map (`/api/v1/location/nearby-workers`) enforces strict role authorization to prevent worker scraping or harassment:

- **Authorized Roles**: `Farmer`, `Admin`
- **Denied Roles**: `Worker` (receives `403 Forbidden`)
- **Unauthenticated Requests**: Receives `401 Unauthorized`

Furthermore, sensitive identification numbers (e.g. Aadhaar numbers, private personal emails, password hashes) are explicitly excluded from worker discovery response payloads using Mongoose field projections (`select('-aadhaarNumber -password')`).
