# Arianus-Sky Encounter Spec

**For:** Bane (RobloxDev), Vasu (Dev-Unity)  
**Status:** Encounter placement + wave design

---

## Zone 1: Descent Encounters

### Encounter 1-1: Thermal Discovery
- **Type:** Discovery (not combat)
- **Location:** ~40m from entry
- **Objects:** Thermal core (ambient, glowing)
- **Mechanic:** Player finds thermal signature → wind currents guide to combat

### Encounter 1-2: First Contact
- **Type:** Combat
- **Entities:** 4
- **Spawn:** 2 patrolling, 2 stationary guards
- **Wave:** Single wave
- **Souls awarded:** 10-15
- **Lore reward:** Wind Direction (after combat)

### Zone Gate 1
- **Trigger:** 30 souls collected
- **Transition:** Bridge with 0 entities (VR breathing)

---

## Zone 2: Up Draft Encounters

### Encounter 2-1: Thermal Updraft
- **Type:** Discovery (required for progression)
- **Location:** Start of vertical climb
- **Mechanic:** Must ride thermal updraft to reach higher platforms
- **Failure:** Cannot progress without it (gated)

### Encounter 2-2: Mid-Air Skirmish
- **Type:** Combat
- **Entities:** 5
- **Spawn:** 3 interceptors, 2 ground-pounders
- **Wave:** Single wave
- **Platform:** Mid-height combat platform
- **Souls awarded:** 15-20
- **Lore reward:** Thermal Sensing (after combat)

### Zone Gate 2
- **Trigger:** 50 souls collected
- **Altitude:** 140m
- **Transition:** Bridge to Zone 3

---

## Zone 3: The Eye Encounters

### Encounter 3-1: The Approach
- **Type:** Environmental narrative
- **Location:** Collapsing edge
- **Mechanic:** Visual storytelling — falling continent, sky breaking
- **No combat:** Dread atmosphere builder

### Encounter 3-2: Boss — THE EYE
- **Type:** Boss encounter
- **Entities:** 6-8 (minions) + 1 boss
- **Boss behavior:** 
  - Phase 1: Ranged attacks, 2 minions
  - Phase 2: Area denial, 3 minions
  - Phase 3: Enraged, 3 minions
- **Souls awarded:** 30-50
- **Win condition:** Boss defeat → Key Fragment revealed

### Post-Boss
- **Key Fragment:** Collectible spawns after boss death
- **Lore:** Sundering's Cost (automatic unlock)
- **Exit Portal:** Revealed after fragment collected
- **Victory:** Portal trigger → return to Nexus

---

## Wave Scaling

| Zone | Base Waves | +Difficulty Waves |
|------|-----------|-------------------|
| 1 | 1 | 1-2 |
| 2 | 2 | 2-3 |
| 3 | 3-4 | 4 (boss) |

---

## Entity Types (Reference)

| Type | Zone | Behavior |
|------|------|----------|
| Interceptor | 2 | Air unit, fast |
| Ground-pounder | 2 | Heavy, slow |
| Minion (generic) | 1, 3 | Standard enemy |
| THE EYE | 3 | Boss |

---

## Soul Thresholds

| Gate | Required | Narrative |
|------|----------|-----------|
| 1→2 | 30 | "You feel the wind change" |
| 2→3 | 50 | "The sky is falling" |
| Exit | 100 + Key Fragment | "You found the way out" |

---

## Dev Notes

### Bane
- Encounter spawn points (X, Y, Z)
- Patrol paths (waypoints)
- Wave trigger zones

### Vasu
- Soul counter logic
- Boss state machine (phases)
- Zone gate triggers
- Victory condition handler

---

## Priority

1. Zone 1 geometry + Encounter 1-2 (first combat)
2. Zone 2 vertical climb + Encounter 2-2
3. Zone 3 boss arena + encounter 3-2
