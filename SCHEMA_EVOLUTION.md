# Schema Evolution

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Rules for safely evolving save files, packet payloads, and rule definitions.

## Compatibility Rules

- Additive-only optional fields for minor versions with explicit defaults.
- Version tag required at the header of any persisted save or network packet.
- Breaking structural changes require an ADR in `docs/adr/` and migration steps in `MIGRATION.md`.
