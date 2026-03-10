# Mobile ↔ XR Handoff Protocol

## Trigger Conditions

| Source | Trigger | Target |
|--------|---------|--------|
| Mobile | "Enter VR" button tap | XR session starts |
| XR | "Switch to Mobile" gesture | XR passthrough → mobile foreground |
| Either | App backgrounded | Graceful state snapshot |

---

## Handoff Payload

```typescript
interface HandoffPayload {
  version: 1;
  source: 'mobile' | 'xr';
  timestamp: number;
  session: {
    id: string;
    sceneId: string;
    checkpointId?: string;
  };
  context: {
    playerState: PlayerState;
    objectStates: EntityState[];
    spatialAnchors: Anchor[];
  };
  intent: 'resume' | 'handoff' | 'abort';
}
```

---

## Mobile → XR Flow

1. Mobile sends `handoff` intent with full state snapshot
2. XR acknowledges → loads scene from `sceneId`
3. XR applies `objectStates` to world
4. XR restores `playerState` (position, inventory, etc.)
5. Mobile shows "Connected" confirmation → backgrounded

---

## XR → Mobile Flow

1. XR sends `handoff` intent with current state
2. Mobile foregrounds → receives payload
3. Mobile applies state → resumes from checkpoint
4. XR enters idle/passthrough

---

## Conflict Resolution

| Condition | Resolution |
|-----------|------------|
| State mismatch | XR state wins (authoritative world) |
| Missing checkpoint | Fall back to last known good |
| Network loss during handoff | Retry 3x, then abort with error UI |

---

## Error States

- `TIMEOUT` (>5s): Abort, show reconnect UI
- `INVALID_PAYLOAD`: Log error, request resync
- `CHECKPOINT_MISSING`: Restore to scene origin
