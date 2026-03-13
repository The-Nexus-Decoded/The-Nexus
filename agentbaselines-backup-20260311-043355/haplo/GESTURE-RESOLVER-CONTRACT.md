# GESTURE-RESOLVER-CONTRACT.md

**Owner:** Haplo  
**Status:** DRAFT  
**Parent Spec:** `XRPC-SPEC.md`

---

## Overview

Platform channel contract between Flutter mobile app and VR headset for gesture event resolution.

---

## Channel Name

```
com.souldrifter/gesture_resolver
```

---

## Methods (Dart → Native → Flutter)

### 1. `resolveIntent`

```
Input:  { intentId, gestureType, position: {x, y, z}, confidence, timestamp }
Output: { status: 'resolved' | 'rejected' | 'pending', resolvedIntent?, errorCode? }
```

### 2. `onGestureEvent` (EventChannel)

```
Stream of: { intentId, gestureType, position, confidence, timestamp }
```

### 3. `triggerHaptic`

```
Input:  { pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'custom', intensity: 0.0-1.0 }
Output: { success: bool }
```

### 4. `getThermalTier`

```
Output: { tier: 'idle' | 'active' | 'sustained' | 'critical', temperatureC: number }
```

### 5. `requestAttentionLease`

```
Input:  { durationMs: number, reason: string }
Output: { leaseId: string, expiresAt: number }
```

---

## Gesture Types

| Enum | Description |
|------|-------------|
| `TAP` | Single touch tap |
| `DOUBLE_TAP` | Two taps within 300ms |
| `LONG_PRESS` | Hold >500ms |
| `DRAG` | Touch move |
| `PINCH` | Two-finger pinch |
| `ROTATE` | Two-finger rotate |
| `FLICK` | Fast swipe |
| `HOLD` | Stationary touch >500ms |
| `CIRCLE` | Circular motion |
| `PINCH_SARTAN` | Special depth gesture |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `object_not_found` | Target entity missing |
| `out_of_bounds` | Gesture outside valid zone |
| `confidence_too_low` | Sensor confidence <0.60 |
| `timeout` | Intent expired before resolution |
| `invalid_transition` | State machine violation |

---

## Confidence Thresholds

| Threshold | Action |
|-----------|--------|
| ≥0.85 | Execute immediately |
| 0.60–0.84 | Require user confirmation |
| <0.60 | Ignore |

---

## Timing Constants

```dart
static const GESTURE_TO_HEADSET_CONFIRM_MS = 2000;
static const DOUBLE_TAP_INTERVAL_MAX_MS = 300;
static const LONG_PRESS_THRESHOLD_MS = 500;
static const MIN_TOUCH_TARGET_PT = 44;
```

---

## Platform Channel Setup (Flutter)

```dart
class GestureResolver {
  static const _channel = MethodChannel('com.souldrifter/gesture_resolver');
  static const _events = EventChannel('com.souldrifter/gesture_events');
  
  Stream<Map> get gestureStream => _events.receiveBroadcastStream();
  
  Future<ResolveResult> resolveIntent(GestureIntent intent) =>
      _channel.invokeMethod('resolveIntent', intent.toMap());
  
  Future<bool> triggerHaptic(HapticPattern pattern, double intensity) =>
      _channel.invokeMethod('triggerHaptic', {'pattern': pattern, 'intensity': intensity});
}
```

---

## Next Steps

- [ ] Paithan implements Flutter side (MethodChannel + EventChannel)
- [ ] VR implements native platform handlers
- [ ] Integration test with gesture stream

---

*Drafted: 2026-03-10*
