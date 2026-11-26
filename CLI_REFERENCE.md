# CLI Reference

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Authoritative command list for npm, CMake, g++, and Justfile recipes.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite 8 dev server on `0.0.0.0:3000` |
| `npm run lint` | Run TypeScript 7 strict type check (`tsc --noEmit`) |
| `npm test` | Run pure gameplay unit suite (`tsx --test src/game/rules.test.ts`) |
| `npm run build` | Build production bundle into `dist/` |
| `npm run preview` | Serve `dist/` on `0.0.0.0:3000` |
| `just check` | Run all local lint, test, build, and C++17 header checks |
