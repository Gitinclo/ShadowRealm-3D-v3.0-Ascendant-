# Combat Formulas

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Cultivation, Worldbuilding & Game Systems | **Last Updated:** 2026-11-25

Exact mathematical equations governing damage, crits, and mitigation.

## Equations

- **Crit Chance:** `min(0.65, 0.10 + totalAgi * 0.012)`
- **Primary Strike Damage:** `totalStr * (isCrit ? 4.0 : 1.0)`
- **Class Power Damage:** `totalStr * 1.9` (9.5u radius)
- **Teraton Bomb Damage:** `450 + level * 40` (30u radius, guaranteed crit + Burn)
- **Incoming Mitigation:** `incomingDmg * (100 / (100 + totalDef * 2.5))`
