# XRPC-SPEC.md — Mobile↔VR RPC Specification

## Overview

XRPC is the bidirectional communication layer between the mobile companion app and the VR headset. It handles gesture intent flow, state synchronization, and handoff protocols.

## Core Principles

1. **Latency Budget**: 100ms max round-trip (mobile → VR → mobile)
2. **Graceful Degradation**: Offline/weak-signal tolerance with queueing
3. **Bidirectional Confirmation**: VR↔mobile handshake for every intent
4. **Idempotent Operations**: Retry-safe intent processing

---

## 1. Gesture Intent Flow

### 1.1 GestureThrottle

- **Rate Limit**: 10Hz (100ms interval) per gesture type
- **Confidence Thresholds**:
  - `≥0.85` → execute immediately
  - `0.60–0.84` → require user confirmation
  - `<0.60` → ignore

### 1.2 Intent Queue

- **Capacity**: 3-deep FIFO
- **Sustained Session Cap**: Max 5 concurrent sessions
- **Overflow Behavior**: `drop_oldest`

### 1.3 IntentResolver

- Bidirectional VR↔mobile confirmation flow
- Transform invalid intents into valid ones where possible
- Reject with typed error codes

---

## 2. Error Codes (Contract-Locked)

| Code | Meaning |
|------|---------|
| `object_not_found` | Target entity missing |
| `out_of_bounds` | Gesture outside valid zone |
| `confidence_too_low` | Sensor confidence below threshold |
| `timeout` | Intent expired before resolution |
| `invalid_transition` | State machine violation |

---

## 3. State Broadcast (VR → Mobile)

```typescript
interface StateBroadcast {
  state: any;
  ttlMs: number;      // Cache TTL in ms
  timestamp: number;
  source: 'vr' | 'mobile';
}
```

- **TTL Tiers**:
  - Foreground: 5000ms
  - Background: 60000ms
  - Handoff: 300000ms

---

## 4. Charge Events (Cast/Charge)

```typescript
type ChargeState = 'start' | 'stop';

interface ChargeEvent {
  intentId: string;
  state: ChargeState;
  timestamp: number;
}
```

- Discrete start/stop events for spell casting and weapon charging

---

## 5. Undo Manager

- **Temporal Window**: 3 seconds
- **Scope**: Last gesture intent per session
- **Trigger**: Double-tap or explicit gesture

---

## 6. Z-Depth Sync

```typescript
interface ZDepthConfig {
  authority: 'last_writer_wins';
  maxDeltaPerSecond: number;
  fallback: 'vr';
  confidenceThreshold: number; // >= threshold = mobile commits, < threshold = queue for VR
}
```

- Mobile commits directly if `confidence >= confidenceThreshold`
- Queues for VR decision otherwise

---

## 7. Feedback Timing (Locked Spec)

| Feedback | Duration | Visual |
|----------|----------|--------|
| CONFIRMED | 200ms | `scale_pulse`, cyan |
| ERROR | 300ms | `shake`, red |

### Gesture → Visual Map

| Gesture | Visual Effect |
|---------|---------------|
| TAP | glow |
| DOUBLE_TAP | glow |
| LONG_PRESS | glow_pulse |
| DRAG | ghost_wireframe |
| PINCH | corner_handles |
| ROTATE | rotation_ring |
| PINCH_SARTAN | depth_handle |
| FLICK | ghost_wireframe |
| HOLD | glow_pulse |
| CIRCLE | rotation_ring |

### Timing Constants

- `GESTURE_TO_HEADSET_CONFIRM_MS: 2000`
- `DOUBLE_TAP_INTERVAL_MAX_MS: 300`
- `LONG_PRESS_THRESHOLD_MS: 500`
- `MIN_TOUCH_TARGET_PT: 44`

---

## 8. Priority & TTL

### Intent Types

- `cast`, `movement`, `menu`, `combat`, `trade`, `social`

### TTL by Type (ms)

| Type | TTL |
|------|-----|
| cast | 2000 |
| movement | 500 |
| menu | 5000 |
| combat | 1000 |
| trade | 10000 |
| social | 30000 |

### Priority Levels

- `high`: 3
- `normal`: 2
- `low`: 1

---

## 9. Connection Status

- `connected` — Full bidirectional sync
- `disconnected` — Queueing intents locally
- `reconnecting` — Attempting restore
- `warning` — High latency detected

---

## 10. Implementation

| File | Responsibility |
|------|-----------------|
| `GestureThrottle.ts` | Rate limiting + confidence filtering |
| `IntentQueue.ts` | FIFO queue with overflow handling |
| `IntentResolver.ts` | Bidirectional confirmation flow |
| `UndoManager.ts` | 3s temporal undo window |
| `StateReconciliation.ts` | Delta merge strategy |
| `ZDepthSync.ts` | Depth authority resolution |
| `ThermalMonitor.ts` | Thermal tier tracking |
| `AmbientHaptics.ts` | Haptic pattern playback |
| `AttentionLease.ts` | Focus lease management |

---

*Last updated: 2026-03-10*
*Owner: Paithan (Mobile Development)*
