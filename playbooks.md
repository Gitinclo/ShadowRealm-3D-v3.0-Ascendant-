# Incident Playbooks

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Tactical decision trees for high-severity operational incidents.

## Playbook: Broken Release Artifact

1. Halt promotion in `cd.yml`.
2. Trigger rollback per `rollback_procedures.md`.
3. Open an incident issue via `.github/ISSUE_TEMPLATE/incident_report.md` and run a blameless postmortem.
