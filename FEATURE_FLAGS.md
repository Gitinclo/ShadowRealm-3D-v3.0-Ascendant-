# Feature Flags

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Compile-time and runtime switches across targets.

## Flags

| Flag | Scope | Default | Effect |
|---|---|---|---|
| `SHADOWREALM_ENABLE_VULKAN` | CMake (Android) | `OFF` | Builds `main_android_vulkan.cpp` instead of `main_android.cpp` |
| `DISABLE_HMR` | Env (`vite.config.ts`) | `false` | Disables Vite HMR when set to `"true"` |
| `flyMode` (`F` key) | Runtime | `false` | Toggles vertical flight camera/movement |
