# Operational Runbooks

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Step-by-step response procedures for build, CI, and deployment issues.

## CI Desktop Build Failure

1. Check failing OS job (`build-linux`, `build-macos`, or `build-windows`) in `.github/workflows/build.yml`.
2. Verify pinned `GLM`, `Dear ImGui`, and `GLAD` tags fetched cleanly.
3. Reproduce locally with `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build`.

## Web Dev Server Startup Failure

1. Verify port `3000` is bound to `0.0.0.0` in `vite.config.ts`.
2. Run `npm install && npm run lint && npm run build`.
