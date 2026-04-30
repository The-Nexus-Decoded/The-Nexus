# ANewLuv Photo Moderation Worker — Implementation Spec

Date: 2026-04-30  
Owner: Devon (Dev-Rapid)  
Status: Code gate clear for fixture-only proof. Real queue gate remains closed until service-account/JWT/actor_key env is provisioned.

## Purpose

This worker is a **recommendation-only** photo moderation proof for ANewLuv.

It does not replace the existing admin photo approval tools. The current implementation proves that an AI worker can read a pending-photo queue, analyze images, normalize recommendation output, and report a redacted result without mutating Xano state.

## Current implementation state

Implemented on branch:

```txt
feat/anewluv-photo-moderation-worker
```

Verified pushed commit:

```txt
b7fc9c0aa fix: prefer codex oauth image provider
```

Accepted fixture smoke:

```txt
endpoint: https://chatgpt.com/backend-api/codex/responses
writes: false
/photos/decide: not called
image_generation_events: 0
validator: pass
queue_source: local_redacted_fixture
```

## Provider route order

### 1. Primary — Codex OAuth / OpenClaw route

The worker must use this route first:

```http
POST https://chatgpt.com/backend-api/codex/responses
Authorization: Bearer <~/.codex/auth.json access_token>
```

Required request shape:

```json
{
  "model": "gpt-5.5",
  "store": false,
  "stream": true,
  "instructions": "Return only compact JSON for Anewluv profile photo moderation. Use recommendation language only: approve_recommendation, reject_recommendation, review, or escalate. Do not make final moderation decisions. Do not generate or edit images.",
  "tools": [{"type": "image_generation", "model": "gpt-image-2"}],
  "input": [{
    "role": "user",
    "content": [
      {"type": "input_text", "text": "Classify this profile photo candidate and return strict JSON."},
      {"type": "input_image", "image_url": "<PNG/JPEG/WEBP data_url or URL>"}
    ]
  }],
  "text": {"format": {"type": "json_object"}}
}
```

Image inputs must be PNG, JPEG, WEBP, or GIF. Local `.ppm` fixtures are converted to PNG data URLs before provider submission; raw `.ppm` is never sent.

### 2. Public OpenAI Responses API — fallback only

```http
POST https://api.openai.com/v1/responses
```

This route is not the primary path and must not block the worker. Current observed status was `429 insufficient_quota` on the public API path.

### 3. OpenAI Moderations API — safety supplement only

OpenAI Moderations is not an ANewLuv-specific profile-photo decision route. It may only be used as broad safety signal if explicitly added later.

### 4. MiniMax VL / OpenClaw image analysis — fallback

Use only if Codex OAuth and public OpenAI image route are unavailable or unreliable.

### 5. OpenRouter multimodal — last fallback

Last-resort fallback only.

## Normalized worker output

The worker must output recommendation language only:

```txt
approve_recommendation
reject_recommendation
review
escalate
```

Provider output is strictly validated. Known provider drift such as `reject` must normalize to `reject_recommendation`; invalid or unmapped output must fall back to `review` with validation failure surfaced.

The tiny dry-run must not write final moderation decisions.

## Xano queue read contract

First real queue proof is still blocked until env/secrets exist.

Once provisioned, the allowed first live Xano call is:

```http
GET <ANEWLUV_API_BASE_URL>/photos/queue?actor_key=<ANEWLUV_ACTOR_KEY>&actor_type=ai_agent&limit=5
Authorization: Bearer <ANEWLUV_WORKER_JWT or ANEWLUV_WORKER_TOKEN>
```

Required env contract:

```txt
ANEWLUV_API_BASE_URL
ANEWLUV_AUTH_API_BASE_URL
ANEWLUV_ACTOR_KEY
ANEWLUV_WORKER_JWT or ANEWLUV_WORKER_TOKEN
```

Do not invent `x-actor-key` unless Xano docs or implementation prove support for it. Current accepted queue contract uses `actor_key` input/query transport.

## Dry-run seal

Tiny dry-run remains read-only:

```txt
GET /photos/queue only after auth env exists
POST Codex OAuth provider analysis allowed
no ai_recommendation writes
no /photos/ai_recommendation
no /photos/ai_decide
no /photos/decide
no final decisions
redacted output only
```

Forbidden until Lord Xar explicitly opens the write gate:

```txt
POST /photos/ai_recommendation
POST /photos/ai_decide
POST /photos/decide
Photos.ai_* writes
admin_notes writes
audit/evidence table writes
```

## Relationship to existing admin photo approval tools

The implementation is intentionally narrower than the existing admin approval system.

Existing/admin-visible paths remain canonical for final decisions:

```txt
/photos/decide
Photos.photostatus_id
reject_reason_code
admin_notes target_type=user_photo
moderation/validate_reason_code
moderation_keywords
moderation_audit_log
photo_review_type
```

Current locked integration decision:

1. AI worker is recommendation-only.
2. Manual moderation remains the final decision path.
3. The worker does not call `/photos/decide`.
4. The worker does not impersonate admin.
5. Existing admin tools should continue to own approval/rejection finalization.
6. If a future write path is approved, it must preserve existing `/photos/decide` semantics for `Photos.photostatus_id`, `reject_reason_code`, and `admin_notes`.

## Existing-path reconciliation

The admin onboarding list may differ because it describes the existing manual/admin finalization tools. That does not conflict with the worker proof if the boundary is preserved:

| Area | Existing admin tool/system | Worker implementation |
|---|---|---|
| Pending photo source | Existing photo moderation queue | Reads queue only after env gate |
| AI analysis | None / external proof path | Codex OAuth image analysis |
| Recommendation | Existing `Photos.ai_*` fields may exist | Report-only for now; no Xano writes |
| Final approval/rejection | Existing `/photos/decide` | Not called |
| Rejection reason/note | `/photos/decide` → `admin_notes` | Not written |
| Audit/history | Existing moderation audit patterns | Not written |
| Manual admin UI | Existing admin approval workflow | Remains final authority |

## Redaction and logging rules

Never print or commit:

```txt
ANEWLUV_ACTOR_KEY
ANEWLUV_WORKER_JWT
ANEWLUV_WORKER_TOKEN
Codex OAuth access_token / refresh_token / id_token
Authorization headers
raw queue item payloads containing user identifiers
raw image URLs if they contain sensitive references
```

Shared reports must include only redacted/summarized fields.

## Current gate state

```txt
code gate: clear
provider route: corrected to Codex OAuth primary
fixture smoke: accepted
writes: false
/photos/decide: not called
real queue: blocked until service-account/JWT/actor_key env exists
```

## Forwardable summary for admin onboarding

The worker is not proposing a replacement for existing admin photo approval. It is a read-only AI recommendation proof. The admin should onboard Devon against the existing queue and final approval workflow, with this boundary:

```txt
AI reads pending photos -> AI returns normalized recommendation -> human/admin existing tools make final decision
```

No final approval/rejection write path is open yet.
