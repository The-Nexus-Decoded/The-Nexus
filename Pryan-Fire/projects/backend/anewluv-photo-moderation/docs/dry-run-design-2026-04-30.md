# Anewluv Photo Moderation — Dry-Run Design

Date: 2026-04-30  
Mode: design only. No write-capable path implemented.

## Purpose

The dry-run mode is the first executable vessel for the Anewluv photo moderation system. It must prove the queue read, image fetch, deterministic checks, model path, normalized result, and planned action without writing production state.

Dry-run must be safe enough to run against production queue data because it does not mutate Xano records and does not expose raw sensitive payloads.

## Required commands

```bash
photo-sweeper --once --dry-run --limit 10
photo-sweeper --once --photo-id <id> --dry-run
photo-sweeper --once --photo-id <id> --force
```

Design note: `--force` must not override dry-run safety. A forced write requires explicit non-dry-run mode plus write gates that are not approved yet.

## Runtime phases

### Phase 0 — startup safety checks

- Load config from env names only; never print values.
- Require `--dry-run` unless write mode is explicitly implemented and enabled later.
- Confirm lock acquisition, even for dry-run, so command behavior matches cron behavior.
- Emit a sanitized run id.
- Emit whether write gates are disabled.

### Phase 1 — queue source

Initial intended source:

```text
GET /photos/queue
```

Current blocker:

- endpoint requires user JWT plus sensitive `actor_key`;
- safe auth source is not yet confirmed;
- direct dry-run cannot call it until the auth contract is resolved.

Fallback for local design/testing only:

- use redacted fixture JSON shaped like the queue response;
- fixture must not contain real emails, raw user PII, or production image URLs unless explicitly authorized.

### Phase 2 — item normalization

Queue item shape from real endpoint:

```json
{
  "id": 123,
  "users_id": 456,
  "photo_url": "https://...",
  "photostatus_id": 1,
  "gallery": true,
  "created_at": "...",
  "user_name": "...",
  "user_email": "..."
}
```

Internal sanitized photo manifest should keep:

```json
{
  "photo_id": 123,
  "user_id": 456,
  "image_url_present": true,
  "queue_source": "GET /photos/queue",
  "photostatus_id": 1,
  "gallery": true,
  "created_at": "..."
}
```

Do not print `user_email` in normal dry-run output.

### Phase 3 — deterministic checks

Initial deterministic checks should be pure read-only image inspection:

- URL presence and supported scheme;
- file extension/content-type if available;
- file size if fetch headers allow it;
- image dimensions;
- blank/solid-color score;
- darkness/exposure score;
- simple sharpness estimate if dependencies allow it;
- OCR/QR checks only after runtime dependencies are available or via model result.

Local dependency state at design time:

- available: Python, Pillow, Numpy, `file` binary;
- unavailable: OpenCV, pyzbar/zbar, zxing, tesseract binary.

### Phase 4 — broad safety moderation

Optional OpenAI Moderations adapter:

- endpoint: `POST https://api.openai.com/v1/moderations`
- model: `omni-moderation-latest`
- purpose: broad harmful-content safety only;
- not sufficient for Anewluv-specific profile rules.

Current blocker:

- availability probe returned HTTP 429.

Dry-run behavior if unavailable:

- set `moderation_api_used=false`;
- set `moderation_model=null`;
- add warning to run evidence;
- do not auto-approve if broad safety was required by policy config.

### Phase 5 — primary image/vision review

The vision adapter is the main app-specific reviewer.

Must produce strict normalized result:

```json
{
  "verdict": "approved | rejected | review | escalate",
  "confidence": 0.0,
  "reason_code": "string",
  "note": "short admin-readable reason",
  "unsafe_categories": [],
  "app_profile_photo_checks": {
    "is_profile_style_photo": true,
    "has_contact_info": false,
    "is_meme_or_screenshot": false,
    "is_blank_or_unusable": false,
    "is_ai_generated": false,
    "needs_human_review": false
  },
  "moderation_api_used": false,
  "moderation_model": null,
  "vision_model_used": "actual model/tool path",
  "fallback_model": null,
  "deterministic_checks_used": []
}
```

Current blocker:

- OpenClaw image tool path failed local PNG/JPG availability probe with `Failed to optimize image`.
- MiniMax key name is present but endpoint/request/response contract is not verified.

Dry-run behavior if no vision path is verified:

- every photo returns `verdict=escalate` or `review`;
- `reason_code=policy_unclear` or `manual_review_needed`;
- planned action must not be approve/reject.

### Phase 6 — decision combiner

Combiner policy:

- auto-approve only if safety passes, vision confirms clean profile-style photo, deterministic checks pass, no contact info, not AI-generated, not meme/screenshot/ad/QR/text-only/collage, no minor/nudity ambiguity, and confidence is high.
- auto-reject only if failure is high-confidence, reason maps to supported rejection reason, and audit path can be written.
- review when confidence/model/checks are unclear or inconsistent.
- escalate for serious safety, minors/nudity ambiguity, abuse/scam suspicion, repeated suspicious users, model/tool failure, uncertainty about real human/profile status, or uncertainty about AI-generated status.

Dry-run never writes this decision. It only emits planned action.

### Phase 7 — dry-run output

Sanitized per-photo output:

```json
{
  "photo_id": 123,
  "user_id": 456,
  "queue_source": "GET /photos/queue",
  "dry_run": true,
  "write_enabled": false,
  "model_path": {
    "moderation_api_used": false,
    "moderation_model": null,
    "vision_model_used": "unverified",
    "fallback_model": null
  },
  "deterministic_checks_used": [],
  "normalized_result": {
    "verdict": "review",
    "confidence": 0.0,
    "reason_code": "manual_review_needed",
    "note": "Vision path unavailable; no safe automatic decision."
  },
  "planned_action": "leave_pending",
  "would_write_recommendation": false,
  "would_finalize_decision": false,
  "would_escalate": true
}
```

Run summary:

```json
{
  "dry_run": true,
  "photos_scanned": 0,
  "auto_approved": 0,
  "auto_rejected": 0,
  "review": 0,
  "escalate": 0,
  "failures": [],
  "model_api_path_used": [],
  "fallback_usage": 0,
  "next_scheduled_run": null,
  "unresolved_escalations": 0
}
```

## Write gates not yet open

Dry-run design intentionally does not include code that can:

- write `ai_verdict`, `ai_confidence`, `ai_reason_code`, or `ai_note`;
- call `POST /photos/decide`;
- write audit/event rows;
- send email;
- ping owner/Jarvis;
- acknowledge escalations.

Those are separate gates and require contract approval.

## Required blockers to clear before executable dry-run

1. Confirm safe auth source for `GET /photos/queue` without printing or committing secrets.
2. Verify or build a redacted fixture path if real queue dry-run auth is not ready.
3. Verify a vision-capable model path with image URL input and strict JSON output.
4. Decide deterministic dependency scope.
5. Confirm where sanitized dry-run evidence should be written.

## Required blockers to clear before non-dry-run writes

1. Resolve `/photos/decide` actor contract: `ai_agent` is required by assignment, but real endpoint currently requires `admin`.
2. Confirm or create AI recommendation write endpoint on a Xano branch.
3. Confirm or create AI photo audit detail path on a Xano branch.
4. Confirm escalation queue/ack path and owner alert route.
5. Confirm backend-mediated email path.
6. Confirm canonical reason-code mapping between assignment codes and real Xano/admin UI codes.
