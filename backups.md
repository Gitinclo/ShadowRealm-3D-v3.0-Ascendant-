# Backups & Recovery

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Backup policies for repository state, release binaries, and player saves.

## Strategy

- Source code and governance docs are backed up via distributed Git clones and GitHub releases.
- Release binaries carry SHA-256 checksums (`CRYPTOGRAPHY_SPEC.md`).
- Player saves are stored locally and exportable before major upgrades (`UPGRADING.md`).
