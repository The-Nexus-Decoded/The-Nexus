# XR V1 Spec - Historical Paithan Handoff

This is a historical handoff from prior `#games-vr` work. The current UI/UX owner is Paithan. Do not route to Orla.

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
- drop oldest
- ephemeral on app background

## Confidence Threshold

- >=0.85: auto-commit
- <0.85: queue for VR confirm

## State Reconciliation

- VR wins when direct spatial input conflicts with delayed mobile input.
- Use delta merge protocol for non-conflicting updates.

## Z-Depth Sync

- last writer wins
- 0.5 units/sec max delta
- VR fallback required

Received: 2026-03-09 23:05 CDT  
Source: historical UI handoff in `#games-vr`.
