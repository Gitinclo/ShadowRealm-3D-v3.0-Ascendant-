# Protocol Specification

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** Architecture & Engineering Specifications | **Last Updated:** 2026-11-25

Wire format for optional multiplayer session packets (`main_android_vulkan.cpp`).

## Packet Structure (`NetPacket`)

- `type` (`uint16_t`): `PLAYER_MOVE`, `PLAYER_ATTACK`, `CHAT`, `SPAWN`, `DESPAWN`.
- `entity` (`uint32_t`): Authoritative entity identifier.
- `position` (`Vec3` float32×3): World-space coordinates.
- `payload` (`char[128]`): UTF-8 bounded metadata payload.
