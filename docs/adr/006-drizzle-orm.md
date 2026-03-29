# ADR-006: Drizzle ORM

**Status:** Accepted
**Date:** 2026-03-15

## Context

The platform needs type-safe database queries for its TypeScript backend. Writing raw SQL strings loses type safety and is error-prone as the schema evolves. An ORM or query builder provides compile-time checks, autocompletion, and schema management.

The three main contenders in the TypeScript ORM space are Prisma, TypeORM, and Drizzle. Prisma is the most popular -- it uses a `.prisma` schema file and generates a client with excellent TypeScript types, but it requires a separate query engine binary that runs alongside the Node.js process. TypeORM follows the OOP/ActiveRecord pattern with decorators, which can feel heavy in a functional codebase. Drizzle takes a different approach: its API mirrors SQL syntax closely, schemas are defined as plain TypeScript files, and it has no runtime query engine.

Given the project's emphasis on lightweight tooling, SQL familiarity, and minimal bundle size, the team needed an ORM that stays close to the database rather than abstracting it away.

## Decision Drivers

- Type-safe queries with TypeScript inference (no manual type annotations)
- SQL-like API preferred over abstracted/OOP-style query builders
- No heavy runtime dependencies (query engines, binary downloads)
- Schema defined as TypeScript code, not a separate DSL
- Good support for PostgreSQL-specific features (used with TimescaleDB)

## Considered Options

1. **Prisma** -- Schema DSL + generated client + query engine binary
2. **TypeORM** -- Decorator-based ORM with ActiveRecord and DataMapper patterns
3. **Drizzle ORM** -- SQL-like TypeScript query builder with no runtime engine

## Decision

Use Drizzle ORM with drizzle-kit for schema management. The database schema is defined in `server/db/schema.ts` as TypeScript code using Drizzle's `pgTable` helper. Drizzle-kit handles schema push (development) and migrations (production). Queries use Drizzle's SQL-like API (`db.select().from(table).where(...)`) which maps directly to the generated SQL.

Drizzle was chosen because its API does not hide the underlying SQL, making it easy to reason about query performance -- important for a platform that will run complex time-series queries against TimescaleDB.

## Consequences

### Positive
- No runtime query engine -- queries compile directly to SQL strings, keeping the bundle small
- SQL-like API is immediately readable by anyone who knows SQL
- Schema-as-code in TypeScript means schema changes are caught by the compiler
- Excellent TypeScript inference -- return types are automatically derived from the query
- drizzle-kit provides both push (fast iteration) and migration (production safety) workflows
- Works well with PostgreSQL-specific features needed for TimescaleDB integration

### Negative
- Smaller ecosystem than Prisma -- fewer tutorials, examples, and community plugins
- Some advanced query patterns (complex subqueries, CTEs) may require falling back to raw SQL
- drizzle-kit is less polished than prisma migrate for complex migration scenarios
- Developers coming from Prisma need to adjust to the SQL-like syntax
