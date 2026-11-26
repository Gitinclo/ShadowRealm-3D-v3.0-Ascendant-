# Caching Strategy

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Asset, terrain chunk, and shader caching policies.

## Terrain & Mesh Caching

- Android Vulkan `TerrainStreamer` caches procedural heightmaps in `m_chunks` within `VIEW_DISTANCE = 3` and unloads chunks beyond `VIEW_DISTANCE + 1`.
- Shared cube/sphere meshes and compiled shader programs are created once per graphics context and reused across all entity draws.
