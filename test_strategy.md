# Test Strategy

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Quality Assurance & Verification | **Last Updated:** 2026-11-25

Multi-layer verification pyramid across C++17, TypeScript, and browser rendering.

## Test Layers

1. **Unit Tests:** C++17 strict-warning tests for `Causality.h`; `node:test` (`src/game/rules.test.ts`) for combat, AI, NFT rarity, shop, domain formulas, and causality.
2. **Static & Type Checks:** `tsc --noEmit`, `g++ -Wall -Wextra -Werror`, HTML/JS syntax validation.
3. **Integration & Visual E2E:** Production `vite build` + Playwright headless Chromium visual and console-error verification.
4. **Cross-Platform Native CI:** Linux, macOS, and Windows CMake compilation.
