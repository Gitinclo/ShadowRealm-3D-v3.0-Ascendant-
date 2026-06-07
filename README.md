# ShadowRealm-3D-v3.0-Ascendant-
# ⚔ ShadowRealm 3D — v3.0 "Ascendant"

> **Open World MMORPG · C++17 · OpenGL 3.3 Core · No Engine**

A fully self-contained 3D action RPG written from scratch in C++17 on top of
raw OpenGL 3.3 Core, GLFW, GLM, Dear ImGui, and GLAD. Every renderer, AI, 
particle system, and game mechanic is hand-rolled — no game engine.

---

## 🆕 What's New in v3.0

| Feature | Details |
|---|---|
| **Day/Night Cycle** | 120s full cycle — sky, sun arc, ambient, fog, enemy speed all shift |
| **Blinn-Phong Specular** | Per-surface highlights, bias adapts to surface angle |
| **Enemy State Machine** | 5 states: Idle → Patrol → Chase → Attack → Flee |
| **4th Enemy Type** | Shade — ranged archer that kites at distance |
| **4 Player Classes** | Knight / Mage / Rogue / Shaman with unique stats & power effects |
| **Status Effects** | Burn / Freeze / Poison / Stun (bitmask) — class-specific |
| **Particle System** | 600-cap CPU billboards — blood, sparks, heal, freeze, nuke smoke |
| **Screen Vignette** | Radial health pulse + domain flash, separate from flat flash |
| **Combo & Streak** | 2.5s combo window, crit hits 4×, Triple/Penta/Unstoppable/Godlike |
| **Sprint System** | Shift drains Stamina; Stamina regens at rest |
| **Shop** | 8 purchasable items (Gold/CC) — potions, revive token, CC 2× |
| **Mushroom Objects** | 4th world object type |
| **Causality v2** | NOT logic, per-effect cooldowns, priority ordering, debug tab |
| **6-tab Menu** | Stats / NFT / Leaderboard / Shop / Nuke / Graphics |
| **Pause Screen** | Esc pauses at any time; in-pause options access |
| **Revive Token** | Survives one lethal hit; purchasable in shop |
| **Class Select Screen** | Named entry → class picker → game |
| **Uniform Caching** | Zero `glGetUniformLocation` calls per draw — cached at init |
| **Enemy Level Scaling** | Enemy stats scale with player level (±1-2 levels) |
| **Zone Shader Tints** | 4 zones (Forest/Desert/Mountains/Cursed) with per-zone GLSL tint |
| **Absolute Zero** | New domain skill at Lv.250 — instant freeze all in range |
| **Respawn Logic** | Dead enemies don't re-clear the array; `spawnEnemies()` only tops up |

---

## 🚀 Build

### Quick (recommended)
```bash
# Linux — install system deps first
sudo apt-get install -y libglfw3-dev libgl1-mesa-dev cmake build-essential git

# Run setup (fetches ImGui, GLM; validates GLAD; builds)
chmod +x setup.sh && ./setup.sh

# Play
./build/bin/shadowrealm
```

### Manual CMake
```bash
# Clone deps
git clone --depth=1 --branch v1.91.1 https://github.com/ocornut/imgui.git imgui
git clone --depth=1 --branch 1.0.1   https://github.com/g-truc/glm.git    glm

# Extract GLAD (from glad.zip or download from gen.glad.sh — GL 3.3 Core)
unzip glad.zip -d glad_tmp
mkdir -p include && cp -r glad_tmp/include/glad include/
cp glad_tmp/src/gl.c .

# Build
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)
./build/bin/shadowrealm
```

### macOS
```bash
brew install glfw glm cmake
# Then follow manual CMake above (ImGui + GLAD still needed)
```

### Windows (MSVC)
```powershell
vcpkg install glfw3 glm opengl --triplet x64-windows
cmake -B build -DCMAKE_TOOLCHAIN_FILE="$env:VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake"
cmake --build build --config Release
```

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W A S D` | Move |
| `Shift` | Sprint (drains Stamina) |
| `Space` | Jump |
| `Z` | Basic Attack |
| `X` | Power Ability (class-specific) |
| `C` | Heal |
| `Ctrl` | Dash (costs 20 Stamina) |
| `N` | Nuke (☢ Teraton Bomb, 90s CD) |
| `G` | Activate Infinite Devouring Domain |
| `F` | Toggle Fly Mode |
| `R` | Revive (when dead) |
| `F1` / `Tab` | Open Menu |
| `F3` | Debug Overlay |
| `Esc` | Pause / Unpause |
| `RMB drag` | Orbit camera |
| `Scroll` | Zoom |

---

## 🧠 Enemy AI State Machine

```
IDLE ──aggro──→ CHASE ──in range──→ ATTACK
  ↑                 ↓ too far              ↓ low HP (if fleeHpPct > 0)
