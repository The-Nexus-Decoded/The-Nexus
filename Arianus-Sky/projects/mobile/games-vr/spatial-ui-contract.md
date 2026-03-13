# Spatial UI Contract

## Overview
Defines the contract between mobile companion and XR spatial interface for gesture manipulation, state synchronization, and intent bridging.

---

## Manipulation Matrix

| Gesture | Mobile Input | XR Output | Priority |
|---------|--------------|-----------|----------|
| **Grab** | Touch-hold on object | Attach to hand collider | High |
| **Drag** | Touch-move while grabbed | World-space delta translation | High |
| **Rotate** | Two-finger twist | Quaternion delta applied to target | Medium |
| **Scale** | Pinch gesture | Uniform scale multiplier | Medium |
| **Point** | Single tap on surface | Raycast hit → cursor position | Low |
| **Pull** | Long-press + drag away | Detach, leave at world position | High |
| **Throw** | Release while moving | Velocity transfer to physics body | High |

---

## Contract Schema

```typescript
interface SpatialIntent {
  id: string;
  timestamp: number;
  gesture: GestureType;
  source: 'mobile' | 'xr';
  target: EntityId | null;
  payload: GesturePayload;
}

type GestureType = 
  | 'grab' | 'drag' | 'rotate' | 'scale' 
  | 'point' | 'pull' | 'throw' | 'release';

interface GesturePayload {
  position?: Vector3;
  delta?: Vector3;
  rotation?: Quaternion;
  scale?: number;
  velocity?: Vector3;
}

interface EntityState {
  id: EntityId;
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  grabbedBy: EntityId | null;
  lastUpdated: number;
}
```

---

## Sync Protocol

- **Mobile → XR**: `SpatialIntent` events via WebSocket
- **XR → Mobile**: `EntityState` snapshots at 30Hz
- **Conflict Resolution**: XR authority on world-space, mobile authority on local manipulation

---

## Error States

| State | Condition | Recovery |
|-------|-----------|----------|
| `DISCONNECTED` | WebSocket closed | Auto-reconnect, queue intents |
| `TIMEOUT` | Intent ack > 500ms | Retry with exponential backoff |
| `GHOST_GRAB` | Target entity not in XR scene | Cancel gesture, notify mobile |
