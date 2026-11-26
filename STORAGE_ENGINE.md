# Storage Engine

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Local persistence format for settings, character progression, and world snapshots.

## Design

Structured JSON/binary save snapshots versioned per `SCHEMA_EVOLUTION.md`, written atomically (write temp file + rename on desktop/mobile; `localStorage` namespaced keys in Web edition) with integrity checksums.
