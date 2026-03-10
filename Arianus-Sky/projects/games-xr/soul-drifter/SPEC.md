# Soul Drifter - Phase 1: Spatial Foundation

## Overview
Soul Drifter is an immersive XR game based on the Death Gate Cycle, where players navigate the four realms (Arianus, Pryan, Chelestra, Abarrach) through spatial portals.

## Phase 1 Goals
- [ ] WebXR runtime with Three.js
- [ ] Basic hand tracking (pinch, grab, release)
- [ ] Spatial scene framework
- [ ] Realm transition visualization
- [ ] Mobile fallback (touch controls)

## Technical Stack
- **Engine**: Three.js + WebXR API
- **Fallback**: Mobile touch → WebXR polyfill
- **Styling**: TailwindCSS (from Arianus-Sky)

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

## Acceptance Criteria
1. WebXR session starts on compatible devices
2. Hand tracking visualized in 3D space
3. Pinch gesture triggers SELECT event
4. Graceful fallback to touch on mobile
5. 60fps minimum on Quest 2 / equivalent

## Timeline
- MVP: 6 weeks
- Full spatial: 3 months
