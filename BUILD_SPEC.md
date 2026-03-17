# Energy Intelligence - Build Specification

## Product Vision
An AI-powered predictive operations platform for renewable energy asset management. This is a prototype demonstrating what the next-generation "operating system for renewable energy" could look like — built on Kubernetes, Node.js, React, and microservices.

## Design Direction
- **Energy / Industrial SaaS dashboard** — clean, precise, data-dense
- **Color**: Deep navy/slate backgrounds with electric green (#22c55e) as primary accent (energy/sustainability), warm amber (#f59e0b) for warnings, cool blue (#3b82f6) for info. Dark mode first.
- **Typography**: Inter for body, JetBrains Mono for data values
- **Tone**: Mission-critical, professional, operational — like a control room interface
- **Dashboard layout**: Sidebar navigation, full-viewport, no body scroll

## Tech Stack (already installed)
- React + TypeScript + Tailwind CSS + shadcn/ui
- Express backend with in-memory storage
- Recharts for charts
- wouter with useHashLocation for routing
- lucide-react for icons
- framer-motion for animations
- date-fns for dates

## Pages (5 total)

### 1. Dashboard (/) — Portfolio Overview
- 5 KPI cards at top: Total Capacity (8.2 GWp), Active Assets (847), Availability (97.3%), Energy Yield Today (42.8 GWh), Revenue Today (€3.2M)
- Line chart: Portfolio energy production over last 24 hours (simulated sinusoidal pattern for solar)
- Donut chart: Asset type breakdown (Solar 72%, Wind 18%, BESS 7%, Hydro 3%)
- Bar chart: Top 10 assets by performance ratio
- Recent alerts feed (5-7 items) with severity colors
- Live updating "Last updated: Xm ago" 

### 2. Asset Fleet (/fleet)
- Filterable table of ~20 assets with columns: Name, Type (Solar/Wind/BESS/Hydro), Location, Capacity (kWp), Status (Online/Warning/Offline/Maintenance), Performance Ratio (%), Last Communication
- Filters: asset type dropdown, status dropdown, search by name
- Color-coded status badges
- Click row to see asset detail panel (slide-over sheet with more info)
- Show asset health score with progress bars

### 3. Predictive Maintenance (/maintenance)
- AI predictions table showing: Asset Name, Component, Predicted Failure Date, Confidence (%), Risk Level (Critical/High/Medium/Low), Recommended Action
- ~12 prediction items with realistic data
- Timeline chart showing predicted failures over next 90 days
- Summary cards: Predictions Active (23), Critical (3), Estimated Savings (€847K), Model Accuracy (94.2%)
- Filter by risk level

### 4. Digital Twin (/digital-twin)
- Asset selector dropdown at top
- When asset selected, show:
  - Real-time metrics panel: Power output, temperature, irradiance, wind speed (depending on type)
  - Gauges/meters for key parameters
  - "Run Simulation" button that shows scenario results
  - Scenario comparison: Base case vs Weather scenario vs Degradation scenario
  - Bar chart comparing projected energy output across scenarios
- Default to showing "Brandenburg Solar Park" as selected asset

### 5. Energy Analytics (/analytics)
- Curtailment analysis: stacked area chart showing production vs curtailment over 30 days
- Energy loss breakdown: horizontal bar chart by loss category (Grid Curtailment, Inverter Downtime, Soiling, Clipping, Shading)
- Grid dispatch schedule: timeline/heatmap showing hourly dispatch status
- Revenue optimization cards: Spot Price Now, Optimal Dispatch Window, Arbitrage Opportunity
- Summary: Total Production (1.24 TWh), Total Curtailment (89 GWh, 6.7%), Avg Revenue/MWh (€78.40)

## Sidebar Navigation
- Logo: "Energy Intelligence" with a lightning bolt SVG mark
- Nav items with lucide icons:
  - Dashboard (LayoutDashboard)
  - Asset Fleet (Server)
  - Predictive Maintenance (Brain)
  - Digital Twin (Cpu)
  - Energy Analytics (BarChart3)
- Collapsible sidebar
- Active state highlighting
- Dark/light mode toggle at bottom

## Data Architecture
All data is simulated in the backend with realistic patterns:
- Solar production follows time-of-day sinusoidal curves
- Wind data has random fluctuation patterns
- BESS shows charge/discharge cycles
- Predictive maintenance uses gaussian confidence distributions
- Curtailment correlates inversely with grid demand

## API Routes
- GET /api/dashboard — KPIs + chart data
- GET /api/assets — fleet data with optional filters (?type=&status=&search=)
- GET /api/assets/:id — single asset detail
- GET /api/predictions — maintenance predictions (?risk=)
- GET /api/digital-twin/:assetId — twin data + simulation results
- GET /api/analytics — energy analytics data

## index.css Color Theme (HSL format H S% L%)
### Light Mode
- background: 210 20% 98%
- foreground: 222 47% 11%
- card: 0 0% 100%
- card-foreground: 222 47% 11%
- primary: 142 71% 45%  (green — energy accent)
- primary-foreground: 0 0% 100%
- secondary: 210 16% 93%
- secondary-foreground: 222 47% 11%
- muted: 210 16% 93%
- muted-foreground: 215 16% 47%
- accent: 210 16% 93%
- accent-foreground: 222 47% 11%
- destructive: 0 84% 60%
- destructive-foreground: 0 0% 100%
- border: 214 20% 90%
- input: 214 20% 85%
- ring: 142 71% 45%
- chart-1: 142 71% 45%  (green)
- chart-2: 217 91% 60%  (blue)
- chart-3: 38 92% 50%  (amber)
- chart-4: 280 65% 60%  (purple)
- chart-5: 0 84% 60%  (red)
- sidebar: 222 47% 8%  (dark sidebar in light mode too)
- sidebar-foreground: 210 20% 90%
- sidebar-primary: 142 71% 45%
- sidebar-primary-foreground: 0 0% 100%
- sidebar-accent: 222 30% 14%
- sidebar-accent-foreground: 210 20% 95%
- sidebar-border: 222 30% 16%
- sidebar-ring: 142 71% 45%

### Dark Mode
- background: 222 47% 7%
- foreground: 210 20% 95%
- card: 222 35% 10%
- card-foreground: 210 20% 95%
- primary: 142 71% 45%
- primary-foreground: 0 0% 100%
- secondary: 222 30% 15%
- secondary-foreground: 210 20% 95%
- muted: 222 30% 17%
- muted-foreground: 215 16% 55%
- accent: 222 30% 15%
- accent-foreground: 210 20% 95%
- destructive: 0 84% 55%
- destructive-foreground: 0 0% 100%
- border: 222 30% 18%
- input: 222 30% 22%
- ring: 142 71% 45%
- chart-1: 142 71% 55%
- chart-2: 217 91% 70%
- chart-3: 38 92% 60%
- chart-4: 280 65% 70%
- chart-5: 0 84% 65%
- sidebar: 222 47% 5%
- sidebar-foreground: 210 20% 90%
- sidebar-primary: 142 71% 50%
- sidebar-primary-foreground: 0 0% 100%
- sidebar-accent: 222 30% 10%
- sidebar-accent-foreground: 210 20% 95%
- sidebar-border: 222 30% 12%
- sidebar-ring: 142 71% 50%

## Critical Rules
- Use `useHashLocation` from `wouter/use-hash-location` in Router
- Use `apiRequest` from `@/lib/queryClient` for ALL API calls
- Never use localStorage/sessionStorage/cookies
- Use `font-variant-numeric: tabular-nums lining-nums` for data values
- Max heading size is text-xl for this webapp
- All chart containers must use ResponsiveContainer from recharts
- Show skeleton/loading states while data loads
- Include PerplexityAttribution component at bottom
