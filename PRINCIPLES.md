# Guiding Principles

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

Non-negotiable operational and coding standards.

## Core Principles

- **Single Source of Truth:** One `CMakeLists.txt`, one canonical workflow per concern.
- **Fail Loudly in CI, Gracefully in Runtime:** Strict `-Wall -Wextra` builds in CI; safe fallbacks (e.g., SDR fallback when HDR10+ is unavailable) on player devices.
- **Pure Logic Separation:** Decouple combat/causality/economy rules from rendering so logic stays unit-testable.
