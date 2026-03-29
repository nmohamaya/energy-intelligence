# Changelog

All notable changes to the Energy Intelligence platform are documented here. Entries are grouped by feature area and linked to GitHub PRs.

---

## 2026-03-29

### Documentation Overhaul (PR [#53](https://github.com/nmohamaya/energy-intelligence/pull/53))

- Added `docs/ARCHITECTURE.md` — full system architecture deep-dive
- Added `docs/TESTING.md` — test strategy, all 15 test files documented
- Added `docs/API.md` — complete REST + WebSocket API reference
- Added `docs/CONTRIBUTING.md` — setup, conventions, PR process
- Added 6 Architecture Decision Records in `docs/adr/`
- Updated `README.md` with table of contents, troubleshooting, documentation section
- Restructured `server/routes.ts` into per-resource route modules under `server/routes/`
- Renamed `script/` to `scripts/`

### WebSocket Real-Time Streaming — Issue #5 (PR [#52](https://github.com/nmohamaya/energy-intelligence/pull/52))

- Rewrote WebSocket server with channel-based protocol (`dashboard:kpis`, `alerts:live`, `asset:<id>:telemetry`)
- Added session authentication on WebSocket upgrade (noServer mode with Express middleware chain)
- Added native WS ping/pong heartbeat (30s) with dead client termination
- KPI broadcast every 10s, telemetry every 5s, simulated alerts ~10% per tick
- Rewrote `useWebSocket` React hook with channel subscriptions, auto-reconnect, React Query cache invalidation
- Added WebSocket test suite (`server/__tests__/websocket.test.ts`)

### TimescaleDB Persistence — Issue #4 (PR [#51](https://github.com/nmohamaya/energy-intelligence/pull/51))

- Added `DatabaseStorage` implementing `IStorage` interface with Drizzle ORM queries
- Lazy-init proxy in `server/storage.ts` selects MemStorage or DatabaseStorage based on `DATABASE_URL`
- Drizzle schema with pgEnums for all domain types
- Database seed script with parameterized credentials (no hardcoded passwords)
- Hardened `docker-compose.yml` — all credentials use `${VAR:?msg}` required syntax
- Added `.env.example` with placeholder credentials

---

## 2026-03-28

### E2E Browser Tests — Issue #47 (PR [#49](https://github.com/nmohamaya/energy-intelligence/pull/49))

- Added 6 Playwright E2E specs: auth flows, dashboard, fleet, maintenance, navigation, theme
- Page object pattern (`e2e/pages/login.page.ts`, `e2e/pages/sidebar.page.ts`)
- Auth fixture for pre-authenticated sessions (`e2e/fixtures/auth.fixture.ts`)
- CI integration with artifact upload on failure

### Python Test Suite — Issue #46 (PR [#48](https://github.com/nmohamaya/energy-intelligence/pull/48))

- Added 6 Pytest test files for prediction service (49 tests)
- SLA markers for latency benchmarks (<100ms inference, <1s batch)
- Session-scoped fixtures for efficient model training
- Coverage reporting with pytest-cov

---

## 2026-03-26

### Server-Side Test Suite — Issue #12 (PR [#45](https://github.com/nmohamaya/energy-intelligence/pull/45))

- Added 7 Vitest test files for server (storage, routes, RBAC, auth middleware, password, query validation)
- Vitest configuration with v8 coverage (60% thresholds)
- CI pipeline integration (lint -> typecheck -> test -> build -> e2e)

---

## 2026-03-25

### Authentication + RBAC — Issue #10 (PR [#39](https://github.com/nmohamaya/energy-intelligence/pull/39))

- Session-based auth with passport-local strategy
- `connect-pg-simple` for PostgreSQL session storage, `memorystore` for local dev
- Password hashing with `crypto.scrypt` + `timingSafeEqual`
- RBAC with 4 roles: operator, engineer, manager, admin
- `requireAuth` and `requireRole()` middleware
- Auth routes: register, login, logout, current user
- Frontend: AuthProvider, Login/Register page, protected routes, user menu in sidebar
- Credentials sent via `credentials: "include"` on all API calls

---

## 2026-03-21

### API Rate Limiting — Issue #16 (PR [#34](https://github.com/nmohamaya/energy-intelligence/pull/34))

- Rate limiting middleware with configurable tiers per endpoint
- Dashboard: 60/min, Predictions: 30/min, Auth: 20/min, API catch-all: 120/min
- Standard `RateLimit-*` headers (draft-7)
- Relaxed limits in test environment to prevent flaky E2E tests

### Interactive Asset Map — Issue #13 (PR [#33](https://github.com/nmohamaya/energy-intelligence/pull/33))

- Leaflet map with asset markers showing type, status, and health score
- Map page added to sidebar navigation

---

## 2026-03-20

### API Input Validation — Issue #29 (PR [#30](https://github.com/nmohamaya/energy-intelligence/pull/30))

- Query parameter validation for type, status, and risk level filters
- Returns 400 with descriptive error messages for invalid enum values

### Initial WebSocket Streaming — Issue #5 (PR [#32](https://github.com/nmohamaya/energy-intelligence/pull/32))

- Basic WebSocket server with flat message broadcasting
- `useWebSocket` React hook with auto-reconnect and exponential backoff
- Later superseded by channel-based protocol in PR #52

### Initial Test Suite — Issue #12 (PR [#31](https://github.com/nmohamaya/energy-intelligence/pull/31))

- First Vitest setup with storage and route tests
- Later expanded significantly in PR #45

---

## 2026-03-19

### TimescaleDB Persistence (Initial) — Issue #4 (PR [#27](https://github.com/nmohamaya/energy-intelligence/pull/27))

- Initial Drizzle ORM integration with TimescaleDB
- Later reworked with lazy-init proxy and credential hardening in PR #51

---

## 2026-03-18

### CI/CD Pipeline (PR [#26](https://github.com/nmohamaya/energy-intelligence/pull/26))

- GitHub Actions: ESLint, TypeScript strict check, Vite production build
- Python linting with Ruff + Bandit security scanner
- Docker build + push to GHCR (web-app and prediction-service images)
- Image tagging: git SHA (immutable), `latest` (main), semver (tags)
