# Zero-Downtime Migrations

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Expand-and-contract strategy for save schemas and hosted deployments.

## Pattern

1. **Expand:** Support reading both old and new schema versions.
2. **Migrate:** Lazily upgrade player saves on load.
3. **Contract:** Remove legacy readers only after deprecation window in `DEPRECATION_POLICY.md`.
