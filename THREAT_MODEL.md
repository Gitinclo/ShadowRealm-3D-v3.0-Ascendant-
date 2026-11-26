# Threat Model

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

STRIDE-based security analysis for ShadowRealm 3D.

## Assets & Threats

- **Build Supply Chain:** Compromised fetched dependency (mitigated by tag pinning and `security_audit.yml`).
- **Save / Packet Tampering:** Malformed input causing buffer overflows in C++ (mitigated by bounded buffers and strict bounds checks).
- **Web Edition XSS:** Untrusted input injection into HUD/logs (mitigated by React text bindings and zero `dangerouslySetInnerHTML`).
