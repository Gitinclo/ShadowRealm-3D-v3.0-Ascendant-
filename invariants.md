# System Invariants

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Quality Assurance & Verification | **Last Updated:** 2026-11-25

Properties that must hold true on every tick.

## Invariants

- `0 <= hp <= maxHp` and `0 <= stamina <= maxStamina`.
- `1 <= domainLevel <= 999` and `domainRange <= 80.0f`.
- Causality rules always execute in non-increasing `priority` order.
- Dead enemies (`alive == false`) never deal damage or drop duplicate loot.
