-- TimescaleDB initialization script
-- Runs automatically on first container startup via docker-entrypoint-initdb.d
--
-- This enables the TimescaleDB extension. Tables are created by Drizzle
-- (via `npm run db:push` or migrations). Hypertable conversion can be added
-- here once time-series tables have enough data volume to benefit from
-- automatic partitioning.

CREATE EXTENSION IF NOT EXISTS timescaledb;
