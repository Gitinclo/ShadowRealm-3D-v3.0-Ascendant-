# ADR-0001: Record Architecture Decisions

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Establish lightweight Architecture Decision Records.

## Status

Accepted (2026-11-25)

## Context

ShadowRealm 3D spans multiple graphics backends (OpenGL 3.3, GLES 3.2, Vulkan 1.3, Three.js WebGL) and complex game systems. Decisions need durable rationale.

## Decision

Record significant architectural choices in `docs/adr/NNNN-title.md` using `docs/adr/TEMPLATE.md`.

## Consequences

Future maintainers and AI agents can trace why build systems, rendering pipelines, and rule engines are structured as they are.
