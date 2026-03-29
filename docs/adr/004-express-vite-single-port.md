# ADR-004: Single-Port Express + Vite

**Status:** Accepted
**Date:** 2026-02-01

## Context

The platform has a React frontend and an Express.js backend. The typical setup for this combination runs two dev servers: Vite on port 3000 for the frontend and Express on port 5000 for the API. The frontend proxies API requests to the backend via Vite's proxy config or a manual CORS setup.

This two-server approach introduces friction. CORS configuration must be maintained, session cookies require `SameSite` and domain settings to work across ports, and developers must start two processes. Debugging network issues often comes down to proxy misconfiguration rather than actual bugs.

An alternative is to use Vite's middleware mode, where Vite's dev server runs as Express middleware rather than as a standalone server. This serves both the React app and the API from a single Express process on one port.

## Decision Drivers

- Session cookies must work without proxy workarounds
- Developers should run one command (`npm run dev`) to start everything
- CORS complexity should be eliminated in development
- Production serving must be simple (static files from Express)

## Considered Options

1. **Two dev servers with proxy** -- Vite on port 3000, Express on port 5000, Vite proxies `/api` requests
2. **Single-port Vite middleware** -- Vite runs as Express middleware, everything on port 5000

## Decision

Use Vite's middleware mode in development. The file `server/vite.ts` creates a Vite dev server in middleware mode and attaches it to the Express app. All requests hit Express first -- API routes are handled by Express, and everything else falls through to Vite for React HMR and asset serving. In production, `server/static.ts` serves the pre-built static files from `dist/public/`.

Both environments serve everything on port 5000.

## Consequences

### Positive
- No CORS configuration needed -- frontend and API share the same origin
- Session cookies work without `SameSite` or proxy hacks
- Single URL (`http://localhost:5000`) for development
- One command (`npm run dev`) starts the full stack
- Production setup mirrors development -- same port, same routing logic

### Negative
- Tighter coupling between Vite build tooling and the Express server
- Vite middleware adds approximately 200ms to the first page load in development
- Debugging Vite issues requires understanding its middleware internals
- Cannot independently scale frontend and backend in development (not an issue in production with static files)
