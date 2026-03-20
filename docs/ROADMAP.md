# Production Roadmap

This document maps the path from current prototype to production-ready platform. It covers what's done, what's simulated, and what needs to happen in each phase.

## Current State

**Done:**
- React 18 + TypeScript frontend with 5 pages (Dashboard, Fleet, Maintenance, Digital Twin, Analytics)
- Express.js backend with 6 REST API endpoints
- TimescaleDB persistence via Drizzle ORM (replaces in-memory storage)
- WebSocket real-time streaming with auto-reconnect
- Python FastAPI prediction service (Isolation Forest + Gradient Boosting)
- Docker Compose for local dev (3 services)
- Kubernetes manifests (deployments, HPA, network policies, ingress)
- CI/CD pipeline (GitHub Actions → GHCR)
- API input validation with Zod enums
- Test suite (Vitest + supertest, 54 tests)

---

## What's Simulated vs Real

Understanding what's simulated is critical for planning the production path. Each item below shows what we have now and what replaces it.

### Asset Metadata & Configuration

| Field | Current Source | Production Source |
|-------|---------------|-------------------|
| Asset names, types, locations | Seed script (20 hardcoded German assets) | Asset registry / onboarding system |
| Coordinates (lat/lng) | Random within Germany bounds | Actual GPS coordinates from site surveys |
| Installed dates | Random 2018–2024 | Real commissioning records |
| Inverter counts | Formula-based estimate | Actual equipment manifests |
| Capacity (kWp) | Hardcoded per asset | Nameplate ratings from equipment specs |

**Status:** Seed data is realistic but synthetic. Structure is production-ready — just needs real data loaded.

### Real-Time Sensor Telemetry

| Metric | Current Source | Production Source | Blocker |
|--------|---------------|-------------------|---------|
| Current output (kW) | `randomBetween()` at query time | SCADA/inverter telemetry | Issue #6 |
| Temperature | `randomBetween(35, 55)` for solar | PT100/thermocouple sensors via SCADA | Issue #6 |
| Irradiance (W/m²) | `randomBetween(400, 950)` | Pyranometer readings | Issue #6 |
| Wind speed (m/s) | `randomBetween(4, 18)` | Anemometer via SCADA | Issue #6 |
| Humidity (%) | `randomBetween(35, 75)` | Hygrometer readings | Issue #6 |
| Efficiency (%) | `randomBetween(88, 97)` | Calculated from actual output vs irradiance | Issue #6 |

**Status:** These are simulated in **both** MemStorage and DatabaseStorage. The `randomBetween()` calls happen at query time, not from the database. Issue #6 (SCADA integration) replaces all of these with real sensor data streamed into TimescaleDB hypertables.

### WebSocket Broadcasts

| Data | Current Source | Production Source |
|------|---------------|-------------------|
| Asset output updates | ±5% jitter on stored values, 3–6 random assets per tick | Real SCADA telemetry deltas |
| Live alerts | 10% random chance per tick, random severity/message | Alert rules engine evaluating real sensor thresholds |

