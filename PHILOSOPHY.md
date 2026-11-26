# Engineering & Design Philosophy

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

How technical and gameplay trade-offs are resolved.

## Simplicity & Explicitness

Data structures in `main_desktop.cpp`, `main_android.cpp`, `main_android_vulkan.cpp`, and `src/game/rules.ts` favor flat structs, predictable state transitions, and direct control over memory and frame pacing.

## Reactive World Simulation

World events are driven declaratively through the priority-ordered `causality::Engine` rather than tangled imperative callbacks.
