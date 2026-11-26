# Test Harness

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Quality Assurance & Verification | **Last Updated:** 2026-11-25

Commands and fixtures used to execute automated verification.

## Commands

```bash
# TypeScript pure-logic suite
npx tsx --test src/game/rules.test.ts

# Type check & production Web build
npm run lint && npm run build

# C++17 Causality header check
g++ -std=c++17 -Wall -Wextra -Werror -x c++ -fsyntax-only Causality.h
```
