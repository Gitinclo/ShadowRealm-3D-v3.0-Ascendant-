# Plugin Architecture

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Extension points for custom Causality rule packs and biomes.

## Extension Seams

- `causality::Engine::addRule()` supports registering custom rules without editing core loop code.
- Radial zones (`zoneNameAt`, `zoneTintAt`) and `kClassSpecs` are isolated data tables ready for data-driven loading.
