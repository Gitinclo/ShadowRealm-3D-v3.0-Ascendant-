# Concurrency Model

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Threading boundaries across native and browser runtimes.

## Desktop & Web

Single-threaded main simulation + render loop with fixed upper `dt` clamp (`0.1s`) to preserve determinism and avoid lock contention.

## Android Vulkan Edition

UI/render loop runs on the `android_main` looper thread; optional `NetworkClient` worker thread communicates solely through mutex-guarded `m_outgoing` and `m_incoming` queues.
