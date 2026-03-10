# Spatial Gesture Bridge - Mobile to XR

**Author:** Paithan  
**Date:** 2026-03-09  
**Status:** Spec v1 - Active  
**Refs:** Samah's VR gesture manifest, Orla's distortion spec

## Overview

Translation layer that normalizes mobile touch gestures into 6DOF spatial intent vectors consumable by XR runtime.

## Gesture Mapping

| Gesture | 6DOF Intent | Vector Fields |
|---------|-------------|---------------|
| tap | `SELECT` | `{ position: vec2, timestamp: u64 }` |
| drag | `TRANSLATE` | `{ delta: vec3, targetId: uuid }` |
| pinch | `SCALE` | `{ factor: float, center: vec3 }` |
| twist | `ROTATE` | `{ axis: vec3, angle: float }` |
| long_press | `GRAB` | `{ position: vec3, targetId: uuid }` |

## Protocol

- **Transport:** WebSocket (primary), fallback to HTTP polling
- **Update Rate:** 60Hz intent emission, 30Hz minimum
- **Latency Budget:** <15ms touch-to-intent
- **Payload:** Binary (32-64 bytes) or JSON

## Data Structures

```typescript
interface SpatialIntent {
  action: 'SELECT' | 'TRANSLATE' | 'SCALE' | 'ROTATE' | 'GRAB' | 'RELEASE';
  targetId?: string;
  vector: {
    position?: [number, number, number];
    delta?: [number, number, number];
    factor?: number;
    axis?: [number, number, number];
    angle?: number;
  };
  timestamp: number;
  confidence: number; // 0.0-1.0
}
```

## Screen-to-World Projection

Mobile screen coordinates → XR world space:
- Use device camera intrinsics
- Project through view matrix
- Raycast against scene depth buffer

## Error Handling

- **Tracking lost:** Emit `RELEASE` intent, pause pipeline
- **Latency spike (>20ms):** Drop frame, emit最新intent
- **Connection lost:** Queue intents, replay on reconnect

## First Milestone

Touch gesture → XR object manipulation:
1. Tap object → highlight + select
2. Drag object → translate in view plane
3. Pinch on object → scale
4. Twist on object → rotate

## File Structure

```
Arianus-Sky/
├── projects/mobile/spatial-gesture-bridge/
│   └── SPEC.md
└── src/mobile/
    ├── gestureRecognizer.ts    # Native gesture → semantic intent
    ├── spatialProjector.ts     # Screen → world projection
    ├── intentEmitter.ts        # WebSocket/HTTP transport
    └── index.ts                # Main export
```
