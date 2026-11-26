# Event Schema Registry

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Canonical schema for Causality v2 events and combat log records.

## Schema

Each rule firing emits `{ id: string, priority: number, fireCount: number, cooldownRemaining: number, message: string }` matching `EVENT_CATALOG.md`.
