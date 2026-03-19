/**
 * Drizzle ORM table definitions for TimescaleDB.
 *
 * These define the DATABASE schema (what tables/columns exist in PostgreSQL).
 * This is separate from shared/schema.ts which defines the API schema (Zod types
 * for request/response validation). Both describe the same domain but serve
 * different purposes:
 *   - Drizzle schema → generates SQL migrations, provides type-safe queries
 *   - Zod schema → validates data at API boundaries, generates TypeScript types
 */

import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  real,
  timestamp,
  date,
  varchar,
} from "drizzle-orm/pg-core";

// --- Enums ---
// PostgreSQL enums are distinct types (CREATE TYPE ... AS ENUM) — the DB enforces valid values.

export const assetTypeEnum = pgEnum("asset_type", [
  "Solar",
  "Wind",
  "BESS",
  "Hydro",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "Online",
  "Warning",
  "Offline",
  "Maintenance",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "Critical",
  "High",
  "Medium",
  "Low",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical",
  "warning",
  "info",
]);

export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "dispatched",
  "curtailed",
  "standby",
]);

// --- Tables ---

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 32 }).notNull().unique(),
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(), // kWp
  status: assetStatusEnum("status").notNull().default("Online"),
  performanceRatio: real("performance_ratio").notNull(),
  lastCommunication: timestamp("last_communication", { withTimezone: true })
    .notNull()
    .defaultNow(),
  healthScore: integer("health_score").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  installedDate: date("installed_date").notNull(),
  inverterCount: integer("inverter_count").notNull(),
  currentOutput: integer("current_output").notNull(), // kW
  dailyYield: integer("daily_yield").notNull(), // kWh
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 32 }).notNull().unique(),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
  assetName: text("asset_name").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 32 }).notNull().unique(),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
  assetName: text("asset_name").notNull(),
  component: text("component").notNull(),
  predictedFailureDate: date("predicted_failure_date").notNull(),
  confidence: real("confidence").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  recommendedAction: text("recommended_action").notNull(),
});

/**
 * Hourly production data. Can be converted to a TimescaleDB hypertable
 * for automatic time-based partitioning when data volume warrants it.
 */
export const productionHistory = pgTable("production_history", {
  id: serial("id").primaryKey(),
  hour: varchar("hour", { length: 8 }).notNull(), // "HH:00" format
  production: real("production").notNull(), // GWh
  forecast: real("forecast").notNull(), // GWh
  recordedAt: date("recorded_at").notNull().defaultNow(),
});

/**
 * Daily curtailment data. Can be converted to a TimescaleDB hypertable
 * for time-based partitioning when data volume warrants it.
 */
export const curtailmentHistory = pgTable("curtailment_history", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  production: real("production").notNull(), // GWh
  curtailment: real("curtailment").notNull(), // GWh
});

export const lossBreakdown = pgTable("loss_breakdown", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  value: real("value").notNull(),
  percentage: real("percentage").notNull(),
});

export const dispatchSchedule = pgTable("dispatch_schedule", {
  id: serial("id").primaryKey(),
  hour: integer("hour").notNull(),
  day: varchar("day", { length: 3 }).notNull(), // Mon, Tue, ...
  status: dispatchStatusEnum("status").notNull(),
});
