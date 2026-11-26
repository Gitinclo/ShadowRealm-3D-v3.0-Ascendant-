# RNG & Seeding Specification

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Deterministic pseudo-random generation rules.

## PRNGs

- Desktop C++17 uses `std::mt19937 rng{4242}`.
- Android Vulkan chunks seed per chunk key `uint32_t(key(cx, cz))` for reproducible monster placement.
- Web unit tests inject deterministic rolls into `src/game/rules.ts`.
