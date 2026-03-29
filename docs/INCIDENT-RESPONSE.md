# Security Incident Response Runbook

## Purpose

This document defines the security incident response procedure for the Energy Intelligence platform. It provides a structured framework for detecting, containing, eradicating, and recovering from security incidents affecting the platform's Kubernetes infrastructure, application services, ML pipeline, and TimescaleDB data stores. All team members with production access must be familiar with this runbook.

## Severity Classification

| Severity | Description | Response Time SLA | Examples |
|----------|-------------|-------------------|----------|
| SEV-1 | Active data breach or system compromise | 15 minutes | Unauthorized access to TimescaleDB, compromised container executing arbitrary code, exfiltration of SCADA telemetry or asset data |
| SEV-2 | Vulnerability actively exploited | 1 hour | Exploited API endpoint bypassing authentication, privilege escalation in Kubernetes namespace, unauthorized prediction service access |
| SEV-3 | Vulnerability discovered, not exploited | 24 hours | CVE found in base container image, exposed secret in ConfigMap, misconfigured network policy allowing cross-namespace traffic |
| SEV-4 | Security improvement needed | Next sprint | Dependency with known low-severity CVE, missing rate limiting on API endpoint, audit logging gap |

## Response Procedure

### Phase 1: Detect and Triage (First 15 Minutes)

1. **Identify the incident.** Determine what happened based on alerts, logs, or reports. Check Kubernetes pod logs, application logs, and network flow data.
2. **Assess scope.** Determine which services are affected (web app, prediction service, TimescaleDB) and whether the incident is ongoing.
3. **Classify severity.** Assign a severity level using the table above.
4. **Identify data at risk.** Determine whether asset telemetry, SCADA data, prediction model data, user credentials, or API keys may be compromised.
5. **Activate the response team.** Notify the on-call engineer and escalate per the emergency contacts section below.

### Phase 2: Contain (First Hour)

1. **Isolate affected systems.** Apply restrictive Kubernetes network policies to block traffic to and from compromised pods.
   ```bash
   kubectl apply -f k8s/emergency/network-deny-all.yaml -n energy-intelligence
   ```
2. **Revoke compromised credentials.** Rotate database passwords, API keys, and any secrets stored in Kubernetes Secrets or environment variables.
   ```bash
   kubectl delete secret db-credentials -n energy-intelligence
   kubectl create secret generic db-credentials --from-literal=... -n energy-intelligence
   ```
3. **Preserve evidence.** Follow the Evidence Preservation section below before making any changes to compromised systems.
4. **Disable compromised accounts or services.** Scale down affected deployments if necessary.
   ```bash
   kubectl scale deployment <name> --replicas=0 -n energy-intelligence
   ```
5. **Block known malicious IPs or sources.** Update ingress rules or firewall policies as needed.

### Phase 3: Eradicate (First 24 Hours)

1. **Conduct root cause analysis.** Identify the attack vector, whether it was a software vulnerability, misconfiguration, credential leak, or supply chain issue.
2. **Patch the vulnerability.** Apply code fixes, update container images, or correct Kubernetes configurations.
3. **Scan other systems.** Verify that the same vulnerability does not exist in other services or namespaces. Run Bandit (Python) and ESLint security rules (TypeScript) against the codebase.
4. **Rebuild compromised containers.** Do not reuse potentially tainted images. Rebuild from source with updated dependencies.
5. **Verify network policies.** Confirm that zero-trust policies in `k8s/base/network-policy.yaml` are correctly enforced.

### Phase 4: Recover

1. **Restore from backup.** If data integrity is compromised, restore TimescaleDB from the most recent verified backup.
2. **Redeploy services.** Roll out patched container images using the CI/CD pipeline.
   ```bash
   kubectl rollout restart deployment/web-app -n energy-intelligence
   kubectl rollout restart deployment/prediction-service -n energy-intelligence
   ```
