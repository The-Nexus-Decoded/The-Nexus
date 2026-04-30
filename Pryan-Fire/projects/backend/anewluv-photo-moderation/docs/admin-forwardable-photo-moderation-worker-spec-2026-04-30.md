# Admin-Forwardable Photo Moderation Worker Spec — 2026-04-30

Status: recommendation-only / dry-run worker spec. Scope is unchanged.

Forwarding line:

```txt
This is a recommendation-only worker spec; existing admin approval tools remain the final moderation interface until Lord Xar opens the write/decision gate.
```

## 1. What this worker does

- Reads queued photo data only after the auth/env gate exists.
- Runs deterministic checks plus the approved image-analysis provider route.
- Produces normalized AI recommendations only.
- Emits redacted dry-run output for review.
- Keeps manual/admin moderation as the final approval or rejection path.

Normalized recommendation enum:

```txt
approve_recommendation
reject_recommendation
review
escalate
```

Accepted fixture proof state:

```txt
writes: false
/photos/decide: not called
image_generation_events: 0
validator: pass
queue_source: local_redacted_fixture
```

## 2. What it explicitly does NOT do

- It does not approve photos.
- It does not reject photos.
- It does not make final moderation decisions.
- It does not write `ai_recommendation` fields.
- It does not write any Xano state.
- It does not call `/photos/decide`.
- It does not call `/admin/decision/*`.
- It does not call `/photos/ai_recommendation`.
- It does not call `/photos/ai_decide`.
- It does not impersonate an admin.
- It does not bypass existing admin approval tools.
- It does not use or create `Profiles.is_ai`.

## 3. How it fits existing admin approval tools

Existing admin approval tools remain final.

The intended lane is:

```txt
AI reads pending photos -> AI returns normalized recommendation -> human/admin existing tools make final decision
```

Admin-visible/manual paths remain canonical for final moderation state, including the existing final approval/rejection interface and its rejection reason/note behavior.

The worker only supplies recommendation evidence. If an admin tool list includes approval or rejection endpoints such as `/admin/decision/*`, those remain outside this worker's dry-run scope. The worker must not call them unless Lord Xar explicitly opens a future write/decision gate.

## 4. Auth/env gate

Real queue access is still blocked until service-account/JWT/actor_key env is provisioned.

Required env contract:

```txt
ANEWLUV_API_BASE_URL
ANEWLUV_AUTH_API_BASE_URL
ANEWLUV_ACTOR_KEY
ANEWLUV_WORKER_JWT or ANEWLUV_WORKER_TOKEN
```

Allowed first live proof after env exists:

```txt
GET /photos/queue only
users JWT / worker token
actor_key
actor_type=ai_agent
small limit
redacted output
zero writes
```

Do not print secrets or token material. Do not invent `x-actor-key` unless Xano docs or implementation prove support for it. Current accepted queue contract uses `actor_key` input/query transport.

## 5. Provider route

Primary provider route is Codex OAuth / OpenClaw route:

```http
POST https://chatgpt.com/backend-api/codex/responses
Authorization: Bearer <~/.codex/auth.json access_token>
```

Required request properties:

```txt
model: gpt-5.5
store: false
stream: true
instructions field present
tools: [{type: image_generation, model: gpt-image-2}]
input_text + input_image
image converted to PNG/JPEG/WEBP, never raw .ppm
```

Public OpenAI `/v1/responses` is fallback only and must not block the primary Codex OAuth path.
