# Gesture Resolver Contract

**Status:** Draft  
**Owner:** Paithan (VR implementation)  
**Source:** Orla (spec)

---

## Core Flow

Mobile tap → `SpatialIntent` payload → VR WebSocket → gesture mapping → VR-native gesture

---

## Payload Structure

```typescript
interface SpatialIntent {
  action: "tap" | "hold" | "swipe";
  position: { x: number; y: number; z: number };
  target: string;
  timestamp: number;
}
```

---

## Ambient Modes (Samah)

| Mode | Description |
|------|-------------|
| full | All gestures active |
| ambient | Reduced input, passive |
| silent | Input disabled |

## States

| State | Description |
|-------|-------------|
| idle | Default, no input detected |
| hover | Pointer/touch over interactive element |
| active | Gesture in progress |
| disabled | Input ignored |

---

## WebSocket Contract

- **Endpoint:** TBD (Samah to provide)
- **Protocol:** JSON over WebSocket
- **Direction:** Mobile → VR

---

## Acceptance Criteria

1. Mobile can emit `SpatialIntent` with all 3 action types
2. VR receives payload via WebSocket
3. Position coordinates map correctly to VR world space
4. Ambient modes transition correctly between all 4 states
5. Timestamp enables gesture duration calculation (tap vs hold)

## Animation Timings (V1)

| Animation | Duration |
|-----------|----------|
| Fade | 200ms |
| Pulse | 300ms |
| Scale | 150ms |
| Transition | 400ms |

---

## TODO

- [ ] Confirm WebSocket endpoint with Samah
- [ ] Define coordinate system (world vs normalized)
- [ ] Add swipe direction vectors
- [ ] Define error handling / reconnection logic
