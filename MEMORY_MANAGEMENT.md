# Memory Management

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Ownership, lifetime, and GPU resource cleanup guidelines.

## Native C++17

- Prefer value semantics (`std::vector`, `std::deque`) and RAII (`std::unique_ptr`).
- Explicitly destroy GL/EGL/Vulkan handles (`vkDeviceWaitIdle`, swapchain, fences, semaphores, command pools) on `APP_CMD_TERM_WINDOW` and shutdown.
- Cap particle pools (`kMaxParticles = 600`) to prevent unbounded allocations.
