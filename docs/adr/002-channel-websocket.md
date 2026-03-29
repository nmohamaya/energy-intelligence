# ADR-002: Channel-based WebSocket Protocol

**Status:** Accepted
**Date:** 2026-03-28

## Context

The Energy Intelligence dashboard needs real-time data streaming for KPIs, alerts, and per-asset telemetry. Polling the REST API every few seconds wastes bandwidth and adds latency. WebSockets provide a persistent connection for server-pushed updates.

The protocol design question was whether to use flat message types (every message has a `type` field like "kpi", "alert", "telemetry") or a channel-based pub/sub model where clients subscribe to named channels and only receive data for those channels.

With flat message types, every connected client receives every message type. This is simple but wasteful -- the fleet overview page does not need per-asset telemetry for 50+ turbines, and the digital twin page does not need portfolio-level KPIs. As the asset fleet grows, flat broadcasting becomes a bandwidth problem.

## Decision Drivers

- Clients should only receive data they actually render
- Must scale to hundreds of assets without flooding connections
- Protocol should be familiar to developers (pub/sub is well-understood)
- Must support authentication and connection health checks

## Considered Options

1. **Flat message types** -- All messages have a `type` field, server broadcasts everything to all clients
2. **Channel-based pub/sub** -- Clients subscribe to named channels, server routes messages accordingly
3. **Socket.IO rooms** -- Use Socket.IO library with its built-in room/namespace abstraction

## Decision

Channel-based protocol with subscribe/unsubscribe messages over native WebSocket (ws library). Four channel types are defined:

- `dashboard:kpis` -- Portfolio-level KPI updates
- `alerts:live` -- Real-time alert stream
- `asset:<id>:telemetry` -- Per-asset telemetry data
- `system` -- Server announcements and errors

Clients send `{ type: "subscribe", channels: ["dashboard:kpis"] }` after connecting. The server tracks each client's channel subscriptions and only pushes matching data. Clients with no subscriptions receive broadcast messages only. The protocol also includes authentication (session cookie validated on upgrade) and ping/pong heartbeats for connection health.

## Consequences

### Positive
- Clients only receive data they need, reducing bandwidth by 60-90% compared to flat broadcast
- Scales naturally to many assets -- subscribing to one turbine does not pull data for all turbines
- Familiar pub/sub pattern that developers already understand from Redis, NATS, etc.
- Channel naming convention (`asset:<id>:telemetry`) is extensible for future data types
- Ping/pong heartbeat detects stale connections and cleans up server-side state

### Negative
- More complex protocol than flat messages -- requires subscription management per client
- Server must maintain a subscription map and route messages accordingly
- Clients must manage their subscriptions when navigating between pages
- Testing requires simulating the subscribe/unsubscribe handshake
