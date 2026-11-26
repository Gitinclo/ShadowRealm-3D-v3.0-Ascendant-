# Debugging Guide

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Diagnostics for OpenGL/Vulkan shaders, TypeScript builds, and Causality rules.

## Common Diagnostics

- **Shader Errors:** `compileShader()` prints GLSL info logs to `stderr` (Desktop) or `logcat` tag `ShadowRealm` (Android).
- **Causality Rules:** Open the in-game `Causality v2` Grimoire tab or press `F3` to inspect live priority, fire counts, and remaining cooldowns.
- **TypeScript 7 Side-Effect CSS Error (`TS2882`):** Ensure `src/vite-env.d.ts` contains `/// <reference types="vite/client" />`.
