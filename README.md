# ShadowRealm 3D — v3.0 "Ascendant"

> **Last Updated:** `20/11/2026`
> **Runtimes:** Node.js `v22.23.5` · npm `10.9.9` · C++17 (`g++ 12.2.0` verified) · CMake `>= 3.18`
> **Web Stack:** React `19.3.1` · Vite `8.3.8` · TypeScript `7.0.2` · Three.js `0.187.0` · Tailwind CSS `4.3.5` · Lucide React `1.80.0`
> **Native Stack:** OpenGL 3.3 Core (Desktop) · OpenGL ES 3.2 & Vulkan 1.3 HDR10+ (Android NDK) · GLAD `v2.0.8` · GLM `1.0.1` · Dear ImGui `v1.91.1` · GLFW `3.4`

ShadowRealm 3D is a multi-target open-world dark-fantasy & cultivation action RPG featuring a 120-second day/night cycle, 4 radial biomes, 4 playable classes, a 5-state enemy AI, procedural NFT-style relic drops, an Infinite Devouring Domain scaling to Level 999, and the priority-ordered **Causality Engine v2**. It ships with native C++17 Desktop/Android sources alongside a browser-playable WebGL (Three.js + React) edition.

---

## Project Architecture Map

```text
.
├── CMakeLists.txt                # Unified UTF-8 CMake build (Desktop OpenGL 3.3 + Android GLES 3.2 / Vulkan 1.3)
├── Causality.h                   # Header-only C++17 Causality Engine v2 (AND/OR/NOT, priority, cooldowns)
├── main_desktop.cpp              # Desktop C++17 OpenGL 3.3 Core + GLAD + GLFW + GLM + Dear ImGui game
├── main_android.cpp              # Android NDK OpenGL ES 3.2 deferred HDR + ACES tonemap + touch controls
├── main_android_vulkan.cpp       # Android NDK Vulkan 1.3 HDR10+ swapchain + streaming terrain ECS
├── shadowrealm.html              # Standalone interactive HTML/CSS/Canvas showcase page
├── index.html                    # Vite SPA entry HTML for the WebGL edition
├── package.json                  # Node/Vite manifest and CLI scripts (dev, build, preview, lint, test)
├── tsconfig.json                 # TypeScript strict configuration (ES2022, bundler resolution, noEmit)
├── vite.config.ts                # Vite 8 + React + Tailwind v4 dev/preview config (port 3000)
├── metadata.json                 # Application metadata descriptor
├── .env.example                  # Documented environment variable template (no real secrets)
├── .editorconfig                 # Cross-editor indentation & UTF-8 LF rules
├── .gitattributes                # Consistent LF line endings & binary attributes
├── .gitignore                    # Ignores build/, dist/, node_modules/, glm/, imgui/, .env*
├── .pre-commit-config.yaml       # Local pre-commit hooks (YAML/JSON/keys/TS/C++17 checks)
├── Justfile                      # Unified task runner (`just check`, `just build-desktop`)
├── LICENSE                       # MIT License
├── src/                          # Browser-playable WebGL edition (React 19 + Three.js + TypeScript)
│   ├── main.tsx                  # React root mount + global CSS import
│   ├── App.tsx                   # Top-level UI orchestration bridging Three.js engine & HUD modals
│   ├── index.css                 # Tailwind CSS v4 entry (`@import "tailwindcss";`)
│   ├── vite-env.d.ts             # Vite client ambient module declarations (CSS/asset imports for TS 7)
│   ├── components/               # React UI overlays (HUD, Title, Menu, Status)
│   │   ├── TitleScreen.tsx       # Hero name input & 4-class selection screen
│   │   ├── PlayingHud.tsx        # Compact HUD (HP/Stamina, zone, domain, cooldowns, combat log)
│   │   ├── GameMenuModal.tsx     # Tabbed Grimoire (Stats, NFT Vault, Shop, Causality v2, Nuke/Domain, Graphics)
│   │   └── StatusModal.tsx       # Pause / defeat modal controls
│   └── game/                     # Decoupled simulation, rendering, audio, and pure rule tests
│       ├── types.ts              # Shared TypeScript interfaces & constants
│       ├── rules.ts              # Pure deterministic combat, AI, NFT, shop, zone & domain formulas
│       ├── causality.ts          # TypeScript Causality Engine v2 implementation (mirrors Causality.h)
│       ├── rules.test.ts         # Node test runner unit suite (`npm test`)
│       ├── world.ts              # Procedural terrain height & 4-zone geometry/prop builders
│       ├── models.ts             # Three.js character, enemy, boss, and Shadow Spire meshes
│       ├── audio.ts              # Web Audio procedural sound effects
│       └── engine.ts             # Three.js render loop, camera orbit, input, and tick coordinator
├── docs/
│   ├── adr/                      # Architecture Decision Records
│   │   ├── 0001-record-architecture-decisions.md
│   │   └── TEMPLATE.md
│   └── rfcs/                     # Request for Comments proposal template
│       └── TEMPLATE.md
├── .github/                      # GitHub governance, templates, and CI/CD pipelines
│   ├── CODEOWNERS                # Subsystem ownership map
│   ├── CODE_OF_CONDUCT_ENFORCEMENT.md
│   ├── FUNDING.yml               # Sponsorship configuration
│   ├── dependabot.yml            # Automated npm & GitHub Actions update rules
│   ├── release.yml               # GitHub release changelog categorization
│   ├── ISSUE_TEMPLATE.md         # Default fallback issue template
│   ├── ISSUE_TEMPLATE/           # Issue forms (bug, feature, release, security, perf, incident, lore, balance, tech debt, docs)
│   ├── PULL_REQUEST_TEMPLATE.md  # Default pull request template
│   ├── PULL_REQUEST_TEMPLATE/    # Specialized PR checklists (hotfix, breaking change, architecture, lore)
│   ├── DISCUSSION_TEMPLATE/      # Discussion forms (announcements, ideas, Q&A)
│   └── workflows/                # Automated CI/CD workflows
│       ├── build.yml             # Cross-platform Desktop C++17 CMake builds (Linux, macOS, Windows)
│       ├── ci.yml                # C++17 Causality.h check + Web lint, unit tests, and build
│       ├── cd.yml                # Tagged release WebGL artifact packaging
│       ├── docs_deploy.yml       # Markdown & shadowrealm.html validation workflow
│       ├── lint_and_format.yml   # TypeScript lint, UTF-8 CMake check, strict C++17 header check
│       ├── nightly_build.yml     # Scheduled full Linux desktop + web verification
│       ├── release_drafter.yml   # Automated draft release notes
│       ├── security_audit.yml    # npm audit & private-key pattern hygiene check
│       └── stale_issues.yml      # Automated stale issue & PR lifecycle hygiene
└── *.md                          # Governance, architecture, SRE, QA, security, cultivation lore & legal specs
```

