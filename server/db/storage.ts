/**
 * DatabaseStorage — implements IStorage using TimescaleDB via Drizzle ORM.
 *
 * This is the production storage backend. It queries real database tables
 * instead of generating simulated data in memory. Some real-time metrics
 * (digital twin sensors) are still simulated because actual SCADA sensor
 * integration is a separate feature (Issue #6).
 *
 * Repository Pattern:
 *   Routes call storage.getAssets() → they don't know or care if it's
 *   MemStorage (arrays) or DatabaseStorage (SQL). This lets us swap
 *   implementations without changing any route code.
 */

import { eq, ilike, or, sql, desc, asc } from "drizzle-orm";
import { db } from "./index.js";
import * as schema from "./schema.js";
import type { IStorage } from "../storage.js";
import type {
  Asset,
  DashboardData,
  DigitalTwinData,
  AnalyticsData,
  Prediction,
} from "@shared/schema";

// Helper: convert DB row to API Asset shape
function toAsset(row: typeof schema.assets.$inferSelect): Asset {
  return {
    id: row.externalId,
    name: row.name,
    type: row.type,
    location: row.location,
    capacity: row.capacity,
    status: row.status,
    performanceRatio: row.performanceRatio,
    lastCommunication: row.lastCommunication.toISOString(),
    healthScore: row.healthScore,
    latitude: row.latitude,
    longitude: row.longitude,
    installedDate: row.installedDate,
    inverterCount: row.inverterCount,
    currentOutput: row.currentOutput,
    dailyYield: row.dailyYield,
  };
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class DatabaseStorage implements IStorage {
  async getAssets(filters?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<Asset[]> {
    const conditions = [];

    if (filters?.type) {
      conditions.push(
        eq(schema.assets.type, filters.type as typeof schema.assets.type.enumValues[number]),
      );
    }
    if (filters?.status) {
      conditions.push(
        eq(schema.assets.status, filters.status as typeof schema.assets.status.enumValues[number]),
      );
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(schema.assets.name, searchTerm),
          ilike(schema.assets.location, searchTerm),
        )!,
      );
    }

    const query = db.select().from(schema.assets);
    const rows =
      conditions.length > 0
        ? await query.where(
            conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`),
          )
        : await query;

    return rows.map(toAsset);
  }

  async getAssetById(id: string): Promise<Asset | undefined> {
    const rows = await db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.externalId, id))
      .limit(1);

    return rows.length > 0 ? toAsset(rows[0]) : undefined;
  }

  async getPredictions(filters?: { risk?: string }): Promise<Prediction[]> {
    const query = db.select().from(schema.predictions);

    const rows = filters?.risk
      ? await query.where(
          eq(
            schema.predictions.riskLevel,
            filters.risk as typeof schema.predictions.riskLevel.enumValues[number],
          ),
        )
      : await query;

    return rows.map((row) => ({
      id: row.externalId,
      assetId: row.externalId, // Will be resolved below
      assetName: row.assetName,
      component: row.component,
      predictedFailureDate: row.predictedFailureDate,
      confidence: row.confidence,
      riskLevel: row.riskLevel,
      recommendedAction: row.recommendedAction,
    }));
  }

  async getDashboardData(): Promise<DashboardData> {
    // Fetch assets for aggregation
    const allAssets = await this.getAssets();

    // Compute KPIs from real asset data
    const totalCapacityKWp = allAssets.reduce((sum, a) => sum + a.capacity, 0);
    const onlineAssets = allAssets.filter((a) => a.status !== "Offline");
    const availability =
      allAssets.length > 0
        ? (onlineAssets.length / allAssets.length) * 100
        : 0;
    const totalYield = allAssets.reduce((sum, a) => sum + a.dailyYield, 0);

    // Fetch production history from DB
    const productionRows = await db
      .select()
      .from(schema.productionHistory)
      .orderBy(asc(schema.productionHistory.hour));

    // Asset type breakdown
    const typeCount: Record<string, number> = {};
    for (const a of allAssets) {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    }
    const total = allAssets.length;
    const breakdown = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    // Top 10 assets by performance ratio
    const topAssets = [...allAssets]
      .filter((a) => a.status !== "Offline")
      .sort((a, b) => b.performanceRatio - a.performanceRatio)
      .slice(0, 10)
      .map((a) => ({
        name: a.name.length > 22 ? a.name.slice(0, 20) + "…" : a.name,
        performanceRatio: a.performanceRatio,
      }));

    // Recent alerts from DB
    const alertRows = await db
      .select()
      .from(schema.alerts)
      .orderBy(desc(schema.alerts.timestamp))
      .limit(7);

    const recentAlerts = alertRows.map((row) => ({
      id: row.externalId,
      assetId: row.externalId,
      assetName: row.assetName,
      severity: row.severity,
      message: row.message,
      timestamp: row.timestamp.toISOString(),
    }));

    return {
      kpis: {
        totalCapacity: Math.round((totalCapacityKWp / 1_000_000) * 10) / 10, // GWp
        activeAssets: onlineAssets.length,
        availability: Math.round(availability * 10) / 10,
        energyYieldToday: Math.round((totalYield / 1_000_000) * 10) / 10, // GWh
        revenueToday:
          Math.round(((totalYield * 0.078) / 1_000_000) * 10) / 10, // €M
      },
      productionHistory: productionRows.map((row) => ({
        hour: row.hour,
        production: row.production,
        forecast: row.forecast,
      })),
      assetBreakdown: breakdown,
      topAssets,
      recentAlerts,
    };
  }

  async getDigitalTwinData(
    assetId: string,
  ): Promise<DigitalTwinData | undefined> {
    const asset = await this.getAssetById(assetId);
    if (!asset) return undefined;

    // Real-time metrics are still simulated (actual sensor data comes with Issue #6)
    const isSolar = asset.type === "Solar";
    const isWind = asset.type === "Wind";

    return {
      asset,
      realTimeMetrics: {
        powerOutput: asset.currentOutput,
        temperature:
          Math.round(
            randomBetween(isSolar ? 35 : 18, isSolar ? 55 : 30) * 10,
          ) / 10,
        irradiance: isSolar
          ? Math.round(randomBetween(400, 950))
          : undefined,
        windSpeed: isWind
          ? Math.round(randomBetween(4, 18) * 10) / 10
          : undefined,
        humidity: Math.round(randomBetween(35, 75)),
        efficiency: Math.round(randomBetween(88, 97) * 10) / 10,
      },
      scenarios: [
        {
          name: "Base Case",
          projectedEnergy: Math.round(
            asset.capacity * 4.2 * randomBetween(0.85, 0.95),
          ),
          projectedRevenue: Math.round(
            asset.capacity * 4.2 * randomBetween(0.85, 0.95) * 0.078,
          ),
          confidence: 94,
        },
        {
          name: "Weather Scenario",
          projectedEnergy: Math.round(
            asset.capacity * 4.2 * randomBetween(0.65, 0.8),
          ),
          projectedRevenue: Math.round(
            asset.capacity * 4.2 * randomBetween(0.65, 0.8) * 0.082,
          ),
          confidence: 78,
        },
        {
          name: "Degradation Scenario",
          projectedEnergy: Math.round(
            asset.capacity * 4.2 * randomBetween(0.55, 0.72),
          ),
          projectedRevenue: Math.round(
            asset.capacity * 4.2 * randomBetween(0.55, 0.72) * 0.075,
          ),
          confidence: 85,
        },
      ],
    };
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    // Curtailment history from DB
    const curtailmentRows = await db
      .select()
      .from(schema.curtailmentHistory)
      .orderBy(asc(schema.curtailmentHistory.date));

    const curtailmentHistory = curtailmentRows.map((row) => ({
      date: row.date,
      production: row.production,
      curtailment: row.curtailment,
    }));

    // Compute summary from curtailment data
    const totalProd = curtailmentRows.reduce(
      (sum, r) => sum + r.production,
      0,
    );
    const totalCurt = curtailmentRows.reduce(
      (sum, r) => sum + r.curtailment,
      0,
    );

    // Loss breakdown from DB
    const lossRows = await db.select().from(schema.lossBreakdown);
    const lossBreakdown = lossRows.map((row) => ({
      category: row.category,
      value: row.value,
      percentage: row.percentage,
    }));

    // Dispatch schedule from DB
    const dispatchRows = await db.select().from(schema.dispatchSchedule);
    const dispatchSchedule = dispatchRows.map((row) => ({
      hour: row.hour,
      day: row.day,
      status: row.status,
    }));

    return {
      summary: {
        totalProduction: Math.round((totalProd / 1000) * 100) / 100, // TWh
        totalCurtailment: Math.round(totalCurt),
        curtailmentPercentage:
          totalProd > 0
            ? Math.round((totalCurt / totalProd) * 100 * 10) / 10
            : 0,
        avgRevenuePerMwh: 78.4, // Will come from real market data later
      },
      curtailmentHistory,
      lossBreakdown,
      dispatchSchedule,
      revenueCards: {
        spotPriceNow: Math.round(randomBetween(55, 95) * 100) / 100,
        optimalDispatchWindow: "10:00 – 14:00",
        arbitrageOpportunity: Math.round(randomBetween(12000, 28000)),
      },
    };
  }
}
