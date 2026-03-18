# Energy Intelligence

An AI-powered predictive operations platform for renewable energy asset management. This prototype demonstrates what the next-generation "operating system for renewable energy" could look like — built with a production-grade microservices architecture.

![Dashboard](https://img.shields.io/badge/Status-Prototype-green) ![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED) ![Python](https://img.shields.io/badge/Python-3.11-yellow) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-blue)

## Overview

Energy Intelligence extends beyond traditional PV monitoring into a full predictive operations platform supporting multi-technology renewable energy portfolios (Solar, Wind, BESS, Hydro). It addresses key competitive gaps in existing renewable energy monitoring platforms:

- **AI-Driven Predictive Maintenance** — ML-based failure prediction with confidence scores and recommended actions
- **Multi-Technology Asset Management** — Unified fleet view for Solar, Wind, BESS, and Hydro assets
- **Digital Twin Simulation** — Virtual asset replicas for scenario testing (weather, degradation, base case)
- **Energy Analytics & Curtailment** — Per-event energy loss accounting, grid dispatch optimization, and revenue analytics
- **Real-Time Operations Dashboard** — KPI monitoring, production charts, and alert feeds

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                               │
│                     namespace: energy-intelligence                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    INGRESS (nginx)                               │    │
│  │              TLS termination + path routing                      │    │
│  │         /           → web-app                                    │    │
│  │         /api/predict → prediction-service                        │    │
│  └────────────────────┬────────────────────┬───────────────────────┘    │
│                       │                    │                             │
│  ┌────────────────────▼──────┐  ┌─────────▼─────────────────────┐      │
│  │     WEB APP (Node.js)     │  │   PREDICTION SERVICE (Python)  │      │
│  │                           │  │                                 │      │
│  │  React 18 + Express.js    │  │  FastAPI + scikit-learn         │      │
│  │  TypeScript + Tailwind    │  │  Isolation Forest (anomaly)     │      │
│  │  shadcn/ui + Recharts     │  │  Gradient Boosting (RUL)        │      │
│  │                           │  │  REST API on port 8001          │      │
│  │  Replicas: 2-10 (HPA)    │  │  Replicas: 2-8 (HPA)           │      │
│  │  Port: 5000               │  │  Port: 8001                     │      │
│  └────────────┬──────────────┘  └──────────────┬──────────────────┘      │
│               │                                │                         │
│  ┌────────────▼────────────────────────────────▼──────────────────┐      │
│  │                    TIMESCALEDB                                  │      │
│  │           (PostgreSQL + time-series extension)                  │      │
│  │                                                                 │      │
│  │  StatefulSet with PersistentVolumeClaim (10Gi)                 │      │
│  │  Headless Service for stable DNS                                │      │
│  │  Port: 5432                                                     │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  SUPPORTING RESOURCES                                           │      │
│  │  • ConfigMap — environment config (DB host, service URLs)       │      │
│  │  • Secret — database credentials (base64-encoded)               │      │
│  │  • HPA — CPU-based autoscaling (target: 70%)                   │      │
│  │  • NetworkPolicy — zero-trust pod-to-pod communication          │      │
│  └─────────────────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────────────┘
```

### Architectural Reasoning

| Decision | Why It Matters |
|---|---|
| **Microservices over monolith** | The ML prediction workload has fundamentally different resource needs (CPU/memory-intensive, Python) than the web server (I/O-bound, Node.js). Separating them allows independent scaling — during peak prediction batch jobs, you scale prediction pods without touching the web tier. |
| **Kubernetes over bare EC2/VMs** | K8s gives you declarative infrastructure, self-healing (pod restarts), horizontal autoscaling, rolling deployments with zero downtime, and namespace isolation. For a platform managing critical energy infrastructure, this reliability is non-negotiable. |
| **StatefulSet for TimescaleDB** | Databases need stable network identity and persistent storage. StatefulSets guarantee ordered, graceful deployment and stable DNS names (`timescaledb-0.timescaledb.energy-intelligence.svc`). A Deployment would lose data on pod restart. |
| **HPA (Horizontal Pod Autoscaler)** | Energy platforms have predictable load patterns (peaks at solar noon, wind forecasting windows). HPA scales pods based on CPU utilization (70% threshold), keeping costs low during off-peak and ensuring responsiveness during spikes. |
| **NetworkPolicy (zero-trust)** | Default Kubernetes networking allows any pod to talk to any pod. Network policies restrict traffic: only the web-app and prediction-service can reach the database. This is a security baseline for SOC2/ISO27001 compliance. |
| **Ingress with TLS** | Single entry point with path-based routing. TLS termination at the edge means internal traffic stays fast (no encryption overhead between pods). The nginx ingress controller handles rate limiting, CORS, and request routing. |
| **ConfigMap + Secret separation** | Config (DB hostname, service URLs) changes often and is non-sensitive → ConfigMap. Credentials are sensitive → Secret (base64-encoded, ideally integrated with Vault or AWS Secrets Manager in production). |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + shadcn/ui + Recharts | Dashboard UI with dark-first industrial control room aesthetic |
| **Backend API** | Express.js (Node.js 20) | RESTful API serving fleet data, dashboard KPIs, analytics |
| **ML Microservice** | FastAPI (Python 3.11) + scikit-learn | Anomaly detection (Isolation Forest) + Remaining Useful Life prediction (Gradient Boosting) |
| **Database** | TimescaleDB (PostgreSQL + time-series) | Time-series sensor data, production metrics, event logs |
| **Container Runtime** | Docker + Docker Compose | Local development with multi-service orchestration |
| **Orchestration** | Kubernetes | Production deployment with autoscaling, self-healing, zero-downtime deploys |
| **Build** | Vite + esbuild | Fast frontend builds with HMR |
| **State Management** | TanStack React Query v5 | Server state caching, background refetching |
| **Routing** | wouter (hash-based) | Lightweight client-side routing |

---

## ML Prediction Microservice

The prediction service (`services/prediction-service/`) is a standalone Python microservice demonstrating how ML models integrate into the platform:

### Endpoints

```
POST /predict/anomaly       — Anomaly detection using Isolation Forest
POST /predict/rul           — Remaining Useful Life estimation using Gradient Boosting
GET  /health                — Health check (readiness/liveness probes)
GET  /model/info            — Model metadata and feature descriptions
```

### Models

| Model | Algorithm | Purpose | Input Features |
|---|---|---|---|
| **Anomaly Detection** | Isolation Forest | Detects unusual sensor patterns indicating equipment failure | temperature, vibration, power_output, wind_speed, humidity, voltage, current |
| **RUL Prediction** | Gradient Boosting Regressor | Estimates days until component failure | operating_hours, temperature_avg, vibration_avg, power_cycles, maintenance_count, age_days |

### Architectural Note

> In a production system, these models would be trained on historical SCADA data from actual wind turbines and solar inverters. The prototype uses synthetic training data to demonstrate the API contract and integration pattern. The key architectural decision is **serving models via REST API** rather than embedding them in the Node.js process — this allows data scientists to iterate on models independently, use Python's ML ecosystem, and scale prediction infrastructure separately from the web tier.

---

## Pages

### 1. Portfolio Dashboard
- 5 KPI cards: Total Capacity, Active Assets, Availability, Energy Yield, Revenue
- 24-hour energy production line chart with forecast overlay
- Asset type breakdown (donut chart)
- Top 10 assets by performance ratio
- Real-time alerts feed with severity indicators

### 2. Asset Fleet
- Filterable/searchable table of 20 German renewable energy assets
- Type, status, capacity, performance ratio, and health score columns
- Slide-over detail panel on row click
- Color-coded status badges (Online/Warning/Offline/Maintenance)

### 3. Predictive Maintenance
- AI failure predictions with confidence percentages and risk levels
- 90-day failure timeline (horizontal bar chart by component)
- Summary KPIs: Active Predictions, Critical Count, Estimated Savings, Model Accuracy
- Filterable by risk level (Critical/High/Medium/Low)

### 4. Digital Twin
- Asset selector with real-time metrics (power output, temperature, irradiance, humidity, efficiency)
- Progress bar gauges for each parameter
- Scenario comparison bar chart (Base Case vs Weather vs Degradation)
- Detailed scenario table with projected energy and revenue

### 5. Energy Analytics
- 30-day production vs curtailment stacked area chart
- Energy loss breakdown by category (Grid Curtailment, Inverter Downtime, Soiling, Clipping, Shading)
- Revenue optimization cards (Spot Price, Dispatch Window, Arbitrage Opportunity)
- Hourly grid dispatch schedule heatmap

---

## Quick Start — See It Running in 2 Minutes

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| **Node.js** | 20+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **Docker** (optional) | 24+ | `docker --version` |
| **kubectl** (optional) | 1.28+ | `kubectl version --client` |

### Launch the App

```bash
# 1. Clone the repo
git clone https://github.com/nmohamaya/energy-intelligence.git
cd energy-intelligence

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

**That's it.** Open [http://localhost:5000](http://localhost:5000) in your browser.

### What You'll See

The app opens to the **Portfolio Dashboard** with a dark industrial-control-room theme. Use the sidebar to navigate:

| Page | What It Shows |
|---|---|
| **Dashboard** | 5 KPI cards, 24-hour energy production chart with forecast, asset breakdown donut, alerts feed |
| **Fleet** | Searchable table of 20 German renewable energy assets — click any row for a detail slide-over |
| **Maintenance** | AI failure predictions with risk levels, 90-day failure timeline, estimated savings |
| **Digital Twin** | Select an asset → see live metrics (power, temperature, efficiency) + scenario comparisons |
| **Analytics** | 30-day production vs curtailment, energy loss breakdown, revenue optimization, dispatch heatmap |

Toggle **light/dark mode** with the theme switch in the sidebar. All data is simulated — the prototype demonstrates the UI, API contract, and architecture, not a live connection.

### Try the ML Prediction API (Optional)

If you want to also run the ML microservice alongside the main app:

```bash
# In a separate terminal — requires Python 3.11+ and pip
cd services/prediction-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```

Then test the anomaly detection endpoint:

```bash
curl -X POST http://localhost:8001/predict/anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 85.2,
    "vibration": 4.8,
    "power_output": 1200,
    "wind_speed": 12.5,
    "humidity": 65.0,
    "voltage": 690,
    "current": 145.3
  }'
```

Expected response:
```json
{
  "is_anomaly": false,
  "anomaly_score": -0.12,
  "confidence": 0.87,
  "model_version": "1.0.0"
}
```

Check model info:
```bash
curl http://localhost:8001/model/info
```

---

## All Deployment Options

### Option 1: Local Development (Node.js only)

The quickest path — runs the React frontend and Express API on a single port with hot module reloading.

```bash
npm install
npm run dev          # → http://localhost:5000 (Vite HMR + Express)
```

For a production build:

```bash
npm run build
NODE_ENV=production node dist/index.cjs   # → http://localhost:5000
```

### Option 2: Docker Compose (Full Stack)

Runs all three services (web app, ML prediction service, TimescaleDB) in containers. Best for testing the full microservices architecture locally.

```bash
# Build and start all services (first run takes ~2 min to build images)
docker-compose up --build

# Or run in the background
docker-compose up --build -d

# View logs across all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f prediction-service

# Stop everything
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

| Service | URL | What To Open |
|---|---|---|
| **Web App** | [http://localhost:5000](http://localhost:5000) | Main dashboard — open this in your browser |
| **Prediction Service** | [http://localhost:8001/health](http://localhost:8001/health) | ML API health check |
| **Prediction Docs** | [http://localhost:8001/docs](http://localhost:8001/docs) | FastAPI auto-generated Swagger UI |
| **TimescaleDB** | `localhost:5432` | Connect via `psql -h localhost -U energy_user -d energy_intelligence` |

### Option 3: Kubernetes Deployment

For production-grade deployment with autoscaling and self-healing. Requires a running K8s cluster (minikube, kind, EKS, GKE, etc.).

**Step 1: Build and push container images**
```bash
# Build images
docker build -t ghcr.io/nmohamaya/energy-intelligence/web-app:latest .
docker build -t ghcr.io/nmohamaya/energy-intelligence/prediction-service:latest \
  services/prediction-service/

# Push to GitHub Container Registry (requires `docker login ghcr.io`)
docker push ghcr.io/nmohamaya/energy-intelligence/web-app:latest
docker push ghcr.io/nmohamaya/energy-intelligence/prediction-service:latest
```

**Step 2: Deploy to the cluster**
```bash
# 1. Create the namespace
kubectl apply -f k8s/base/namespace.yaml

# 2. Deploy configuration and secrets
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml

# 3. Deploy the database first (StatefulSet — wait for it to be ready)
kubectl apply -f k8s/base/timescaledb.yaml
kubectl -n energy-intelligence rollout status statefulset/timescaledb

# 4. Deploy application services
kubectl apply -f k8s/base/web-app.yaml
kubectl apply -f k8s/base/prediction-service.yaml

# 5. Configure networking and autoscaling
kubectl apply -f k8s/base/ingress.yaml
kubectl apply -f k8s/base/network-policy.yaml
kubectl apply -f k8s/base/hpa.yaml
```

**Step 3: Verify and access**
```bash
# Check all pods are Running
kubectl -n energy-intelligence get pods

# Quick access without ingress (for local clusters)
kubectl -n energy-intelligence port-forward svc/web-app 5000:5000
# → Open http://localhost:5000
```

#### Kubernetes Commands Cheat Sheet

```bash
# Watch pods in real-time
kubectl -n energy-intelligence get pods -w

# Check pod logs
kubectl -n energy-intelligence logs -f deployment/web-app
kubectl -n energy-intelligence logs -f deployment/prediction-service

# Scale manually (overrides HPA temporarily)
kubectl -n energy-intelligence scale deployment/web-app --replicas=5

# Rolling update (zero-downtime)
kubectl -n energy-intelligence set image deployment/web-app \
  web-app=ghcr.io/nmohamaya/energy-intelligence/web-app:v2.0.0

# Rollback to previous version
kubectl -n energy-intelligence rollout undo deployment/web-app

# Check resource utilization
kubectl -n energy-intelligence top pods
```

---

## Project Structure

```
energy-intelligence/
├── client/                          # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/              # Shared components (Sidebar, ThemeProvider)
│   │   ├── pages/                   # Page components (Dashboard, Fleet, etc.)
│   │   ├── lib/                     # Utilities (queryClient, cn helper)
│   │   ├── hooks/                   # Custom React hooks
│   │   └── App.tsx                  # Router and app shell
│   └── index.html
├── server/                          # Backend (Express.js)
│   ├── routes.ts                    # API endpoint definitions
│   ├── storage.ts                   # Data simulation and in-memory store
│   └── index.ts                     # Express server setup
├── shared/
│   └── schema.ts                    # Zod schemas + TypeScript types
├── services/
│   └── prediction-service/          # ML Microservice (Python)
│       ├── app.py                   # FastAPI application with ML models
│       ├── requirements.txt         # Python dependencies
│       └── Dockerfile               # Python 3.11-slim container
├── k8s/
│   └── base/                        # Kubernetes manifests
│       ├── namespace.yaml           # Namespace isolation
│       ├── configmap.yaml           # Environment configuration
│       ├── secret.yaml              # Database credentials
│       ├── web-app.yaml             # Deployment + Service (Node.js)
│       ├── prediction-service.yaml  # Deployment + Service (Python)
│       ├── timescaledb.yaml         # StatefulSet + PVC + Headless Service
│       ├── ingress.yaml             # Nginx ingress with TLS
│       ├── hpa.yaml                 # Horizontal Pod Autoscalers
│       └── network-policy.yaml      # Zero-trust network policies
├── Dockerfile                       # Main app multi-stage build
├── docker-compose.yml               # Local multi-service development
├── BUILD_SPEC.md                    # Full design and data specification
└── package.json
```

---

## API Endpoints

### Web App API

```
GET /api/dashboard          — Portfolio KPIs + chart data
GET /api/assets             — Fleet data (filterable: ?type=&status=&search=)
GET /api/assets/:id         — Single asset detail
GET /api/predictions        — AI maintenance predictions (filterable: ?risk=)
GET /api/digital-twin/:id   — Twin metrics + simulation results
GET /api/analytics          — Energy production, curtailment, and revenue data
```

### Prediction Service API

```
POST /predict/anomaly       — Detect sensor anomalies (Isolation Forest)
POST /predict/rul           — Estimate Remaining Useful Life (Gradient Boosting)
GET  /health                — Health check for K8s probes
GET  /model/info            — Model metadata and capabilities
```

---

## Design System

- **Primary accent**: Electric green (#22c55e) — energy/sustainability
- **Background**: Deep navy/slate — industrial control room aesthetic
- **Typography**: Inter (body), JetBrains Mono (data values)
- **Data values**: `font-variant-numeric: tabular-nums lining-nums` for aligned columns
- **Sidebar**: Always dark, even in light mode

---

## Container Images

The project publishes two container images:

| Image | Base | Size |
|---|---|---|
| `ghcr.io/nmohamaya/energy-intelligence/web-app` | node:20-alpine | ~150MB |
| `ghcr.io/nmohamaya/energy-intelligence/prediction-service` | python:3.11-slim | ~250MB |

Both use multi-stage builds to minimize image size. The web-app Dockerfile builds the frontend with Vite in a build stage, then copies only the production artifacts into the runtime stage.

---

## Production Considerations

This is a prototype. For production deployment, you would additionally need:

- **CI/CD Pipeline** — GitHub Actions building and pushing container images on merge to main
- **Secrets Management** — HashiCorp Vault or AWS Secrets Manager (not base64-encoded K8s Secrets)
- **Monitoring** — Prometheus + Grafana for cluster and application metrics
- **Logging** — EFK stack (Elasticsearch, Fluentd, Kibana) or Loki + Grafana
- **Service Mesh** — Istio or Linkerd for mTLS, traffic management, and observability
- **Database Backup** — Automated pg_dump to S3 with point-in-time recovery
- **Model Registry** — MLflow or similar for ML model versioning and A/B testing
- **Real SCADA Integration** — OPC-UA or Modbus TCP adapters for real sensor data ingestion

---

## License

MIT
