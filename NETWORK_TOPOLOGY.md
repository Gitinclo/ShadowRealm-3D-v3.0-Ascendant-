# Network Topology

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Offline-first topology and optional multiplayer relay design.

## Modes

- **Default Offline Mode:** Zero outbound sockets; local simulation is fully authoritative.
- **Optional Session Mode:** Client connects explicitly via `Game::connectToServer(host, port)` to an authoritative regional shard server.
