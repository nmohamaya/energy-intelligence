# ADR-007: Security Hardening Strategy

**Status:** Accepted
**Date:** 2026-03-29

## Context

The Energy Intelligence platform manages operational data for renewable energy assets — a critical infrastructure domain where security incidents could have physical consequences. As the platform approaches production readiness (Phase 1 completion), a systematic security hardening pass was needed across all layers: application, container, orchestration, and CI/CD.

The platform already had authentication (ADR-001), rate limiting, and input validation. However, it lacked HTTP security headers, had wide-open CORS on the prediction service, ran containers without restrictive security contexts, and had no automated vulnerability scanning in the CI pipeline.

## Decision Drivers

- Energy infrastructure customers require SOC2 and ISO 27001 compliance
- Defense in depth — no single control should be the only line of defense
- Must not break existing functionality or developer experience
- Security controls should be automated (CI) rather than manual

## Considered Options

1. **Incremental hardening** — Add security controls layer by layer, verifiable at each step
2. **Full security overhaul** — Rewrite with security framework (e.g., migrate to Keycloak, add WAF, implement mTLS)
3. **Defer to Phase 2** — Focus on infrastructure first, security later

## Decision

Incremental hardening (Option 1). Each control is independently deployable and testable:

**Application layer:**
- Helmet.js on Express for HTTP security headers (CSP deferred until inline script audit)
- Security headers middleware on FastAPI
- CORS restricted from `["*"]` to environment-driven allowlist

**Static analysis:**
- ESLint security plugin expanded from 2 to 14 rules (server) and 4 rules (client)
- Bandit continues for Python (already in CI)

**Container and orchestration:**
- Pod Security Standards (restricted profile) enforced at namespace level
- SecurityContext on all deployments: non-root, read-only rootfs, drop ALL capabilities
- ServiceAccounts with automountServiceAccountToken disabled
- Least-privilege RBAC (web-app: read configmaps only)

**CI/CD pipeline:**
- npm audit and pip-audit for dependency vulnerability scanning
- Trivy for container image scanning (fail on CRITICAL/HIGH)
- Cosign keyless signing for image provenance
- SBOM generation for supply chain transparency

## Consequences

### Positive
- Defense in depth across 4 layers (application, container, K8s, CI/CD)
- Automated scanning catches vulnerabilities before they reach production
- Pod Security Standards prevent common container escape vectors
- Image signing provides provenance chain for compliance audits
- Incremental approach means each control can be rolled back independently

### Negative
- CSP is deferred — inline scripts from Vite require careful policy crafting
- `readOnlyRootFilesystem` requires emptyDir mounts for /tmp in both services
- ESLint security rules produce some false positives (detect-object-injection on array access)
- npm audit may flag transitive dependency issues outside our control
- Cosign signing requires GHCR access and cannot be fully tested locally
