# Transformer Interface Spec

## Purpose
Bridge mobile app input/output to Haplo's backend socket for VR game state sync.

## Interface Contract

### Outbound (Mobile → Haplo)
```typescript
interface OutboundMessage {
  type: 'input' | 'sync' | 'heartbeat';
  payload: InputPayload | SyncPayload | null;
  timestamp: number; // Unix ms
  sequence: number;
}

interface InputPayload {
  action: 'grab' | 'release' | 'point' | 'gesture';
  hand: 'left' | 'right';
  position: [x: number, y: number, z: number];
  rotation: [x: number, y: number, z: number, w: number];
}

interface SyncPayload {
  playerId: string;
  state: PlayerState;
}
```

### Inbound (Haplo → Mobile)
```typescript
interface InboundMessage {
  type: 'state' | 'event' | 'error';
  payload: StatePayload | EventPayload | ErrorPayload;
  timestamp: number;
}

interface StatePayload {
  worldState: WorldState;
  players: Record<string, PlayerState>;
  timestamp: number;
}

interface EventPayload {
  eventType: 'object_grabbed' | 'object_released' | 'collision' | 'zone_entered';
  source: string;
  data: Record<string, unknown>;
}
```

## Socket Config (Haplo → Paithan)
- **Protocol:** WebSocket (wss://)
- **Target:** `/ws/vr-game` (configurable)
- **Reconnect:** Exponential backoff (100ms → 5s max)
- **Heartbeat:** Every 5s, 10s timeout
- **Buffer:** Per-message batching up to 16ms before flush

## Latency Budget
- Network: <30ms (target)
- Processing: <5ms
- Buffer flush: <5ms
- **Total:** <40ms (within 50ms spec)

## Error States
- `ECONNREFUSED` → Trigger reconnect + UI "Connecting..."
- `TIMEOUT` → Queue inputs, show "Reconnecting..."
- `INVALID_STATE` → Log + request full state sync

## To Do
- [ ] Confirm socket endpoint path with Haplo
- [ ] Validate buffer sizing (16ms vs 8ms)
- [ ] Define packet loss UI states (if needed)
