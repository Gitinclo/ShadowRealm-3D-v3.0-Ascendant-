# Contributing Guide

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Core & Governance | **Last Updated:** 20/11/2026

How to propose features, fix bugs, and submit clean pull requests.

## Workflow

1. Read `ONBOARDING.md`, `CODE_OF_CONDUCT.md`, and `CODING_STANDARDS.md`.
2. Fork and branch from `main`.
3. Keep simulation logic decoupled and covered by tests (`npm test` and C++17 `Causality.h` check).
4. Verify `npm run lint`, `npm test`, and `npm run build` pass with zero errors before opening a PR.

## Pull Request Templates

Use `.github/PULL_REQUEST_TEMPLATE.md` or specialized templates under `.github/PULL_REQUEST_TEMPLATE/` (`hotfix.md`, `breaking_change.md`, `architecture_change.md`, `lore_addition.md`).
