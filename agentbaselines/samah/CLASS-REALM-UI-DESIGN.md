# Soul Drifter - Class & Realm System: Spatial UI Design

**Status:** Draft for Orla Review  
**Date:** 2026-03-10  
**Owner:** Samah (XR Architecture) + Orla (UI/UX)

---

## 1. Overview

This document maps Sterol's class/rarity/offensive skill system to spatial UI elements for both XR (Quest/WebXR) and mobile (companion overlay).

---

## 2. Class Selection UI

### 2.1 Visual Layout (XR)

```
        [WARRIOR]----[MAGE]
           ↑            ↑
    ═══════════════════════
         CLASS SELECTION
    ═══════════════════════
           ↓            ↓
      [PRIEST]----[SHARPSHOOTER]
```

- **Radial carousel** — 8 class cards arranged in 2 rows of 4
- **Rarity glow** — Each card has particle aura matching tier:
  - Common (30%): Stone gray, dim
  - Uncommon (12.5%): Green tint
  - Rare (5%): Blue shimmer
  - Legendary (2.5%): Gold radiant + lens flare

### 2.2 Gestures

| Gesture | Action |
|---------|--------|
| Gaze hover (2s) | Highlight class, show tooltip |
| Double-tap / pinch | Select class |
| Swipe left/right | Scroll through tiers |

### 2.3 Mobile Adaptation

- Vertical scroll list (easier for thumb reach)
- Bottom sheet for class details
- Haptic pulse on selection

---

## 3. Rarity Display System

### 3.1 Particle Effects by Tier

| Tier | Particles | Color | Animation |
|------|-----------|-------|-----------|
| Common | Dust motes | #888888 | Slow float |
| Uncommon | Sparkles | #22CC44 | Gentle pulse |
| Rare | Energy orbs | #4488FF | Orbit |
| Legendary | Radiant beams | #FFDD00 | Lens flare + bloom |

### 3.2 Probability Visualization

- **Progress bar** showing "chance" — e.g., Warrior 30%
- **Dice roll animation** on selection — 3D dice tumble, land on result

---

## 4. Realm & Secondary Skills

### 4.1 Realm Gates (XR)

Each realm = immersive 3D environment user "enters":

| Realm | Element | Description |
|-------|---------|-------------|
| **PRYAN** | Fire | Volcanic forge world, molten rivers |
| **ARIANUS** | Air | Sky islands, floating continents |
| **CHELESTRA** | Water | Ocean realm, underwater cities |
| **ABARRACH** | Death | The death realm, undead lands |
| **THE NEXUS** | — | Gateway between all realms, hub city |
| **THE LABYRINTH** | — | Endgame dungeon, procedural maze |

> **Note:** These are the canonical Death Gate Cycle realms created by the Sundering. Secondary professions and drop tables should be designed around these elemental themes.

### 4.2 Skill Acquisition Flow

1. User enters realm gate (gesture: reach forward)
2. 3 floating orbs appear (80%/15%/5% drop)
3. User points/gazes to select orb
4. Orb opens with particle burst → skill revealed
5. Skill added to HUD hotbar

### 4.3 Mobile Version

- Realm selection as vertical list with preview thumbnails
- Tap to enter → modal shows skill orbs
- Tap orb to reveal skill

---

## 5. Offensive Skills (Combat HUD)

### 5.1 Skill Hotbar

- **XR:** Floating radial menu, 1.5m from body, waist height
- **Mobile:** Bottom action bar (4 slots)

### 5.2 Skill Activation

| Class | Skill | XR Trigger | Mobile Trigger |
|-------|-------|------------|----------------|
| Warrior | Berserker | Punch gesture | Tap |
| Mage | Meteor Swarm | Point + hold | Long press |
| Priest | Holy Arrow | Bow gesture | Swipe up |
| Sharpshooter | Multishot | Two-finger spread | Double tap |
| Summoner | Summon Minion | Open palm | Button |
| Paladin | Thor's Hammer | Hammer fist | Tap |
| Asura | Mindburn | Mind gesture (gaze + hold) | Hold |
| Slayer | Backstab | Stealth gesture (crouch) | Swipe |

### 5.3 Feedback

- **Visual:** Screen flash, skill icon bloom
- **Haptic:** Pattern per skill type
- **Audio:** Distinct sound per skill

---

## 6. Dark/Light Magic Schools

### 6.1 Visual Coding

| School | Atmosphere | UI Color | Particle Style |
|--------|------------|----------|----------------|
| Dark Magic | Crimson fog, embers | #990000 | Dark flames |
| Light Magic | Golden rays, soft glow | #FFDD44 | Holy light |

### 6.2 Skill Progression

```
DARK MAGIC:
Demonic Blast (tier 1) → Demonic Wave (tier 2) → Demonic Nova (tier 3)

LIGHT MAGIC:
Radiant Blessing (tier 1) → Divine Blessing (tier 2) → Celestial Blessing (tier 3)
```

- **XR:** Upgrade orb floats to user, absorbed with grab gesture
- **Mobile:** Vertical upgrade path, tap to unlock

---

## 7. Technical Notes

### 7.1 Cross-Platform Data

```typescript
interface PlayerCharacter {
  id: string;
  class: 'warrior' | 'mage' | 'priest' | ...;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  realm: string;
  skills: {
    offensive: string[];
    secondary: string[];
  };
  createdAt: number;
}
```

### 7.2 State Sync

- Mobile ↔ XR via WebSocket or local broadcast
- Character data persists to server (future: The-Nexus backend)

---

## 8. Next Steps

- [ ] **Orla:** Design mockups for mobile class selection + realm picker
- [ ] **Samah:** Build XR prototype (Unity/Three.js)
- [ ] **Haplo:** API endpoint for character persistence
- [ ] **Sterol:** Confirm skill trigger mappings

---

## 9. Mentioned Parties

- @Orla — UI/UX lead for mobile + spatial design review
- @Haplo — Backend integration
- @Sterol — Game mechanics final approval
