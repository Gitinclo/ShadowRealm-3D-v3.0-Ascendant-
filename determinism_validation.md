# Determinism Validation

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Quality Assurance & Verification | **Last Updated:** 2026-11-25

Ensuring reproducible math, PRNG seeding, and causality ordering.

## Rules

- Seed `std::mt19937` explicitly for deterministic test fixtures.
- Use `std::stable_sort` in `Causality.h` so equal-priority rules always evaluate in deterministic registration order.
