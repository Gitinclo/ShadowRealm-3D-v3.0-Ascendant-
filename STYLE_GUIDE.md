# Style Guide

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core Repository & Governance | **Last Updated:** 2026-11-25

Code, shader, and documentation formatting conventions.

## C++17

- Use `#pragma once`, `constexpr` constants (`kCamelCase`), and standard `<cmath>`/`<algorithm>` headers.
- Compile cleanly under `-Wall -Wextra` (GCC/Clang) and `/W4` (MSVC).
- Never take addresses of temporary rvalues or ship stubbed input loops.

## TypeScript & React

- Strict TypeScript (`tsc --noEmit`). Keep pure game rules in `src/game/rules.ts` and `src/game/causality.ts`.
- Style UI with Tailwind CSS utility classes; avoid inline CSS files.

## Markdown & Lore

- Use ATX headings, tables for numerical systems, and keep entity names aligned with `GLOSSARY.md`.