3. **Gradual rollout with monitoring.** Monitor application metrics, error rates, and pod health closely during recovery. Do not restore full traffic until stability is confirmed.
4. **Validate functionality.** Run health checks against all API endpoints (`/api/dashboard`, `/health`, `/model/info`) and confirm prediction service model integrity.

### Phase 5: Post-Incident

1. **Blameless post-mortem.** Conduct a post-mortem meeting within 48 hours. Focus on systemic causes, not individual blame.
2. **Document findings.** Record the timeline, root cause, impact, and remediation steps.
3. **Update controls.** Implement preventive measures: new network policies, additional monitoring alerts, CI security checks, or code changes.
4. **File follow-up issues.** Create GitHub Issues for any long-term improvements identified during the post-mortem.
5. **Regulatory notification.** If personal data was involved, follow the notification requirements in the Regulatory Requirements section.

## Evidence Preservation

Before modifying any compromised system, complete the following steps to preserve forensic evidence:

1. **Snapshot pod logs.** Export logs from all affected containers before scaling down or restarting.
   ```bash
   kubectl logs <pod-name> -n energy-intelligence --all-containers > incident-<date>-pod-logs.txt
   ```
2. **Capture container state.** If possible, commit the running container to a new image for offline analysis.
   ```bash
   docker commit <container-id> incident-snapshot-<date>
   ```
3. **Export network flow data.** Capture any available network flow logs from the cluster's CNI plugin or cloud provider.
4. **Snapshot database state.** Take a point-in-time backup of TimescaleDB before any remediation queries.
   ```bash
   pg_dump -h <host> -U energy_user energy_db > incident-<date>-db-snapshot.sql
   ```
5. **Record timestamps.** Document the exact time each action was taken during the response.
6. **Secure evidence.** Store all captured artifacts in a dedicated, access-controlled storage location. Do not store evidence on the compromised system.

## Communication Templates

### Internal Notification

```
Subject: [SEV-X] Security Incident - Energy Intelligence Platform

Incident ID: INC-YYYY-MM-DD-NNN
Severity: SEV-X
Status: Detected / Contained / Resolved
Affected Systems: [list services]
Summary: [brief description of the incident]
Current Actions: [what is being done]
Next Update: [expected time of next update]
Incident Lead: [name]
```

### Customer Notification

```
Subject: Security Notice - Energy Intelligence Platform

We are writing to inform you of a security incident affecting the
Energy Intelligence platform that was identified on [date].

What happened: [brief, factual description]
What data was affected: [specific data types, if any]
What we have done: [remediation steps taken]
What you should do: [required actions, e.g., rotate API keys]
Contact: [support email or phone number]

We will provide updates as our investigation progresses.
```

## Emergency Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| On-Call Engineer | TBD | TBD | First responder for all incidents |
| Head of Engineering | TBD | TBD | Escalation for SEV-1 and SEV-2 |
| Legal / Data Protection Officer | TBD | TBD | Required for any incident involving personal data |
| Cloud Provider Support | TBD | TBD | Infrastructure-level incidents |

## Regulatory Requirements

### GDPR (General Data Protection Regulation)

- **72-hour notification window.** If a breach involves personal data of EU residents, the supervisory authority must be notified within 72 hours of becoming aware of the breach (Article 33).
- **Data subject notification.** If the breach poses a high risk to individuals, affected data subjects must also be notified without undue delay (Article 34).
- **Documentation.** All breaches must be documented regardless of whether notification is required, including facts, effects, and remedial actions taken.

### SOC 2 Compliance

- **Audit logging.** All access to production systems, databases, and Kubernetes clusters must be logged and retained for the audit period.
- **Incident documentation.** Maintain records of all security incidents, response actions, and post-mortem outcomes.
- **Access reviews.** Following any credential compromise, conduct a full access review of affected systems and document the results.
- **Change management.** All remediation changes must follow the standard CI/CD pipeline and be traceable to the incident.
