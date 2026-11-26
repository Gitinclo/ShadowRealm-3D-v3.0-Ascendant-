# System Design

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

High-level architecture across Desktop C++, Android NDK, and WebGL.

## Runtime Layers

1. **Presentation Layer:** OpenGL 3.3 Core + Dear ImGui (`main_desktop.cpp`), GLES 3.2 Deferred HDR (`main_android.cpp`), Vulkan 1.3 HDR10+ (`main_android_vulkan.cpp`), Three.js + React 19 (`src/`).
2. **Simulation Layer:** Movement, terrain height sampling, 5-state Enemy AI, status effects, Infinite Devouring Domain, and loot generation.
3. **Causality Layer:** Declarative priority-sorted rule evaluation (`Causality.h` / `src/game/causality.ts`).

## Data Flow

Input -> Frame Tick (`dt` clamped to <= 0.1s) -> Physics & AI -> Combat Resolution -> Causality Evaluation -> Render Pass -> HUD Overlay.
