# State Machine Specification

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Formal transitions for game screens and Enemy AI.

## Game Screen States

`ClassSelect` -> `Playing` <-> `Paused`; `Playing` -> `ClassSelect` (reset).

## Enemy 5-State AI

- **Patrol / Idle:** Default roaming around `spawnPos`.
- **Chase:** Entered when player distance `<= 18u` (day) or `<= 24u` (night).
- **Attack:** Entered when distance `<= attackRange`; Shade kites backward if distance `< 10u`.
- **Flee:** Entered when `hp / maxHp <= fleeHpPct` and `fleeHpPct > 0` (Boss never flees).
