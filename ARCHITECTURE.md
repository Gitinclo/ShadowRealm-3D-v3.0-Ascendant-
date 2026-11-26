# Architecture Overview

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core & Governance | **Last Updated:** 20/11/2026

Top-level system architecture spanning Desktop OpenGL 3.3, Android NDK, and WebGL.

## Multi-Target Design

- **Desktop Native (`main_desktop.cpp`, `Causality.h`, `CMakeLists.txt`):** C++17 OpenGL 3.3 Core renderer with GLAD v2, GLFW, GLM, and Dear ImGui.
- **Android Native (`main_android.cpp`, `main_android_vulkan.cpp`):** Deferred HDR OpenGL ES 3.2 and experimental Vulkan 1.3 HDR10+ targets with NDK `AInputEvent` touch controls.
- **WebGL Edition (`src/`):** React 19 + Three.js + Vite 8 + Tailwind CSS v4 SPA with decoupled pure logic (`src/game/rules.ts`, `src/game/causality.ts`).

## Core Subsystems

See `SYSTEM_DESIGN.md`, `DOMAIN_MODEL.md`, `STATE_MACHINE.md`, and `docs/adr/` for deep specifications.
