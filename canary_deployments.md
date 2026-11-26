# Canary Deployments

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Progressive rollout plan for hosted WebGL builds and future online shards.

## Rollout Stages

Deploy to staging preview -> 5% canary traffic -> 25% -> 100%, gating each step on zero console errors, clean FPS telemetry, and zero crash spikes.
