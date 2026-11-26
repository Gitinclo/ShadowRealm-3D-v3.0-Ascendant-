# Data Pipeline

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

How static world tables, procedural heightmaps, and loot specs flow into runtime.

## Flow

Deterministic constants (`kClassSpecs`, zone radii, rarity multipliers) -> Runtime state initialization -> Per-tick simulation -> HUD/UI projection.
