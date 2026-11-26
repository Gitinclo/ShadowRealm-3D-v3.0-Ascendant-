# Supply Chain Security

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

Defenses against dependency confusion and build tampering.

## Controls

- Dependabot updates configured in `.github/dependabot.yml`.
- Automated `npm audit` and C++ static review in `.github/workflows/security_audit.yml`.
- Pinned tags for GLAD (`v2.0.8`), GLM (`1.0.1`), Dear ImGui (`v1.91.1`), and GLFW (`3.4`).
