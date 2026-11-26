# Disaster Recovery Plan

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Recovery objectives and restoration procedures for source, artifacts, and hosted web builds.

## Targets

- **RPO (Source & Docs):** 0 minutes (Git distributed replicas).
- **RTO (Web & CI Artifacts):** <= 30 minutes via clean rebuild from pinned tags.
