# Gesture Resolver Contract

**Version:** 1.0  
**Status:** In Progress  
**Created:** 2026-03-10

---

## Overview

Contract between mobile gesture layer and VR spatial consumer layer. Defines intent resolution with latency-aware token management.

---

## Split Ownership

| Layer | Owner | Deliverables |
|-------|-------|--------------|
| Token Latency Bands | Samah | AckTimeoutManager with confidence-based timeouts |
| VR Gesture Handling | Paithan | SpatialIntent payload, WebSocket bridge, ambient modes |

---

## Token Latency Bands (Samah)

### Requirement

Add confidence-based latency bands to `AckTimeoutManager`:

| Confidence | Timeout | Rationale |
|------------|---------|-----------|
| ≥0.85 (high) | 100ms | Fast commit, trust mobile |
| 0.60-0.84 (medium) | 200ms | Allow VR override window |
| <0.60 (low) | 350ms | Extended timeout or drop |

### Implementation

```typescript
interface LatencyBand {
  minConfidence: number;
  timeoutMs: number;
}

const LATENCY_BANDS: LatencyBand[] = [
  { minConfidence: 0.85, timeoutMs: 100 },
  { minConfidence: 0.60, timeoutMs: 200 },
  { minConfidence: 0.00, timeoutMs: 350 },
];

function getTimeoutForConfidence(confidence: number): number {
  for (const band of LATENCY_BANDS) {
    if (confidence >= band.minConfidence) {
      return band.timeoutMs;
    }
  }
  return LATENCY_BANDS[LATENCY_BANDS.length - 1].timeoutMs;
}
```

### Modified AckTimeoutManager API

```typescript
register(token: string, onAck: () => void, onTimeout: () => void, confidence?: number): void;
```

---

## VR Gesture Handling (Paithan)

### SpatialIntent Payload

```typescript
interface SpatialIntent {
  gesture: 'tap' | 'hold' | 'swipe_left' | 'swipe_right' | 'drag' | 'pinch' | 'twist';
  position: { x: number; y: number; z: number };
  target?: string;
  confidence: number; // 0.0-1.0
  timestamp: number;
  returnToken: string; // For ACK correlation
}
```

### WebSocket Bridge

- Connect to `ws://vr-host:8080/gestures`
- Send `SpatialIntent` on gesture complete
- Expect `{ returnToken: string, status: 'acknowledged' | 'superseded' }` within latency band timeout

### Ambient Mode States

| State | Visibility | Behavior |
|-------|------------|----------|
| `idle` | 40% | Ghost handles, pulse on focus |
| `hover` | 100% | Glow effect, real-time preview |
| `active` | 100% | Full commit, haptic feedback |
| `disabled` | 0% | Tap-to-reveal, 3s fade |

---

## Integration Points

1. Mobile sends `SpatialIntent` with `returnToken`
2. VR receives, processes, sends ACK with `returnToken`
3. Mobile `AckTimeoutManager` clears timeout on ACK
4. On timeout: trigger `onTimeout` callback (retry or fallback)

---

## Delivery

- **Token Latency:** Samah (this branch)
- **VR Handler:** Paithan (pending branch)
- **Integration Test:** End-to-end gesture roundtrip with ACK

---

**Contract locked.** 📐
