# Cryptography Specification

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

Approved algorithms for hashing, transport security, and save integrity.

## Standards

- **Transport (when networked):** TLS 1.3 / DTLS 1.3 only.
- **Hashing / Checksums:** SHA-256 for artifact verification and save integrity.
- **Prohibited:** MD5, SHA-1 for security, custom home-grown ciphers, or hardcoded keys.
