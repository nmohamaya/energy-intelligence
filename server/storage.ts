import type {
  Asset,
  Alert,
  Prediction,
  DashboardData,
  DigitalTwinData,
  AnalyticsData,
  AssetType,
  AssetStatus,
  RiskLevel,
} from "@shared/schema";

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const assetNames: { name: string; type: AssetType; location: string; capacity: number }[] = [
  { name: "Brandenburg Solar Park", type: "Solar", location: "Brandenburg, DE", capacity: 52000 },
  { name: "Nordfriesland Wind Farm", type: "Wind", location: "Schleswig-Holstein, DE", capacity: 120000 },
  { name: "Bavaria Solar Complex", type: "Solar", location: "Bavaria, DE", capacity: 78000 },
  { name: "Rhine-Ruhr BESS Station", type: "BESS", location: "North Rhine-Westphalia, DE", capacity: 45000 },
  { name: "Mecklenburg Wind Park", type: "Wind", location: "Mecklenburg-Vorpommern, DE", capacity: 95000 },
  { name: "Saxon Solar Field", type: "Solar", location: "Saxony, DE", capacity: 34000 },
  { name: "Hamburg Port BESS", type: "BESS", location: "Hamburg, DE", capacity: 28000 },
  { name: "Thuringia Solar Farm", type: "Solar", location: "Thuringia, DE", capacity: 42000 },
  { name: "North Sea Wind Alpha", type: "Wind", location: "Lower Saxony, DE", capacity: 180000 },
  { name: "Black Forest Hydro", type: "Hydro", location: "Baden-Württemberg, DE", capacity: 15000 },
  { name: "Hessen Solar Array", type: "Solar", location: "Hessen, DE", capacity: 61000 },
  { name: "Baltic Wind Farm", type: "Wind", location: "Mecklenburg-Vorpommern, DE", capacity: 145000 },
  { name: "Leipzig Solar Park", type: "Solar", location: "Saxony, DE", capacity: 27000 },
  { name: "Cologne BESS Hub", type: "BESS", location: "North Rhine-Westphalia, DE", capacity: 35000 },
  { name: "Saarland Solar Strip", type: "Solar", location: "Saarland, DE", capacity: 19000 },
  { name: "Alps Hydro Station", type: "Hydro", location: "Bavaria, DE", capacity: 22000 },
  { name: "Bremen Wind Cluster", type: "Wind", location: "Bremen, DE", capacity: 67000 },
  { name: "Potsdam Solar Grid", type: "Solar", location: "Brandenburg, DE", capacity: 38000 },
  { name: "Dresden Solar Center", type: "Solar", location: "Saxony, DE", capacity: 44000 },
  { name: "Eifel Wind Ridge", type: "Wind", location: "Rhineland-Palatinate, DE", capacity: 88000 },
];

function generateAssets(): Asset[] {
  return assetNames.map((def, i) => {
    const statuses: AssetStatus[] = ["Online", "Online", "Online", "Online", "Online", "Online", "Warning", "Offline", "Maintenance"];
    const status = i < 3 ? "Online" : randomChoice(statuses);
    const healthScore = status === "Online" ? randomBetween(85, 100) : status === "Warning" ? randomBetween(60, 84) : status === "Maintenance" ? randomBetween(40, 65) : randomBetween(20, 50);
    const performanceRatio = status === "Offline" ? 0 : randomBetween(status === "Online" ? 82 : 55, status === "Online" ? 99 : 82);
    const currentOutput = status === "Offline" ? 0 : def.capacity * (performanceRatio / 100) * randomBetween(0.3, 0.7);

    return {
      id: `asset-${i + 1}`,
      name: def.name,
      type: def.type,
      location: def.location,
      capacity: def.capacity,
      status,
      performanceRatio: Math.round(performanceRatio * 10) / 10,
      lastCommunication: new Date(Date.now() - Math.random() * 600000).toISOString(),
      healthScore: Math.round(healthScore),
      latitude: randomBetween(47.3, 55.0),
      longitude: randomBetween(5.9, 15.0),
      installedDate: `20${Math.floor(randomBetween(18, 24))}-${String(Math.floor(randomBetween(1, 13))).padStart(2, "0")}-01`,
      inverterCount: Math.floor(def.capacity / 5000) + Math.floor(randomBetween(1, 5)),
      currentOutput: Math.round(currentOutput),
      dailyYield: Math.round(currentOutput * randomBetween(4, 8)),
    };
  });
}

