# Frequently Asked Questions

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

Answers to common build, gameplay, and architecture questions.

## Why are there Desktop, Android, and Web editions?

The core C++17 codebase targets native Desktop (OpenGL 3.3) and Android NDK (GLES 3.2 / Vulkan 1.3), while the Vite + Three.js edition provides instant browser playability with shared gameplay rules.

## How do I build the Vulkan Android backend?

Configure CMake with `-DSHADOWREALM_ENABLE_VULKAN=ON` and an Android NDK r26+ toolchain file.

## Does the game require an online server?

No. All editions run completely offline in single-player mode; `NetworkClient` in `main_android_vulkan.cpp` remains idle unless explicitly connected.
