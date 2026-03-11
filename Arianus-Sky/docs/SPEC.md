# Soul Drifter - Arianus-Sky Vertical Slice Spec

**Status:** White-box in progress  
**Realm:** Arianus-Sky (Air/Wind)  
**Focus:** Vertical slice for core loop validation

---

## Core Loop (v2 Approved)

Discovery → Combat → Escape → Advance

- Discovery BEFORE Combat Encounter
- Lore as survival tool — discovery enables combat success

---

## Zone Structure

| Zone | Souls | Entities | Density | Key Mechanic | Lore Beat |
|------|-------|----------|---------|--------------|-----------|
| Zone 1: Descent | 30 | 4 | Low | Thermal discovery | Wind Direction |
| Zone 2: Up Draft | 50 | 5 | Medium | Vertical climb (required) | Thermal Sensing |
| Zone 3: The Eye | 100 | 6-8 | High | Boss + Key Fragment | Sundering's Cost |

---

## Z-Depth Anchors

| Zone | Range | Density | UX Inputs |
|------|-------|---------|-----------|
| 1 | 0-60m | Low (4) | Wayfinding markers |
| 2 | 60-140m | Medium (5) | Haptic intervals |
| 3 | 140-180m | High (6-8) | Group UI thresholds |

---

## Entropy Model

- Timer runs from entry
- Discovery = time extension (mandatory, not bonus)
- Collapse frontier visible in sky
- Wayfinding: find the edge, not the enemy

---

## Design Pillars

- **Realm antagonist:** Entropy-driven dying realm IS the antagonist
- **Discovery = escape route**, not optional bonus
- **Dual threat:** Combat waves + Realm collapse
- **Souls = lore + power** merged
- **VR breathing room:** 0 entities on bridges (Zone 1→2, Zone 2→3)

---

## Emotional Throughline (Divine Restoration)

| Minute | Beat | Emotion |
|--------|------|---------|
| 5 | wonder → dread | Discovery shock |
| 20 | competence → purpose | Mastery + meaning |
| Beyond | momentum → hope | Rebuilding momentum |

---

## Realm Death Identity

- **Element:** Air/Wind
- **Death:** Wind-scattered, forgotten
- **Fragment:** Breath

---

## VR Constraints

| Constraint | Bound | Narrative Implication |
|-----------|-------|----------------------|
| Draw calls | 30 max | Optimized encounters |
| Entities/encounter | 5-8 | Wave design ceiling |
| Players/encounter | 8 | Faction dialogue scales |
| Hub population | 20 | Ambient narrative cap |
| Pose sync | <100ms | Multiplayer timing |

---

## Lore Tiers

| Zone | Lore Fragment | Theme | Question Answered |
|------|---------------|-------|-------------------|
| Zone 1 | Wind Direction | Why flight matters | "What is this place?" |
| Zone 2 | Thermal Sensing | How to survive | "Why did it die?" |
| Zone 3 | Sundering's Cost | What was lost | Full truth |

**Narrative arc:** Why → How → What was lost

---

## Narrative Timeline

| Timeline | Question | Lore Layer |
|----------|----------|-----------|
| Minute 5 | "What is this place?" | Realm intro |
| Minute 30 | "Why did it die?" | Sundering hints |
| Phase 2 | "Who built the Labyrinth?" | Sartan/Patryn truth |

---

## Zone Flow (v2 Discovery-First)

```
Entry → Discovery (Thermal) → Combat Encounter → Lore Reward → Zone Gate → [Next Zone]
                                    ↓
                              Boss (Zone 3)
                                    ↓
                         Key Fragment → Exit Portal
```

- **Discovery before Combat** — player learns mechanics before testing
- **"I learned to fight"** — replay incentive
- **Lore gates** — Wind Dir → Thermal → Sundering's Cost

---

## Realm Topology

- **Ring connectivity:** Adjacent realms accessible
- **Nexus hub:** Non-adjacent travel
- **Labyrinth:** Phase 2 expansion (Patryn domain)

**Current build:** Arianus-Sky vertical slice only

---

## Emotional Arc

| Zone | Narrative Beat | Emotion | Spatial Focus |
|------|---------------|---------|---------------|
| Zone 1 | Origin / Wonder | Thermal discovery, open sky | Entry → Discovery |
| Zone 2 | Dread | Entropy pressure, vertical climb | Transition → Climb |
| Zone 3 | Revelation | Sundering's Cost, Key Fragment | Boss → Gate |
| Gate | Hope | Exit portal revelation | Escape |

---

## Team

| Role | Name |
|------|------|
| Lead | Lord Xar (Sterol) |
| Design | Edmund |
| VR/Spatial | Haplo |
| Narrative | Iridal |
| Tech | Vasu |
| UX | Orla |

---

## Tickets

- #226: Failure States — Iridal needs to calibrate lore consequence
- #227: Realm Flow Diagrams — Cross-realm alignment
- #228: Player Count & Retention — Narrative scope scaling
