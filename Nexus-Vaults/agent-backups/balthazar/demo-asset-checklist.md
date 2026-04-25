# Soul Drifters - Demo Asset Checklist

**Zone 1 Demo | Priority: Demos First**

---

## What's Delivered

### Shaders

- `realm-shaders-gles.js` - GLSL shaders for Arianus, Pryan, Chelestra, and Abarrach
- Particle effect configs: heat shimmer, droplet trail, ground vibration, glow flicker

### UI Design Tokens

- Full color palette JSON from the prior handoff
- Zone 1 themes: Thermal Core, Aerian Sky, Naga Corruption, Sartan Magic

---

## What's Needed For Demos

### Unity VR / Roblox Priority

| Asset | Description | Format | Priority |
|---|---|---|---|
| Tile sprites | Fire/Water/Earth/Void icons | 64x64 PNG | HIGH |
| Realm backgrounds | Gradient backgrounds per realm | 512x512 PNG | HIGH |
| Particle textures | Soft glow circle for particles | 32x32 PNG | HIGH |
| UI icons | Pause, Menu, Restart | 48x48 PNG | MEDIUM |

### Placeholder Assets

For immediate demo:

- Tiles: solid colored squares with element symbol
- Backgrounds: solid colors from palette
- Particles: simple circles

---

## Mobile WebXR Notes

From `mobile-webxr-spec.md`:

- Target: 60 FPS, fewer than 50 draw calls, under 100MB texture memory
- Zone 1 spawn points: Entry at 0m, Thermal Core at 40m, Combat at 60-70m, Zone Gate at 100-120m
- Touch controls: tap, double-tap, swipe, long press, pinch

---

## Edmund White-Box Integration

When Edmund's spawn coordinates are finalized:

1. Replace placeholder geometry with white-box blockouts
2. Apply realm shaders to geometry materials
3. Add particle systems at spawn points

---

## Next Steps

1. **Vasu (Unity)** - Needs spawn coordinates from Edmund, then applies shaders to Unity materials
2. **Limbeck (Roblox/Godot)** - Can use solid color placeholders now, then swap with sprites later
3. **Paithan (Mobile)** - Shaders ready for Three.js integration

---

Asset spec by Balthazar - Audio and Technical Art
