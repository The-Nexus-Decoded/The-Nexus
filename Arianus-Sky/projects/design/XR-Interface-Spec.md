# XR Interface Spec v1.0

## Presentation Modes
- **full**: Full immersion
- **ambient**: Passive background
- **silent**: No visual/haptic output

## Gesture Thresholds
- Confidence threshold: 80% (Sartan gestures)
- Below threshold = ambiguous
- Sartan gestures: flick/hold/circle/pinch

## Circular Rotation
- Discrete events at 15° → delta → end

## Gaze Confirmation
- ≥1.5m distance: gaze confirm required (extra verification step)

## Undo Window
- 3 seconds

## Haptics
- Pulse: 35ms
- Double: 50ms × 2
- Triple: 40ms × 3
- Alert: 100ms

## Trust Ladder
- Passive → Exploratory → Manipulative

## Mobile → XR WebSocket Protocol
- JSON message format
- Bidirectional state flow

## Gesture-Haptic Protocol (Mobile → XR)

### 1. Gesture → Visual Mapping
| Gesture | Intent | Visual Feedback |
| ------- | ------ | --------------- |
| DOUBLE-TAP | Intent sent | Glow (cyan) |
| ROTATE | Confirmed | Scale pulse (1.0 → 1.05 → 1.0, 200ms) |
| LONG-PRESS (500ms) | Error | Red outline + shake (10px L-R, 3 cycles, 300ms) |

### 2. Timing Tolerance
| Parameter | Value |
| --------- | ----- |
| Gesture → Headset confirm | 2s max |
| Double-tap interval | 300ms max |
| Long-press threshold | 500ms |

### 3. Haptic Patterns
| Event | Pattern | Intensity |
| ----- | ------- | --------- |
| Intent sent (double-tap) | Single 35ms pulse | Medium |
| Confirmed (rotate) | Double 50ms pulse, 80ms gap | High |
| Error (long-press) | Triple 40ms pulse, 50ms gaps | High |

### 4. Platform Haptics
| Gesture | iOS Haptic | Android Haptic | Feel |
| ------- | ---------- | -------------- | ---- |
| DOUBLE-TAP | .medium impact | VibrationEffect.createOneShot(30, 150) | Prompt confirmation |
| ROTATE | .light impact × 2 (100ms gap) | VibrationEffect.createWaveform([0,20,50,20], -1) | Double tick |
| LONG-PRESS (500ms) | .error notification | VibrationEffect.createWaveform([0,50,30,50,30,50], -1) | Sharp reject |
| Mode Toggle | .success notification | VibrationEffect.createOneShot(50, 250) | Positive switch |

## Spatial UI Contract

### Manipulation Matrix
| Action | Input | Preview Type | Mobile Render |
| ------ | ----- | ------------ | ------------- |
| MOVE | Horizontal drag | ghost_wireframe | ✓ |
| ROTATE | Circular threshold / toggle | rotation_ring | ✓ |
| SCALE | Dual trigger / dual grip | corner_handles (uniform) | ✓ |

### Contract Schema
```json
{
  "intent": "manipulate",
  "action": "move" | "rotate" | "scale",
  "axis": "x" | "y",
  "method": "dual_trigger" | "dual_grip",
  "preview": {
    "type": "ghost_wireframe" | "rotation_ring" | "corner_handles",
    "uniform": true
  },
  "confidence": 0.0-1.0,
  "user_can_override": true
}
```

### V1 Constraints
- **XY plane only** — no Z-axis manipulation
- **Preview-first** — ghost wireframe confirms intent before geometry commit
- **Override capability** — user_can_override enables correction flow
- **Queue management** — preview_queue_max: 3

### World Unit Baseline (V1/V2 Shared)
- **Reference distance:** 1m from camera
- **FOV assumption:** 90° horizontal
- **Math:** visible width at 1m = 2 × tan(45°) × 1m = 2m world units
- **Conversion (1920px canvas):** 1 world unit = 960px → 44px touch target = ~0.046m at 1m
- **Depth scaling:** world_units_per_px scales linearly with distance

### Mobile Responsibilities
- Render preview visualizations on device
- Handle preview queue in ambient/foreground transitions
- Emit confidence scores for override decisions
- Source identification: `source: menu`

## AmbientSkin Contract

### Ack Patterns
- **Tier 1 (Passive):** No ack
- **Tier 2 (Attentive):** Single pulse on phone confirms VR received
- **Tier 3 (Urgent):** Double pulse + screen flash confirms override engaged

### Thermal Self-Preservation
- **Nominal (<35°C):** Tier as-set
- **Throttling (35-38°C):** Auto-bump one tier higher
- **Critical (>38°C):** Max tier, force-reduce activity

## Intent Queue
- 3-deep cap
- FIFO drop on overflow
- Intent preserved, preview disposable
- **Mobile edge:** Queue overflow at 100 intents for sustained sessions

## State Reconciliation
- **Z-Depth Sync:** `last_writer_wins` for mobile latency safety
- Avoid `vr_primary` mode (creates latency issues for mobile immediate feedback)

## Mobile Platform Constraints

### ThermalContext (iOS)
- iOS `ProcessInfo.thermalState` monitors app-only, not system-wide
- VR app must push thermal warnings to mobile for adaptive quality
- Companion process alternative for continuous monitoring

### Proximity Wake (iOS)
- iOS proximity sensor requires active audio session or VoIP call
- Fallback: motion-based wake via `CMMotionManager` pickup detection
- Alternative: notification-triggered wake

## Character Matrix
- **Status:** On hold until Sterol

---

## Mobile ↔ Spatial Contract (v1.0)

### Virtual Display Plane (V1)
- **Distance:** 1m from camera (fixed)
- **Width:** 0.8m (80cm virtual display)
- **Coordinate mapping:** Mobile 0-1 maps directly to UV on virtual plane
- **Aspect ratio:** Handled via letterbox with configurable padding (no stretch)
- **Mobile responsibility:** Send normalized UV coordinates only
- **Headset responsibility:** Projection, letterboxing, rendering

### HUD Angle Adjustment
- Store offset in user prefs (degrees from default)
- Calibrate on first session via quick tap-where-you-look

### Frame Drop / Undo Recovery
- Headset maintains gesture history ring buffer (last 3s)
- If visual confirmation lags >2 frames: ghost overlay shows "reverting" state until catch-up
- Maintains gesture continuity during latency spikes

### Error Codes
| Code | Meaning |
| ---- | ------- |
| `object_not_found` | Target object doesn't exist in scene |
| `out_of_bounds` | Target outside allowed manipulation bounds |
| `confidence_too_low` | Gesture confidence below 80% threshold |
| `timeout` | VR didn't respond within latency budget |
| `invalid_transition` | State transition not allowed |

### Latency Budget
- **Max round-trip:** 100ms
- Mobile must timeout and reject if exceeded

### Cache TTL
- State broadcasts include `ttl_ms` for cache expiration
- Mobile discards stale state after ttlMs

### Bounds Rejection
- Out-of-bounds targets return `out_of_bounds` error
- Includes distance/direction info for user feedback

### Charge Events (Cast)
| State | Meaning |
| ----- | ------- |
| `start` | Cast/charge initiated |
| `stop` | Cast/charge released |

### Error Response Schema
```json
{
  "intentId": "uuid",
  "status": "rejected",
  "error": {
    "code": "out_of_bounds",
    "message": "Target outside manipulation bounds"
  }
}
```
