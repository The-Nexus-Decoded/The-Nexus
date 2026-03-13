# Death Gate Cycle - Games-VR Wireframe Specification

**Project:** Match-3 Foundation Prototype  
**Version:** 1.0-sprint-1  
**Created:** 2026-03-09  
**Design Lead:** Orla (UI/UX)  
**XR Specialist:** Samah (Spatial Computing)  

---

## Overview

This wireframe defines the UI/UX for a Match-3 puzzle game prototype serving as the foundation for a Death Gate Cycle-themed spatial XR experience. The prototype validates gesture UI, mobile touch systems, and cross-platform accessibility before expanding to full realm mechanics.

---

## 1. HUD Layout (2D Plane)

### Desktop Landscape
- **Viewport:** 1920×1080px baseline, scalable to ultrawide
- **Game Grid:** Center-left (60% width), 8×8 tiles, 0m depth plane
- **Score HUD:** Bottom-right (320×120px), +3m elevation
- **Soul Gauge:** Bottom-center, 120mm height, fixed position
- **Realm Indicator:** Top-left corner, 80mm diameter, +8m sky-space
- **Catch Zone:** Bottom-center, -1m depth

### Mobile Portrait
- **Viewport:** 390×844px (iPhone 15 Pro baseline)
- **Game Grid:** Center (60% width, 70% height), 6×6 tiles
- **Score HUD:** Top-center overlay, +2m elevation
- **Soul Gauge:** Bottom-center, 120mm height
- **Realm Indicator:** Top-left, 80mm diameter
- **Control Bar:** Bottom 30% (Pause, Settings, Help)
- **Touch Targets:** Minimum 48×48px (WCAG 2.2)

### Tablet / WebXR Fallback
- Hybrid layout combining desktop and mobile elements
- Performance target: <300ms gesture response

---

## 2. Soul Gauge Decay System

```yaml
soulGauge:
  baseOpacity: 1.0
  decayRate: 0.002  # per frame at 60fps = ~12%/sec
  pulseInterval: 60  # ms between heartbeats (~16.7/sec)
  visualEffect: 'radial_pulse'  # opacity + scale animation
```

### Per-Realm Modifiers

| Realm | Decay Rate | Pulse Interval | Effect |
|-------|-----------|----------------|--------|
| Arianus (Fire) | 0.003 | 45ms | Intense pulse |
| Pryan (Water) | 0.0015 | 80ms | Calm pulse |
| Chelestra (Earth) | 0.002 | 60ms | Standard pulse |

### Match Integration
- Tile matches restore +0.05 opacity
- Missed matches accelerate decay (+0.001)
- Special tiles trigger realm particle bonus

---

## 3. Elemental Particle System

```yaml
particleSystem:
  base: universal (neutral particles)
  arianus: fire (red, rising vectors, thermal shimmer)
  pryan: water (blue, flowing spirals, droplets)
  chelestra: earth (green/brown, grounded, slow drift)
  abarrach: void (transparent, subtle glow, static micro-flicker)
  interaction: 'elemental_reaction'  # color shift when realms touch
```

### Particle Specifications

| Color | Realm | Direction | Speed | Special Effect |
| ----- | ----- | --------- | ----- | -------------- |
| Red | Arianus | Rising vectors | Fast | Thermal shimmer |
| Blue | Pryan | Flowing spirals | Medium | Droplets |
| Green/Brown | Chelestra | Grounded | Slow | Slow drift |
| Transparent/Black | Abarrach | Static | Micro | Subtle glow + flicker |

### Elemental Reactions

| Combination | Effect |
|-------------|--------|
| Fire + Water | Steam burst (white, fast rise) |
| Fire + Earth | Magma flow (orange/brown, slow drip) |
| Water + Earth | Life bloom (green expansion) |
| Any + Void | Dimension tear (purple/black spiral) |

---

## 4. Mobile Controls

```yaml
mobileControls:
  primaryGestures:
    - pinch-zoom: distance measurement
    - swipe-drag: tile orientation/placement
  secondary:
    - tap-to-toggle-depth: Z-plane switching
    - tap-to-capture-soul: confirm collection
  fallback:
    - voice-commands: no controller detected
  testDevice: 'Samsung S24 Ultra'
```

### Mobile Control Translation
- **Pinch** → Distance/zoom (gesture mapping)
- **Swipe Drag** → Orientation control
- **Tap** → Toggle depth / capture soul
- **Voice** → Fallback if no controller detected

### Gesture Mapping

| Gesture | Desktop | Mobile Behavior |
|---------|---------|-----------------|
| Pinch-zoom | Scroll wheel | Two-finger pinch → catch zone radius |
| Swipe-drag | Click-drag | Single finger drag tile |
| Tap-depth | Right-click | Single tap → cycle Z-plane (0m/±0.5m) |
| Tap-capture | Spacebar | Double-tap → confirm soul gauge |
| Long-press | Hover | 800ms hold → grab without drag |

### Priority Test Device
- Samsung S24 Ultra (touch testing priority)

---

## 5. Accessibility (WCAG 2.2 AA)

- **Color-blind safe:** Textures + patterns, not just color
- **High contrast mode:** +30% luminance, toggle in settings
- **Voice commands:** Offline on-device recognition
- **Screen reader:** ARIA live regions for score/matches
- **Motor alternatives:** Auto-drag mode, extended grab time (800ms)

---

## 6. Performance Targets

| Platform | FPS Target | Max Particles | Latency |
|----------|-----------|---------------|----------|
| VisionOS | 90fps | 500 | <50ms |
| Mobile High | 60fps | 200 | <100ms |
| Mobile Low | 30fps | 50 | <200ms |
| WebXR | 60fps | 30 | <300ms |

---

## Files Reference

| File | Path |
|------|------|
| This wireframe | `/data/openclaw/workspace/wireframe.md` |
| Match-3 foundation | `/data/openclaw/workspace/design/wireframes-match-3.json` |
| Complete VR spec | `/data/openclaw/workspace/design/wireframes-games-vr-complete.json` |
| Elemental specs | `/data/openclaw/workspace/design/elemental-particle-specs.md` |

---

## Next Steps

- [ ] Mobile flow testing (Zifnab-owned)
- [ ] Haplo backend ticket creation
- [ ] Marit accessibility audit
- [ ] First integration demo (Day 3)
