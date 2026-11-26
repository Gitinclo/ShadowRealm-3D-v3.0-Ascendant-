# Engineering & Operational Discipline

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Daily engineering rigor, verification gates, and zero-shortcut standards.

## Five Pillars of Discipline

1. **Evidence Before Claims:** Never assert a build, lint, or test passed without executing it and reading exit code `0`.
2. **Zero Stubs in Main:** Do not merge placeholder comments (`TODO`, dummy movement, fake network dials) into release branches.
3. **Strict Warning Hygiene:** Enforce TypeScript `strict: true` (`tsc --noEmit`) and C++17 `-Wall -Wextra -Werror` on core headers.
4. **Deterministic Simulation:** Clamp frame deltas (`dt <= 0.1s`), guard normalizations, and keep pure rules unit-tested.
5. **Blameless Continuous Improvement:** Every outage or regression yields a concrete automated guard (`blameless_retrospective.md`).
