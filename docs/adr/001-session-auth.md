# ADR-001: Session-based Authentication

**Status:** Accepted
**Date:** 2026-03-15

## Context

The Energy Intelligence platform needed authentication for production readiness. Without it, all API endpoints and dashboard data are publicly accessible, which is unacceptable for an energy asset management system handling operational data.

The two main approaches were: (1) integrate an external identity provider like Keycloak with OIDC/OAuth2 redirect flows, or (2) implement session-based authentication directly in the Express.js backend. Keycloak is the enterprise-grade choice and provides SSO, federation, and fine-grained authorization out of the box. However, it requires deploying a separate Java service, configuring realms and clients, and handling OIDC redirect flows -- a significant operational burden for a prototype still running simulated data.

The team needed something that works immediately with the existing Node.js stack, supports local development without Docker, and can be upgraded to a full OIDC flow later.

## Decision Drivers

- Minimal new infrastructure for a prototype-stage project
- Must work with `npm run dev` (no Docker dependency)
- PostgreSQL already in the stack (TimescaleDB) for session storage
- Clear migration path to OIDC/Keycloak for production

## Considered Options

1. **Keycloak + OIDC** -- External identity provider with redirect-based authentication
2. **express-session + passport-local** -- Server-side sessions with username/password strategy
3. **JWT-only (stateless)** -- Signed tokens with no server-side session state

## Decision

Use express-session with passport-local strategy for authentication. Session storage uses connect-pg-simple for PostgreSQL-backed sessions when DATABASE_URL is set, and memorystore for local development without Docker. Passwords are hashed with scrypt. Role-based access control (RBAC) is enforced via middleware that checks user roles (admin, operator, viewer).

Keycloak integration is deferred to a production follow-up once the platform moves beyond prototype stage.

## Consequences

### Positive
- Works immediately with the existing Node.js and Express stack
- No external service dependencies -- no Java runtime, no realm configuration
- Dual session storage: PostgreSQL in Docker/production, in-memory for `npm run dev`
- Simple mental model for developers (req.user, req.isAuthenticated())
- Session cookies work naturally with the single-port Express + Vite setup (ADR-004)

### Negative
- Must migrate sessions when adding OIDC later (session schema may change)
- No SSO or federated identity (Google, SAML, etc.) until Keycloak is integrated
- Password management (reset, complexity rules) must be built manually
- Session affinity may be needed in Kubernetes if not using shared session store
