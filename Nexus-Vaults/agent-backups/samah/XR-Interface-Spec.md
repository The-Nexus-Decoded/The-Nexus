# XR Interface Specification v1.0

## Unified Protocol: Mobile to XR Bridge

This is historical Soul Drifter interface context. Before implementation, Samah must restate platform, posture, input, locomotion, comfort, and performance targets, then hand mobile/UI execution to Paithan.

## Core Contract

```typescript
interface XRPresentationMode {
  mode: "full" | "ambient" | "silent"
}

interface GestureEvent {
  type: "double_tap" | "rotate" | "long_press" | "swipe"
  confidence: number
  timestamp: number
  data?: unknown
}

interface HapticPattern {
  pattern: "pulse" | "double" | "triple" | "alert"
  duration_ms: number
  intensity: number
}
```

## Presentation Modes

| Mode | Visual | Haptics | Audio | Use Case |
|---|---|---|---|---|
| `full` | rendered | all events | spatial | active session |
| `ambient` | off | notification-tier only | silent | locked screen |
| `silent` | off | off | off | backgrounded |

State transitions:

```text
locked -> ambient
unlock -> full
backgrounded -> silent
```

## Gesture To Visual Mappings

| Gesture | Threshold | Visual Output | Undo Window |
|---|---|---|---|
| double-tap | 80% confidence | selection highlight | 3s |
| rotate | 80% confidence | object rotation on Y-axis | 3s |
| long-press | 80% confidence | context menu / manipulation mode | 3s |
| swipe | 80% confidence | navigation / dismiss | 3s |

## Sartan Class Gestures

| Gesture | Action | Confidence Threshold | Notes |
|---|---|---|---|
| `flick` | `cast` | 85% for user override | below threshold queues or idles |
| `hold` | `charge` | 85% for user override | below threshold queues or idles |
| `circle` | `rotate` | 85% for user override | below threshold queues or idles |
| `pinch` | `grab` | 85% for user override | below threshold queues or idles |

## Circular Rotation Events

| Event | Trigger | Description |
|---|---|---|
| `rotate_start` | 15-degree threshold breach | begin rotation state |
| `rotate_delta` | continuous during motion | delta values for smooth tracking |
| `rotate_end` | velocity below threshold for 200ms | end rotation and clean state |

## Trust Ladder

```text
Passive gaze -> exploratory touch -> manipulative gesture
```

Each rung unlocks higher-fidelity haptics and more complex visual feedback.

## Distance-Based Confirmation

| Target Distance | Additional Step Required |
|---|---|
| < 1.5m | direct gesture trigger |
| >= 1.5m | gaze confirm before gesture execution |

Distant targets require gaze fixation before gesture execution to prevent accidental activation.

## Haptic Patterns

| Pattern | Duration | Use Case |
|---|---|---|
| `pulse` | 35ms | fireball cast, target acquired |
| `double` | 50ms x2 | combat resolved, selection confirm |
| `triple` | 40ms x3 | quest update, low health alert |
| `alert` | 100ms | critical state |

## Timing Tolerances

- Gesture recognition: <=150ms latency
- Haptic playback: <=50ms from gesture trigger
- Visual feedback: <=100ms from gesture trigger
- Undo execution: 3 second window from gesture

## Mobile To XR Protocol

```json
{
  "event": "gesture",
  "type": "double_tap",
  "confidence": 0.85,
  "timestamp": 1709510400000,
  "presentation_mode": "full"
}
```

```json
{
  "event": "haptic",
  "pattern": "pulse",
  "intensity": 0.8
}
```

## Transport

- WebSocket for real-time sync
- URL scheme fallback for non-persistent connections

## Implementation Notes

- Enforce confidence threshold before visual or haptic output.
- Undo clears the last gesture if invoked within 3s.
- Ambient mode respects battery and attention; no visual output until unlock.
- Ambient haptics use notification-tier intensity.
- Paithan owns mobile UI implementation.
- Balthazar owns audio and technical-art execution.
