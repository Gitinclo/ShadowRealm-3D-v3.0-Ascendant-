# Data Dictionary

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Canonical field definitions and units across C++ and TypeScript models.

## Fields

| Field | Type | Range / Unit | Description |
|---|---|---|---|
| `hp` / `maxHp` | `float` | `0..∞` | Vitality points; `0` triggers revive token or defeat. |
| `domainLevel` | `int` | `1..999` | Current Infinite Devouring Domain tier. |
| `dayTime` | `float` | `0..120` sec | Elapsed time in the 120-second day/night cycle. |
| `rarity` | `int` | `0..5` | Common (0) through Mythic (5); scales power by `2^rarity`. |
| `statusMask` | `uint32` | Bitmask | `BURN=1, FREEZE=2, POISON=4, STUN=8`. |
