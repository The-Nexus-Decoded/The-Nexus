# Soul Drifter - Class & Realm System Spatial UI Design

**Status:** Historical draft; requires current Lord Xar activation and Paithan review before implementation  
**Original Date:** 2026-03-10  
**Owner:** Samah (XR architecture) + Paithan (mobile/UI/UX execution)

## Overview

This historical draft maps class, rarity, offensive skill, and realm-selection mechanics to spatial UI elements for XR and mobile fallback.

Samah owns the spatial architecture and interaction contract. Paithan owns mobile and UI/UX execution. Do not route work to Orla; that role has been absorbed by Paithan.

## Class Selection UI

### XR Layout

- Radial carousel: class cards arranged around the user with depth, readable scale, and reachable selection targets.
- Rarity glow: each card has a particle aura matching tier.
- Selection distance, gaze dwell, hand reach, and controller affordance must be specified before implementation.

### Rarity Tiers

| Tier | Visual Direction | Probability Memory |
|---|---|---|
| Common | stone gray, dim dust | 30% |
| Uncommon | green tint, gentle spark | 12.5% |
| Rare | blue shimmer, orbiting energy | 5% |
| Legendary | gold radiant bloom | 2.5% |

### Gestures

| Gesture | Action |
|---|---|
| Gaze hover | Highlight class and show details |
| Double-tap / pinch | Select class |
| Swipe left/right | Scroll through tiers |

### Mobile Adaptation

- Vertical scroll list for thumb reach.
- Bottom sheet for class details.
- Haptic pulse on selection.
- Paithan owns the mobile UI implementation.

## Realm And Secondary Skills

Each realm is an immersive environment the user enters:

| Realm | Element | Description |
|---|---|---|
| Pryan | Fire | Volcanic forge world, molten rivers |
| Arianus | Air | Sky islands, floating continents |
| Chelestra | Water | Ocean realm, underwater cities |
| Abarrach | Death | Death realm, undead lands |
| The Nexus | Gateway | Hub between realms |
| The Labyrinth | Endgame | Procedural maze / endgame dungeon |

## Skill Acquisition Flow

1. User enters realm gate.
2. Three floating orbs appear with drop weights.
3. User points or gazes to select an orb.
4. Orb opens with particle burst and reveals the skill.
5. Skill is added to the HUD/hotbar contract.

## Offensive Skills

| Class | Skill | XR Trigger | Mobile Trigger |
|---|---|---|---|
| Warrior | Berserker | Punch gesture | Tap |
| Mage | Meteor Swarm | Point + hold | Long press |
| Priest | Holy Arrow | Bow gesture | Swipe up |
| Sharpshooter | Multishot | Two-finger spread | Double tap |
| Summoner | Summon Minion | Open palm | Button |
| Paladin | Thor's Hammer | Hammer fist | Tap |
| Asura | Mindburn | Gaze + hold | Hold |
| Slayer | Backstab | Crouch/stealth gesture | Swipe |

## Implementation Notes

- XR hotbar target: floating radial menu around 1.5m from body at waist height unless testing proves otherwise.
- Mobile hotbar target: bottom action bar with reachable touch zones.
- Feedback layers: visual bloom, haptic pattern, and Balthazar-owned audio cue.
- Backend persistence routes to Haplo.
- Deployment automation routes to Alfred.

## Current Next Steps

- [ ] Lord Xar: reactivate or defer Soul Drifter.
- [ ] Samah: restate platform, posture, input, locomotion, comfort, and performance contract.
- [ ] Paithan: review mobile class selection and realm picker if activated.
- [ ] Balthazar: review audio/technical-art hooks if activated.
- [ ] Haplo: review backend persistence if activated.
- [ ] Zifnab: open or update tickets if activated.
