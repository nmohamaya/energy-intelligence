# Security Architecture

## Overview

Energy Intelligence employs a defense-in-depth security strategy, applying controls at every layer of the stack: application code, container runtime, orchestration, CI/CD pipeline, and dependency management. No single layer is trusted in isolation. The goal is to ensure that a compromise at one layer does not cascade into a full system breach.

This document describes the security controls currently in place and serves as the authoritative reference for the platform's security posture.

---

## Application Security

### Security Headers

| Service | Framework | Headers Applied |
|---------|-----------|-----------------|
| Web App | Express.js + Helmet.js | X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-XSS-Protection, Referrer-Policy |
| Prediction Service | FastAPI middleware | X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Cache-Control: no-store |

Content Security Policy (CSP) is deferred until all inline script sources are cataloged and nonce-based loading is in place.

### CORS Policy

- **Express (Web App):** Same-origin only. No cross-origin requests are permitted by default.
- **FastAPI (Prediction Service):** Restricted to an environment-driven allowlist via the `CORS_ORIGINS` variable. Only explicitly listed origins may issue cross-origin requests.

### Authentication and Session Management

The platform uses session-based authentication with the following cookie attributes:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `httpOnly` | `true` | Prevents client-side JavaScript access to session cookies |
| `secure` | `true` | Cookies transmitted only over HTTPS |
| `sameSite` | `lax` | Mitigates CSRF by restricting cross-site cookie transmission |

### Role-Based Access Control (RBAC)

Four application roles govern access to platform functionality:

| Role | Permissions |
|------|-------------|
| `operator` | View dashboards, view assets, view alerts |
| `engineer` | Operator permissions + run predictions, view digital twins, export data |
| `manager` | Engineer permissions + view analytics, manage maintenance schedules |
| `admin` | Full access including user management, system configuration, audit logs |

Role checks are enforced at the route middleware layer. Unauthorized access returns `403 Forbidden`.

### Rate Limiting

Rate limits are applied per endpoint category to prevent abuse and ensure fair resource allocation:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication (`/api/auth/*`) | 20 requests | 1 minute |
| Predictions (`/api/predictions`) | 30 requests | 1 minute |
| Dashboard (`/api/dashboard`) | 60 requests | 1 minute |
| General API (`/api/*`) | 120 requests | 1 minute |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

### Input Validation

All API inputs are validated using Zod schemas defined in `shared/schema.ts`. Invalid payloads are rejected with `400 Bad Request` before reaching any business logic. The Prediction Service uses Pydantic models for equivalent server-side validation.

---

## Container Security

### Non-Root Execution

Both Dockerfiles create and run as a dedicated non-root user:

```
USER appuser (UID 1001)
```

No container process runs as root at any point during normal operation.

### Filesystem and Privilege Restrictions

| Control | Configuration |
|---------|---------------|
| Read-only root filesystem | `readOnlyRootFilesystem: true` in K8s securityContext |
| Writable temp directory | `emptyDir` volume mounted at `/tmp` |
| Capability dropping | `drop: ["ALL"]` — no Linux capabilities granted |
| Privilege escalation | `allowPrivilegeEscalation: false` |

### Minimal Base Images

| Service | Base Image | Rationale |
|---------|-----------|-----------|
| Web App | `node:20-alpine` | Minimal footprint, reduced CVE surface |
| Prediction Service | `python:3.12-slim` | No unnecessary system packages |

Both Dockerfiles use multi-stage builds so that build tools, compilers, and dev dependencies are excluded from the final runtime image.

---

## Kubernetes Security

### Pod Security Standards

The `energy-intelligence` namespace enforces the **Restricted** Pod Security Standard. This prevents pods from running as root, using host networking, mounting host paths, or escalating privileges.

### Network Policies

A zero-trust networking model is enforced:

1. **Default deny** — all ingress and egress traffic is blocked by default.
2. **Explicit allow rules** — only the following traffic flows are permitted:

| Source | Destination | Port | Purpose |
|--------|-------------|------|---------|
| Ingress controller | Web App | 5000 | External HTTP traffic |
| Ingress controller | Prediction Service | 8001 | External API traffic |
| Web App | TimescaleDB | 5432 | Database queries |
| Prediction Service | TimescaleDB | 5432 | Database queries |
| Web App | Prediction Service | 8001 | Internal ML predictions |

### ServiceAccount Hardening

All deployments set `automountServiceAccountToken: false` to prevent pods from accessing the Kubernetes API unless explicitly required.

### RBAC (Cluster Level)

Workload RBAC follows the principle of least privilege:

| ServiceAccount | Permissions |
|----------------|-------------|
| `web-app` | No cluster API access |
| `prediction-service` | No cluster API access |

### TLS Termination

TLS is terminated at the Ingress layer using cert-manager for automated certificate provisioning and renewal. Backend traffic within the cluster travels over the internal pod network.

---

## CI/CD Security

### Static Analysis

| Tool | Target | Scope |
|------|--------|-------|
| ESLint (security plugin) | Server TypeScript | 14 security-focused rules |
| ESLint (security plugin) | Client TypeScript | 4 security-focused rules |
| Bandit | Python source | Common Python security issues (B1xx-B7xx) |

### Dependency Auditing

| Tool | Ecosystem | Trigger |
|------|-----------|---------|
| `npm audit` | Node.js | Every CI run |
| `pip-audit` | Python | Every CI run |

Both audits run on every pull request. They are currently **informational** (`continue-on-error: true`) while baseline findings are triaged. Once clean, they will be promoted to required checks that block merge on HIGH or above.

### Container Image Scanning

**Trivy** scans all built container images for known vulnerabilities:

- Severity threshold: `CRITICAL` and `HIGH`
- Policy: CI pipeline fails if any finding at or above threshold is detected
- Scans cover OS packages, language libraries, and misconfigurations

### Image Signing and Provenance

- **Cosign** (keyless, Sigstore-backed) signs every container image pushed to GHCR.
- A Software Bill of Materials (SBOM) is generated and attached to each image for supply chain transparency.

---

## Dependency Management

### Version Pinning

| File | Strategy |
|------|----------|
| `requirements.txt` | Exact version pins (`==`) for all Python dependencies |
| `package-lock.json` | Lockfile ensures deterministic Node.js installs |

### Automated Scanning

Dependency vulnerability scans execute on every pull request via `npm audit` and `pip-audit`. Results are surfaced in the CI check status. Once baseline findings are resolved, audit jobs will be promoted to required CI checks that block merge on HIGH or CRITICAL findings.

---

## Reporting Vulnerabilities

If you discover a security vulnerability in Energy Intelligence, please report it responsibly.

**Contact:** Send an email to the project maintainers with the subject line `[SECURITY] Vulnerability Report`.

Include the following information:

- Description of the vulnerability
- Steps to reproduce
- Affected components (web app, prediction service, infrastructure)
- Potential impact assessment
- Suggested remediation (if known)

**Response commitment:**

- Acknowledgment within 48 hours
- Initial assessment within 5 business days
- Coordinated disclosure after a fix is available

Please do not open public GitHub issues for security vulnerabilities. Use the private reporting channel described above.
