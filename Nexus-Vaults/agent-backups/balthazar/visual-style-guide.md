# Soul Drifters — Visual Style Guide
**Zone 1 | Version 1.0 | 2026-03-11**

---

## Overview

This document defines the visual language for Soul Drifters Zone 1 demo. It establishes color, effects, and material standards for all platforms (Unity VR, Roblox, Mobile WebXR).

---

## Core Visual Pillars

| Pillar | Description |
|--------|-------------|
| **Ethereal Warmth** | Arianus is a dying sky-realm — heat, light, drift |
| **Elemental Purity** | Each realm has a distinct visual identity (fire/water/earth/void) |
| **Magical Decay** | Naga corruption adds tension — sickly glow, entropy |
| **Ancient Mystery** | Sartan magic is muted, golden, ethereal |

---

## Realm Color System

### Primary Palette

| Realm | Hex | Name | Element |
|-------|-----|------|---------|
| Arianus | `#FF3333` | Fire Red | Fire |
| Pryan | `#3333FF` | Deep Blue | Water |
| Chelestra | `#33FF33` | Life Green | Earth |
| Abarrach | `#000000` | Void Black | Void |

### Secondary/Accent

| Usage | Hex | Name |
|-------|-----|------|
| Fire Glow | `#FF6600` | Ember Orange |
| Fire Highlight | `#FFAA00` | Gold Flame |
| Water Highlight | `#66AAFF` | Sky Blue |
| Earth Pulse | `#66FF66` | Bright Green |
| Void Glow | `#1a1a2e` | Dark Purple |

### UI System

| Element | Hex | Opacity |
|---------|-----|---------|
| Background | `#1a1a2e` | 100% |
| Surface | `#16213e` | 100% |
| Accent | `#FFD700` | 100% |
| Text Primary | `#FFFFFF` | 100% |
| Text Secondary | `#FFFFFF` | 60% |
| Text Muted | `#FFFFFF` | 20% |

### Theme Colors (Lore-Derived)

| Theme | Primary | Secondary | Effect |
|-------|---------|-----------|--------|
| Thermal Core | `#FF3333` | `#FF6600` | Heat shimmer |
| Aerian Sky | `#E0F0FF` | `#FFFFFF` | Wind trails |
| Naga Corruption | `#000000` | `#39FF14` | Sickly veins |
| Sartan Magic | `#B8860B` | `#D4AF37` | Muted gold |
| Zone Gate | `#FFE4B5` | `#696969` | Salt + ash |

### Realm Class Colors

| Class | Hex |
|-------|-----|
| Vesper (Conjuring) | `#9932CC` |
| Tul Nielohg (Desert) | `#FF4500` |
| Netheralm (Dark) | `#8B0000` |
| Magincia (Light) | `#FFD700` |

---

## Effects Specification

### Particle Systems

| Realm | Effect Name | Direction | Speed | Density |
|-------|-------------|-----------|-------|---------|
| Arianus | heat_shimmer | upward | fast | high |
| Pryan | droplet_trail | spiral_down | medium | medium |
| Chelestra | ground_vibration | downward | slow | low |
| Abarrach | subtle_glow | static | none | low |

### Material Properties

#### Fire (Arianus)
- **Albedo:** `#FF3333`
- **Emission:** `#FF6600` @ 0.5 intensity
- **Surface:** Smooth, reflective

#### Water (Pryan)
- **Albedo:** `#3333FF`
- **Emission:** `#66AAFF` @ 0.3 intensity
- **Surface:** Glossy, refractive

#### Earth (Chelestra)
- **Albedo:** `#33FF33`
- **Emission:** `#66FF66` @ 0.2 intensity
- **Surface:** Matte, rough

#### Void (Abarrach)
- **Albedo:** `#000000`
- **Emission:** `#1a1a2e` @ 0.4 intensity
- **Surface:** Smooth, absorbing

---

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Heading 1 | System Default | 24px | Bold |
| Heading 2 | System Default | 20px | Bold |
| Body | System Default | 16px | Regular |
| Caption | System Default | 12px | Regular |
| HUD Score | System Default | 32px | Bold |

---

## Spacing System

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

---

## Touch Targets (Mobile/VR)

| Element | Min Size |
|---------|----------|
| Button | 48x48px |
| Icon | 32x32px |
| HUD Element | 64x64px |

---

## Performance Targets

| Platform | FPS | Draw Calls | Particles | Texture Memory |
|----------|-----|------------|-----------|----------------|
| Mobile High | 60 | <50 | 200 | <100MB |
| Mobile Low | 30 | <30 | 50 | <50MB |
| VR | 90 | <100 | 500 | <200MB |

---

## Platform Notes

### Unity VR
- Use Standard Shader with Emission
- Particle System: Shuriken
- Post-processing: Bloom (subtle)

### Roblox
- Color3 for albedo
- ParticleEmitter for effects
- SurfaceGui for UI

### Mobile WebXR (Three.js)
- Use custom GLSL shaders (see `realm-shaders-gles.js`)
- WebGL 2.0 preferred, WebGL 1.0 fallback
- Use instancing for particles

---

## Assets Required

| Asset | Format | Priority |
|-------|--------|----------|
| Tile icons (4) | 64x64 PNG | HIGH |
| Realm backgrounds | 512x512 PNG | HIGH |
| Particle texture | 32x32 PNG (soft circle) | HIGH |
| UI icons | 48x48 PNG | MEDIUM |

---

## Reference Files

- `realm-perks-classes.md` — Realm mechanics
- `death-gate-race-mapping.md` — Race lore
- `/data/openclaw/shared/souldrifters/images/` — Concept JPEGs
- `mobile-webxr-spec.md` — Technical requirements

---

*Style guide by Balthazar — Audio & Technical Art*
