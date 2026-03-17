# Energy Intelligence

An AI-powered predictive operations platform for renewable energy asset management. This prototype demonstrates what the next-generation "operating system for renewable energy" could look like.

![Dashboard](https://img.shields.io/badge/Status-Prototype-green) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-blue)

## Overview

Energy Intelligence extends beyond traditional PV monitoring into a full predictive operations platform supporting multi-technology renewable energy portfolios (Solar, Wind, BESS, Hydro). It addresses key competitive gaps in existing renewable energy monitoring platforms:

- **AI-Driven Predictive Maintenance** — ML-based failure prediction with confidence scores and recommended actions
- **Multi-Technology Asset Management** — Unified fleet view for Solar, Wind, BESS, and Hydro assets
- **Digital Twin Simulation** — Virtual asset replicas for scenario testing (weather, degradation, base case)
- **Energy Analytics & Curtailment** — Per-event energy loss accounting, grid dispatch optimization, and revenue analytics
- **Real-Time Operations Dashboard** — KPI monitoring, production charts, and alert feeds

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js (Node.js) with RESTful API
- **Routing**: wouter with hash-based routing
- **State Management**: TanStack React Query
- **Build**: Vite + esbuild

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Microservices-ready API design** | Each endpoint (`/api/dashboard`, `/api/assets`, `/api/predictions`, `/api/digital-twin/:id`, `/api/analytics`) maps to a bounded context, enabling future service decomposition |
| **In-memory data simulation** | Realistic renewable energy data patterns (solar sinusoidal curves, wind fluctuations, BESS charge/discharge cycles) for demo purposes — production would use time-series DB (InfluxDB/TimescaleDB) |
| **Event-driven alert system** | Alerts with severity levels (Critical/Warning/Info) modeled for future pub/sub integration (Kafka/NATS) |
| **Schema-first design** | Zod schemas shared between frontend and backend ensure type safety across the full stack |
| **Dark-first dashboard UI** | Industrial control room aesthetic — operators work in low-light environments, reducing eye strain during 24/7 monitoring |

### API Endpoints

```
GET /api/dashboard          — Portfolio KPIs + chart data
GET /api/assets             — Fleet data (filterable: ?type=&status=&search=)
GET /api/assets/:id         — Single asset detail
GET /api/predictions        — AI maintenance predictions (filterable: ?risk=)
GET /api/digital-twin/:id   — Twin metrics + simulation results
GET /api/analytics          — Energy production, curtailment, and revenue data
```

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

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production server
NODE_ENV=production node dist/index.cjs
```

The dev server starts at `http://localhost:5000`.

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/       # Shared components (Sidebar, ThemeProvider)
│   │   ├── pages/            # Page components (Dashboard, Fleet, etc.)
│   │   ├── lib/              # Utilities (queryClient, cn helper)
│   │   ├── hooks/            # Custom React hooks
│   │   └── App.tsx           # Router and app shell
│   └── index.html
├── server/
│   ├── routes.ts             # API endpoint definitions
│   ├── storage.ts            # Data simulation and in-memory store
│   └── index.ts              # Express server setup
├── shared/
│   └── schema.ts             # Zod schemas + TypeScript types
└── package.json
```

## Design System

- **Primary accent**: Electric green (#22c55e) — energy/sustainability
- **Background**: Deep navy/slate — industrial control room aesthetic
- **Typography**: Inter (body), JetBrains Mono (data values)
- **Data values**: `font-variant-numeric: tabular-nums lining-nums` for aligned columns
- **Sidebar**: Always dark, even in light mode

## License

MIT
