# Mobile Distortion Indicator Spec (Orla v1)

## States

| State           | FPS Threshold | Visual                                   | Interaction          |
| --------------- | ------------- | ---------------------------------------- | -------------------- |
| Raycast Active  | ≥60fps        | Pulsing grid overlay, 4pt corner anchors | Subtle glow feedback |
| Static Fallback | <60fps        | Semi-transparent static grid, no raycast | Tap to refresh       |

## Design Tokens

- Primary: `#00D4FF` (cyan glow)
- Secondary: `#1A1A2E` (deep background)
- Fallback indicator: `#2D2D44` (muted grid)
- Animation: 300ms ease-out pulse, max 2s cycle

## Source

Orla - 2026-03-09 in #games-vr
