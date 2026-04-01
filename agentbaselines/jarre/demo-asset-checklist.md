# Soul Drifters — Demo Asset Checklist
**Zone 1 Demo | Priority: Demos First**

---

## What's Delivered (Ready to Use)

### Shaders
- ✅ `realm-shaders-gles.js` — GLSL shaders for 4 realms (Arianus, Pryan, Chelestra, Abarrach)
- ✅ Particle effect configs (heat shimmer, droplet trail, ground vibration, glow flicker)

### UI Design Tokens
- ✅ Full color palette JSON (see previous message)
- ✅ Zone 1 themes: Thermal Core, Aerian Sky, Naga Corruption, Sartan Magic

---

## What's Needed for Demos

### Unity VR / Roblox Priority

| Asset | Description | Format | Priority |
|-------|-------------|--------|----------|
| Tile sprites | Fire/Water/Earth/Void icons | 64x64 PNG | HIGH |
| Realm backgrounds | Gradient backgrounds per realm | 512x512 PNG | HIGH |
| Particle textures | Soft glow circle for particles | 32x32 PNG | HIGH |
| UI icons | Pause, Menu, Restart | 48x48 PNG | MEDIUM |

### Placeholder Assets (Can Use Colored Squares)

For immediate demo, use:
- **Tiles**: Solid colored squares with element emoji (🔥💧🌿🕳️)
- **Backgrounds**: Solid colors from palette
- **Particles**: Simple circles

---

## Mobile WebXR Spec Notes

From `mobile-webxr-spec.md`:
- Target: 60 FPS, <50 draw calls, <100MB texture
- Zone 1 spawn points: Entry (0m) → Thermal Core (40m) → Combat (60-70m) → Zone Gate (100-120m)
- Touch controls: tap, double-tap, swipe, long press, pinch

---

## Edmund's White-Box Integration

When Edmund's spawn coordinates are finalized:
1. Replace placeholder geometry with white-box blockouts
2. Apply realm shaders to geometry materials
3. Add particle systems at spawn points

---

## Next Steps

1. **Vasu (Unity)** — Need spawn coords from Edmund, then I can apply shaders to Unity materials
2. **Bane (Roblox)** — Can use solid color placeholders now, swap with sprites later
3. **Paithan (Mobile)** — Shaders ready for Three.js integration

---

*Asset spec by Jarre — Art & Shaders*
