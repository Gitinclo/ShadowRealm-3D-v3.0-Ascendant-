# Changelog

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core & Governance | **Last Updated:** 20/11/2026

All notable changes to ShadowRealm 3D follow Keep a Changelog conventions.

## [3.0.0] — Ascendant (20/11/2026)

### Added
- Complete C++17 Desktop implementation (`main_desktop.cpp`) and header-only `Causality.h`.
- Unified UTF-8 `CMakeLists.txt` supporting Desktop OpenGL 3.3 Core and Android NDK (GLES 3.2 / optional Vulkan 1.3).
- Playable WebGL edition (`src/`) powered by React 19.3.1, Three.js 0.187.0, Vite 8.3.8, TypeScript 7.0.2, and Tailwind CSS 4.3.5.
- Full governance, architecture, SRE, QA, security, cultivation lore, and `.github/` workflow suite.
### Fixed
- Removed duplicate misspelled `CMakeList.txt` / `CMakelist.txt` and stray root `build.yml`.
- Renamed `main_android_valkun.cpp` to `main_android_vulkan.cpp` and replaced input/network/render stubs.
- Completed truncated `shadowrealm.html` showcase.
