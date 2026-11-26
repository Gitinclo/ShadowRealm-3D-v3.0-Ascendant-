# Incident Response

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

End-to-end lifecycle for SEV-1 and SEV-2 operational or security incidents.

## Lifecycle

1. **Detect & Triage:** Classify severity per `severity_definitions.md` and open `.github/ISSUE_TEMPLATE/incident_report.md`.
2. **Contain & Mitigate:** Halt rollout or roll back via `rollback_procedures.md`.
3. **Preserve Evidence:** Capture logs/hashes per `INCIDENT_FORENSICS.md`.
4. **Learn:** Publish blameless postmortem using `postmortem_template.md`.
