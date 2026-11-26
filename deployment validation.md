# Deployment Validation

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Pre-release and post-deployment verification checklist across Web and Native artifacts.

## Release Gates

- [ ] `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- [ ] `npm test` (`tsx --test src/game/rules.test.ts`) passes 100%.
- [ ] `npm run build` exits `0` and loads cleanly on port `3000` with 0 browser console errors.
- [ ] `Causality.h` passes strict C++17 syntax check.
- [ ] `.github/workflows/build.yml` Linux, macOS, and Windows artifact jobs pass green.
