# Authentication Flows

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Security, Threat Modeling & Cryptography | **Last Updated:** 2026-11-25

Design guidelines for optional future online account authentication.

## Flow

Offline single-player requires no login. Future multiplayer authentication will use short-lived OAuth2/OIDC tokens over TLS with server-side verification and zero client-embedded secrets.