function generateAlerts(assets: Asset[]): Alert[] {
  const messages = [
    { severity: "critical" as const, msg: "Inverter failure detected — immediate inspection required" },
    { severity: "critical" as const, msg: "Communication loss exceeding 30 minutes" },
    { severity: "warning" as const, msg: "Performance ratio dropped below 80% threshold" },
    { severity: "warning" as const, msg: "Elevated operating temperature on string 4" },
    { severity: "warning" as const, msg: "Grid frequency deviation detected" },
    { severity: "info" as const, msg: "Scheduled maintenance window approaching" },
    { severity: "info" as const, msg: "Firmware update available for inverter cluster" },
    { severity: "info" as const, msg: "Weather advisory: high winds forecast for next 12h" },
    { severity: "warning" as const, msg: "DC/AC ratio anomaly in combiner box 7" },
    { severity: "critical" as const, msg: "Arc fault detection triggered — safety shutdown" },
  ];

  return messages.map((m, i) => {
    const asset = assets[i % assets.length];
    return {
      id: `alert-${i + 1}`,
      assetId: asset.id,
      assetName: asset.name,
      severity: m.severity,
      message: m.msg,
      timestamp: new Date(Date.now() - i * 900000 - Math.random() * 300000).toISOString(),
    };
  });
}

function generatePredictions(assets: Asset[]): Prediction[] {
  const components = [
    "Main Inverter", "Transformer Unit", "Tracking System", "Junction Box",
    "Gearbox", "Generator Bearings", "Yaw Motor", "Pitch System",
    "Battery Module", "Cooling System", "DC-DC Converter", "Control Board",
  ];
  const actions = [
    "Schedule preventive replacement within 2 weeks",
    "Order replacement parts and plan maintenance window",
    "Conduct thermal inspection and apply corrective measures",
    "Replace worn bearings during next scheduled downtime",
    "Upgrade firmware and recalibrate sensor array",
    "Flush cooling system and replace coolant",
    "Inspect wiring and replace degraded connectors",
    "Run diagnostic cycle and replace faulty module",
    "Re-torque bolts and inspect mounting structure",
    "Balance rotor assembly and check alignment",
    "Replace capacitor bank in power conditioning unit",
    "Calibrate pitch angle sensors and test actuation",
  ];
  const risks: RiskLevel[] = ["Critical", "Critical", "Critical", "High", "High", "High", "High", "Medium", "Medium", "Medium", "Low", "Low"];

  return components.map((comp, i) => {
    const asset = assets[i % assets.length];
    const daysUntilFailure = risks[i] === "Critical" ? randomBetween(3, 14) : risks[i] === "High" ? randomBetween(14, 35) : risks[i] === "Medium" ? randomBetween(35, 60) : randomBetween(60, 90);
    return {
      id: `pred-${i + 1}`,
      assetId: asset.id,
      assetName: asset.name,
      component: comp,
      predictedFailureDate: new Date(Date.now() + daysUntilFailure * 86400000).toISOString().split("T")[0],
      confidence: Math.round(randomBetween(risks[i] === "Critical" ? 88 : 70, 98) * 10) / 10,
      riskLevel: risks[i],
      recommendedAction: actions[i],
    };
  });
}

function generateProductionHistory(): { hour: string; production: number; forecast: number }[] {
  const data = [];
  for (let h = 0; h < 24; h++) {
    const hourStr = `${String(h).padStart(2, "0")}:00`;
    // Solar sinusoidal pattern peaking at noon
    const solarFactor = Math.max(0, Math.sin((h - 6) * Math.PI / 12));
    const production = solarFactor * randomBetween(35, 45) + randomBetween(5, 12); // GWh
    const forecast = solarFactor * 40 + 8 + randomBetween(-2, 2);
    data.push({
      hour: hourStr,
      production: Math.round(production * 100) / 100,
      forecast: Math.round(forecast * 100) / 100,
    });
  }
  return data;
}

