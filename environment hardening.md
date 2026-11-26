# Environment Hardening

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Baseline hardening controls for local dev boxes, CI runners, and deployment targets.

## Controls

- Pin all GitHub Actions and native dependencies (`GLAD v2.0.8`, `GLM 1.0.1`, `Dear ImGui v1.91.1`, `GLFW 3.4`).
- Enforce least-privilege `permissions: contents: read` on workflows.
- Never commit `.env` secrets (`.gitignore`, `secrets_management.md`).
