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

## 8. Photo moderation review items

Core prompt rule:

```txt
Only approve clean_profile_style where all other checks pass. If uncertain, choose review/escalate — never approve.
```

1. Sexual content

Description: Sexually suggestive pose, lingerie/underwear focus, explicit sexual framing, fetish/sexualized presentation.

Prompt instruction: Reject/escalate if the image appears sexually explicit or primarily sexual.

Reason code: `sexual_content`

2. Nudity

Description: Exposed genitals, breasts/nipples, buttocks, transparent clothing, or implied nudity.

Prompt instruction: Reject/escalate if nudity or likely nudity is present.

Reason code: `sexual_content or inappropriate_photos`

3. Pornographic explicit content

Description: Sex acts, explicit adult content, pornography, masturbation, or graphic sexual imagery.

Prompt instruction: Reject/escalate immediately.

Reason code: `sexual_content`

4. Other inappropriate photo content

Description: Image content that is inappropriate for a dating profile but does not fit a narrower reason.

Prompt instruction: Reject/escalate when the image is inappropriate and no narrower reason applies.

Reason code: `inappropriate_photos`

5. Clean profile-style photo

Description: Real person, non-explicit, usable, no contact info, no spam, no obvious AI/fake indicators.

Prompt instruction: Approve recommendation only; human/admin remains final.

Reason code: `clean_profile_style`

6. Not a real profile photo

Description: Meme, screenshot, celebrity/photo of someone else, object-only image, landscape, cartoon, group image with unclear owner.

Prompt instruction: Manual review or reject recommendation depending severity.

Reason code: `fake_profile or inappropriate_photos`

7. Fake / AI-generated image

Description: Synthetic face/body, obvious AI artifacting, unrealistic skin/eyes/hands, heavily generated avatar.

Prompt instruction: Manual review unless policy says reject.

Reason code: `fake_profile`

8. Contact info / off-platform solicitation

Description: Phone number, email, Snapchat/Instagram/Telegram/WhatsApp handle, QR code, URL, “text me,” “add me.”

Prompt instruction: Reject/escalate if visible.

Reason code: `off_platform_contact`

9. Text-only contact/ad image

Description: Text-only or mostly-text image containing a handle, phone, email, external link, promo, or contact bait.

Prompt instruction: Recommend rejection when the image is text/ad content rather than a profile photo.

Reason code: `off_platform_contact or spam`

10. Low-quality or unusable

Description: Blank image, solid color, too dark, too blurry, corrupted, no visible person.

Prompt instruction: Manual review/reject recommendation.

Reason code: `inappropriate_photos`

11. Meme, screenshot, or copied content

Description: Screenshot, meme, app screen, copied/reposted content, quote card, reaction image, or non-original social-media-style image.

Prompt instruction: Recommend review/rejection if it appears to be a meme, screenshot, or copied content instead of a profile photo.

Reason code: `inappropriate_photos or manual_review_needed`

12. Blank or unusable image

Description: Blank image, solid color, corrupted image, empty frame, no discernible subject, or non-viewable upload.

Prompt instruction: Recommend rejection if the image is blank or unusable.

Reason code: `inappropriate_photos`

13. Underage / minor concern

Description: Person appears under 18, school-age child/teen, or age is ambiguous in a sexual/flirt/dating context.

Prompt instruction: Never approve; escalate for human review.

Reason code: `underage or minor_targeting`

14. Fake profile or impersonation

Description: Stock photo, celebrity image, influencer/public-figure image, impersonation signal, stolen-looking professional image, or fake identity cue.

Prompt instruction: Recommend rejection/review when the image appears fake, stock, celebrity, or impersonating someone.

Reason code: `fake_profile`

15. Advertisement / spam

Description: Flyer, business promo, paid service ad, crypto/financial pitch, repeated text overlay, marketing graphic.

Prompt instruction: Reject/escalate if the image is promotional/spam.

Reason code: `spam`

16. Bot/scam signal

Description: Scammy text, fake verification graphic, reused model/stock-photo style, suspicious overlay.

Prompt instruction: Manual review or reject recommendation.

Reason code: `bot_behavior or fake_profile`

17. Off-platform contact attempt

Description: Attempt to move users to another platform through visible handles, QR codes, phone numbers, emails, links, or contact bait.

Prompt instruction: Recommend rejection if the image asks or hints for off-platform contact.

Reason code: `off_platform_contact`

18. Hate / harassment / threats

Description: Hate symbols, slurs, violent threats, targeted harassment.

Prompt instruction: Reject/escalate.

Reason code: `hate_speech or harassment`

19. Hate speech or hateful symbols

Description: Additional hate-symbol or hateful/dehumanizing content signal if not captured by the combined hate/harassment/threats item.

Prompt instruction: Reject/escalate if hateful content is present.

Reason code: `hate_speech`

20. Money request / transactional dating signal

Description: CashApp/Venmo/PayPal handle, “send money,” “sugar,” explicit paid companionship solicitation.

Prompt instruction: Reject/escalate.

Reason code: `money_request`

21. Manual review uncertainty

Description: Model uncertainty, ambiguous image, conflicting signals, borderline content, partial evidence, or any case not clearly covered.

Prompt instruction: Choose review/manual_review_needed when uncertain; do not approve uncertain images.

Reason code: `manual_review_needed`

22. Missing image reference

Description: Queue item lacks a usable image URL/path/reference for analysis.

Prompt instruction: Return review/manual_review_needed because the image cannot be evaluated.

Reason code: `missing_image_reference`

23. Provider auth unavailable

Description: The image-analysis provider cannot run because auth/env is missing.

Prompt instruction: Return review/manual_review_needed; do not fabricate an image decision.

Reason code: `api_auth_unavailable`

24. Provider/API failure fallback

Description: The provider failed, returned unusable output, timed out, or could not parse a valid response.

Prompt instruction: Return review/manual_review_needed; do not approve or reject from failed provider output.

Reason code: `api_failure_fallback`

25. Admin-only final decision

Description: Existing admin-only final decision reason; this worker must not assign final approval/rejection authority to itself.

Prompt instruction: Do not write this as a worker decision. Existing admin tools remain final.

Reason code: `manual_admin_decision`

Forced output shape:

```json
{
  "verdict": "approve_recommendation | reject_recommendation | review | escalate",
  "reason_code": "one canonical code",
  "confidence": 0.0,
  "checks": {
    "sexual_content": false,
    "nudity": false,
    "underage_concern": false,
    "ai_generated_or_fake": false,
    "contact_info": false,
    "spam_or_ad": false,
    "money_request": false,
    "hate_or_harassment": false,
    "bot_or_scam": false,
    "low_quality_or_unusable": false,
    "clean_profile_style": false
  },
  "note": "short admin-readable explanation"
}
```

Hard rule:

```txt
If uncertain, choose review/escalate — never approve.
```

Do not include markdown, prose, or extra keys in provider output.

## 9. Final output policy / normalization split

Final `reason_code` output should be canonical Xano-compatible wherever possible. Detailed prompt flags may still identify `nudity`, `ai_generated_image`, `api_failure_fallback`, etc., but normalized worker output must map them before policy handling.

Required final-output mappings:

```txt
api_failure_fallback -> manual_admin_decision
missing_image_reference -> manual_admin_decision
api_auth_unavailable -> manual_admin_decision
clean_profile_style -> approve_recommendation only, no reject code
```

Code ownership split:

```txt
validators.py = strict schema/enum validation and reason-code normalization
model.py = provider calls, provider payloads, provider parsing only
```
