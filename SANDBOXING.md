# Sandboxing

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

Isolation boundaries protecting players and build environments.

## Isolation

- Web edition executes inside the browser sandbox with zero native filesystem access.
- Android NDK builds execute inside the Android application UID sandbox with no unnecessary permissions.
- CI runs inside ephemeral isolated GitHub runners.
