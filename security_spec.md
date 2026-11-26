# Security Specification

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security & Legal | **Last Updated:** 20/11/2026

Technical security controls enforced across native C++17, Android NDK, and WebGL builds.

## Controls

- Strict input bounds checking (`dt` clamp, fixed-size player name buffers, index validation in `Player::useSkill`).
- Offline-by-default networking (`NetworkClient` never dials remote endpoints automatically).
- Zero raw HTML injection in React UI components.
- Automated CI hygiene via `.github/workflows/security_audit.yml`.
