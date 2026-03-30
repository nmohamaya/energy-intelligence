# Penetration Testing Plan

## Energy Intelligence Platform

**Document Owner:** Security Team
**Last Updated:** 2026-03-29
**Classification:** Internal / Confidential

---

## 1. Purpose

This document defines the penetration testing plan for the Energy Intelligence platform. The goal is to identify and remediate security vulnerabilities across all layers of the system -- the Express.js web application, React frontend, FastAPI prediction service, TimescaleDB database, and Kubernetes infrastructure -- before they can be exploited in a production environment.

---

## 2. Scope

### In Scope

| Component              | Target                                      |
|------------------------|----------------------------------------------|
| Web Application        | Express.js API (port 5000), React frontend   |
| Prediction Service     | FastAPI ML microservice (port 8001)          |
| Authentication Flows   | Session management, RBAC enforcement         |
| Kubernetes Cluster     | Pods, services, ingress, network policies    |
| Data Layer             | TimescaleDB, secrets, backups                |
| Container Images       | Base images, dependencies, build pipeline    |

### Out of Scope

- Third-party SaaS integrations not hosted by the project
- Physical security of hosting infrastructure
- Social engineering attacks against team members
- Denial-of-service testing against production environments

---

## 3. Test Categories

### 3.1 Application Layer

#### A1 - Injection

- [ ] SQL injection on query parameters (`?search=`, `?type=`, `?status=`, `?risk=`)
- [ ] SQL injection on path parameters (`/api/assets/:id`, `/api/digital-twin/:id`)
- [ ] Command injection via prediction service inputs (`/predict/anomaly`, `/predict/rul`)
- [ ] NoSQL / ORM injection through Zod schema bypass attempts

#### A2 - Broken Authentication

- [ ] Session fixation and session hijacking
- [ ] Expired session token reuse after logout
- [ ] Brute-force login attempts without lockout
- [ ] Cookie attributes validation (`HttpOnly`, `Secure`, `SameSite`)

#### A3 - Sensitive Data Exposure

- [ ] API responses leaking internal errors, stack traces, or SQL queries
- [ ] Credentials or tokens visible in browser DevTools or network traffic
- [ ] Sensitive data transmitted without TLS

#### A4 - XML External Entities (XXE)

- [ ] Malformed payloads in JSON/XML request bodies to prediction endpoints

#### A5 - Broken Access Control

- [ ] IDOR -- access another user's asset data via `/api/assets/:id`
- [ ] IDOR -- access another user's digital twin via `/api/digital-twin/:id`
- [ ] Mass assignment -- set `role=admin` or `isAdmin=true` via API request body
- [ ] Horizontal privilege escalation between users of the same role
- [ ] Vertical privilege escalation from viewer to admin

#### A7 - Cross-Site Scripting (XSS)

- [ ] Stored XSS via asset names, alert messages, or prediction labels
- [ ] Reflected XSS via query parameters rendered in the frontend
- [ ] DOM-based XSS through hash-based routing (wouter `useHashLocation`)

#### A10 - Server-Side Request Forgery (SSRF)

- [ ] Prediction service making requests to internal cluster services
- [ ] URL parameters causing backend-to-backend requests to unintended hosts
- [ ] Access to cloud metadata endpoints (`169.254.169.254`) from within pods

#### Rate Limiting and Abuse

- [ ] Rate limiting bypass via `X-Forwarded-For` header manipulation
- [ ] Distributed request flooding from multiple source IPs
- [ ] API endpoint enumeration through timing analysis

### 3.2 Infrastructure Layer

#### Kubernetes Security

- [ ] RBAC misconfiguration -- can a compromised pod access the K8s API server
- [ ] Service account token abuse -- default tokens mounted in pods
- [ ] Network policy bypass -- can pods reach services outside their allowed set
- [ ] Pod security context -- containers running as root or with elevated capabilities
- [ ] Container escape -- process breakout via kernel exploits or misconfigured mounts

#### Ingress and Networking

- [ ] Path traversal via ingress rules (`/../` sequences)
- [ ] HTTP header injection through ingress annotations
- [ ] TLS configuration validation (protocol versions, cipher suites)
- [ ] CORS policy enforcement -- unauthorized origins making API requests

