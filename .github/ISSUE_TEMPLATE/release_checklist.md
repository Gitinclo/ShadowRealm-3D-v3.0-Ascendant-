---
name: Release Checklist
about: Track end-to-end validation before cutting a tagged release
title: "[RELEASE] v"
labels: ["release"]
assignees: []
---

## Pre-Release Verification
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm test` passes (all unit tests green)
- [ ] `npm run build` succeeds cleanly
- [ ] `Causality.h` passes strict `g++ -std=c++17 -Wall -Wextra -Werror` check
- [ ] `.github/workflows/build.yml` passes on Linux, macOS, and Windows
- [ ] `CHANGELOG.md`, `RELEASE_NOTES.md`, and `README.md` updated
- [ ] Tag pushed and artifacts verified per `deployment validation.md`
