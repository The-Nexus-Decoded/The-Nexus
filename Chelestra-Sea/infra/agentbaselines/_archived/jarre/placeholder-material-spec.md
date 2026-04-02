# Soul Drifters — Placeholder Material Spec
**Zone 1 Demo | Quick Reference for Devs**

---

## Quick Reference: Realm Materials

### Arianus (Fire)
| Property | Value |
|----------|-------|
| Albedo | `#FF3333` (red) |
| Emission | `#FF6600` (orange) |
| Emission Intensity | 0.5 |
| Effect | Heat shimmer (animate UV offset) |

### Pryan (Water)
| Property | Value |
|----------|-------|
| Albedo | `#3333FF` (blue) |
| Emission | `#66AAFF` (light blue) |
| Emission Intensity | 0.3 |
| Effect | Spiral highlight (animate UV) |

### Chelestra (Earth)
| Property | Value |
|----------|-------|
| Albedo | `#33FF33` (green) |
| Emission | `#66FF66` (bright green) |
| Emission Intensity | 0.2 |
| Effect | Subtle pulse (animate emission) |

### Abarrach (Void)
| Property | Value |
|----------|-------|
| Albedo | `#000000` (black) |
| Emission | `#1a1a2e` (dark purple) |
| Emission Intensity | 0.4 |
| Effect | Flicker (animate alpha/emission) |

---

## Particle Materials

### Fire Particles
- Color: `#FF6600` → `#FF3300` gradient
- Blend Mode: Additive
- Size: 0.1 - 0.3 units
- Lifetime: 1-2 seconds

### Water Particles
- Color: `#3399FF` → `#0033AA` gradient
- Blend Mode: Additive
- Size: 0.05 - 0.2 units
- Lifetime: 2-3 seconds

### Earth Particles
- Color: `#33FF33` → `#00AA00` gradient
- Blend Mode: Additive
- Size: 0.1 - 0.4 units
- Lifetime: 3-4 seconds

### Void Particles
- Color: `#660066` → `#000000` gradient
- Blend Mode: Additive
- Size: 0.1 - 0.3 units
- Lifetime: 2-3 seconds

---

## UI Material (for HUD elements)

| Element | Color | Opacity |
|---------|-------|---------|
| Panel Background | `#1a1a2e` | 0.8 |
| Button | `#16213e` | 1.0 |
| Button Hover | `#FFD700` | 0.3 |
| Text | `#FFFFFF` | 1.0 |
| Text Muted | `#FFFFFF` | 0.6 |

---

## Unity Quick Setup

```csharp
// Fire material (placeholder)
var fireMat = new Material(Shader.Find("Standard"));
fireMat.color = Color.red;
fireMat.EnableKeyword("_EMISSION");
fireMat.SetColor("_EmissionColor", new Color(1f, 0.4f, 0f) * 0.5f);
```

---

## Roblox Quick Setup

```lua
-- Fire material (placeholder)
local firePart = Instance.new("Part")
firePart.Color = Color3.new(1, 0.2, 0.2)
local emission = Instance.new("SurfaceGui")
-- Use ParticleEmitter for effects
local particles = Instance.new("ParticleEmitter")
particles.Color = ColorSequence.new{
  ColorSequenceKeypoint.new(0, Color3.new(1, 0.4, 0)),
  ColorSequenceKeypoint.new(1, Color3.new(1, 0.2, 0))
}
```

---

## Performance Budget

- Max 50 draw calls for demo
- Max 200 particles on screen
- Texture memory: <100MB
- Target: 60 FPS

---

*Material spec by Jarre — Art & Shaders*