#### Secrets Management

- [ ] Secrets exposed in environment variables or container logs
- [ ] Secrets visible in Kubernetes API responses to unauthorized service accounts
- [ ] Base64-encoded secrets in `secret.yaml` without encryption at rest
- [ ] Error messages leaking database credentials or connection strings

### 3.3 Data Layer

- [ ] Tenant isolation -- cross-tenant data access (for future multi-tenancy, Issue #19)
- [ ] Database backup exposure -- backups accessible without authentication
- [ ] Data at rest encryption -- TimescaleDB volumes encrypted at the storage layer
- [ ] Data exfiltration via verbose API responses or pagination abuse

---

## 4. Recommended Tools

| Tool           | Purpose                              | Layer           |
|----------------|--------------------------------------|-----------------|
| OWASP ZAP      | DAST scanning, automated crawl       | Application     |
| Burp Suite Pro | Manual testing, request interception  | Application     |
| sqlmap         | SQL injection detection               | Application     |
| Nikto          | Web server misconfiguration scanning  | Application     |
| kube-bench     | CIS Kubernetes benchmark compliance   | Infrastructure  |
| kube-hunter    | K8s cluster penetration testing       | Infrastructure  |
| Trivy          | Container image vulnerability scan    | Infrastructure  |
| Falco          | Runtime container threat detection    | Infrastructure  |
| kubeaudit      | K8s security auditing                 | Infrastructure  |
| Snyk / Grype   | Dependency vulnerability scanning     | Build Pipeline  |
| Nuclei         | Template-based vulnerability scanning | All             |

---

## 5. Testing Schedule

| Activity                        | Frequency        | Trigger                          |
|---------------------------------|------------------|----------------------------------|
| Full penetration test           | Annually         | Scheduled or after major release |
| DAST scan (OWASP ZAP)          | Monthly          | Automated pipeline               |
| Container image scan (Trivy)   | Every PR         | CI/CD pipeline                   |
| Dependency vulnerability scan  | Every PR         | CI/CD pipeline                   |
| K8s benchmark (kube-bench)     | Quarterly        | Scheduled                        |
| Manual API security review     | Per feature PR   | New endpoints or auth changes    |

---

## 6. Remediation SLAs

| Severity   | CVSS Range | Response Time | Fix Deadline   | Example                              |
|------------|------------|---------------|----------------|---------------------------------------|
| Critical   | 9.0 - 10.0 | 4 hours       | 24 hours       | RCE, auth bypass, data breach        |
| High       | 7.0 - 8.9  | 24 hours      | 7 days         | SQL injection, privilege escalation  |
| Medium     | 4.0 - 6.9  | 3 days        | 30 days        | XSS, CSRF, information disclosure    |
| Low        | 0.1 - 3.9  | 1 week        | Next quarter   | Missing headers, verbose errors      |

---

## 7. Findings Tracking

### Process

1. **Report** -- Document each finding with severity, affected component, reproduction steps, and evidence (screenshots, request/response logs).
2. **Triage** -- Security lead assigns severity and owner within the response time SLA.
3. **Remediate** -- Owner creates a GitHub issue labeled `security` with the fix deadline. Branch naming: `fix/sec-XX-description`.
4. **Verify** -- Security team re-tests the specific finding after the fix is deployed.
5. **Close** -- Finding is marked resolved only after successful re-test. Update the findings register.

### Findings Register

Maintain a tracking table (internal, not committed to the repository) with the following columns:

| Field              | Description                                    |
|--------------------|------------------------------------------------|
| Finding ID         | Unique identifier (e.g., PT-2026-001)          |
| Date Discovered    | Date the vulnerability was identified          |
| Severity           | Critical / High / Medium / Low                 |
| Component          | Affected service or layer                      |
| Description        | Brief summary of the vulnerability             |
| Status             | Open / In Progress / Resolved / Accepted Risk  |
| Owner              | Engineer responsible for the fix               |
| Fix Deadline       | Based on remediation SLA                       |
| Resolution Date    | Date the fix was verified                      |
| GitHub Issue       | Link to the tracking issue                     |

---

**Note:** This plan should be reviewed and updated after each penetration test cycle or when significant architectural changes are made to the platform.
