# Secrets Management

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Handling credentials, signing keys, and CI tokens safely.

## Rules

- Never commit `.env` files, API keys, Android keystores, or OAuth secrets to Git.
- Store CI signing credentials exclusively in encrypted GitHub Actions Secrets with least-privilege scopes.
