# Observability Pipeline

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Structured logging and diagnostics architecture.

## Pipeline

- **Desktop:** `stderr` shader/GLFW diagnostics + in-game F3 debug overlay.
- **Android:** `__android_log_print` / `__android_log_vprint` tagged `ShadowRealm` / `MMORPG`.
- **Web:** Structured console assertions verified cleanly (0 errors) in Playwright.
