# Anewluv Photo Moderation — Proposed Xano Branch Change Plan

Date: 2026-04-30  
Mode: proposal only. Do not apply without Lord Xar approval.

## Purpose

This plan lists the minimum Xano changes needed before Devon can implement write-capable Anewluv photo moderation safely. It is not an instruction to mutate production.

## Branch requirement

All schema/API changes must happen on a Xano branch first. Production `v1` must not be mutated directly for this workflow.

Suggested branch name:

```text
photo-ai-moderation-worker
```

## Change 1 — dedicated AI recommendation endpoint

Add a narrow endpoint, e.g.:

```text
POST /photos/ai_recommendation
```

Inputs:

- `actor_key` sensitive text
- `actor_type` text, required, must be `ai_agent` or approved system type
- `photo_id` int
- `ai_verdict` text
- `ai_confidence` decimal
- `ai_reason_code` text
- `ai_note` text
- `review_type_id` optional, default Agent (`1`) if approved

Behavior:

- require valid moderation service key;
- require approved auth path for the worker/service account;
- reject deleted photos;
- reject already approved/rejected photos unless an explicit approved `force` mode is added later;
- update only recommendation fields;
- do not update `photostatus_id`;
- write structured AI audit detail;
- return `{ success, photo_id, ai_verdict }`.

Open decision:

- canonical `ai_verdict` values. Assignment says `approved|rejected|review|escalate`; current field description says `approve|review|reject`.

## Change 2 — resolve final decision actor contract

Current real endpoint:

```text
POST /photos/decide
actor_type must equal admin
```

Assignment requires:

```text
actor_type: ai_agent
```

Options:

### Option A — extend existing endpoint

Allow `actor_type == ai_agent` only when:

- service key is valid;
- auth identity is an approved admin/service account;
- `ai_confidence` and recommendation state already exist;
- structured AI audit write succeeds.

Pros:

- one final decision endpoint remains canonical.

Cons:

- changes existing endpoint semantics; higher regression risk.

### Option B — add AI-only finalization endpoint

Add:

```text
POST /photos/ai_decide
```

Behavior:

- accepts only `actor_type=ai_agent`;
- validates prior recommendation;
- validates reason-code mapping;
- only allows auto-approve/reject when policy permits;
- writes `photostatus_id` final state;
- writes admin note if rejected;
- writes structured audit;
- returns final status.

Pros:

- keeps human admin endpoint untouched;
- easier to lock down policy.

Cons:

- adds another endpoint to maintain.

### Option C — recommendation only

AI never finalizes. Human admin reviews recommendations.

Pros:

- lowest safety risk.

Cons:

- fails assignment requirement for automatic approve/reject unless Lord Xar revises scope.

Recommendation: Option B unless Lord Xar wants the existing admin endpoint to become the single finalization path.

## Change 3 — structured AI audit table/path

Add table, e.g.:

```text
photo_ai_moderation_audit
```

Suggested fields:

- `id`
- `created_at`
- `photo_id`
- `user_id`
- `image_url_hash` or sanitized URL reference policy
- `queue_source`
- `actor_type`
- `run_id`
- `dry_run` bool
- `moderation_api_used` bool
- `moderation_model`
- `moderation_summary_json`
- `vision_model_used`
- `fallback_model`
- `vision_summary_json`
- `deterministic_checks_json`
- `verdict`
- `confidence`
- `reason_code`
- `note`
- `planned_action`
- `final_action`
- `error_code`
- `error_note`

Endpoint options:

```text
POST /photos/ai_audit
```

or embedded audit writes inside recommendation/finalization endpoints.

Requirement:

- final approve/reject must not occur if audit write fails.

## Change 4 — escalation queue + ack route

Add table, e.g.:

```text
photo_moderation_escalations
```

Suggested fields:

- `id`
- `created_at`
- `updated_at`
- `photo_id`
- `user_id`
- `reason_code`
- `note`
- `severity` (`urgent|normal`)
- `status` (`open|acknowledged|resolved|dismissed`)
- `model_path_json`
- `next_reminder_at`
- `reminder_count`
- `acknowledged_at`
- `acknowledged_by`
- `acknowledged_by_type`

Endpoints:

```text
GET /photos/escalations
POST /photos/escalations/ack
```

Behavior:

- list unresolved escalations for agent/admin tool;
- ack by id;
- maintain retry schedule externally or via backend fields.

## Change 5 — backend-mediated owner/user email path

Do not send email directly from OpenClaw chat/agent behavior.

Options:

1. Use existing Mailgun functions after security/cost/provider review.
2. Use existing SendGrid functions after approval, despite assignment cost caution.
3. Add Resend-backed Xano function/endpoint if no approved provider exists.

Required endpoint behavior:

- owner escalation email: internal/admin only;
- user rejection email: reason-code based, short, no raw model output, product-approved only;
- write notification/audit record.

## Change 6 — service-account auth path

Current endpoints require `auth = users` and `is_admin = true` in addition to service key. The worker needs a safe, documented way to satisfy this without Discord secrets or admin impersonation.

Options:

1. Create an AI service-account user marked `is_admin=true` and `is_ai_agent=true`, with a secure JWT acquisition/refresh path.
2. Add service-key-only endpoints narrowed to the exact worker operations.
3. Add Xano-side internal task/tool that runs with backend context instead of external JWT.

Recommendation:

- Prefer service-key-only narrow worker endpoints or a dedicated service account with explicit audit identity. Do not reuse a human admin JWT.

## Change 7 — reason-code mapping

Add or document mapping from normalized app-specific reason codes to Xano/admin final rejection reason codes.

Example draft mapping:

| Normalized reason | Existing Xano candidate |
|---|---|
| `sexual_content` | `sexual_content` |
| `minor_safety_risk` | `underage` or `minor_targeting` depending context |
| `contact_info_or_ad` | `off_platform_contact` or `spam` |
| `not_a_profile_photo` | `inappropriate_photos` |
| `ai_generated_image` | `fake_profile` or new code required |
| `low_quality_or_unusable` | `inappropriate_photos` or new code required |
| `manual_review_needed` | no final reject; review only |
| `policy_unclear` | no final reject; review/escalate only |

Approval needed from Lord Xar/Zifnab before final reject mapping.

## Change 8 — AI verdict value contract

Resolve storage values for `Photos.ai_verdict`.

Options:

1. Store assignment values: `approved`, `rejected`, `review`, `escalate`.
2. Store current description values: `approve`, `reject`, `review`, and represent escalation elsewhere.
3. Add a separate `ai_escalation_status`/escalation table and keep verdict to approve/reject/review.

Recommendation:

- Use `approved|rejected|review|escalate` if UI/admin contracts can align. Otherwise store `review` for escalation and use escalation table for status.

## Required approval checklist

Before Devon writes implementation code that can mutate state, confirm:

- [ ] Xano branch name and owner.
- [ ] Recommendation endpoint strategy.
- [ ] Final decision strategy for `ai_agent`.
- [ ] Structured audit storage design.
- [ ] Escalation queue/ack storage design.
- [ ] Backend email/provider decision.
- [ ] Worker auth/service-account path.
- [ ] Reason-code mapping.
- [ ] `ai_verdict` values.

## Rollback approach for Xano changes

- Keep all changes in branch until reviewed.
- Export/document endpoint XanoScript before publishing.
- Validate on test photo IDs only.
- Do not set branch live until acceptance evidence exists.
- If published and failure occurs, revert live branch to prior version or disable worker write gates immediately.
