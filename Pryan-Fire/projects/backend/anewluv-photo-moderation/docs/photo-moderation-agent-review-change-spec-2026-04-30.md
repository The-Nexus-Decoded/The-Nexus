# ANewLuv Photo Moderation Agent Review Change Spec — 2026-04-30

## Purpose

Patch the photo moderation worker so it separates technical image viability from visual/content judgment, normalizes business decisions before strict validation, and routes uncertainty safely without mutating live photo state.

## Source of Truth Decision Flow

```text
1. Technical/system unreadable
   → retry/diagnostic no_write

2. Hard-safety category
   → human_admin_review only

3. Clear non-person / non-profile image
   → rejected / not_person_photo

4. Clear clean person/profile photo
   → approved

5. Ordinary uncertainty or borderline case
   → fleet_agent_review / no_write

6. Fleet agent unresolved or sensitive
   → human_admin_review
```

## Pre-model Boundary

Pre-model checks are technical viability only. They are not content moderation.

Allowed pre-model checks:
- missing image reference
- unsupported MIME
- corrupt or unreadable file
- too small / too large
- blank or near-blank

Do not reintroduce heuristic content rejects before vision. Screenshots, memes, trading cards, logos, objects, fake/impersonation, explicit content, hate/violence, minor-risk, spam/contact info, and similar labels must come from visual/content classification or agent/human review.

## Business Normalization Before Validator

Raw model result must pass through business normalization before strict validator fallback.

Examples:
- screenshot/trading card/no person → `reject_recommendation` + `not_person_photo`
- clean usable person/profile photo → `approve_recommendation` + clean profile reason
- hard safety → `human_admin_review`
- genuinely unresolved/model failure → `agent_review/no_write`

The validator should validate normalized business decisions. It must not convert a high-confidence non-person result into manual ambiguity.

## Hard-safety Human-only Bypass

Hard safety skips fleet-agent image review and goes directly to human admin review.

Human-only categories:
- children/minors
- x-rated or explicit sexual content
- hate/extremism symbols or imagery
- credible violence, threats, self-harm
- illegal or safety-sensitive content

Hard safety is not hard reject/no-human. Human admin is required.

## Fleet Agent Review Path

Ordinary uncertainty goes to fleet agent review before human admin.

Agent review request should include:
- `photo_id`
- local image path/reference if available
- deterministic technical stats
- model summary
- uncertainty reason
- allowed decisions: `approve`, `reject_not_person_photo`, `reject_policy`, `needs_human_admin`
- `write_enabled=false`

No-image fallback is allowed: post path + metadata; do not block on Discord media upload.

Fleet agents must not mutate `Gallery` or `deleted` directly. They may only return a signed recommendation/payload. Live submit still requires expected-status/idempotency guard.

## Live Write Rules

The only AI live-submit decisions are:
- `approved`
- `rejected`

Do not submit live `escalated` for uncertainty, agent review, or human admin routing. Escalation is routing, not `/photos/ai_decide` mutation.

For reject mapping:

```python
if photo.get("recommended_decision") == "reject_recommendation" and photo.get("planned_action") == "auto_reject":
    return "rejected"
```

For disabled auto-decide or confidence below floor:

```python
if settings.get("ai_auto_decide_enabled") is False:
    return None

if confidence < float(settings.get("ai_escalate_below_confidence", 0.7)):
    return None
```

## Expected Behavior for `photo_id=13286`

Input fact pattern:
- readable image
- high-confidence non-person/non-profile image
- screenshot/card-game-like content
- no human-safety category required

Expected normalized result:

```json
{
  "photo_id": 13286,
  "verdict": "reject_recommendation",
  "reason_code": "not_person_photo",
  "needs_human_review": false,
  "needs_agent_review": false,
  "planned_action": "auto_reject",
  "recommended_decision": "reject_recommendation"
}
```

Expected submit behavior when live writes are explicitly enabled:

```json
{
  "decision": "rejected",
  "reason_code": "not_person_photo",
  "gallery_mutation": false,
  "deleted_mutation": false
}
```

Dry-run must perform no live mutation.

## Acceptance Criteria

- Unit tests cover:
  - clear non-person/profile → `auto_reject` / `not_person_photo`
  - clean person/profile → approve path
  - ordinary uncertainty/model failure → `agent_review/no_write`
  - hard safety → `human_admin_review`
  - no uncertainty path submits live `escalated`
- `13286` dry-run shows `reject/not_person_photo`, no escalation, no `Gallery`/`deleted` mutation.
- Fake live-submit for `13286` produces only `decision=rejected` with expected-status guard.
- Diagnostic trace preserves raw or parsed provider response, redacted as needed.
- Worker remains stopped until reviewed ticket/spec is assigned and verification passes.
