# Simulation Tick Loop

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, QA & Operations | **Last Updated:** 20/11/2026

Frame pacing, delta clamping, and phase execution order.

## Order of Operations

1. Measure `rawDt`, enforce optional FPS cap (30/60/uncapped), clamp `dt = clamp(rawDt, 0, 0.1)`.
2. Poll OS/DOM input and update camera orbit.
3. Advance day/night clock and cooldown timers.
4. Integrate movement, gravity, terrain height, and combat actions.
5. Step 5-state Enemy AI and particles.
6. Evaluate `causality::Engine` rules.
7. Render 3D scene and HUD overlay.
