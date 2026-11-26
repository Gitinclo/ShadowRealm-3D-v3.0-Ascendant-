# API Specification

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Internal engine module APIs and scriptable hook contracts.

## Causality Engine API (`Causality.h`)

- `engine.addRule(Rule<Context>)` — inserts rule and stable-sorts descending by `priority`.
- `engine.evaluate(Context& ctx, float dt)` — ticks cooldowns, checks predicates, invokes effects, returns fired rule IDs.
- `engine.reset()` — resets `fireCount`, `cooldownRemaining`, and `lastConditionMet`.

## Web Simulation API (`src/game/rules.ts`)

Pure functions for zone lookup, damage mitigation, crit evaluation, AI state updates, shop purchases, and domain formulas.
