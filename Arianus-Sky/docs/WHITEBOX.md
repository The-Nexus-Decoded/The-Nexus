# Arianus-Sky White-Box Layout

**Status:** White-box in progress  
**For:** Bane (RobloxDev), Vasu (Dev-Unity)  
**Priority:** High — Devs need geometry to start

---

## Zone 1: Descent

### Spatial Layout
```
┌─────────────────────────────────────────┐
│           ENTRY POINT                   │
│      (Player spawn, 0m)                 │
│                                          │
│    [Discovery: Thermal Core]            │
│         ↓ (guide player)               │
│                                          │
│    [Combat Encounter 1]                 │
│         4 entities                      │
│                                          │
│    [Lore Reward: Wind Direction]        │
│                                          │
│         ↓ (bridge, 0 entities)          │
│                                          │
│    [ZONE GATE: 30 souls]                │
└─────────────────────────────────────────┘
```

### Dimensions
- Entry → Discovery: ~40m horizontal
- Discovery → Combat: ~30m
- Combat → Lore: ~20m
- Lore → Gate: ~30m
- Total Zone 1: ~120m linear

### Key Objects
- Thermal Core (discovery point) — glowing, wind currents
- Wind Direction artifact (lore reward)
- Zone gate trigger (30 soul threshold)

---

## Zone 2: Up Draft

### Spatial Layout
```
┌─────────────────────────────────────────┐
│    [ZONE GATE: 30 souls → 50]          │
│                                          │
│    [Vertical Climb Start]               │
│     ↗ ↗ ↗ (thermal updraft path)       │
│                                          │
│    [Discovery: Thermal Updraft]         │
│     (required for climb)                │
│                                          │
│    [Combat Encounter 2]                │
│     5 entities, mid-height              │
│                                          │
│    [Lore Reward: Thermal Sensing]       │
│                                          │
│         ↓ (bridge, 0 entities)          │
│                                          │
│    [ZONE GATE: 50 souls]                │
│     (140m altitude)                     │
└─────────────────────────────────────────┘
```

### Dimensions
- Vertical climb: 60m → 140m (80m height)
- Mid-level encounter platforms
- Bridge to Zone 3: ~20m

### Key Objects
- Thermal updraft columns (required mechanic)
- Platform structures (vertical combat)
- Thermal Sensing artifact

---

## Zone 3: The Eye

### Spatial Layout
```
┌─────────────────────────────────────────┐
│    [ZONE GATE: 50 souls → 100]          │
│     (140m altitude)                     │
│                                          │
│    [Approach: Collapsing Edge]          │
│     (visual: falling continent)         │
│                                          │
│    [Boss Arena: THE EYE]                │
│     6-8 entities + Boss                 │
│     (160m altitude)                     │
│                                          │
│    [Key Fragment Discovery]             │
│     (post-boss)                          │
│                                          │
│    [Lore: Sundering's Cost]             │
│                                          │
│    [EXIT PORTAL]                        │
│     (revealed after fragment)           │
└─────────────────────────────────────────┘
```

### Dimensions
- Approach: ~50m
- Boss arena: ~40m diameter
- Post-boss → Exit: ~30m

### Key Objects
- The Eye (boss)
- Key Fragment (collectible)
- Exit Portal (lore-gated)
- Collapse frontier (skyline)

---

## Vertical Slice Flow

```
Nexus → [Zone 1] → [Zone 2] → [Zone 3] → [Exit] → Nexus
 30 souls   30→50     50→100    Victory
```

---

## Dev Handoff Notes

### For Bane (RobloxDev)
- Zone geometry needed first
- Start with Zone 1 linear path
- Then Zone 2 vertical climb
- Then Zone 3 boss arena

### For Vasu (Dev-Unity)
- Thermal discovery mechanic
- Soul counter system
- Zone gate triggers
- Boss state machine
- Exit portal logic

### VR Constraints
- 30 draw calls max
- 8 entities per encounter max
- Bridges = 0 entities (breathing room)
- Pose sync <100ms

---

## Next: Encounter Placement Details

Coming: Entity spawn points, wave timing, patrol paths.
