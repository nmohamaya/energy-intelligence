# ADR-003: TimescaleDB for Time-Series Data

**Status:** Accepted
**Date:** 2026-03-15

## Context

Energy assets generate continuous time-series data: production output (kWh), telemetry readings (temperature, vibration, wind speed), and operational events. The platform needs to store this data, run efficient range queries (e.g., "last 24 hours of production for asset X"), apply retention policies (e.g., drop raw data after 90 days), and compute aggregations (e.g., daily averages).

Plain PostgreSQL can store time-series data, but range queries on large tables degrade as data grows. Purpose-built time-series databases like InfluxDB or TimescaleDB are optimized for this workload. InfluxDB uses its own query language (Flux) and is a completely separate system. TimescaleDB is a PostgreSQL extension, meaning the team can use familiar SQL, existing tooling (pg_dump, psql), and the same connection for both time-series and relational data.

The platform already uses PostgreSQL-compatible infrastructure (Drizzle ORM, connect-pg-simple for sessions), so staying within the PostgreSQL ecosystem minimizes operational complexity.

## Decision Drivers

- Time-series queries (range scans, aggregations) must be fast at scale
- Team already knows PostgreSQL and SQL
- Single database system preferred over running PostgreSQL + a separate TSDB
- Data retention policies needed to manage storage growth
- Must run in Docker for local development and Kubernetes for production

## Considered Options

1. **Plain PostgreSQL 16** -- Standard relational database with B-tree indexes on timestamp columns
2. **TimescaleDB (PostgreSQL extension)** -- Hypertable-based time-series optimization on top of PostgreSQL
3. **InfluxDB** -- Purpose-built time-series database with Flux query language

## Decision

Use TimescaleDB as a PostgreSQL 16 extension. Time-series tables (sensor readings, production data, events) are created as hypertables with automatic time-based partitioning. Non-temporal tables (users, assets, sessions) remain standard PostgreSQL tables. The same database instance serves both.

The Docker image is `timescale/timescaledb:latest-pg16`, which is a drop-in replacement for the standard PostgreSQL image.

## Consequences

### Positive
- Familiar PostgreSQL interface -- all existing SQL knowledge, tools, and ORMs work unchanged
- Hypertable queries are 10-100x faster for time-range scans compared to plain PostgreSQL on large datasets
- Built-in retention policies automatically drop old data without custom cron jobs
- Continuous aggregates pre-compute rollups (hourly, daily) for dashboard queries
- Single database for both relational and time-series data -- no operational overhead of a second system

### Negative
- Requires the TimescaleDB extension in production -- not available on all managed PostgreSQL providers
- Slightly more complex deployment than plain PostgreSQL (extension must be enabled)
- Hypertable chunk size tuning may be needed as data volume grows
- Some advanced TimescaleDB features (compression, distributed hypertables) require the licensed edition
