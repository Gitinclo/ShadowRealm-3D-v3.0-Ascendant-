# Cost Optimization

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Keeping CI runner time and static hosting efficient.

## Practices

- Shallow clones (`--depth 1`) for GLM, Dear ImGui, and GLFW in CI.
- Parallel builds (`--parallel 4`) and artifact retention capped at 30 days.
- Tree-shaken Vite production bundles for WebGL hosting.
