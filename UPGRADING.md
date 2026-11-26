# Upgrading Guide

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

Step-by-step instructions for upgrading dependencies and runtime editions.

## Dependencies

- **GLM / Dear ImGui:** Update pinned tags in `.github/workflows/build.yml` and re-verify Linux, macOS, and Windows CI jobs.
- **Web Packages:** Run `npm update`, then verify `npm run lint`, `npm run build`, and `npx tsx --test src/game/rules.test.ts`.