**Status:** Currently decorative — shows the UI working but data has no real meaning. Becomes real once SCADA ingestion (Issue #6) and alerting service (Issue #21) are in place.

### ML Predictions

| Component | Current Source | Production Source | Blocker |
|-----------|---------------|-------------------|---------|
| Training data | 2,000 synthetic samples (`np.random.seed(42)`) | Historical telemetry from TimescaleDB | Issue #7 |
| Anomaly detection | Isolation Forest on synthetic patterns | Isolation Forest on real operating data | Issue #7 |
| RUL estimation | Gradient Boosting with formula-based targets | LSTM on real failure/maintenance history | Issues #7, #9 |
| Confidence scores | 85% base + random jitter | Calibrated from validation on real data | Issue #7 |

**Status:** Models are structurally correct but trained on made-up distributions. Predictions have no real-world validity until retrained on actual SCADA data.

### Market & Revenue Data

| Data | Current Source | Production Source |
|------|---------------|-------------------|
| Spot price (€/MWh) | `randomBetween(55, 95)` | Market data API (EPEX SPOT, Nord Pool) |
| Arbitrage opportunity (€) | `randomBetween(12000, 28000)` | Calculated from price spreads + battery capacity |
| Revenue per MWh | Hardcoded €78.4 | PPA rates + spot market weighted average |
| Revenue today | Hardcoded €3.2M (MemStorage) or calculated from yield × €0.078 (DatabaseStorage) | Actual metered revenue from billing system |

**Status:** No market data integration exists. Needs a market data adapter and price forecasting model.

### Historical / Analytics Data

| Data | Current Source | Production Source |
|------|---------------|-------------------|
| Production history (24h) | Sinusoidal curve simulating solar output | Metered production from inverters/meters |
| Curtailment history (30d) | Random 35–55 GWh production, 1.5–5.5 GWh curtailed | Grid operator curtailment signals + metered data |
| Loss breakdown | 5 hardcoded categories with fixed percentages | Calculated from actual downtime, curtailment, and degradation logs |
| Dispatch schedule (7×24h) | Random with 85% dispatched during daytime | Actual dispatch commands from grid operator / trading desk |

**Status:** Seed data populates the DB with plausible values. The tables and queries are production-ready — just needs real data flowing in.

### Digital Twin Scenarios

| Scenario | Current Source | Production Source |
|----------|---------------|-------------------|
| Base Case projection | `capacity × 4.2 × random(0.85, 0.95)` | Physics model using weather forecast + panel degradation curves |
| Weather Scenario | `capacity × 4.2 × random(0.65, 0.8)` | Numerical weather prediction API + energy model |
| Degradation Scenario | `capacity × 4.2 × random(0.55, 0.72)` | IV curve analysis + historical degradation rate |

**Status:** Placeholder calculations. Real digital twin requires physics-based energy models, weather forecast integration, and degradation tracking.

---

## Production Phases

### Phase 1: Foundation (Current → Security & Auth)

**Goal:** Secure the platform so it can be deployed to a real environment.

| Issue | Task | Priority | Why First |
|-------|------|----------|-----------|
| #10 | Authentication + RBAC (Keycloak/Auth0) | **Critical** | Can't deploy without user auth |
| #3 | External secrets management (Vault/AWS SM) | **Critical** | K8s secrets are base64, not encrypted |
| #16 | API rate limiting | High | Prevents abuse before public exposure |
| #25 | Security hardening (container scanning, headers, RBAC) | High | Baseline security posture |
| #28 | Align import extensions across server/db | Low | Cleanup, prevents runtime issues |

**Milestone:** Platform can be deployed with real user accounts and proper secret management.

### Phase 2: Infrastructure (Deployment & Observability)

**Goal:** Production-grade infrastructure with monitoring, logging, and environment management.

| Issue | Task | Priority | Why Now |
|-------|------|----------|---------|
| #2 | Kustomize overlays (staging/prod) | **Critical** | Need separate environments before going live |
| #11 | Prometheus + Grafana monitoring | **Critical** | Can't operate what you can't observe |
| #15 | Centralized logging (Loki/EFK) | High | Need aggregated logs across services |
| #17 | Database backup & disaster recovery | **Critical** | Data loss prevention before real data enters |
| #23 | Performance & load testing | High | Validate capacity before real traffic |

**Milestone:** Staging environment running with full observability. DR tested and documented.

### Phase 3: Real Data Pipeline

**Goal:** Replace all simulated data with real sensor telemetry and market data.

| Issue | Task | Priority | What It Replaces |
|-------|------|----------|------------------|
| #6 | SCADA data ingestion (OPC-UA/Modbus) | **Critical** | All `randomBetween()` sensor readings |
| #7 | Train ML models on real SCADA data | **Critical** | Synthetic 2,000-sample training set |
| #14 | Event-driven architecture (NATS/Kafka) | High | Direct polling; enables decoupled data flow |
| #21 | Alerting & notification service | High | Random fake WebSocket alerts |
| — | Market data adapter (EPEX SPOT / Nord Pool) | High | Hardcoded spot prices and revenue |

**Milestone:** Dashboard shows real sensor data. ML predictions are based on actual operating history. Alerts fire on real threshold violations.

### Phase 4: Advanced ML & Digital Twin

**Goal:** Production-quality ML models and physics-based digital twin.

| Issue | Task | Priority | What It Replaces |
|-------|------|----------|------------------|
| #9 | LSTM-based RUL model | High | Gradient Boosting with formula targets |
| #8 | Model A/B testing infrastructure | High | Manual model deployment |
| — | Physics-based energy model | Medium | `capacity × factor × random` scenario projections |
| — | Weather forecast integration | Medium | Simulated irradiance/wind values |
| #13 | Interactive asset map (Mapbox GL) | Medium | No map visualization currently |

**Milestone:** Digital twin shows physics-based projections. RUL predictions are validated against real failure data. Models are versioned and A/B tested.

### Phase 5: Enterprise Features

**Goal:** Multi-tenant, compliant, and internationalized platform.

| Issue | Task | Priority |
|-------|------|----------|
| #19 | Multi-tenancy & tenant isolation | High |
| #22 | Data retention & GDPR compliance | High |
| #18 | API versioning strategy | Medium |
| #20 | Internationalization (i18n) | Medium |
| #24 | API documentation (OpenAPI/Swagger) | Medium |

**Milestone:** Platform can serve multiple organizations with data isolation, regulatory compliance, and documented APIs.

---

## Simulation Elimination Tracker

This tracks the journey from "100% simulated" to "0% simulated" across phases.

```
Current state (prototype):
  MemStorage mode:  ~100% simulated (all data generated in-memory)
  DatabaseStorage:  ~30% simulated  (seed data is real-shaped but synthetic;
                                      real-time metrics still randomized)

After Phase 1 (Auth & Security):
  Still ~30% simulated — no data pipeline changes, but platform is secure

After Phase 2 (Infrastructure):
  Still ~30% simulated — monitoring/logging added, but data sources unchanged

After Phase 3 (Real Data Pipeline):
  ~5% simulated — real sensors, real alerts, real market data
  Remaining: digital twin scenarios still use simplified models

After Phase 4 (Advanced ML):
  ~0% simulated — physics models, validated ML, weather forecasts
  MemStorage kept as dev-mode fallback only

After Phase 5 (Enterprise):
  0% simulated — production-grade platform
```

---

## Key Dependencies Between Phases

```
Phase 1 (Auth/Security) ─────┐
                              ├──▶ Phase 2 (Infrastructure) ──▶ Phase 3 (Data Pipeline)
Phase 1 is prerequisite for   │                                        │
any real deployment            │                                        ▼
                              │                               Phase 4 (Advanced ML)
                              │                                        │
                              │                                        ▼
                              └────────────────────────────── Phase 5 (Enterprise)
```

- **Phase 3 depends on Phase 2:** Need monitoring and backups before ingesting real data
- **Phase 4 depends on Phase 3:** ML models need real training data from SCADA
- **Phase 5 can partially overlap with Phase 3/4:** API versioning and i18n are independent

---

## Non-Issue Work Required

Some production requirements don't have GitHub issues yet:

| Task | Phase | Description |
|------|-------|-------------|
| Market data adapter | 3 | Integration with EPEX SPOT / Nord Pool for real spot prices |
| Physics-based energy model | 4 | Replace `capacity × random` with irradiance/wind power curves |
| Weather forecast integration | 4 | NWP API for digital twin scenario projections |
| Real asset onboarding flow | 3 | UI/API to register real assets (replace seed script) |
| SLA & uptime monitoring | 2 | External uptime checks, SLA dashboards |
| Runbooks & incident response | 2 | Operational documentation for on-call |
