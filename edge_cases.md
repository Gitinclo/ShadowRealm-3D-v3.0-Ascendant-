# Edge Cases Catalog

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Quality Assurance & Verification | **Last Updated:** 2026-11-25

Boundary conditions verified across engine and gameplay logic.

## Key Boundaries

- `dt = 0` and large frame spikes (`dt > 1.0s`) clamped to `0.1s`.
- Zero-length movement/chase vectors guarded before `normalize()` to prevent `NaN`.
- Domain Level clamping (`1..999`), range cap (`80u`), cooldown floor (`15s`).
- Lethal damage with `reviveTokens > 0` restoring 50% HP instead of incrementing deaths.
