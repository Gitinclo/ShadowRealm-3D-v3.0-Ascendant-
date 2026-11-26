# Domain Model

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Core entities, aggregates, and invariants of ShadowRealm 3D.

## Core Aggregates

- **Player:** Class archetype (`Knight`, `Mage`, `Rogue`, `Shaman`), level, XP, HP/Stamina, Gold, CC, Domain Level (1..999), Revive Tokens, equipped NFT items.
- **Enemy:** Kind (`Wolf`, `Goblin`, `Shade`, `Boss`), level-scaled stats, 5-state AI (`Idle`, `Patrol`, `Chase`, `Attack`, `Flee`), status bitmask.
- **World:** 4 radial zones (`Shadow Forest`, `Ashen Desert`, `Obsidian Mountains`, `Cursed Wastes`) + 120s day/night cycle.
- **Causality Rule:** Priority, `LogicOp::AND/OR`, `NOT()` predicates, cooldown, fire cap, effect callback.
