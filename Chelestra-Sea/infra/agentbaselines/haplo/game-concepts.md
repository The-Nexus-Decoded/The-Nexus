# Death Gate Cycle - Game Concepts

## Sprint 1 Selected: Soul Drifter ✅

**Prototype Selection:** Option A - Soul Drifter  
**Rationale:** Flight physics serve as perfect spatial training ground. All four realms integrated into single gameplay loop. Lower technical debt than mobile-specific implementations. Better foundation for future Death Gate Cycle expansion.

---

## Option A: Soul Drifter (SELECTED)

| Criterion | Assessment |
| --------- | ---------- |
| Core Mechanics | Flight between 4 realms = Death Gate native topology |
| Technical Risk | Mature flight physics = Low risk, high control |
| Spatial Design | Volumetric travel = Perfect for XR |
| Narrative Integration | Direct Death Gate mapping = Maximum cohesion |

### Gameplay Loop
- Player controls a soul fragment traveling between the 4 Death Gate realms
- Elemental particle trails reflect current realm (Fire/Water/Earth/Void)
- Match-3 gating controls realm transitions
- Progressive difficulty through speed and obstacle density

### Technical Specs
- **Platform:** Mobile-first (iOS/Android), WebXR fallback
- **Engine:** Unity (primary), Three.js (web fallback)
- **Touch Controls:** Tilt + Swipe for flight direction
- **VR Support:** 6DOF hand tracking via WebXR

---

## Option B: Gravity Well Puzzle (Deferred)

| Criterion | Assessment |
| --------- | ---------- |
| Core Mechanics | Gesture gravity = Requires mobile-first design |
| Technical Risk | Mobile-specific optimization = Higher risk |
| Spatial Design | Limited XR potential = Fits WebXR only |
| Narrative Integration | Death Gate adaptation needed = Extra work |

### Status
- Deferred to Sprint 2 or later
- Revisit after Soul Drifter MVP validates mobile architecture

---

## Realm Visual System

| Realm | Color | Particle Behavior | Special Effect |
| ----- | ----- | ----------------- | --------------- |
| Arianus | Red (#FF3333) | Rising vectors | Thermal shimmer |
| Pryan | Blue (#3333FF) | Flowing spirals | Droplets |
| Chelestra | Green (#33FF33) | Grounded | Slow drift |
| Abarrach | Void (#000000) | Static | Subtle glow + flicker |

---

## Sprint Timeline

- **Sprint 1 Start:** 14:00 UTC
- **MVP Prototype:** 7 days
- **Playtest:** End of Sprint 1
- **Metrics:** Performance + user feedback before full build
