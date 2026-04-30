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
Only approve clean_profile_style where all other checks pass. Anything uncertain escalates or goes to manual review.
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

Description: Hard porn, explicit adult material, visible sexual acts, genital focus, intercourse, masturbation, or pornographic framing.

Prompt instruction: Escalate and recommend rejection if explicit pornographic content is present.

Reason code: `sexual_content`

4. Other inappropriate photo content

Description: Image content that is inappropriate for a dating profile but does not fit a narrower reason.

Prompt instruction: Reject/escalate when the image is inappropriate and no narrower reason applies.

Reason code: `inappropriate_photos`

5. Clean profile-style photo

Description: Real human, profile-style photo, visible subject/face or acceptable portrait framing, no policy issue found.

Prompt instruction: Approve recommendation only when this is a clean profile photo and every other check passes.

Reason code: `clean_profile_style`

6. Not a profile photo

Description: Book, object, illustration, artwork, pet-only image, logo, landscape, food, vehicle, room, or unrelated image.

Prompt instruction: Recommend rejection/review if the image is not a real profile-style photo of a person.

Reason code: `inappropriate_photos`

7. AI-generated or synthetic image

Description: AI-generated face, synthetic person, rendered avatar, cartoon/anime style, illustration, drawing, or obviously artificial profile image.

Prompt instruction: Recommend rejection/review for synthetic identity imagery; use manual review if uncertain.

Reason code: `fake_profile or manual_review_needed`

8. Contact info or advertisement

Description: Phone number, email, social handle, QR code, external username, promo flyer, sales content, watermark/contact bait, or ad-like image.

Prompt instruction: Recommend rejection/review when contact info or ad content is visible.

Reason code: `off_platform_contact or spam`

9. Text-only contact/ad image

Description: Text-only or mostly-text image containing a handle, phone, email, external link, promo, or contact bait.

Prompt instruction: Recommend rejection when the image is text/ad content rather than a profile photo.

Reason code: `off_platform_contact or spam`

10. Low quality or unusable image

Description: Blurry, dark, obscured, unreadable, too small, cropped beyond usefulness, subject not visible, or otherwise unusable.

Prompt instruction: Send to manual review or recommend rejection if the image cannot be evaluated as a profile photo.

Reason code: `inappropriate_photos or manual_review_needed`

11. Meme, screenshot, or copied content

Description: Screenshot, meme, app screen, copied/reposted content, quote card, reaction image, or non-original social-media-style image.

Prompt instruction: Recommend review/rejection if it appears to be a meme, screenshot, or copied content instead of a profile photo.

Reason code: `inappropriate_photos or manual_review_needed`

12. Blank or unusable image

Description: Blank image, solid color, corrupted image, empty frame, no discernible subject, or non-viewable upload.

Prompt instruction: Recommend rejection if the image is blank or unusable.

Reason code: `inappropriate_photos`

13. Underage or minor risk

Description: Subject appears to be a minor, age is ambiguous with childlike presentation, or content raises minor-safety concerns.

Prompt instruction: Escalate if the person may be underage or if any minor-safety risk is present.

Reason code: `underage or minor_targeting`

14. Fake profile or impersonation

Description: Stock photo, celebrity image, influencer/public-figure image, impersonation signal, stolen-looking professional image, or fake identity cue.

Prompt instruction: Recommend rejection/review when the image appears fake, stock, celebrity, or impersonating someone.

Reason code: `fake_profile`

15. Spam or bulk-uploaded content

Description: Spam graphic, repeated/template content, sales pitch, bulk promo image, solicitation, or obviously non-personal upload.

Prompt instruction: Recommend rejection if the image appears to be spam or bulk promotional content.

Reason code: `spam`

16. Bot-style content

Description: Bot-like promo image, automation artifact, repetitive template, machine-posted style, or suspicious non-human profile content.

Prompt instruction: Recommend rejection/review if the image suggests bot behavior.

Reason code: `bot_behavior`

17. Off-platform contact attempt

Description: Attempt to move users to another platform through visible handles, QR codes, phone numbers, emails, links, or contact bait.

Prompt instruction: Recommend rejection if the image asks or hints for off-platform contact.

Reason code: `off_platform_contact`

18. Harassment or bullying

Description: Harassing, bullying, threatening, degrading, or targeted abusive text/image content.

Prompt instruction: Escalate if harassment, bullying, or threats are present.

Reason code: `harassment`

19. Hate speech or hateful symbols

Description: Hate symbols, slurs, extremist imagery, or hateful/dehumanizing content targeting protected groups.

Prompt instruction: Escalate if hate speech or hateful symbols are present.

Reason code: `hate_speech`

20. Money request or scam signal

Description: CashApp/Venmo/crypto/payment request, sugar/scam solicitation, money demand, donation ask, or financial bait in the image.

Prompt instruction: Recommend rejection if payment or money-solicitation content appears.

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
