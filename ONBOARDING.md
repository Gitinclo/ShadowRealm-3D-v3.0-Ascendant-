# Developer Onboarding

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

Zero-to-first-PR guide for new engineers and writers.

## 1. Prerequisites

- **Desktop C++17:** CMake >= 3.18, C++17 compiler, GLFW 3.3+, GLM, Dear ImGui, Python 3 + Jinja2.
- **Web Edition:** Node.js 20+ and npm.
- **Android NDK:** NDK r23+ (GLES 3.2) or r26+ (Vulkan 1.3).

## 2. First Local Verification

```bash
# Verify Causality.h with strict warnings
printf '#include "Causality.h"\n' | g++ -std=c++17 -Wall -Wextra -Werror -x c++ -fsyntax-only -I. -

# Run Web edition dev server & tests
npm install && npm run lint && npm run build
npx tsx --test src/game/rules.test.ts
```

## 3. Where to Start

Read `SYSTEM_DESIGN.md`, `STYLE_GUIDE.md`, and check open issues labeled `good-first-issue` or `documentation-gap`.
