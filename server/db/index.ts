/**
 * Database connection setup using pg.Pool + Drizzle ORM.
 *
 * Connection Pool Concepts:
 *   - Pool keeps N connections open and ready (no TCP handshake per query)
 *   - min: connections to keep alive even when idle (avoids cold-start latency)
 *   - max: hard cap to prevent overwhelming the database
 *   - idleTimeoutMillis: how long an idle connection stays in the pool
 *   - connectionTimeoutMillis: how long to wait for a free connection before erroring
 *
 * TimescaleDB is PostgreSQL — we use the standard `pg` driver. No special
 * client library needed. Hypertables are transparent to the driver.
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in .env or docker-compose.yml.\n" +
      "Example: postgresql://energy:energy_secret@localhost:5432/energy_intelligence",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2, // Keep 2 connections warm (instant query response)
  max: 10, // Cap at 10 (TimescaleDB default max_connections = 100)
  idleTimeoutMillis: 30_000, // Close idle connections after 30s
  connectionTimeoutMillis: 5_000, // Fail fast if DB is unreachable
});

// Drizzle wraps the pool with type-safe query builders
export const db = drizzle(pool, { schema });

// Graceful shutdown: close all connections when the process exits.
// Without this, Kubernetes sees "connection refused" errors during rolling updates
// because the old pod's pool still holds connections while the new pod starts.
function shutdown() {
  pool.end().then(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
