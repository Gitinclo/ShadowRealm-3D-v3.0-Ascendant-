# Dependency Policy

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Rules for adding, pinning, and auditing third-party libraries.

## Policy

- Every native dependency in CI (`GLM 1.0.1`, `Dear ImGui v1.91.1`, `GLAD v2.0.8`, `GLFW 3.4`) must be pinned to an explicit tag.
- Prefer header-only or MIT/Zlib/BSD licensed libraries.
- Document all licenses in `THIRD_PARTY_NOTICES.md` and `OPEN_SOURCE_LICENSES.md`.
