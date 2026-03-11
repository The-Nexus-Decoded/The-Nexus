# Gesture Resolver Contract
# Mobile → XR Intent Handoff Specification
# Owner: Samah (XR Spatial Layer)
# Implementation: Paithan (Mobile Gesture Engine)

## Overview
This contract defines the interface between the mobile gesture capture layer and the XR spatial intent consumption layer.

## Phase 1: Core Infrastructure

### 1.1 Configuration
| Parameter | Value | Source |
|-----------|-------|--------|
| CONFIDENCE_THRESHOLD | ≥0.80 | companion-feedback-states |
| THROTTLE_INTERVAL_MS | 100 | 10Hz max rate |
| UNDO_WINDOW_MS | 3000 | 3 second window |
| INTENT_QUEUE_DEPTH | 3 | 3-deep FIFO |
| SESSION_EXPIRY_MS | 300000 | 5 minutes idle |

### 1.2 WebSocket Endpoint
- Default: `wss://xr.soul-drifter.local:443/gesture/stream`
- Protocol: JSON-RPC 2.0 over WebSocket (wss)

### 1.3 GestureEvent Payload Schema
```typescript
interface GestureEvent {
  gesture_id: string;
  intent: {
    action: 'move' | 'rotate' | 'scale' | 'select';
    target: string;
    source: 'gesture' | 'menu' | 'depth_handle';
    confidence: number;        // 0.0-1.0
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
  thermal: {
    temperature: number;
    tier: 0 | 1 | 2 | 3 | 4;  // 0=unspecified, 1=cool, 2=warm, 3=hot, 4=critical
    timestamp: number;
  };
  timestamp: number;
}
```

### 1.3 Coordinate System
- Input: Normalized 0-1 from touch gesture
- Output: World units via SpatialProjector
- OOB handling: Reject with `OUT_OF_BOUNDS` error

## Phase 2: Session Management

### 2.1 Session States
```
ACTIVE → IDLE → EXPIRED → DISCONNECTED
```

### 2.2 State Transitions
| From | To | Trigger |
|------|-----|---------|
| ACTIVE | IDLE | 60s no gesture |
| IDLE | EXPIRED | 5min idle |
| EXPIRED | DISCONNECTED | WebSocket close |
| * | ACTIVE | Valid gesture |

## Phase 3: Gesture Semantics

### 3.1 Cast vs Charge
| Gesture | Duration | Magnitude | Action |
|---------|----------|------------|--------|
| Cast | <200ms | >0.7 | Immediate dispatch |
| Charge | 500-2000ms | builds 0→1 | Intensity on release |

### 3.2 Swipe Direction Vectors
- **Patryn (right hand)**: left→right = positive X
- **Sartan (left hand)**: right→left = negative X

## Phase 4: Error Handling

### 4.1 Error Codes
| Code | Meaning | Recovery |
|------|---------|----------|
| SESSION_EXPIRED | Session timed out | Reconnect WS |
| OUT_OF_BOUNDS | Gesture outside bounds | Clamp or reject |
| THROTTLED | Rate limit exceeded | Queue or drop |
| CONNECTION_LOST | WS disconnected | Auto-reconnect |

### 4.2 TTL Values
- Intent TTL: 5000ms
- Ack TTL: 2000ms
- Reconnect backoff: 1000ms → 8000ms (exponential)

## Phase 5: XR Integration

### 5.1 Intent Payload Schema
```typescript
interface SpatialIntent {
  id: string;
  type: 'cast' | 'charge';
  action: string;
  target: string;
  position: { x: number; y: number; z: number };
  intensity?: number; // 0-1 for charge
  handedness: 'patryn' | 'sartan';
  timestamp: number;
  sessionId: string;
}
```

### 5.2 Action→Effect Mapping
| Action | XR Effect |
|--------|-----------|
| move | ghost_wireframe |
| rotate | rotation_ring |
| scale | scale_handle |
| select | highlight_pulse |

### 5.3 Acknowledgment Pattern
- Mobile sends intent → XR consumes → XR sends ACK
- ACK triggers AmbientSkin haptics per tier

## Implementation Status

| Component | File | Status |
|-----------|------|--------|
| Gesture Types | `gesture-types.ts` | ✅ Done |
| Intent Queue | `intent-queue.ts` | ✅ Done |
| Undo Manager | `undo-manager.ts` | ✅ Done |
| WebSocket Client | `gesture-stream.ts` | ✅ Done |
| Exports | `index.ts` | ✅ Done |
| XR Effect Mapping | `gesture-types.ts` | ✅ Done |
| **Phase 2: Session Management** | | |
| XRpcError Codes (9) | `gesture-types.ts` | ✅ Done |
| ImmersionContext | `gesture-types.ts` | ✅ Done |
| Swipe Direction Mapping | `gesture-types.ts` | ✅ Done |
| Confidence Threshold (≥0.85) | `gesture-types.ts` | ✅ Done |

## Owner
Samah (XR Spatial Layer) — responsible for XR-side consumption, SpatialProjector, gesture-to-action mapping.
