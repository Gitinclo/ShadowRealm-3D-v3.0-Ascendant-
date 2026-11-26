# Event Catalog

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Reactive Causality v2 events and gameplay telemetry hooks.

## Standard Causality Rules

1. `unlock_nuke` (P10): Level>=5 AND Kills>=10 AND NOT(unlocked) -> Unlock Teraton Bomb.
2. `low_hp_warn` (P9): HP < 20% -> Warning (5s CD).
3. `on_fire` (P8): Streak>=5 -> Bonus CC (8s CD).
4. `boss_alert` (P8): Boss within 20u -> Alert.
5. `cc_airdrop` (P7): CC>=200 -> Epic NFT drop.
6. `boss_wave` (P6): Level>=10 OR Deaths>=3 -> Summon Shadow King.
7. `wave_respawn` (P5): Alive enemies==0 -> Respawn + 40 Gold.
8. `nuke_ready` (P4): Nuke ready reminder.
9. `absorb_evolve` (P3): DomainLv>=50 AND Kills>=50 -> +500 MaxHP.
10. `night_warn` (P2): Nightfall difficulty notice.
