# Zone 1: Arianus-Sky — Technical Specification
**Soul Drifters VR — Zone 1 Descent**

---

## Spawn Coordinates

### Demo Config (70m, flat)
| Location | Coordinates |
|----------|-------------|
| Entry | (0, 0, -10) |
| Thermal Discovery | (0, 0, -30) |
| Combat Encounter | (0, 0, -50) |
| Zone Gate | (0, 0, -70) |

### Full Config (120m, Y-variation)
| Location | Coordinates | Y-Anchor | Trigger Radius |
|----------|-------------|----------|----------------|
| Entry | (0, 0, 0) | — | — |
| Thermal Discovery | (0, 15, -40) | 10-20 | sphere r=15m |
| Combat Encounter | (0, 5, -70) | 5 | box 20x10x20 |
| Lore Reward | (0, 8, -90) | — | sphere r=8m |
| Zone Gate | (0, 10, -120) | — | sphere r=12m |

**Active:** Full Config (120m) — Demo uses this

**Total Zone Depth:** 120m
**Width:** 30m
**Height:** 60m

---

## Patrol Waypoints (Windshear Stalker)

**Primary Patrol Path:**
```
(0, 8, -65) -> (-5, 8, -75) -> (5, 8, -75) -> back
```

**Altitude Band:** 5m - 12m
**Attack Hover:** (0, 6, -70)

---

## Floating Islands

| Platform | Coordinates | Size | Y-Span |
|----------|-------------|------|--------|
| Entry | (0, 0, 0) | 30x30m | ground |
| Thermal | (0, 15, -40) | 20x20m | 10-20 |
| Combat | (0, 5, -70) | 25x25m | — |
| Lore | (0, 8, -90) | 15x15m | — |
| Gate | (0, 10, -120) | 20x20m | — |

### Thermal Vents
- **Main:** (0, 15, -40) — continuous updraft
- **Secondary:** (-5, 12, -38), (5, 12, -42) — periodic bursts

### Enemy Altitudes (Windshear Stalker)
- **Patrol:** y=8 (cruising)
- **Attack:** y=4 (dive)
- **Recovery:** y=10 (reposition)

---

## Vertical Anchor Points (Particles)

| Effect | Y-Range | Notes |
|--------|---------|-------|
| Thermal Updrafts | 10 -> 25 | Rising from thermal core |
| Wind Streaks | 5 -> 15 | Player movement speed |
| Naga Corruption | 0 -> 8 | Ground-hugging glow |

---

## Entity Configuration

- **Windshear Stalkers:** 4 (patrol behavior)
- **Soul Threshold (Zone Gate):** 30
- **Entropy Timer:** 60s per zone collapse

---

## Material Palette (URP)

| Element | Albedo | Emission | Intensity |
|---------|--------|----------|-----------|
| Thermal Core | (1, 0.2, 0.2) | (1, 0.4, 0) | 2.0 |
| Sky Islands | (0.88, 0.94, 1.0) | — | — |
| Naga Corruption | (0, 0, 0) | (0.22, 1, 0.08) | 0.5 |
| Zone Gate | (1, 0.89, 0.71) | (1, 1, 1) | 0.8 |
| Soul Collect | (1, 0.84, 0) | (1, 0.84, 0) | 1.5 |

---

## Particle Systems

| Effect | Max Particles | Speed | Color |
|--------|---------------|-------|-------|
| Thermal Updraft | 30 | 2 m/s up | #FF6600 -> #FFAA00 |
| Wind Streak | 50 | 5 m/s | #FFFFFF |
| Corruption Glow | 20 | static | #39FF14 (pulse 0.5s) |

---

## UI Anchors (Roblox)

- SoulCounter (top-right)
- ZoneIndicator (top-left) — "Zone 1: Descent"
- EntropyTimer (top-center) — 60s collapse
- DiscoveryPrompt (center) — "Thermal Core Discovered"
- FragmentCollection (center-bottom) — "Wind Direction Acquired"
- ZoneGateLocked/Unlocked (center) — 30 soul threshold

**UI Colors:**
- Primary: #FF3333
- Background: #1a1a2e
- Accent: #FFD700

---

## Budget

- **Draw Calls:** 30 max
- **Particles:** 200 max (mobile-high)
- **Entity Limit:** 4 Stalkers + 1 Gate + 1 Lore

---

## Narrative Beats

| Location | Coordinates | Narrative Beat | Lore Object |
|----------|-------------|---------------|-------------|
| Entry | (0, 0, 0) | First breath into Arianus | Wind-carved stones — Aerian shrine fragments |
| Thermal Discovery | (0, 10, -40) | "breath pockets" — thermal vents | Dead skypeople's last exhale (lore fragment) |
| Combat | (0, 5, -70) | Survival narrative | Crumbling observation platform — skywatcher journal |
| Lore Reward | (0, 8, -90) | Victory + depth | Wind Direction Artifact — why the sky is dying |
| Zone Gate | (0, 10, -120) | Transition curiosity | Gate whispers — what's beyond? |

---

*Last Updated: 2026-03-11*
