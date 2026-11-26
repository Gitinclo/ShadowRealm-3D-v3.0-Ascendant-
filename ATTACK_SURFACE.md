# Attack Surface

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

Enumerated external inputs and system interfaces.

## Entry Points

1. Keyboard/mouse/touch OS events (`GLFW`, `AInputEvent`, DOM).
2. Optional `NetPacket` transport boundary (`main_android_vulkan.cpp`).
3. Local save/config files and static web assets.
4. CI/CD third-party GitHub Actions and fetched C++/npm packages.
