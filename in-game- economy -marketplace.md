# In-Game Economy & Marketplace

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Cultivation, Lore & Economy | **Last Updated:** 20/11/2026

Currency sinks, faucets, NFT relic valuation, and shop balance.

## Dual-Currency Loop

- **Gold (Faucet):** Standard mob kills (`14 + 3*lv`), Bosses (`95G`), wave clears (`+40G`). **Sinks:** Minor/Major Potions, Energy Draughts, Revive Tokens, Shadow Essence.
- **Chaos Coins / CC (Faucet):** Kills, `on_fire` streaks (`+25/+50 CC`), dismantling NFT relics (`18 * 2^rarity`). **Sinks:** XP Scrolls (`50 CC`), 2× CC Multiplier (`100 CC`), Nuke Reset (`200 CC`).

## Anti-Exploit Guardrails

All shop purchases validate sufficient Gold and CC atomically (`src/game/rules.ts`, `main_desktop.cpp`) before applying effects, and no real-money monetization exists (`ETHICS.md`).