PATROL ←──lost──    ↑                    FLEE ──far enough──→ PATROL
```

- **Wolf** — fast, low flee threshold (5%)
- **Goblin** — medium speed, flees at 12% HP
- **Boss (Shadow King)** — never flees, heavy stats, level-scaled
- **Shade** — ranged archer, flees at 30% HP, kites at 18u range

---

## ✨ Causality Engine v2

10 rules wired to live game state. Fires only when logical conditions are met — never spuriously.

| Rule | Logic | Priority | Notes |
|---|---|---|---|
| `unlock_nuke` | AND | 10 | Level≥5 AND Kills≥10 → unlock ☢, fires once |
| `low_hp_warn` | AND | 9 | HP<20% → red vignette + warning (5s effect CD) |
| `on_fire` | AND | 8 | Streak≥5 → announcement + CC (8s CD) |
| `boss_alert` | AND | 8 | Boss alive AND within 20u → alert (fires once) |
| `cc_airdrop` | AND | 7 | CC≥200 → Epic NFT airdrop (fires once) |
| `boss_wave` | OR | 6 | Level≥10 OR Deaths≥3 → boss spawn (30s CD) |
| `wave_respawn` | AND | 5 | All dead → respawn + gold bonus |
| `nuke_ready` | AND | 4 | Nuke CD=0 AND Level≥3 → reminder (max 5×) |
| `absorb_evolve` | AND | 3 | DomainLv≥50 AND Kills≥50 → MaxHP+500 (once) |
| `night_warn` | AND | 2 | Night time → "enemies grow stronger" (3×) |

**v2 additions:** NOT() cause factory, per-Effect cooldown timer, priority-sorted rule execution, in-game debug tab showing live state of all rules.

---

## 🎴 NFT System

6 rarity tiers: Common → Uncommon → Rare → Epic → Legendary → Mythic

- Drop chance scales with enemy type (Boss: 90%, Shade: 40%, Goblin: 35%, Wolf: 20%)
- Stats (STR/DEF bonus, CC value) multiply by `2^rarity`
- Equip from NFT Vault or Menu → instant stat application
- Sell for CC from either panel
- CC milestone (200 CC) triggers Causality airdrop of free Epic weapon

---

## 🌊 Domain System — Lv 1 → 999

| Level | Unlock |
|---|---|
| 1 | Soul Devour (HP drain → XP, self-heal) |
| 10 | Domain Suppression (freeze all in range, 4s) |
| 25 | Void Erasure (instakill below 20% HP) |
| 50 | Breaker (shatter all defences, +8 DPS in domain) |
| 100 | Chaos (random massive burst hits every ~80 frames) |
| 250 | Absolute Zero (instant freeze all in range) |
| 999 | ABSOLUTE SUPREMACY |

Domain cooldown reduces with level (floor: 15s). Range expands +0.5u per level, capped at 80u.

---

## 🛒 Shop

| Item | Cost | Effect |
|---|---|---|
| Minor Potion | 30G | +30 HP |
| Major Potion | 80G | +80 HP |
| Energy Draught | 40G | +50 Stamina |
| XP Scroll | 50CC | +200 XP instantly |
| CC Multiplier | 100CC | 2× CC earn for 60s |
| Revive Token | 150G + 20CC | Survive next death at 50% HP |
| Nuke Cooldown Reset | 200CC | Reset ☢ CD to 0 |
| Shadow Essence | 60G + 30CC | +10 STR +5 AGI for 5 min |

---

## 📁 File Structure

```
shadowrealm/
├── shadowrealm.cpp          # Main game (all systems, ~2500 lines)
├── Causality.h              # Causality engine v2
├── CMakeLists.txt           # Build system
├── setup.sh                 # Dependency fetch + build script
├── build.yml                # GitHub Actions CI (Linux/macOS/Windows)
├── ShadowRealm-v3-Showcase.html  # Interactive showcase page
├── imgui/                   # Dear ImGui (fetched by setup.sh)
├── glm/                     # GLM (fetched by setup.sh or system)
├── glad/                    # GLAD (from glad.zip)
└── include/                 # GLAD headers
```

---

## 🔧 Architecture Notes

- **Uniform caching** — all `glGetUniformLocation` calls done once at init into `MainUniforms g_uni`. Zero string lookups per draw call.
- **Particle cap** — 600 particles max; oldest auto-pruned on overflow.
- **Enemy array** — never cleared on wave end; `spawnEnemies()` only adds up to target count, preserving respawn state.
- **FPS cap** — accumulator-based, configurable (30/60/uncapped) from Graphics tab.
- **dt clamping** — `glm::clamp(rawDt, 0.0, 0.1)` prevents spiral-of-death on window focus loss.
- **Zone detection** — simple radial distance from origin. Extend to polygon zones trivially.
- **Shadow bias** — adapts to `dot(normal, lightDir)` to eliminate acne on steep surfaces.

---

## 📜 Licence

MIT — use freely, credit appreciated.
