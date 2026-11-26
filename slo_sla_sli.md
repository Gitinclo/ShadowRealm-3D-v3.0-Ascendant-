# SLOs, SLAs & SLIs

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Service reliability metrics for CI pipelines and hosted WebGL preview.

## Indicators & Objectives

| SLI | Target SLO | Measurement |
|---|---|---|
| Web Edition Availability | 99.9% monthly | Synthetic HTTP 200 + canvas boot check |
| Frame Pacing (p95) | <= 16.6 ms | Headless Chromium / profiler benchmark |
| CI Main Branch Green Rate | >= 98% | GitHub Actions workflow success ratio |
