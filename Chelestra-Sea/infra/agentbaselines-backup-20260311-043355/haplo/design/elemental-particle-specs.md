# Death Gate Cycle - Elemental & Soul Gauge Specifications

*Added 2026-03-09 per Samah's design input*

---

## 1. Soul Gauge Decay System

```yaml
soulGauge:
  baseOpacity: 1.0
  decayRate: 0.002  # per frame, visible as gradual fade
  pulseInterval: 60  # ms between heartbeats
  visualEffect: 'radial_pulse'  # opacity + scale animation
```

### Implementation Notes

| Parameter | Value | Visual Behavior |
|-----------|-------|-----------------|
| `baseOpacity` | 1.0 | Starts fully visible |
| `decayRate` | 0.002/frame | ~12% opacity loss per second at 60fps |
| `pulseInterval` | 60ms | ~16.7 pulses per second (heartbeat effect) |
| `visualEffect` | radial_pulse | Opacity + scale oscillation |

### Per-Realm Modifiers

```yaml
arianus:  # Fire realm - faster decay, more intense pulse
  decayRate: 0.003
  pulseInterval: 45
  visualEffect: 'radial_pulse_intense'

pryan:  # Water realm - slower decay, calm
  decayRate pulse: 0.0015
  pulseInterval: 80
  visualEffect: 'radial_pulse_calm'

chelestra:  # Earth realm - standard decay, steady pulse
  decayRate: 0.002
  pulseInterval: 60
  visualEffect: 'radial_pulse'
```

---

## 2. Physics Overlay → Elemental Particles

```yaml
particleSystem:
  base: universal (neutral particles)
  arianus: fire (red, rising vectors, thermal shimmer)
  pryan: water (blue, flowing spirals, droplets)
  chelestra: earth (green/brown, grounded, slow drift)
```

### Particle Specifications by Realm

#### Arianus (Fire Realm)
| Property | Value |
|----------|-------|
| Primary Color | `#ff4500` (OrangeRed) |
| Secondary Color | `#ff8c00` (DarkOrange) |
| Motion Vector | Rising (Y+ axis) |
| Particle Shape | Ember sparks |
| Velocity | 2-5 units/second upward |
| Thermal Effect | Heat shimmer overlay |

#### Pryan (Water Realm)
| Property | Value |
|----------|-------|
| Primary Color | `#1e90ff` (DodgerBlue) |
| Secondary Color | `#00bfff` (DeepSkyBlue) |
| Motion Vector | Flowing spirals (parametric curves) |
| Particle Shape | Droplets |
| Velocity | 1-3 units/second, circular path |
| Flow Pattern | Clockwise spiral descent |

#### Chelestra (Earth Realm)
| Property | Value |
|----------|-------|
| Primary Color | `#228b22` (ForestGreen) |
| Secondary Color | `#8b4513` (SaddleBrown) |
| Motion Vector | Grounded, slow drift (X/Z plane) |
| Particle Shape | Dust motes, leaves |
| Velocity | 0.3-1 unit/second |
| Pattern | Random walk, gravity-affected |

### Universal (Base) Particles
| Property | Value |
|----------|-------|
| Color | `#d3d3d3` (LightGray) |
| Motion | Floating, zero-gravity feel |
| Shape | Soft circles |
| Use Case | Non-realm UI, loading states |

#### Abarrach (Void Realm)
| Property | Value |
|----------|-------|
| Primary Color | `#0a0a0f` (Near-black with transparency) |
| Secondary Color | `#4a0080` (Deep purple subtle glow) |
| Motion Vector | Static with micro-flicker (no movement) |
| Particle Shape | Wisps, shadow tendrils |
| Velocity | 0 (static) with 0.1 unit micro-jitter |
| Glow Effect | Subtle purple underlight (`#4a0080` at 20% opacity) |
| Special Interaction | `elemental_reaction` — color shift when realms touch |

##### Elemental Reaction Mechanic
When particles from different realms interact:
| Combination | Reaction Effect |
|-------------|-----------------|
| Fire + Water | Steam burst (white particles, fast rise) |
| Fire + Earth | Magma flow (orange/brown, slow drip) |
| Water + Earth | Life bloom (green expansion, particle spawn) |
| Any + Void | Dimension tear (purple/black spiral, screen distortion) |

---

## 3. Mobile Controls Specification

```yaml
mobileControls:
  primaryGestures: 
    - pinch-zoom: for distance measurement between tiles
    - swipe-drag: for tile orientation and placement
  secondary:
    - tap-to-toggle-depth: switch tile Z-depth planes
    - tap-to-capture-soul: confirm soul gauge capture
  fallback: 
    - voice-commands: if no controller detected
  testDevice: 'Samsung S24 Ultra'  # priority touch test device
```

### Touch Gesture Mapping

| Gesture | Desktop Equivalent | Mobile Behavior |
|---------|-------------------|-----------------|
| Pinch-zoom | Scroll wheel | Two-finger pinch adjusts catch zone radius |
| Swipe-drag | Click-drag | Single finger drag for tile movement |
| Tap-to-toggle-depth | Right-click | Single tap cycles tile through Z-planes (0m, +0.5m, -0.5m) |
| Tap-to-capture-soul | Spacebar | Double-tap confirms soul gauge collection |
| Long-press | Hover (800ms) | Hold finger to grab tile without dragging |

### Mobile Test Device Priority
| Priority | Device | Screen Size | Touch Sampling |
|----------|--------|------------|---------------|
| 1 (Primary) | Samsung S24 Ultra | 6.8" | 240Hz |
| 2 | iPhone 15 Pro | 6.1" | 120Hz |
| 3 | Google Pixel 8 | 6.2" | 120Hz |

### Voice Command Fallbacks
| Command | Action |
|---------|--------|
| "Drop tile" | Release current tile at position |
| "Capture soul" | Confirm soul gauge collection |
| "Toggle depth" | Cycle Z-plane depth |
| "Pause game" | Open pause menu |

---

## 4. Accessibility for Mobile

- All touch targets minimum 48×48px (WCAG 2.2)
- Voice commands work without internet (on-device speech recognition)
- Haptic feedback toggle in settings
- High-contrast mode available

---

## 3. Integration with Match-3 Mechanics

### Match Effects → Particle Bursts

| Match Type | Particle Effect |
|------------|-----------------|
| 3-match | Realm-appropriate burst (small) |
| 4-match (Line Clear) | Realm-appropriate wave pattern |
| 5-match (Explosion) | Radial explosion with realm particles |
| 6+ match (Bomb) | Screen-wide particle cascade |

### Soul Gauge Interaction

- **Tile matches** restore soul gauge opacity (+0.05 per match)
- **Missed matches** accelerate decay (+0.001 additional)
- **Special tiles** trigger realm-specific particle bonus

---

## 4. Performance Considerations

| Platform Target | Max Particles | Particle LOD |
|----------------|---------------|--------------|
| VisionOS | 500 | High fidelity |
| Mobile High | 200 | Medium |
| Mobile Low | 50 | Simplified sprites |
| WebXR Fallback | 30 | 2D sprites only |

*Decay rate and pulse interval should scale with device capability.*
