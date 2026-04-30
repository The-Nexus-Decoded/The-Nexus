# Anewluv Photo Moderation — Projection-Based MiniMax Sample

Date: 2026-04-30  
Mode: read-only sample evidence. No Xano writes, no `/photos/decide`, no image reposts, no raw model dumps.

## Scope note

This was **not** an authenticated `GET /photos/queue` integration test. The shell did not have the approved queue JWT/service auth path.

Instead, the sample used the public Photos projection and applied the queue-equivalent filter:

```text
photostatus_id = 1
ai_verdict is null
deleted = false
oldest pending first / projection order available from source
limit = 3
```

Live data drift was observed: pending count changed from `41` to `43` during discovery. Treat this as live-data movement, not a failure.

## Sanitized sample result

| photo_id | source_field | fetchable | ai_verdict | ai_confidence | ai_reason_code | model_used | zero_writes |
|---:|---|---:|---|---:|---|---|---:|
| 13242 | PhotoData.url | true | review | 0.68 | low_quality_or_unusable | minimax/MiniMax-VL-01 + parser | true |
| 13243 | PhotoData.url | true | approve_recommendation | 0.82 | clean_profile_style | minimax/MiniMax-VL-01 + parser | true |
| 13231 | PhotoData.url | true | review | 0.62 | not_a_profile_photo | minimax/MiniMax-VL-01 + parser | true |

## Interpretation

- Image references were fetchable for all three sampled pending photos.
- MiniMax-VL CLI path produced usable descriptions for all three.
- Parser/normalizer now emits recommendation language only:
  - `approve_recommendation`, not `approved`
  - `reject_recommendation`, not `rejected`
- `zero_writes=true` for every row.

## Next gate

Build and test the fixture-backed adapter path before any authenticated queue integration:

```text
fixture queue item -> resolver -> GET Range fetchability probe -> MiniMax CLI adapter -> parser -> dry-run report
```

Authenticated `/photos/queue` remains blocked until service auth is provided through a safe secret path, not Discord.
