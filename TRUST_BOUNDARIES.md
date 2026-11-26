# Trust Boundaries

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

Explicit boundaries between untrusted inputs and authoritative state.

## Boundaries

- **Client Input -> Simulation:** Clamp `dt`, sanitize player names (`char[32]`), validate item/skill indices before array indexing.
- **Network -> World:** Never blindly trust remote entity IDs or positions without `m_world.valid(id)` checks.
