# Technical Debt Register

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Tracked engineering improvements and deferred refactors.

## Active Items

1. **Android Vulkan Mesh Pipeline:** Expand `Renderer::drawFrame` in `main_android_vulkan.cpp` from swapchain clear/present to full SPIR-V PBR render pass.
2. **Desktop PCF Shadow Map:** Add dedicated shadow FBO depth pass in `main_desktop.cpp` to match `main_android.cpp`.
3. **Unified Save Serialization:** Share JSON save schema across Desktop, Android, and Web.