---

## Tech Stack & Agent Coding Constraints

### Exact Installed Web Dependencies (`package.json`)

| Package | Installed Version | Role |
|---|---|---|
| `react` / `react-dom` | `19.3.1` | UI component tree and HUD state |
| `three` / `@types/three` | `0.187.0` | Real-time 3D WebGL scene, lighting, and meshes |
| `lucide-react` | `1.80.0` | Crisp vector HUD and modal iconography |
| `tailwindcss` / `@tailwindcss/vite` | `4.3.5` | Utility-first styling via Vite plugin |
| `vite` / `@vitejs/plugin-react` | `8.3.8` / `6.3.0` | Dev server (port `3000`) and production bundler |
| `typescript` | `7.0.2` | Static type checking (`tsc --noEmit`) |
| `tsx` | `4.23.15` | TypeScript execution for `node:test` unit suite |
| `@types/react` / `@types/react-dom` | `19.3.3` / `19.3.0` | React 19 type definitions |

### Native C++17 & CI Pinned Libraries (`CMakeLists.txt` & `.github/workflows/build.yml`)

| Library | Version | Target |
|---|---|---|
| `GLAD` | `v2.0.8` | OpenGL 3.3 Core loader (fetched via CMake `FetchContent`) |
| `GLM` | `1.0.1` | Vector/matrix math (Desktop & Android GLES) |
| `Dear ImGui` | `v1.91.1` | Immediate-mode Desktop HUD & Grimoire tabs |
| `GLFW` | `3.4` (Windows CI) / `>= 3.3` | Desktop windowing & input |

### Engineering & AI Agent Rules

