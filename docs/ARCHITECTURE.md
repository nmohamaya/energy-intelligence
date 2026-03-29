# Architecture

This document describes the system architecture of Energy Intelligence, an AI-powered predictive operations platform for renewable energy asset management.

## Table of Contents

- [System Overview](#system-overview)
- [Service Boundaries](#service-boundaries)
- [Request Lifecycle](#request-lifecycle)
- [Storage Layer](#storage-layer)
- [Authentication Flow](#authentication-flow)
- [WebSocket Protocol](#websocket-protocol)
- [Frontend Architecture](#frontend-architecture)
- [ML Service](#ml-service)
- [Data Model](#data-model)
- [Deployment](#deployment)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  KUBERNETES CLUSTER (energy-intelligence namespace)     │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Ingress  │───>│  Web App     │───>│ TimescaleDB  │  │
│  │ (nginx)  │    │  (Express +  │    │ (PostgreSQL  │  │
│  │          │    │   React)     │    │  + hypertables│  │
│  │          │    │  :5000       │    │  :5432)      │  │
│  │          │    └──────┬───────┘    └──────────────┘  │
│  │          │           │ WS /ws            ▲          │
│  │          │    ┌──────┴───────┐           │          │
│  │          │───>│ Prediction   │───────────┘          │
│  │          │    │ Service      │                      │
│  │          │    │ (FastAPI)    │                      │
│  │          │    │ :8001        │                      │
│  └──────────┘    └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

Three services, one database:

| Service | Tech | Port | Role |
| ------- | ---- | ---- | ---- |
| **Web App** | Express 5 + React 18 | 5000 | REST API, WebSocket server, serves frontend |
| **Prediction Service** | FastAPI + scikit-learn | 8001 | Anomaly detection, remaining useful life |
| **TimescaleDB** | PostgreSQL 16 + TimescaleDB | 5432 | Time-series storage, sessions, user data |

---

## Service Boundaries

### Web App (Express + React)

**Owns:** REST API, session management, authentication, WebSocket real-time streaming, frontend SPA.

The Express server serves dual duty:
- **Development:** Vite dev middleware on port 5000 provides HMR for the React frontend (`server/vite.ts`)
- **Production:** Serves static files from `dist/public/` (`server/static.ts`)

This single-port approach eliminates CORS complexity between frontend and backend dev servers. See [ADR-004](adr/004-express-vite-single-port.md).

### Prediction Service (FastAPI)

**Owns:** ML model training, anomaly detection, remaining useful life prediction.

Runs independently. The web app calls it via HTTP when predictions are needed. Models are trained on synthetic data at startup (~2-3s cold start). FastAPI was chosen for its async support, automatic OpenAPI docs, and Pydantic validation — a natural fit for ML serving.

### TimescaleDB

**Owns:** Persistent storage for assets, predictions, alerts, analytics, user sessions, and user accounts.

TimescaleDB extends PostgreSQL with hypertables for efficient time-series operations (time-range queries, automated retention, continuous aggregates). See [ADR-003](adr/003-timescaledb.md).

---

## Request Lifecycle

An authenticated API request flows through these layers:

```
Browser
  │
  ▼
Express middleware chain:
  1. express.json()          — parse request body
  2. express.urlencoded()    — parse form data
  3. express-session         — load/create session from cookie
  4. passport.initialize()   — attach passport to request
  5. passport.session()      — deserialize user from session
  6. request logger          — log method, path, status, duration
  7. apiLimiter              — rate limit: 120 req/min per IP
  │
  ▼
Route-specific middleware:
  8. requireAuth             — check req.isAuthenticated(), 401 if not
  9. endpoint limiter        — e.g. dashboardLimiter (60/min)
  │
  ▼
Route handler:
  10. storage.getXxx()       — calls into storage layer
  │
  ▼
Storage layer (IStorage):
  - MemStorage              — in-memory simulated data (no DB)
  - DatabaseStorage         — Drizzle ORM queries to TimescaleDB
  │
  ▼
Response: JSON → client
```

---

## Storage Layer

The storage layer uses an interface pattern that allows the app to run with or without a database. See [ADR-005](adr/005-storage-interface.md).

### Interface

```typescript
// server/storage.ts
export interface IStorage {
  getDashboardData(): Promise<DashboardData>;
  getAssets(filters?): Promise<Asset[]>;
  getAssetById(id: string): Promise<Asset | undefined>;
  getPredictions(filters?): Promise<Prediction[]>;
  getDigitalTwinData(assetId: string): Promise<DigitalTwinData | undefined>;
  getAnalyticsData(): Promise<AnalyticsData>;
  getUserByUsername(username: string): Promise<StoredUser | undefined>;
  getUserByEmail(email: string): Promise<StoredUser | undefined>;
  getUserById(id: number): Promise<StoredUser | undefined>;
  createUser(data: CreateUserData): Promise<StoredUser>;
}
```

### Two implementations

| Implementation | File | Used when |
| -------------- | ---- | --------- |
| `MemStorage` | `server/storage.ts` | `DATABASE_URL` is not set (local dev without Docker) |
| `DatabaseStorage` | `server/db/storage.ts` | `DATABASE_URL` is set (Docker Compose or Kubernetes) |

### Lazy-init proxy

The exported `storage` object is a proxy that lazily initializes the correct backend on first use:

```typescript
// server/storage.ts (simplified)
let instance: IStorage | null = null;

async function getStorage(): Promise<IStorage> {
  if (!instance) {
    instance = process.env.DATABASE_URL
      ? new (await import("./db/storage.js")).DatabaseStorage()
      : new MemStorage();
  }
  return instance;
}

export const storage: IStorage = {
  getDashboardData: () => getStorage().then(s => s.getDashboardData()),
  // ... each method delegates to the resolved instance
};
```

This means `npm run dev` works instantly without Docker — routes don't need to know which backend they're using.

---

## Authentication Flow

Session-based authentication using Passport.js with a local strategy. See [ADR-001](adr/001-session-auth.md).

```
Login:
  POST /api/auth/login { username, password }
    → passport.authenticate("local")
    → verify password (scrypt + timingSafeEqual)
    → serialize user.id into session
    → set httpOnly cookie (connect.sid)
    → return safe user object (no passwordHash)

Subsequent requests:
  Browser sends cookie automatically
    → express-session loads session from store
    → passport.session() deserializes user by ID
    → req.user is populated
    → requireAuth middleware checks req.isAuthenticated()
```

### Session storage

| Environment | Store | Persistence |
| ----------- | ----- | ----------- |
| With `DATABASE_URL` | `connect-pg-simple` (PostgreSQL) | Survives server restarts |
| Without `DATABASE_URL` | `memorystore` | Lost on restart |

### Password hashing

Uses Node's built-in `crypto.scrypt` (no external dependency). Passwords are stored as `salt:hash` strings. Comparison uses `crypto.timingSafeEqual` to prevent timing attacks.

### RBAC

Four roles: `operator`, `engineer`, `manager`, `admin`. The `requireRole(...roles)` middleware factory checks `req.user.role` against allowed roles, returning 403 if forbidden.

---

## WebSocket Protocol

Channel-based pub/sub over WebSocket, authenticated via session cookie on upgrade. See [ADR-002](adr/002-channel-websocket.md).

### Connection

```
Browser opens ws://host/ws
  → HTTP Upgrade request (includes session cookie)
  → Express session middleware runs on raw upgrade request (noServer mode)
  → passport.initialize() + passport.session()
  → if authenticated: wss.handleUpgrade() accepts connection
  → if not: socket.write("HTTP/1.1 401\r\n\r\n"), socket.destroy()
```

### Channels

| Channel | Data | Frequency |
| ------- | ---- | --------- |
| `dashboard:kpis` | Portfolio KPIs | Every 10s |
| `alerts:live` | Simulated alerts | ~10% chance per 5s tick |
| `asset:<id>:telemetry` | Per-asset output, status, health | Every 5s (3-6 random assets) |
| `system` | Connected, heartbeat, subscribed, error | On events / every 30s |

### Subscribe/Unsubscribe

```json
// Client → Server
{ "type": "subscribe", "channels": ["dashboard:kpis", "asset:asset-1:telemetry"] }
{ "type": "unsubscribe", "channels": ["asset:asset-1:telemetry"] }

// Server → Client
{ "channel": "dashboard:kpis", "data": { ...kpis } }
{ "channel": "system", "data": { "type": "heartbeat", "timestamp": "..." } }
```

An empty channel set means broadcast mode (receive everything).

### Heartbeat

Native WebSocket ping/pong every 30s. Clients that don't respond with pong are terminated as dead connections. A JSON heartbeat is also sent on the `system` channel for client-side display.

---

## Frontend Architecture

React 18 SPA bundled with Vite, using hash-based routing.

### Key libraries

| Library | Purpose |
| ------- | ------- |
| **wouter** | Routing (`useHashLocation` for `#/path` URLs) |
| **TanStack React Query** | Server state management, caching, background refetch |
| **shadcn/ui** | Component library (52 components in `client/src/components/ui/`) |
| **Recharts** | Data visualization (all charts use `ResponsiveContainer`) |
| **Tailwind CSS** | Utility-first styling |

### Pages

| Page | Route | Description |
| ---- | ----- | ----------- |
| Dashboard | `#/` | Portfolio KPIs, production chart, alerts, fleet overview |
| Fleet | `#/fleet` | Asset table with type/status/search filtering |
| Maintenance | `#/maintenance` | AI predictions with risk levels |
| Digital Twin | `#/digital-twin` | Per-asset metrics and simulations |
| Analytics | `#/analytics` | Production, curtailment, dispatch, revenue |

### Auth integration

`AuthProvider` wraps the app. If unauthenticated, only the login/register page is shown. All API calls include `credentials: "include"` to send the session cookie.

### WebSocket integration

The `useWebSocket` hook manages connection lifecycle, auto-reconnect with exponential backoff, channel subscriptions, and React Query cache invalidation on incoming data.

---

## ML Service

Python FastAPI microservice providing anomaly detection and remaining useful life (RUL) prediction.

### Models

| Model | Algorithm | Purpose |
| ----- | --------- | ------- |
| Anomaly Detection | Isolation Forest | Detect abnormal telemetry patterns |
| RUL Prediction | Gradient Boosting Regressor | Estimate remaining useful life in days |

Both models train on 2,000 synthetic samples at startup. Feature normalization uses `StandardScaler`.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/v1/detect-anomaly` | Anomaly detection (Isolation Forest) |
| `POST` | `/api/v1/predict-failure` | Failure prediction + RUL estimation |
| `POST` | `/api/v1/batch-predict` | Batch prediction (multiple assets) |
| `GET` | `/health` | Kubernetes health/readiness probe |

---

## Data Model

### Database schema (Drizzle ORM)

Key tables defined in `server/db/schema.ts`:

| Table | Purpose |
| ----- | ------- |
| `assets` | Renewable energy assets (Solar, Wind, BESS, Hydro) |
| `alerts` | Asset alerts with severity levels |
| `predictions` | AI-generated maintenance predictions |
| `production_data` | Time-series production output |
| `curtailment_events` | Grid curtailment records |
| `dispatch_records` | Energy dispatch/curtail/standby decisions |
| `revenue_data` | Monthly revenue by asset |
| `users` | User accounts with roles |
| `user_sessions` | Express session storage (connect-pg-simple) |

### Shared types

All data contracts live in `shared/schema.ts` as Zod schemas. Both client and server import from `@shared/schema`. This ensures API request/response types are always in sync.

---

## Deployment

### Local Development (no Docker)

```bash
npm install && npm run dev
```

Uses MemStorage (simulated data). Single port 5000 serves both API and React frontend via Vite dev middleware.

### Docker Compose (full stack)

```bash
docker-compose up --build
```

Runs web-app, prediction-service, and TimescaleDB. Uses DatabaseStorage with real PostgreSQL. Requires `.env` file with credentials.

### Kubernetes (production)

9 manifests in `k8s/base/`:

- **Namespace:** `energy-intelligence` (isolation)
- **Deployments:** web-app (2-10 replicas), prediction-service (2-8 replicas)
- **StatefulSet:** TimescaleDB with 20Gi PVC
- **HPA:** Auto-scaling based on CPU/memory
- **NetworkPolicy:** Zero-trust pod communication
- **Ingress:** Nginx with TLS and path-based routing
- **ConfigMap/Secret:** Environment configuration

See `k8s/base/` for full manifests.
