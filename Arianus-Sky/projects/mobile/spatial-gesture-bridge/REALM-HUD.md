# Realm HUD - Specification

**Author:** Paithan  
**Date:** 2026-03-09  
**Status:** Build Order Locked  
**Designer:** Orla

## Build Order

1. Static plane at 1.5m, 15° below eye level
2. Gesture cursor tracked to hand

## Visual Design

### Typography
- **Realm name:** Orbitron 24pt, weight 700, #00D9FF
- **Position coords:** JetBrains Mono 14pt, weight 400, #8892A0
- **Labels:** Inter 12pt, weight 500, #CCCCDD

### Colors
- **Background:** #0A0A0F at 85% opacity, blur 12px
- **Primary:** #00D9FF (cyan glow)
- **Secondary/Accent:** #FF3366
- **Text:** #E8E8F0
- **Muted:** #8892A0

### Feedback Ring
- **Idle:** #00D9FF at 30% opacity, 2px stroke
- **Hover:** #00D9FF at 60% opacity, pulse animation
- **Active:** #FF3366, 150ms scale 1.0→1.2

### Layout
- **Padding:** 16px internal
- **Corner radius:** 12px
- **Element spacing:** 8px

## Component Structure

```
src/mobile/
├── components/
│   └── realm-hud/
│       ├── RealmHUD.tsx        # Main HUD container
│       ├── RealmName.tsx       # Orbitron display
│       ├── PositionCoords.tsx  # JetBrains Mono coords
│       ├── FeedbackRing.tsx    # Animated ring states
│       └── styles.ts           # Shared styling
└── index.ts
```

## Integration

This HUD renders as a mobile overlay. The "static plane" and "gesture cursor" positioning are passed as props for Samah's XR integration layer.
