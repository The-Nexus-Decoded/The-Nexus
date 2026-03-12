# XR Interface Specification v1.0
## Unified Protocol: Mobile → XR Bridge

### Core Contract

```typescript
interface XRPresentationMode {
  mode: "full" | "ambient" | "silent"
}

interface GestureEvent {
  type: "double_tap" | "rotate" | "long_press" | "swipe"
  confidence: number  // 0.0-1.0
  timestamp: number
  data?: any
}

interface HapticPattern {
  pattern: "pulse" | "double" | "triple" | "alert"
  duration_ms: number
  intensity: number  // 0.0-1.0
}
```

---

## 1. Presentation Modes

| Mode | Visual | Haptics | Audio | Use Case |
|------|--------|---------|-------|----------|
| `full` | ✓ Rendered | ✓ All events | ✓ Spatial | Active session |
| `ambient` | ✗ Off | ✓ Notification-tier only | ✗ Silent | Locked screen |
| `silent` | ✗ Off | ✗ Off | ✗ Off | Backgrounded |

### State Transitions
```
locked → ambient
unlock → full  
backgrounded → silent
```

---

## 2. Gesture → Visual Mappings

| Gesture | Threshold | Visual Output | Undo Window |
|---------|-----------|---------------|-------------|
| Double-tap | 80% confidence | Selection highlight | 3s |
| Rotate | 80% confidence | Object rotation (Y-axis) | 3s |
| Long-press | 80% confidence | Context menu / manip mode | 3s |
| Swipe | 80% confidence | Navigation / dismiss | 3s |

### Sartan Class Gestures (Default)

| Gesture | Action | Confidence Threshold | Notes |
|---------|--------|---------------------|-------|
| `flick` | `cast` (projectile intent) | 85% for user_can_override | Below = ambiguous → queue or idle |
| `hold` | `charge` (build power) | 85% for user_can_override | Below = ambiguous → queue or idle |
| `circle` | `rotate` (target lock) | 85% for user_can_override | Below = ambiguous → queue or idle |
| `pinch` | `grab` (object manipulation) | 85% for user_can_override | Below = ambiguous → queue or idle |

### Circular Rotation (Discrete Events)

| Event | Trigger | Description |
|-------|---------|-------------|
| `rotate_start` | 15° threshold breach | Begin rotation state |
| `rotate_delta` | continuous during motion | Delta values for smooth tracking |
| `rotate_end` | velocity < threshold for 200ms | End rotation, clean state transition |

### Patryn Class (Menu-Driven)

Menu emits `source: menu`. Mobile reads `source` field to apply Patryn presentation skin.

### Trust Ladder

```
Passive (gaze) → Exploratory (touch) → Manipulative (gesture)
```

Each rung unlocks higher-fidelity haptics and more complex visual feedback.

### Distance-Based Confirmation

| Target Distance | Additional Step Required |
|-----------------|-------------------------|
| < 1.5m | Direct gesture trigger |
| ≥ 1.5m | Gaze confirm before gesture execution |

Distant targets (>1.5m) require gaze fixate → gesture to prevent accidental activation.

---

## 3. Haptic Patterns

| Pattern | Duration | Use Case |
|---------|----------|----------|
| `pulse` | 35ms | Fireball cast, target acquired |
| `double` | 50ms (×2) | Combat resolved, selection confirm |
| `triple` | 40ms (×3) | Quest update, low health alert |
| `alert` | 100ms | Critical state (liquidation, danger) |

### Event → Haptic Mapping

| Event | full | ambient |
|-------|------|---------|
| Fireball cast | ✓ pulse | ✓ pulse |
| Target acquired | ✓ pulse | ✓ pulse |
| Combat resolved | ✓ double | ✓ double |
| Quest update | ✓ triple | ✓ triple |
| Low health | ✓ alert | ✓ alert |

---

## 4. Timing Tolerances

- Gesture recognition: ≤150ms latency
- Haptic playback: ≤50ms from gesture trigger
- Visual feedback: ≤100ms from gesture trigger
- Undo execution: 3 second window from gesture

---

## 5. Mobile → XR Protocol

### Message Format

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

### Transport
- WebSocket for real-time sync
- Fallback: URL scheme for non-persistent connections

---

## 6. Implementation Notes

- Confidence threshold enforced at 80% before triggering any visual/haptic
- Undo clears last gesture if invoked within 3s window
- Ambient mode respects battery and attention — no visual until unlock
- All haptics in ambient mode use notification-tier intensity (0.6)

---

*Spec v1.0 — Mobile → XR Bridge Protocol*