function generateDashboardData(assets: Asset[], alerts: Alert[]): DashboardData {
  const typeCount = { Solar: 0, Wind: 0, BESS: 0, Hydro: 0 };
  assets.forEach((a) => typeCount[a.type]++);
  const total = assets.length;

  const sortedByPerf = [...assets]
    .filter((a) => a.status !== "Offline")
    .sort((a, b) => b.performanceRatio - a.performanceRatio)
    .slice(0, 10);

  return {
    kpis: {
      totalCapacity: 8.2,
      activeAssets: 847,
      availability: 97.3,
      energyYieldToday: 42.8,
      revenueToday: 3.2,
    },
    productionHistory: generateProductionHistory(),
    assetBreakdown: [
      { type: "Solar", count: typeCount.Solar, percentage: 72 },
      { type: "Wind", count: typeCount.Wind, percentage: 18 },
      { type: "BESS", count: typeCount.BESS, percentage: 7 },
      { type: "Hydro", count: typeCount.Hydro, percentage: 3 },
    ],
    topAssets: sortedByPerf.map((a) => ({
      name: a.name.length > 22 ? a.name.slice(0, 20) + "…" : a.name,
      performanceRatio: a.performanceRatio,
    })),
    recentAlerts: alerts.slice(0, 7),
  };
}

function generateDigitalTwinData(asset: Asset): DigitalTwinData {
  const isSolar = asset.type === "Solar";
  const isWind = asset.type === "Wind";

  return {
    asset,
    realTimeMetrics: {
      powerOutput: asset.currentOutput,
      temperature: Math.round(randomBetween(isSolar ? 35 : 18, isSolar ? 55 : 30) * 10) / 10,
      irradiance: isSolar ? Math.round(randomBetween(400, 950)) : undefined,
      windSpeed: isWind ? Math.round(randomBetween(4, 18) * 10) / 10 : undefined,
      humidity: Math.round(randomBetween(35, 75)),
      efficiency: Math.round(randomBetween(88, 97) * 10) / 10,
    },
    scenarios: [
      {
        name: "Base Case",
        projectedEnergy: Math.round(asset.capacity * 4.2 * randomBetween(0.85, 0.95)),
        projectedRevenue: Math.round(asset.capacity * 4.2 * randomBetween(0.85, 0.95) * 0.078),
        confidence: 94,
      },
      {
        name: "Weather Scenario",
        projectedEnergy: Math.round(asset.capacity * 4.2 * randomBetween(0.65, 0.80)),
        projectedRevenue: Math.round(asset.capacity * 4.2 * randomBetween(0.65, 0.80) * 0.082),
        confidence: 78,
      },
      {
        name: "Degradation Scenario",
        projectedEnergy: Math.round(asset.capacity * 4.2 * randomBetween(0.55, 0.72)),
        projectedRevenue: Math.round(asset.capacity * 4.2 * randomBetween(0.55, 0.72) * 0.075),
        confidence: 85,
      },
    ],
  };
}

function generateAnalyticsData(): AnalyticsData {
  const curtailmentHistory = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(Date.now() - (29 - d) * 86400000).toISOString().split("T")[0];
    const production = randomBetween(35, 55);
    const curtailment = randomBetween(1.5, 5.5);
    curtailmentHistory.push({
      date,
      production: Math.round(production * 100) / 100,
      curtailment: Math.round(curtailment * 100) / 100,
    });
  }

  const losses = [
    { category: "Grid Curtailment", value: 38, percentage: 42.7 },
    { category: "Inverter Downtime", value: 22, percentage: 24.7 },
    { category: "Soiling", value: 12, percentage: 13.5 },
    { category: "Clipping", value: 10, percentage: 11.2 },
    { category: "Shading", value: 7, percentage: 7.9 },
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dispatchSchedule: AnalyticsData["dispatchSchedule"] = [];
  for (const day of days) {
    for (let h = 0; h < 24; h++) {
      const statuses: Array<"dispatched" | "curtailed" | "standby"> = ["dispatched", "dispatched", "dispatched", "curtailed", "standby"];
      dispatchSchedule.push({
        hour: h,
        day,
        status: h >= 6 && h <= 20 ? (Math.random() > 0.15 ? "dispatched" : "curtailed") : randomChoice(statuses),
      });
    }
  }

  return {
    summary: {
      totalProduction: 1.24,
      totalCurtailment: 89,
      curtailmentPercentage: 6.7,
      avgRevenuePerMwh: 78.4,
    },
    curtailmentHistory,
    lossBreakdown: losses,
    dispatchSchedule,
    revenueCards: {
      spotPriceNow: Math.round(randomBetween(55, 95) * 100) / 100,
      optimalDispatchWindow: "10:00 – 14:00",
      arbitrageOpportunity: Math.round(randomBetween(12000, 28000)),
    },
  };
}

