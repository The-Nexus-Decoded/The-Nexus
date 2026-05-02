# Escalation + Owner Ack Contract (#317)

## Active blocker repaired first

The live `POST /photos/escalations/open` probe failed with:

```json
{
  "code": "ERROR_CODE_INPUT_ERROR",
  "message": "Text filter requires an integer, float, string or boolean value.",
  "payload": { "param": "model_path_json" }
}
```

The worker had sent `model_path_json` as an object. Xano currently expects text/scalar input at that filter point, so the worker now serializes `model_path_json` to a compact JSON string before POSTing.

Diagnostic artifact copied to shared storage:

```text
/data/openclaw/shared/anewluv/escalation-open-400-diagnostic-20260501T045214Z.json
sha256: 6b1414f0dbf0893a0a30d5fa933448d7d4055c3f18280417371674b7305fa63f
```

No diagnostic partial escalation row was found for the object-payload failure.

A follow-up probe with `model_path_json` serialized as a JSON string was accepted by Xano. Important leak: `expected_current_status=999` did **not** prevent creation, so the escalation-open endpoint currently accepts the fixed payload but does not enforce that race guard. The diagnostic escalation created by that probe was dismissed immediately.

```text
accepted-probe artifact: /data/openclaw/shared/anewluv-photo-moderation-live-runs/escalation-open-string-contract-probe-20260501T045355Z.json
accepted-probe sha256: 2ec89b75852d93a58d38b6e3cea56191c620fbce980e91a40efc77da6811164d
cleanup artifact: /data/openclaw/shared/anewluv-photo-moderation-live-runs/escalation-diagnostic-58-dismiss-20260501T045421Z.json
cleanup sha256: 0ac381f921ced39ff3005b206f971dc5078820aab03816f29ce8cd2826964278
```

## `POST /photos/escalations/open` request contract

Sanitized body shape:

```json
{
  "photo_id": 9288,
  "user_id": null,
  "route": "agent_review",
  "reason_code": "low_quality",
  "note": "short admin note",
  "severity": "normal",
  "model_path_json": "{\"fallback_model\":null,\"moderation_api_used\":false,\"moderation_model\":null,\"vision_model_used\":\"...\"}",
  "run_id": "uuid",
  "idempotency_key": "uuid:9288:escalation",
  "expected_current_status": 1,
  "actor_type": "ai_agent",
  "actor_key": "[REDACTED]"
}
```

Rules:

- never print or commit `actor_key`;
- `model_path_json` is text containing JSON, not an object;
- `expected_current_status = 1` is sent as the intended race guard for uploaded photos;
- current live probe shows escalation-open may not enforce that guard yet, so worker-side uploaded/deleted filtering remains mandatory and live batches stay paused until owner accepts that risk or Xano adds enforcement;
- 409 remains a race skip, not a blind retry;
- non-409 4xx hard-fails the run so unresolved moderation cases are not hidden.

## Owner ack/list path

Client methods added:

- `GET /photos/escalations?status=open&route=agent_review`
- `POST /photos/escalations/ack`

Ack body shape:

```json
{
  "escalation_id": 7,
  "status": "acknowledged",
  "expected_current_status": "open",
  "expected_route": "agent_review",
  "idempotency_key": "run_id:7:ack",
  "note": "owner ack note",
  "actor_type": "ai_agent",
  "actor_key": "[REDACTED]"
}
```

## Retry / idempotency stance

- Same escalation ack retry must reuse the same `idempotency_key`.
- Status/route mismatch must skip, not retry blind.
- Discord/owner notification failure must not roll back an already accepted API ack decision.
- Until a single controlled live escalation request accepts, do not resume capped live moderation batches.

## Validation

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Required test coverage:

- escalation payload serializes `model_path_json` as text;
- list endpoint includes `status`, `route`, and actor params;
- ack endpoint includes race guards and idempotency key;
- existing 409 handling remains skip behavior.
