# Rollback Procedures

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Safe, rapid reversion of releases and deployments.

## Steps

1. Identify last known-good Git tag.
2. Revert offending commit via `git revert` (never force-push `main`).
3. Re-publish previous verified release artifacts and verify smoke tests.
