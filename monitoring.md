# Monitoring

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Runtime health signals, CI watchlists, and frame-time monitoring.

## Key Signals

- **Web Runtime:** Zero uncaught exceptions, zero WebGL context errors, p95 frame time <= 16.6ms.
- **CI Pipelines:** Daily `nightly_build.yml` and weekly `security_audit.yml` status tracked per `alerting_matrix.md`.
