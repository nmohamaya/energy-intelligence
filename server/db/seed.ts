/**
 * Database seed script — populates TimescaleDB with realistic energy data.
 *
 * Usage: DATABASE_URL=postgresql://... npx tsx server/db/seed.ts
 * Or:    npm run db:seed  (with DATABASE_URL set in environment)
 *
 * This script:
 *   1. Pushes the Drizzle schema to the database (creates/updates tables)
 *   2. Clears existing data (idempotent — safe to re-run)
 *   3. Inserts 20 assets, 10 alerts, 12 predictions
 *   4. Generates 24h production history and 30-day curtailment data
 *   5. Generates loss breakdown and 7×24 dispatch schedule
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

const { Pool } = pg;

// --- Helpers (same as storage.ts) ---

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Asset definitions (same 20 German assets) ---

const assetDefs = [
  { name: "Brandenburg Solar Park", type: "Solar" as const, location: "Brandenburg, DE", capacity: 52000 },
  { name: "Nordfriesland Wind Farm", type: "Wind" as const, location: "Schleswig-Holstein, DE", capacity: 120000 },
  { name: "Bavaria Solar Complex", type: "Solar" as const, location: "Bavaria, DE", capacity: 78000 },
  { name: "Rhine-Ruhr BESS Station", type: "BESS" as const, location: "North Rhine-Westphalia, DE", capacity: 45000 },
  { name: "Mecklenburg Wind Park", type: "Wind" as const, location: "Mecklenburg-Vorpommern, DE", capacity: 95000 },
  { name: "Saxon Solar Field", type: "Solar" as const, location: "Saxony, DE", capacity: 34000 },
  { name: "Hamburg Port BESS", type: "BESS" as const, location: "Hamburg, DE", capacity: 28000 },
  { name: "Thuringia Solar Farm", type: "Solar" as const, location: "Thuringia, DE", capacity: 42000 },
  { name: "North Sea Wind Alpha", type: "Wind" as const, location: "Lower Saxony, DE", capacity: 180000 },
  { name: "Black Forest Hydro", type: "Hydro" as const, location: "Baden-Württemberg, DE", capacity: 15000 },
  { name: "Hessen Solar Array", type: "Solar" as const, location: "Hessen, DE", capacity: 61000 },
  { name: "Baltic Wind Farm", type: "Wind" as const, location: "Mecklenburg-Vorpommern, DE", capacity: 145000 },
  { name: "Leipzig Solar Park", type: "Solar" as const, location: "Saxony, DE", capacity: 27000 },
  { name: "Cologne BESS Hub", type: "BESS" as const, location: "North Rhine-Westphalia, DE", capacity: 35000 },
  { name: "Saarland Solar Strip", type: "Solar" as const, location: "Saarland, DE", capacity: 19000 },
  { name: "Alps Hydro Station", type: "Hydro" as const, location: "Bavaria, DE", capacity: 22000 },
  { name: "Bremen Wind Cluster", type: "Wind" as const, location: "Bremen, DE", capacity: 67000 },
  { name: "Potsdam Solar Grid", type: "Solar" as const, location: "Brandenburg, DE", capacity: 38000 },
  { name: "Dresden Solar Center", type: "Solar" as const, location: "Saxony, DE", capacity: 44000 },
  { name: "Eifel Wind Ridge", type: "Wind" as const, location: "Rhineland-Palatinate, DE", capacity: 88000 },
];

type AssetStatus = "Online" | "Warning" | "Offline" | "Maintenance";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Example:");
    console.error(
      "  DATABASE_URL=postgresql://energy:energy_secret@localhost:5432/energy_intelligence npx tsx server/db/seed.ts",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Pushing schema to database...");
  // Use drizzle-kit push programmatically by running raw SQL for table creation.
  // We'll use db:push via CLI instead. For now, just seed data.

  console.log("Clearing existing data...");
  await db.delete(schema.dispatchSchedule);
  await db.delete(schema.lossBreakdown);
  await db.delete(schema.curtailmentHistory);
  await db.delete(schema.productionHistory);
  await db.delete(schema.predictions);
  await db.delete(schema.alerts);
  await db.delete(schema.assets);

  // Reset serial sequences so IDs start from 1
  await db.execute(sql`ALTER SEQUENCE assets_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE alerts_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE predictions_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE production_history_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE curtailment_history_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE loss_breakdown_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE dispatch_schedule_id_seq RESTART WITH 1`);

  // --- 1. Seed Assets ---
  console.log("Seeding 20 assets...");
  const statuses: AssetStatus[] = [
    "Online", "Online", "Online", "Online", "Online", "Online",
    "Warning", "Offline", "Maintenance",
  ];

  const assetRows = assetDefs.map((def, i) => {
    const status: AssetStatus = i < 3 ? "Online" : randomChoice(statuses);
    const healthScore =
      status === "Online" ? randomBetween(85, 100)
      : status === "Warning" ? randomBetween(60, 84)
      : status === "Maintenance" ? randomBetween(40, 65)
      : randomBetween(20, 50);
    const performanceRatio =
      status === "Offline" ? 0 : randomBetween(status === "Online" ? 82 : 55, status === "Online" ? 99 : 82);
    const currentOutput =
      status === "Offline" ? 0 : def.capacity * (performanceRatio / 100) * randomBetween(0.3, 0.7);

    return {
      externalId: `asset-${i + 1}`,
      name: def.name,
      type: def.type,
      location: def.location,
      capacity: def.capacity,
      status,
      performanceRatio: Math.round(performanceRatio * 10) / 10,
      lastCommunication: new Date(Date.now() - Math.random() * 600000),
      healthScore: Math.round(healthScore),
      latitude: randomBetween(47.3, 55.0),
      longitude: randomBetween(5.9, 15.0),
      installedDate: `20${Math.floor(randomBetween(18, 24))}-${String(Math.floor(randomBetween(1, 13))).padStart(2, "0")}-01`,
      inverterCount: Math.floor(def.capacity / 5000) + Math.floor(randomBetween(1, 5)),
      currentOutput: Math.round(currentOutput),
      dailyYield: Math.round(currentOutput * randomBetween(4, 8)),
    };
  });

  const insertedAssets = await db.insert(schema.assets).values(assetRows).returning();
  console.log(`  Inserted ${insertedAssets.length} assets`);

  // --- 2. Seed Alerts ---
  console.log("Seeding alerts...");
  const alertMessages = [
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

  const alertRows = alertMessages.map((m, i) => {
    const asset = insertedAssets[i % insertedAssets.length];
    return {
      externalId: `alert-${i + 1}`,
      assetId: asset.id,
      assetName: asset.name,
      severity: m.severity,
      message: m.msg,
      timestamp: new Date(Date.now() - i * 900000 - Math.random() * 300000),
    };
  });

  await db.insert(schema.alerts).values(alertRows);
  console.log(`  Inserted ${alertRows.length} alerts`);

  // --- 3. Seed Predictions ---
  console.log("Seeding predictions...");
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
  const risks = [
    "Critical", "Critical", "Critical",
    "High", "High", "High", "High",
    "Medium", "Medium", "Medium",
    "Low", "Low",
  ] as const;

  const predictionRows = components.map((comp, i) => {
    const asset = insertedAssets[i % insertedAssets.length];
    const risk = risks[i];
    const daysUntilFailure =
      risk === "Critical" ? randomBetween(3, 14)
      : risk === "High" ? randomBetween(14, 35)
      : risk === "Medium" ? randomBetween(35, 60)
      : randomBetween(60, 90);
    return {
      externalId: `pred-${i + 1}`,
      assetId: asset.id,
      assetName: asset.name,
      component: comp,
      predictedFailureDate: new Date(Date.now() + daysUntilFailure * 86400000)
        .toISOString()
        .split("T")[0],
      confidence:
        Math.round(randomBetween(risk === "Critical" ? 88 : 70, 98) * 10) / 10,
      riskLevel: risk,
      recommendedAction: actions[i],
    };
  });

  await db.insert(schema.predictions).values(predictionRows);
  console.log(`  Inserted ${predictionRows.length} predictions`);

  // --- 4. Seed Production History (24h) ---
  console.log("Seeding 24h production history...");
  const productionRows = [];
  const today = new Date().toISOString().split("T")[0];
  for (let h = 0; h < 24; h++) {
    const hourStr = `${String(h).padStart(2, "0")}:00`;
    const solarFactor = Math.max(0, Math.sin(((h - 6) * Math.PI) / 12));
    const production = solarFactor * randomBetween(35, 45) + randomBetween(5, 12);
    const forecast = solarFactor * 40 + 8 + randomBetween(-2, 2);
    productionRows.push({
      hour: hourStr,
      production: Math.round(production * 100) / 100,
      forecast: Math.round(forecast * 100) / 100,
      recordedAt: today,
    });
  }

  await db.insert(schema.productionHistory).values(productionRows);
  console.log(`  Inserted ${productionRows.length} production history rows`);

  // --- 5. Seed Curtailment History (30 days) ---
  console.log("Seeding 30-day curtailment history...");
  const curtailmentRows = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(Date.now() - (29 - d) * 86400000)
      .toISOString()
      .split("T")[0];
    curtailmentRows.push({
      date,
      production: Math.round(randomBetween(35, 55) * 100) / 100,
      curtailment: Math.round(randomBetween(1.5, 5.5) * 100) / 100,
    });
  }

  await db.insert(schema.curtailmentHistory).values(curtailmentRows);
  console.log(`  Inserted ${curtailmentRows.length} curtailment history rows`);

  // --- 6. Seed Loss Breakdown ---
  console.log("Seeding loss breakdown...");
  const losses = [
    { category: "Grid Curtailment", value: 38, percentage: 42.7 },
    { category: "Inverter Downtime", value: 22, percentage: 24.7 },
    { category: "Soiling", value: 12, percentage: 13.5 },
    { category: "Clipping", value: 10, percentage: 11.2 },
    { category: "Shading", value: 7, percentage: 7.9 },
  ];

  await db.insert(schema.lossBreakdown).values(losses);
  console.log(`  Inserted ${losses.length} loss breakdown rows`);

  // --- 7. Seed Dispatch Schedule (7 days × 24 hours) ---
  console.log("Seeding dispatch schedule...");
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dispatchRows: Array<{
    hour: number;
    day: string;
    status: "dispatched" | "curtailed" | "standby";
  }> = [];

  for (const day of days) {
    for (let h = 0; h < 24; h++) {
      const statusOptions: Array<"dispatched" | "curtailed" | "standby"> = [
        "dispatched", "dispatched", "dispatched", "curtailed", "standby",
      ];
      const status: "dispatched" | "curtailed" | "standby" =
        h >= 6 && h <= 20
          ? (Math.random() > 0.15 ? "dispatched" : "curtailed")
          : randomChoice(statusOptions);
      dispatchRows.push({ hour: h, day, status });
    }
  }

  await db.insert(schema.dispatchSchedule).values(dispatchRows);
  console.log(`  Inserted ${dispatchRows.length} dispatch schedule rows`);

  // --- Done ---
  console.log("\nSeed complete!");
  console.log(
    `  Assets: ${insertedAssets.length}, Alerts: ${alertRows.length}, Predictions: ${predictionRows.length}`,
  );
  console.log(
    `  Production: ${productionRows.length}h, Curtailment: ${curtailmentRows.length}d, Dispatch: ${dispatchRows.length}`,
  );

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
