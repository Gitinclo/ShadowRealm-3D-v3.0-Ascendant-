# Chaos Engineering

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Controlled fault injection experiments for resilience validation.

## Experiments

- Simulate frame-time spikes (`dt > 0.5s`) to verify physics clamping (`dt <= 0.1s`) prevents terrain tunneling.
- Simulate WebGL context loss / Android `APP_CMD_TERM_WINDOW` pause-resume cycles.
- Simulate disconnected network transport in `main_android_vulkan.cpp`.
