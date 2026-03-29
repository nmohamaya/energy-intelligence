# Architecture Decision Records (ADRs)

Architecture Decision Records capture the key architectural decisions made during the development of Energy Intelligence. Each ADR documents the context, options considered, decision made, and consequences. We follow the [MADR](https://adr.github.io/madr/) (Markdown Any Decision Records) format.

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| 001 | [Session-based Authentication](001-session-auth.md) | Accepted | 2026-03-15 |
| 002 | [Channel-based WebSocket Protocol](002-channel-websocket.md) | Accepted | 2026-03-28 |
| 003 | [TimescaleDB for Time-Series Data](003-timescaledb.md) | Accepted | 2026-03-15 |
| 004 | [Single-Port Express + Vite](004-express-vite-single-port.md) | Accepted | 2026-02-01 |
| 005 | [IStorage Interface Pattern](005-storage-interface.md) | Accepted | 2026-02-01 |
| 006 | [Drizzle ORM](006-drizzle-orm.md) | Accepted | 2026-03-15 |

## ADR Template

When creating a new ADR, copy this template:

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date:** YYYY-MM-DD

## Context

[2-3 paragraphs about the problem and constraints]

## Decision Drivers

- [bullet points of key factors]

## Considered Options

1. **Option A** — brief description
2. **Option B** — brief description
3. **Option C** — brief description (if applicable)

## Decision

[What was chosen and why]

## Consequences

### Positive
- [bullets]

### Negative
- [bullets]
```