export interface IStorage {
  getDashboardData(): Promise<DashboardData>;
  getAssets(filters?: { type?: string; status?: string; search?: string }): Promise<Asset[]>;
  getAssetById(id: string): Promise<Asset | undefined>;
  getPredictions(filters?: { risk?: string }): Promise<Prediction[]>;
  getDigitalTwinData(assetId: string): Promise<DigitalTwinData | undefined>;
  getAnalyticsData(): Promise<AnalyticsData>;
}

export class MemStorage implements IStorage {
  private assets: Asset[];
  private alerts: Alert[];
  private predictions: Prediction[];

  constructor() {
    this.assets = generateAssets();
    this.alerts = generateAlerts(this.assets);
    this.predictions = generatePredictions(this.assets);
  }

  async getDashboardData(): Promise<DashboardData> {
    return generateDashboardData(this.assets, this.alerts);
  }

  async getAssets(filters?: { type?: string; status?: string; search?: string }): Promise<Asset[]> {
    let result = [...this.assets];
    if (filters?.type) {
      result = result.filter((a) => a.type === filters.type);
    }
    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(s) || a.location.toLowerCase().includes(s));
    }
    return result;
  }

  async getAssetById(id: string): Promise<Asset | undefined> {
    return this.assets.find((a) => a.id === id);
  }

  async getPredictions(filters?: { risk?: string }): Promise<Prediction[]> {
    let result = [...this.predictions];
    if (filters?.risk) {
      result = result.filter((p) => p.riskLevel === filters.risk);
    }
    return result;
  }

  async getDigitalTwinData(assetId: string): Promise<DigitalTwinData | undefined> {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) return undefined;
    return generateDigitalTwinData(asset);
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    return generateAnalyticsData();
  }
}

// Conditional storage: use real DB when DATABASE_URL is set, otherwise fall back
// to in-memory simulation. This lets `npm run dev` work without Docker.
//
// We use a lazy-init wrapper to avoid top-level await (tsconfig doesn't allow it).
// The first call to any storage method triggers the import; after that it's cached.

// Cache the initialization promise (not just the result) to prevent race conditions.
// If two requests arrive simultaneously before init completes, both await the SAME
// promise instead of each creating their own storage instance.
let _storagePromise: Promise<IStorage> | null = null;

function getStorage(): Promise<IStorage> {
  if (!_storagePromise) {
    _storagePromise = (async () => {
      if (process.env.DATABASE_URL) {
        const { DatabaseStorage } = await import("./db/storage.js");
        console.log("Using DatabaseStorage (TimescaleDB)");
        return new DatabaseStorage();
      } else {
        console.log("Using MemStorage (in-memory simulation — no DATABASE_URL set)");
        return new MemStorage();
      }
    })();
  }
  return _storagePromise;
}

// Proxy that delegates every IStorage method to the lazily-initialized backend
export const storage: IStorage = {
  getDashboardData: () => getStorage().then((s) => s.getDashboardData()),
  getAssets: (filters) => getStorage().then((s) => s.getAssets(filters)),
  getAssetById: (id) => getStorage().then((s) => s.getAssetById(id)),
  getPredictions: (filters) => getStorage().then((s) => s.getPredictions(filters)),
  getDigitalTwinData: (assetId) => getStorage().then((s) => s.getDigitalTwinData(assetId)),
  getAnalyticsData: () => getStorage().then((s) => s.getAnalyticsData()),
};
