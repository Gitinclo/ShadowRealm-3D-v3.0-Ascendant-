# Business Continuity Plan

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Maintaining development and player access during upstream outages.

## Continuity Measures

- Players retain full offline single-player access on Desktop and Android binaries.
- Dependencies are pinned by tag and mirrored via lockfiles (`bun.lock` / `package-lock.json`) to survive transient registry issues.
