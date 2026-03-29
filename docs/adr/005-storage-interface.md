# ADR-005: IStorage Interface Pattern

**Status:** Accepted
**Date:** 2026-02-01

## Context

The platform needs two modes of operation: fast local development without Docker (using `npm run dev`) and production deployment with real database persistence (TimescaleDB). Routes should not know or care which storage backend is active -- they call the same methods regardless.

Without an abstraction layer, routes would import database-specific code directly, making it impossible to run the app without a database connection. Every developer would need Docker running just to start the frontend, slowing down iteration.

The challenge is designing an interface that supports both a simulated in-memory store (for development and testing) and a real database store (for production), with the selection happening automatically at runtime.

## Decision Drivers

- `npm run dev` must work instantly without Docker or database setup
- Routes must be storage-agnostic (no `if (process.env.DATABASE_URL)` checks in route handlers)
- Tests must run without a database (fast, isolated, deterministic)
- Adding a new storage method should only require implementing the interface

## Considered Options

1. **Direct database imports in routes** -- Routes import Drizzle queries directly, mock database in tests
2. **IStorage interface with swappable implementations** -- Abstract interface, multiple concrete implementations
3. **Repository pattern with dependency injection framework** -- Full DI container (e.g., tsyringe, inversify)

## Decision

Define an `IStorage` interface in `server/storage.ts` with two implementations:

- **MemStorage** -- Generates simulated energy data in memory. Used when `DATABASE_URL` is not set. Provides realistic mock data for all API endpoints without any external dependencies.
- **DatabaseStorage** -- Executes Drizzle ORM queries against TimescaleDB. Used when `DATABASE_URL` is set.

A lazy-init proxy (`storage` export) checks `DATABASE_URL` on first access and instantiates the appropriate implementation. Routes import `storage` and call interface methods -- they never know which backend is active.

## Consequences

### Positive
- `npm run dev` works instantly -- MemStorage generates data with no setup
- Routes are completely storage-agnostic, improving testability and maintainability
- Tests use MemStorage by default -- fast, isolated, no database cleanup needed
- Adding a new backend (e.g., Redis cache layer) only requires implementing IStorage
- Lazy initialization means the decision is deferred until the first database call

### Negative
- Two implementations must be maintained and kept in sync as the interface evolves
- Simulated data in MemStorage may diverge from real data shapes over time
- MemStorage cannot replicate database-specific behaviors (transactions, constraints, race conditions)
- New interface methods require implementation in both MemStorage and DatabaseStorage
