# Admin-Forwardable Photo Moderation Worker Spec — 2026-04-30

Status: recommendation-only / dry-run worker spec. Scope is unchanged.

Forwarding line:

```txt
Existing admin approval tools remain the final moderation interface; this worker only produces AI recommendations until Lord Xar explicitly opens the write/decision gate.
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

## 6. Dry-run output shape

Dry-run output is redacted and recommendation-only. It must prove the seal without exposing private image/user data or calling decision endpoints.

Expected shape:

```json
{
  "endpoint_used": "https://chatgpt.com/backend-api/codex/responses",
  "provider": "codex-openai-image",
  "model_route": "Codex OAuth/OpenClaw gpt-5.5 + gpt-image-2 configured image route",
  "writes": false,
  "/photos/decide": "not called",
  "/admin/decision/*": "not called",
  "image_generation_events": 0,
  "normalized_verdict_enum": "review",
  "validator": "pass",
  "queue_source": "local_redacted_fixture"
}
```

Live queue dry-run, once auth/env exists, must remain the same shape but with queue source summarized/redacted. It must not include raw user identifiers, raw image URLs, tokens, actor keys, or Authorization headers.

## 7. Current status / remaining gate

Current status:

```txt
code gate: clear
provider route: Codex OAuth primary
fixture smoke: accepted
writes: false
/photos/decide: not called
/admin/decision/*: not called
real queue: blocked until service-account/JWT/actor_key env exists
```

Remaining gate before real queue dry-run:

```txt
provision ANEWLUV_API_BASE_URL
provision ANEWLUV_AUTH_API_BASE_URL
provision ANEWLUV_ACTOR_KEY
provision ANEWLUV_WORKER_JWT or ANEWLUV_WORKER_TOKEN
then run GET /photos/queue only with redacted output
```

Existing admin approval tools remain the final moderation interface; this worker only produces AI recommendations until Lord Xar explicitly opens the write/decision gate.

## 8. Prompt checklist / image-type review

Core prompt rule:

```txt
Only approve clean_profile_style where all other checks pass. Anything uncertain escalates or goes to manual review.
```

| Reason Code | What We Check | Prompt Description |
|---|---|---|
| `clean_profile_style` | Real human, profile-style photo, no issues | Real person, profile photo — approve |
| `not_a_profile_photo` | Book, object, illustration, artwork, pet-only, logo, landscape, or unrelated image | Not a real person/profile photo — reject/review |
| `ai_generated_image` | AI-generated, synthetic, illustrated, cartoon, anime, rendered, or avatar-style imagery | AI/synthetic image — reject/review |
| `sexual_content` | Explicit sexual content or sexualized framing | Sexual content — escalate |
| `nudity` | Partial or full nudity | Nudity — escalate |
| `pornographic_explicit` | Hard porn or explicit adult material | Explicit porn — escalate |
| `inappropriate_photos` | Other inappropriate image content that does not fit a narrower reason | Inappropriate — escalate |
| `contact_info_or_ad` | Phone, email, social handle, QR code, or ad/promo content in the image | Contact info/ad — reject/review |
| `contact_info_text_only_ad` | Text-only image with handle, phone, email, promo, or contact bait | Text/ad — reject |
| `low_quality_or_unusable` | Blurry, dark, obscured, unreadable, too small, or no visible subject | Low quality — review |
| `is_meme_or_screenshot` | Screenshot, meme, copied content, app screen, or repost-like image | Meme/screenshot — review |
| `is_blank_or_unusable` | Blank, solid color, corrupted, or otherwise unusable image | Blank/unusable — reject |
| `is_ai_generated` | Flagged as AI/synthetic by image features or metadata-like clues | AI flagged — review |
| `underage` | Signs the person may be a minor or age-risk uncertainty | Minor — escalate |
| `fake_profile` | Stock photo, celebrity, impersonation, or fake identity signal | Fake profile — reject |
| `spam` | Spam, bulk-uploaded, sales, solicitation, or repetitive promo content | Spam — reject |
| `manual_review_needed` | Model uncertainty, ambiguous image, edge case, or conflicting signals | Uncertain — manual review |
| `bot_behavior` | Bot-style uploaded content, templated promo image, or automation artifact | Bot behavior — reject |
| `off_platform_contact` | Off-platform contact attempt or contact bait | Contact bait — reject |
| `harassment` | Harassment, bullying, threatening, or abusive content | Harassment — escalate |
| `hate_speech` | Hate symbols, slurs, or hateful content | Hate speech — escalate |
| `money_request` | Payment request, crypto/CashApp, scam, sugar/money solicitation | Money request — reject |
| `minor_targeting` | Minor-targeting or minor-safety risk beyond age uncertainty | Minor safety risk — escalate |
| `manual_admin_decision` | Existing admin-only final decision reason; the worker must not assign this as its own final action | Admin-only final decision — do not write |
