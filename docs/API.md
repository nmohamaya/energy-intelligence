# API Reference

Complete API reference for the Energy Intelligence platform.

## Table of Contents

- [Authentication](#authentication)
- [Auth Endpoints](#auth-endpoints)
- [Data Endpoints](#data-endpoints)
  - [Dashboard](#get-apidashboard)
  - [Assets](#get-apiassets)
  - [Asset Detail](#get-apiassetsid)
  - [Predictions](#get-apipredictions)
  - [Digital Twin](#get-apidigital-twinassetid)
  - [Analytics](#get-apianalytics)
- [Rate Limits](#rate-limits)
- [WebSocket Protocol](#websocket-protocol)
- [Prediction Service](#prediction-service)
- [Error Format](#error-format)

---

## Authentication

The platform uses **session-based authentication** via httpOnly cookies.

| Property | Value |
|----------|-------|
| Cookie name | `connect.sid` |
| Cookie flags | `httpOnly`, `secure` (production only, HTTPS) |
| Session store | Server-side |

All data endpoints require an authenticated session. Include `credentials: "include"` in fetch calls:

```js
fetch("/api/dashboard", {
  credentials: "include",
});
```

---

## Auth Endpoints

Base path: `/api/auth`
Rate limit: **20 requests/min**

### POST /api/auth/register

Create a new user account. Automatically logs in and sets the session cookie.

**Request:**
```json
{
  "username": "jdoe",
  "email": "jdoe@example.com",
  "displayName": "Jane Doe",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "id": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "displayName": "Jane Doe",
  "role": "operator",
  "createdAt": "2026-03-29T10:00:00.000Z"
}
```

> Note: The response never includes `passwordHash`.

### POST /api/auth/login

Authenticate an existing user. Sets the session cookie on success.

**Request:**
```json
{
  "username": "jdoe",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "id": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "displayName": "Jane Doe",
  "role": "operator",
  "createdAt": "2026-03-29T10:00:00.000Z"
}
```

### POST /api/auth/logout

Destroy the current session and clear the session cookie.

**Request:** No body required.

**Response (200):**
```json
{
  "message": "Logged out"
}
```

### GET /api/auth/me

Return the currently authenticated user.

**Response (200):**
```json
{
  "id": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "displayName": "Jane Doe",
  "role": "operator",
  "createdAt": "2026-03-29T10:00:00.000Z"
}
```

**Response (401):**
```json
{
  "message": "Authentication required"
}
```

---

## Data Endpoints

All data endpoints require authentication. Unauthenticated requests receive a `401` response.

### GET /api/dashboard

Return portfolio-level KPIs, production chart data, alerts, and fleet overview.

Rate limit: **60 requests/min**

**Response (200):**
```json
{
  "kpis": {
    "totalCapacity": 2450.5,
    "activeAssets": 42,
    "avgEfficiency": 94.2,
    "alertCount": 7
  },
  "productionData": [
    {
      "timestamp": "2026-03-29T00:00:00.000Z",
      "actual": 1820.3,
      "predicted": 1850.0
    }
  ],
  "alerts": [
    {
      "id": "alert-1",
      "assetId": "asset-12",
      "severity": "high",
      "message": "Bearing temperature exceeds threshold",
      "timestamp": "2026-03-29T09:15:00.000Z"
    }
  ],
  "fleetOverview": {
    "solar": 15,
    "wind": 12,
    "bess": 10,
    "hydro": 5
  }
}
```

### GET /api/assets

Return a list of assets with optional filtering.

**Query Parameters:**

| Parameter | Type | Description | Valid Values |
|-----------|------|-------------|--------------|
| `type` | string | Filter by asset type | `Solar`, `Wind`, `BESS`, `Hydro` |
| `status` | string | Filter by status | `Online`, `Warning`, `Offline`, `Maintenance` |
| `search` | string | Full-text search on asset name/location | Any string |

**Example:** `GET /api/assets?type=Solar&status=Online&search=Nevada`

**Response (200):**
```json
[
  {
    "id": "asset-1",
    "name": "Nevada Solar Farm Alpha",
    "type": "Solar",
    "status": "Online",
    "location": "Nevada, US",
    "capacity": 150.0,
    "efficiency": 96.1,
    "lastUpdated": "2026-03-29T10:30:00.000Z"
  }
]
```

**Response (400) — invalid filter:**
```json
{
  "message": "Invalid type. Must be one of: Solar, Wind, BESS, Hydro"
}
```

### GET /api/assets/:id

Return a single asset by ID.

**Response (200):**
```json
{
  "id": "asset-1",
  "name": "Nevada Solar Farm Alpha",
  "type": "Solar",
  "status": "Online",
  "location": "Nevada, US",
  "capacity": 150.0,
  "efficiency": 96.1,
  "lastUpdated": "2026-03-29T10:30:00.000Z"
}
```

**Response (404):**
```json
{
  "message": "Asset not found"
}
```

### GET /api/predictions

Return AI-generated predictions with optional risk filtering.

Rate limit: **30 requests/min**

**Query Parameters:**

| Parameter | Type | Description | Valid Values |
|-----------|------|-------------|--------------|
| `risk` | string | Filter by risk level | `Critical`, `High`, `Medium`, `Low` |

**Example:** `GET /api/predictions?risk=Critical`

**Response (200):**
```json
[
  {
    "id": "pred-1",
    "assetId": "asset-12",
    "assetName": "Wind Turbine Delta-7",
    "riskLevel": "Critical",
    "component": "Main Bearing",
    "prediction": "Bearing failure likely within 14 days",
    "confidence": 0.92,
    "remainingLife": 14,
    "createdAt": "2026-03-29T08:00:00.000Z"
  }
]
```

### GET /api/digital-twin/:assetId

Return digital twin data for a specific asset, including simulated metrics.

**Response (200):**
```json
{
  "assetId": "asset-1",
  "metrics": {
    "temperature": 42.3,
    "vibration": 0.8,
    "powerOutput": 145.2,
    "windSpeed": 12.5
  },
  "simulations": [
    {
      "scenario": "high-wind",
      "predictedOutput": 148.0,
      "stressLevel": "moderate"
    }
  ]
}
```

**Response (404):**
```json
{
  "message": "Asset not found"
}
```

### GET /api/analytics

Return production, curtailment, dispatch, and revenue analytics.

**Response (200):**
```json
{
  "production": {
    "total": 18500.0,
    "byType": {
      "solar": 7200.0,
      "wind": 6800.0,
      "bess": 2500.0,
      "hydro": 2000.0
    }
  },
  "curtailment": {
    "total": 320.5,
    "reasons": [
      { "reason": "Grid congestion", "amount": 180.2 },
      { "reason": "Frequency regulation", "amount": 140.3 }
    ]
  },
  "dispatch": {
    "scheduled": 18200.0,
    "actual": 18500.0,
    "variance": 1.6
  },
  "revenue": {
    "total": 2450000,
    "byType": {
      "solar": 950000,
      "wind": 890000,
      "bess": 380000,
      "hydro": 230000
    }
  }
}
```

---

## Rate Limits

Rate limiting follows the [draft-7 RateLimit header specification](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/).

| Endpoint Pattern | Limit |
|-----------------|-------|
| `/api/auth/*` | 20 req/min |
| `/api/predictions` | 30 req/min |
| `/api/dashboard` | 60 req/min |
| `/api/*` (catch-all) | 120 req/min |

**Response Headers (on every request):**

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests allowed in the window |
| `RateLimit-Remaining` | Requests remaining in the current window |
| `RateLimit-Reset` | Seconds until the rate limit window resets |

**When exceeded (429):**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

---

## WebSocket Protocol

Real-time streaming uses a channel-based WebSocket protocol.

### Connection

```
ws://host/ws
```

A valid session cookie (from a prior HTTP login) is required. The WebSocket handshake will be rejected without authentication.

### Client Messages

**Subscribe to channels:**
```json
{
  "type": "subscribe",
  "channels": ["dashboard:kpis", "alerts:live"]
}
```

**Unsubscribe from channels:**
```json
{
  "type": "unsubscribe",
  "channels": ["dashboard:kpis"]
}
```

### Server Messages

**Channel data update:**
```json
{
  "channel": "dashboard:kpis",
  "data": {
    "totalCapacity": 2450.5,
    "activeAssets": 42,
    "avgEfficiency": 94.2,
    "alertCount": 7
  }
}
```

### Available Channels

| Channel | Description |
|---------|-------------|
| `dashboard:kpis` | Real-time portfolio KPI updates |
| `alerts:live` | Live alert stream |
| `asset:<id>:telemetry` | Per-asset telemetry data (replace `<id>` with asset ID) |
| `system` | System-level notifications |

---

## Prediction Service

The prediction service is a standalone FastAPI microservice running on port **8001**. It is called internally by the web app backend and is not directly exposed to end users in production.

### POST /api/v1/detect-anomaly

Detect anomalies in real-time sensor telemetry using an Isolation Forest model.

**Request:**
```json
{
  "asset_id": "asset-001",
  "asset_type": "solar",
  "power_output_kw": 145.0,
  "temperature_c": 72.5,
  "vibration_mm_s": 1.2,
  "humidity_pct": 65.0,
  "efficiency_pct": 90.0,
  "hours_since_maintenance": 500
}
```

**Response (200):**
```json
{
  "asset_id": "asset-001",
  "is_anomaly": false,
  "anomaly_score": -0.42,
  "risk_level": "low",
  "details": "Normal operating parameters"
}
```

### POST /api/v1/predict-failure

Predict component failure and remaining useful life using Gradient Boosting regression.

**Request:**
```json
{
  "asset_id": "asset-001",
  "asset_type": "wind",
  "power_output_kw": 98.0,
  "temperature_c": 95.1,
  "vibration_mm_s": 3.8,
  "humidity_pct": 80.0,
  "efficiency_pct": 85.0,
  "hours_since_maintenance": 2000
}
```

**Response (200):**
```json
{
  "asset_id": "asset-001",
  "component": "Main Bearing",
  "predicted_failure_date": "2026-04-12",
  "days_until_failure": 14,
  "confidence_pct": 91.0,
  "risk_level": "high",
  "recommended_action": "Schedule bearing inspection within 7 days"
}
```

### POST /api/v1/batch-predict

Run failure predictions on multiple telemetry samples in a single request.

**Request:**
```json
[
  {
    "asset_id": "asset-001",
    "asset_type": "solar",
    "power_output_kw": 145.0,
    "temperature_c": 72.5,
    "vibration_mm_s": 1.2,
    "humidity_pct": 65.0,
    "efficiency_pct": 90.0,
    "hours_since_maintenance": 500
  },
  {
    "asset_id": "asset-002",
    "asset_type": "wind",
    "power_output_kw": 98.0,
    "temperature_c": 95.1,
    "vibration_mm_s": 3.8,
    "humidity_pct": 80.0,
    "efficiency_pct": 85.0,
    "hours_since_maintenance": 2000
  }
]
```

**Response (200):**
```json
[
  {
    "asset_id": "asset-001",
    "component": "Inverter",
    "predicted_failure_date": "2026-07-15",
    "days_until_failure": 108,
    "confidence_pct": 85.0,
    "risk_level": "low",
    "recommended_action": "Continue routine monitoring"
  },
  {
    "asset_id": "asset-002",
    "component": "Main Bearing",
    "predicted_failure_date": "2026-04-12",
    "days_until_failure": 14,
    "confidence_pct": 91.0,
    "risk_level": "high",
    "recommended_action": "Schedule bearing inspection within 7 days"
  }
]
```

### GET /health

Kubernetes health/readiness probe endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "model_version": "1.0.0-isolation-forest",
  "uptime_seconds": 3842.5
}
```

---

## Error Format

All errors follow a consistent JSON format.

**Standard error:**
```json
{
  "message": "Human-readable error description"
}
```

**Common error responses:**

| Status | Scenario | Example Message |
|--------|----------|-----------------|
| 400 | Validation error | `"Invalid type. Must be one of: Solar, Wind, BESS, Hydro"` |
| 401 | Not authenticated | `"Authentication required"` |
| 403 | Insufficient permissions | `"Forbidden: insufficient role"` |
| 404 | Resource not found | `"Asset not found"` |
| 429 | Rate limit exceeded | `"Rate limit exceeded. Try again in 45 seconds."` |
| 500 | Internal server error | `"Internal server error"` |
