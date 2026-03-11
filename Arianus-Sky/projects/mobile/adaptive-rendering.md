# Adaptive Rendering Specification

## Gesture Input System

This document defines the gesture event interfaces used by the VR/XR gesture recognition pipeline to drive adaptive rendering decisions in mobile companion apps.

### Interfaces

```typescript
interface GestureIntent {
  type: 'tap' | 'hold' | 'swipe' | 'pinch' | 'grab' | 'drag';
  position: { x: number; y: number; z: number };
  vector?: { x: number; y: number; z: number };
  intensity?: number;      // 0-1, for hold duration or pinch scale
  timestamp: number;
  hand: 'left' | 'right' | 'both';
}

interface GestureEvent {
  intent: GestureIntent;
  targetId?: string;        // AR object or UI element hit
  hitPoint: { x: number; y: number; z: number };
  sceneDepth: number;      // meters from camera
}
```

### Behavior Notes

- **Payload Timing**: `GestureEvent` fires on **gesture completion** — not per-frame during execution.
- **Coordinate System**: World-space 3D coordinates. Z represents depth from camera.
- **Intensity Mapping**:
  - `hold`: normalized duration (0 = just started, 1 = max hold time)
  - `pinch`: scale factor relative to rest position

### Usage in Adaptive Rendering

Gestures drive rendering tier transitions and proximity-based detail levels:

| Gesture | Rendering Effect |
|---------|------------------|
| `tap` on object | Highlight + LOD bump to high |
| `hold` | Progressive detail ramp while held |
| `swipe` | Motion blur / velocity-based effects |
| `pinch` | Dynamic FOV or scale adjustment |
| `grab` | Object isolation — isolate to full detail |
| `drag` | Real-time shadow/reflection updates |

---

*Linked from: UX Spec (Orla)*
*Source: Gesture Pipeline (Samah)*
