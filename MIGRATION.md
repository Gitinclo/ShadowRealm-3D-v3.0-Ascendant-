# Migration Guide

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

Upgrading from earlier ShadowRealm v2.x prototypes to v3.0 Ascendant.

## Build System Migration

- Replace legacy `CMakeList.txt` / `CMakelist.txt` references with `CMakeLists.txt`.
- Rename any local references to `main_android_valkun.cpp` to `main_android_vulkan.cpp`.
- Update desktop build scripts to point to `main_desktop.cpp` and `Causality.h`.
