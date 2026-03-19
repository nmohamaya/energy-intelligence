-- TimescaleDB initialization script
-- Runs automatically on first container startup via docker-entrypoint-initdb.d
--
-- This enables the TimescaleDB extension. Hypertable conversion happens AFTER
-- Drizzle creates the tables (via db:push or migrations), because you can't
-- convert a table that doesn't exist yet.
--
-- The actual hypertable setup is in setup-hypertables.sql, which the seed
-- script runs after tables are created.

CREATE EXTENSION IF NOT EXISTS timescaledb;