1. **Strict TypeScript:** `tsconfig.json` enforces `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, and `"noFallthroughCasesInSwitch": true`. Keep `src/vite-env.d.ts` intact for side-effect CSS imports under TypeScript 7.
2. **Pure Logic Separation:** Keep deterministic gameplay formulas in `src/game/rules.ts` and `src/game/causality.ts` (mirrored in `Causality.h` and `main_desktop.cpp`) so all simulation rules remain unit-testable via `npm test`.
3. **Styling Discipline:** Use Tailwind CSS v4 utility classes imported via `@import "tailwindcss";` in `src/index.css`. Do not introduce ad-hoc external CSS files.
4. **C++17 Strictness:** All native headers and sources must remain UTF-8 (no BOM), avoid taking addresses of rvalue temporaries, clamp `dt <= 0.1f`, and pass `g++ -std=c++17 -Wall -Wextra -Werror` on `Causality.h`.
5. **Do Not Manually Edit Generated Paths:** Never hand-edit `dist/` or `node_modules/`. Never commit real `.env` files or credentials.
6. **Port & Offline Guarantees:** Keep Vite bound to `0.0.0.0:3000` (`vite.config.ts`). All editions must remain fully playable offline without dialing placeholder servers.

---

## Zero-Friction Setup & CLI Commands

### WebGL Edition (Node.js `v22+`)

```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev

# Type-check with TypeScript 7 (zero-error gate)
npm run lint

# Run pure-logic unit test suite (7 tests covering combat, AI, NFTs, shop, domain, causality)
npm test

# Build optimized production bundle to dist/
npm run build

# Preview production build on http://localhost:3000
npm run preview
```

### Native C++17 Verification & Desktop Build

```bash
# Strict-warning syntax verification for Causality.h (no GPU libraries required)
printf '#include "Causality.h"\n' | g++ -std=c++17 -Wall -Wextra -Werror -x c++ -fsyntax-only -I. -

# Fetch pinned GLM & Dear ImGui into repository root (requires GLFW 3.3+, CMake 3.18+, Python 3 + jinja2)
git clone --depth 1 --branch 1.0.1 https://github.com/g-truc/glm.git glm
git clone --depth 1 --branch v1.91.1 https://github.com/ocornut/imgui.git imgui

# Configure, build, and run Desktop OpenGL 3.3 Core binary
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
./build/shadowrealm
```

### Android NDK Build (OpenGL ES 3.2 Default / Optional Vulkan 1.3)

```bash
# OpenGL ES 3.2 target (main_android.cpp)
cmake -S . -B build-android \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-24
cmake --build build-android --parallel

# Experimental Vulkan 1.3 HDR10+ target (main_android_vulkan.cpp)
cmake -S . -B build-android-vk \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-24 \
  -DSHADOWREALM_ENABLE_VULKAN=ON
cmake --build build-android-vk --parallel
```

---

## Environment Variables

Defined in `.env.example` and referenced directly in `vite.config.ts`. No API keys or secrets are required to build or play.

| Variable | Required | Description | Example / Dummy Format |
|---|---|---|---|
| `DISABLE_HMR` | No | Disables Vite Hot Module Replacement when set to `"true"` (useful for embedded/static preview frames). Defaults to HMR enabled (`false`). | `DISABLE_HMR=false` |

---

## Gameplay Reference

- **4 Playable Classes:** Knight (`Aegis Cleave` / Stun), Mage (`Frostfire Nova` / Freeze+Burn), Rogue (`Venom Flurry` / Poison), Shaman (`Cinder Totem` / Burn).
- **Controls:** `WASD` Move · `Shift` Sprint · `Space` Jump · `Z` Basic Attack · `X` Class Power · `C` Heal · `G` Infinite Devouring Domain · `N` Teraton Bomb · `F` Fly Mode · `R` Revive · `Tab` / `F1` Grimoire Menu · `Esc` Pause · `RMB Drag` Orbit Camera · `Scroll` Zoom.
- **Core Systems:** See `COMBAT_FORMULAS.md`, `STATE_MACHINE.md`, `EVENT_CATALOG.md`, `REALMS_AND_TIERS.md`, and `WORLD_GEOGRAPHY.md` for complete specifications.

---

## License

MIT License — see `LICENSE` and `THIRD_PARTY_NOTICES.md`.
