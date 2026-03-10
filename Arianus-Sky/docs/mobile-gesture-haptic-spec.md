# Mobile Gesture-Haptic Contract

**Version:** 1.0  
**Status:** Implementation Required  
**Created:** 2026-03-10

---

## Overview

Contract between mobile layer (`games-vr/src/mobile/`) and XR spatial consumer layer. Defines the gesture-to-intent pipeline with presence-aware continuous context.

---

## Current Implementation (Audit)

| Component | Path | Status |
|-----------|------|--------|
| GestureRecognizer | `mobile/spatial-gesture-bridge.ts` | ✅ Complete |
| SpatialProjector | `mobile/spatial-gesture-bridge.ts` | ✅ Complete |
| IntentEmitter (WebSocket) | `mobile/spatial-gesture-bridge.ts` | ✅ Complete |
| ProximityObserver | `mobile/context-observers.ts` | ✅ Complete |
| ThermalObserver | `mobile/context-observers.ts` | ✅ Complete |
| PreviewQueue | `mobile/ambient-skin/PreviewQueue.ts` | ✅ Complete |
| IntentTTL | `mobile/ambient-skin/IntentTTL.ts` | ✅ Complete |
| Confidence Threshold | — | ❌ Missing |
| 10Hz Throttle | — | ❌ Missing |
| SESSION_EXPIRED | — | ❌ Missing |
| Sartan/Patryn Mapping | — | ⚠️ Partial |

---

## Requirements (per mobile-gesture-haptic-spec.md)

### 1. Confidence Threshold (Section 4.3)

```typescript
interface GestureResult {
  intent: SpatialIntent | null;
  action: 'execute' | 'confirm' | 'ignore';
}

// Implementation needed in GestureRecognizer
function evaluateConfidence(confidence: number): GestureResult {
  if (confidence >= 0.85) return { intent, action: 'execute' };
  if (confidence >= 0.60) return { intent, action: 'confirm' };
  return { intent: null, action: 'ignore' };
}
```

### 2. 10Hz Throttle

```typescript
class GestureThrottle {
  private lastEmitMs: number = 0;
  private readonly INTERVAL_MS = 100; // 10Hz

  canEmit(): boolean {
    const now = Date.now();
    if (now - this.lastEmitMs >= this.INTERVAL_MS) {
      this.lastEmitMs = now;
      return true;
    }
    return false;
  }
}
```

### 3. SESSION_EXPIRED Handling

Per spec Section 2.3: 3s timeout after leaving near zone → fade to ambient.

```typescript
interface SessionState {
  status: 'active' | 'expiring' | 'SESSION_EXPIRED';
  lastProximityMs: number;
  TIMEOUT_MS = 3000;
}
```

### 4. Gesture Mapping Alignment

| Spec Gesture | Current Type | Alignment |
|--------------|--------------|-----------|
| flick | drag | ✅ Map to flick |
| hold | long_press | ✅ Map to hold |
| circle | twist | ✅ Map to circle |
| pinch | pinch | ✅ Match |
| double-tap | double_tap | ✅ Match |
| long-press | long_press | ✅ Match |
| tap (Patryn) | tap | ✅ Match |
| swipe_left | — | ❌ Add |
| swipe_right | — | ❌ Add |

---

## Implementation Plan

1. **Create `GestureThrottle`** — `mobile/ambient-skin/GestureThrottle.ts`
2. **Add confidence evaluation** — Extend `GestureRecognizer` 
3. **Add SESSION_EXPIRED** — Extend `ImmersionContext` or create `SessionManager`
4. **Fill gesture gaps** — swipe_left, swipe_right for Patryn mode
5. **Wire into existing pipeline** — Connect to IntentEmitter

---

## Delivery

- **Owner:** Samah (XR Architect)
- **Dependencies:** Orla's spec (`docs/mobile-gesture-haptic-spec.md`)
- **Testing:** Unit tests for throttle, confidence threshold

---

**Contract confirmed:** Implementation proceeds.

---

## Visual Feedback Spec (Mobile Layer)

Per Paithan's mobile implementation spec:

| State | Opacity | Effect |
|-------|---------|--------|
| Ambient (handles) | 40% | — |
| Fade-in | 200ms | ease-out |
| Hover glow | #00D9FF @60% | +15% scale |
| Commit | 300ms ease-in-out | full opacity |

---

## Sartan Gesture Map

| Gesture    | Threshold   | Output        | Haptic |
| ---------- | ----------- | ------------- | ------ |
| tap        | <200ms      | select        | light  |
| double_tap | gap <300ms  | confirm       | double |
| long_press | >500ms      | context menu  | heavy  |
| drag_x/y   | >30px       | translate X/Y | soft   |
| drag_z     | 0.85 conf   | translate Z   | medium |
| pinch      | scale delta | scale         | medium |

---

## V0.2 Spec Lock

### Rotate
- **Gesture**: two-finger twist >15°
- **Output**: rotate Z
- **Haptic**: medium

### Confidence Threshold
- **0.85** → commit action
- **<0.85** → queue for split decision

### Ambient Modes
| Mode     | Visibility | Handles | Behavior |
| -------- | ---------- | ------- | -------- |
| full     | 100%       | visible | hover glow, real-time preview |
| ambient  | 40%        | ghosted | pulse on focus |
| silent   | 0%         | none    | tap-to-reveal (3s fade) |
