# Build System Architecture

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

How CMake, Vite 8, and GitHub Actions orchestrate builds.

## Overview

- `CMakeLists.txt` (UTF-8, CMake >= 3.18) detects `ANDROID` vs Desktop automatically, fetching GLAD `v2.0.8` via `FetchContent` on Desktop and linking `native_app_glue` on Android.
- `vite.config.ts` bundles the React 19 + Three.js Web edition with Tailwind CSS v4.
