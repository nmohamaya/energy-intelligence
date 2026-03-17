import { z } from "zod";

// Asset types
export const assetTypeEnum = z.enum(["Solar", "Wind", "BESS", "Hydro"]);
export type AssetType = z.infer<typeof assetTypeEnum>;

// Asset status
export const assetStatusEnum = z.enum(["Online", "Warning", "Offline", "Maintenance"]);
export type AssetStatus = z.infer<typeof assetStatusEnum>;

// Risk level
export const riskLevelEnum = z.enum(["Critical", "High", "Medium", "Low"]);
export type RiskLevel = z.infer<typeof riskLevelEnum>;

// Alert severity
export const alertSeverityEnum = z.enum(["critical", "warning", "info"]);
export type AlertSeverity = z.infer<typeof alertSeverityEnum>;

// Asset schema
export const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: assetTypeEnum,
  location: z.string(),
  capacity: z.number(), // kWp
  status: assetStatusEnum,
  performanceRatio: z.number(), // percentage
  lastCommunication: z.string(),
  healthScore: z.number(), // 0-100
  latitude: z.number(),
  longitude: z.number(),
  installedDate: z.string(),
  inverterCount: z.number(),
  currentOutput: z.number(), // kW
  dailyYield: z.number(), // kWh
});
export type Asset = z.infer<typeof assetSchema>;

// Alert schema
export const alertSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  severity: alertSeverityEnum,
  message: z.string(),
  timestamp: z.string(),
});
export type Alert = z.infer<typeof alertSchema>;

// Prediction schema
export const predictionSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  component: z.string(),
  predictedFailureDate: z.string(),
  confidence: z.number(), // percentage
  riskLevel: riskLevelEnum,
  recommendedAction: z.string(),
});
export type Prediction = z.infer<typeof predictionSchema>;

// Dashboard data
export const dashboardDataSchema = z.object({
  kpis: z.object({
    totalCapacity: z.number(),
    activeAssets: z.number(),
    availability: z.number(),
    energyYieldToday: z.number(),
    revenueToday: z.number(),
  }),
  productionHistory: z.array(z.object({
    hour: z.string(),
    production: z.number(),
    forecast: z.number(),
  })),
  assetBreakdown: z.array(z.object({
    type: z.string(),
    count: z.number(),
    percentage: z.number(),
  })),
  topAssets: z.array(z.object({
    name: z.string(),
    performanceRatio: z.number(),
  })),
  recentAlerts: z.array(alertSchema),
});
export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Digital Twin data
export const digitalTwinDataSchema = z.object({
  asset: assetSchema,
  realTimeMetrics: z.object({
    powerOutput: z.number(),
    temperature: z.number(),
    irradiance: z.number().optional(),
    windSpeed: z.number().optional(),
    humidity: z.number(),
    efficiency: z.number(),
  }),
  scenarios: z.array(z.object({
    name: z.string(),
    projectedEnergy: z.number(),
    projectedRevenue: z.number(),
    confidence: z.number(),
  })),
});
export type DigitalTwinData = z.infer<typeof digitalTwinDataSchema>;

// Analytics data
export const analyticsDataSchema = z.object({
  summary: z.object({
    totalProduction: z.number(),
    totalCurtailment: z.number(),
    curtailmentPercentage: z.number(),
    avgRevenuePerMwh: z.number(),
  }),
  curtailmentHistory: z.array(z.object({
    date: z.string(),
    production: z.number(),
    curtailment: z.number(),
  })),
  lossBreakdown: z.array(z.object({
    category: z.string(),
    value: z.number(),
    percentage: z.number(),
  })),
  dispatchSchedule: z.array(z.object({
    hour: z.number(),
    day: z.string(),
    status: z.enum(["dispatched", "curtailed", "standby"]),
  })),
  revenueCards: z.object({
    spotPriceNow: z.number(),
    optimalDispatchWindow: z.string(),
    arbitrageOpportunity: z.number(),
  }),
});
export type AnalyticsData = z.infer<typeof analyticsDataSchema>;
