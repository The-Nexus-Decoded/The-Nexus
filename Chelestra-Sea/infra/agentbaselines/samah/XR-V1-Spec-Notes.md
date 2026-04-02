# XR V1 Spec - Orla Handoff

## Intent TTL (ms)
```json
{
  "cast": 5000,
  "movement": 500,
  "menu": 10000,
  "combat": 2000,
  "trade": 15000,
  "social": 5000
}
```

## Preview Queue
- max: 3 items
- drop_oldest
- ephemeral (disappears on app background)

## Confidence Threshold
- ≥0.85: auto-commit
- <0.85: queue for VR confirm

## State Reconciliation
- vr_wins
- delta_merge protocol

## Z-depth Sync
- last_writer_wins
- 0.5 units/sec max delta
- vr fallback

---
Received: 2026-03-09 23:05 CDT
Source: Orla (#games-vr)
