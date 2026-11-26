# AI Behavior Trees & State Machines

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Decision logic for Wolf, Goblin, Shade, and Shadow King.

## Hierarchy

Priority selector: `Dead` -> `Flee (hpPct <= fleeHpPct)` -> `Attack (dist <= attackRange, Shade kites < 10u)` -> `Chase (dist <= aggroRadius)` -> `Patrol/Idle`. Nightfall boosts aggro radius from `18u` to `24u` and speed by `1.2×`.
