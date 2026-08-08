# AgriConnect Location API Specification (`LOCATION_API.md`)

## Overview
All location APIs are prefixed under `/api/v1/location` and `/api/v1/profiles`. Endpoints strictly validate input parameters, apply rate limiting (60 requests per minute), enforce role-based access control (RBAC), and sanitize outputs for privacy.

---

## Endpoint Summary

| Endpoint | Method | Auth Required | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/location/geocode` | `GET` | No | All | Address to Latitude/Longitude conversion |
| `/api/v1/location/reverse` | `GET` | No | All | Latitude/Longitude to Address conversion |
| `/api/v1/location/search-autocomplete` | `GET` | No | All | Debounced location autocomplete search |
| `/api/v1/location/route` | `GET` | No | All | OSRM route calculation & polyline steps |
| `/api/v1/location/distance` | `GET` | No | All | Haversine distance calculation |
| `/api/v1/location/nearby-jobs` | `GET` | No | All | Discover active jobs within radius |
| `/api/v1/location/nearby-workers` | `GET` | Yes | `Farmer`, `Admin` | Discover workers within farm radius |
| `/api/v1/profiles/location-privacy` | `PUT` | Yes | `Worker`, `Farmer` | Update account location privacy setting |

---

## 1. Geocode Address Search
Convert place names or address strings into geographical coordinates.

- **URL**: `GET /api/v1/location/geocode`
- **Headers**: None required
- **Query Parameters**:
  - `q` (string, required): Place name or address (min 2 chars, max 200 chars).
- **Example Request**:
  ```http
  GET /api/v1/location/geocode?q=Amritsar+Punjab
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "address": "Amritsar",
        "village": "Amritsar",
        "district": "Amritsar",
        "state": "Punjab",
        "country": "India",
        "pincode": "143001",
        "latitude": 31.634,
        "longitude": 75.8573,
        "formattedAddress": "Amritsar, Punjab, India"
      }
    ]
  }
  ```

---

## 2. Reverse Geocode Coordinates
Convert latitude and longitude coordinates into a structured human-readable address.

- **URL**: `GET /api/v1/location/reverse`
- **Query Parameters**:
  - `lat` (float, required): Latitude (`-90` to `90`).
  - `lng` (float, required): Longitude (`-180` to `180`).
- **Example Request**:
  ```http
  GET /api/v1/location/reverse?lat=31.634&lng=75.8573
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "address": "GT Road",
      "village": "Verka",
      "district": "Amritsar",
      "state": "Punjab",
      "country": "India",
      "pincode": "143501",
      "latitude": 31.634,
      "longitude": 75.8573,
      "formattedAddress": "GT Road, Verka, Amritsar, Punjab, India"
    }
  }
  ```

---

## 3. Location Autocomplete Search
Fast debounced search endpoint designed for frontend autocomplete dropdowns.

- **URL**: `GET /api/v1/location/search-autocomplete`
- **Query Parameters**:
  - `q` (string, required): Search query (min 3 chars).
  - `limit` (integer, optional): Maximum suggestions (default: 8).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "placeName": "Amritsar, Punjab, India",
        "address": "Amritsar",
        "village": "Amritsar",
        "district": "Amritsar",
        "state": "Punjab",
        "country": "India",
        "pincode": "143001",
        "latitude": 31.634,
        "longitude": 75.8573,
        "formattedAddress": "Amritsar, Punjab, India",
        "type": "city"
      }
    ]
  }
  ```

---

## 4. OSRM Route Calculation
Calculate driving distance, estimated travel time, geometry polyline, and turn-by-turn navigation steps.

- **URL**: `GET /api/v1/location/route`
- **Query Parameters**:
  - `startLat` (float, required): Origin latitude.
  - `startLng` (float, required): Origin longitude.
  - `endLat` (float, required): Destination latitude.
  - `endLng` (float, required): Destination longitude.
- **Example Request**:
  ```http
  GET /api/v1/location/route?startLat=31.634&startLng=75.8573&endLat=31.65&endLng=75.88
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "distance": {
        "meters": 4300,
        "kilometers": 4.3,
        "formatted": "4.3 km"
      },
      "duration": {
        "seconds": 600,
        "minutes": 10,
        "formatted": "10 mins"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[75.8573, 31.634], [75.88, 31.65]]
      },
      "coordinates": [[31.634, 75.8573], [31.65, 75.88]],
      "steps": [
        {
          "instruction": "Depart onto GT Road",
          "distanceMeters": 2000,
          "durationSeconds": 240
        }
      ],
      "isFallback": false
    }
  }
  ```

---

## 5. Distance Calculation
Calculate direct distance between two coordinate pairs.

- **URL**: `GET /api/v1/location/distance`
- **Query Parameters**:
  - `startLat`, `startLng`, `endLat`, `endLng` (floats, required).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "meters": 2800,
      "kilometers": 2.8,
      "miles": 1.7,
      "formatted": "2.8 km away"
    }
  }
  ```

---

## 6. Discover Nearby Jobs
Search active agricultural job vacancies within a specified radial distance.

- **URL**: `GET /api/v1/location/nearby-jobs`
- **Query Parameters**:
  - `lat` / `latitude` (float, required): Center latitude.
  - `lng` / `longitude` (float, required): Center longitude.
  - `radius` / `radiusKm` (float, optional): Search radius in km (default: 25, max: 100).
  - `page` (integer, optional): Page number (default: 1).
  - `limit` (integer, optional): Items per page (default: 20, max: 50).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 1,
    "pagination": { "page": 1, "limit": 20, "totalPages": 1 },
    "data": [
      {
        "job": {
          "_id": "60d5ec49f1b2c81128c12345",
          "title": "Wheat Harvesting Specialist",
          "category": "Harvesting",
          "dailyWage": 650
        },
        "distanceKm": 2.8,
        "formattedDistance": "2.8 km away",
        "location": { "type": "Point", "coordinates": [75.88, 31.65] }
      }
    ]
  }
  ```

---

## 7. Discover Nearby Workers (Authorized Farmers Only)
Search available agricultural workers within a farm's radial distance.

- **URL**: `GET /api/v1/location/nearby-workers`
- **Headers**: `Authorization: Bearer <FARMER_JWT_TOKEN>`
- **Role Requirement**: `Farmer` or `Admin` (Workers receive `403 Forbidden`).
- **Query Parameters**:
  - `lat`, `lng` (float, required).
  - `radius` (float, optional, max 100).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "worker": {
          "_id": "60d5ec49f1b2c81128c99999",
          "title": "Harvest Specialist",
          "skills": ["Wheat Cutting"],
          "expectedDailyWage": 700
        },
        "distanceKm": 3.1,
        "formattedDistance": "3.1 km away",
        "location": { "type": "Point", "coordinates": [75.882, 31.651] }
      }
    ]
  }
  ```

---

## 8. Update Location Privacy Setting
Update user profile location privacy controls.

- **URL**: `PUT /api/v1/profiles/location-privacy`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Body**:
  ```json
  {
    "locationVisibility": "approximate"
  }
  ```
- **Permitted Values**: `"private"`, `"approximate"`, `"verified_users"`, `"public"`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Location privacy updated successfully",
    "data": { "locationVisibility": "approximate" }
  }
  ```
