# Fuzz Testing

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Quality Assurance & Verification | **Last Updated:** 2026-11-25

Randomized input testing for parser, packet, and rule resilience.

## Targets

- Randomized `AInputEvent` multi-touch pointer IDs and out-of-bounds coordinates.
- Fuzzed `NetPacket` payloads and malformed rule predicates/cooldowns.
