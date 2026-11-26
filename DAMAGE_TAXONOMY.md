# Damage Taxonomy

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Cultivation, Worldbuilding & Game Systems | **Last Updated:** 2026-11-25

Status effects and damage-over-time classifications.

## Status Flags

| Flag | Bit | Effect (3.5s duration) |
|---|---|---|
| `STATUS_BURN` | `1 << 0` | 8 DPS fire damage |
| `STATUS_FREEZE` | `1 << 1` | 55% movement slow (`0.45×` speed) |
| `STATUS_POISON` | `1 << 2` | 8 DPS venom damage |
| `STATUS_STUN` | `1 << 3` | Immobilized (`0×` speed), prevents attacks |
