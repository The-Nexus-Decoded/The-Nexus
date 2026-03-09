# Soul Drifter — Death Gate Cycle VR Game (MVP)

**Issue:** #196
**Status:** Phase 1 — Spatial Foundation
**Lead:** Samah (spatial architecture)

## Overview

WebXR-first VR game. Flight across four Death Gate Cycle realms (Arianus/Pryan/Chelestra/Abarrach), collecting soul anchors while experiencing unique physics per realm.

## Team

| Agent | Role | Realm |
|---|---|---|
| Samah | Spatial architecture, VR core | Arianus-Sky (this project) |
| Orla | Visual language, UI/UX per realm | Arianus-Sky/projects/design/ |
| Paithan | Mobile WebXR fallback layer | Arianus-Sky/projects/mobile/ |
| Haplo | Backend infrastructure | Pryan-Fire/ |

## Scope (MVP)

### Phase 1: Spatial Foundation
- WebXR runtime with Three.js
- Basic hand tracking (pinch, grab, release)
- Spatial scene framework
- 4-realm traversal system
- Physics per realm (fire fluid, ice solid, wind drag, void anti-gravity)
- Realm transition visualization
- Mobile fallback (touch controls)
- Target: 90fps VR / 60fps WebXR

### Phase 2: Gameplay Mechanics
- Pinch-teleport raycast (VR) / tap-nav (mobile)
- Tap-collect soul anchors
- Wave-pause gesture

### Phase 3: Accessibility Layer
- Voice navigation
- Button remapping
- Color contrast compliance

### Phase 4: Narrative Integration
- Soul anchors = lore nodes (Patryn history)
- Realm transitions (Sundering consequences)
- Optional story path

## Tech Stack

| Platform | Engine | Target FPS |
|---|---|---|
| WebXR | Three.js/Babylon | 60fps |
| VR Mid (Quest) | Unity 2024 LTS | 90fps |
| VR Premium | Unity/Unreal | 120fps |

## Hand Gesture Mapping

| Gesture | Action |
|---------|--------|
| Pinch | SELECT (confirm) |
| Long press | GRAB (hold) |
| Release | RELEASE (drop) |
| Twist right | ROTATE (clockwise) |
| Twist left | ROTATE (counter-clockwise) |

## File Structure
```
soul-drifter/
├── src/
│   ├── index.html        # Entry point
│   ├── app.js            # Main app logic
│   ├── spatial/          # XR-specific code
│   │   ├── scene.js      # Three.js scene setup
│   │   ├── hands.js      # Hand tracking
│   │   └── realm.js      # Realm visualization
│   └── styles/
│       └── main.css
├── public/
│   └── assets/           # 3D models, textures
└── SPEC.md
```

## Platform Targets

- iPhone 8+ (64-bit)
- Android 64-bit with VR/AR support
- Windows XR
- Meta Quest

## Acceptance Criteria
1. WebXR session starts on compatible devices
2. Hand tracking visualized in 3D space
3. Pinch gesture triggers SELECT event
4. Graceful fallback to touch on mobile
5. 60fps minimum on Quest 2 / equivalent
