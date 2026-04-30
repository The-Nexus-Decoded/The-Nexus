# Anewluv Photo Moderation — Xano Additive Objects Evidence

Date: 2026-04-30  
Approval: Lord Xar approved proactive additive Xano changes and said not to wait for later adds; document changes and acceptance criteria for later review.  
Constraint: Xano additive-only. No deletes, no destructive replacements.
Current schema posture: pause all further table/schema/field additions until Lord Xar explicitly confirms additive-global-table posture. Continue only docs, acceptance criteria, branch-safe/non-schema work, and endpoint/function logic using already-approved objects.
Design correction from Lord Xar: the long-term target should be **one generic photo moderation ledger**, not separate AI-vs-human truth stores. AI, human admin, system, and any future user/community moderation paths should write/check the same data shape; source is distinguished by actor/source fields, not by separate moderation databases.
Preferred path correction from Zifnab: review existing photo/photo-management tables first. New tables are acceptable only if existing structures cannot support unified moderation history plus escalation lifecycle without destructive changes. Created tables remain inert until that review completes.

## Branch / production state

Branch created:

```text
photo-ai-moderation-worker
```

Source branch:

```text
v1
```

Production `v1` was not set live again or replaced by Devon in this step. No delete/truncate/drop tools were used.

## Added tables

### `photo_ai_moderation_audit`

Xano table id: `162`

Purpose: provisional moderation-history storage. The table name is AI-specific because it was created before Lord Xar corrected the architecture; conceptually, the accepted target is unified photo moderation history for all actor types.

Functional requirement clarified by Lord Xar/Zifnab: **every moderated photo action should be tracked in a shared moderation ledger format**. AI-reviewed photos must always be tracked, and human/admin/user moderation should use the same record shape where possible. AI-specific evidence is optional/nullable and distinguished by `actor_type` / model fields, not a separate source of truth. `Photos` remains the current-state source of truth; the moderation ledger is the historical motivation/evidence trail.

Naming note: the currently-created table is named `photo_ai_moderation_audit`, but the desired contract is generic. Do not add another table yet. Treat this object as provisional until review decides whether to reuse it generically, map it into an existing moderation table, or create/rename through an approved schema path later.

Fields verified after creation:

- `id`
- `created_at`
- `photo_id`
- `user_id`
- `image_url_hash`
- `queue_source`
- `actor_type`
- `run_id`
- `dry_run`
- `moderation_api_used`
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

### `photo_moderation_escalations`

Xano table id: `163`

Purpose: provisional photo moderation escalation queue and acknowledgement state for unified moderation history workflows.

Fields verified after creation:

- `id`
- `created_at`
- `updated_at`
- `photo_id`
- `user_id`
- `reason_code`
- `note`
- `severity`
- `status`
- `model_path_json`
- `next_reminder_at`
- `reminder_count`
- `acknowledged_at`
- `acknowledged_by`
- `acknowledged_by_type`
- `run_id`

## Added endpoints

All endpoints are additive. Existing `POST /photos/decide` was not edited or replaced.

### `POST /photos/escalations/open`

Xano API id: `2827`

Inputs:

- `actor_key`
- `actor_type`
- `photo_id`
- `user_id`
- `reason_code`
- `note`
- `severity`
- `model_path_json`
- `run_id`

Contract:

- requires users auth;
- validates moderation service key;
- requires caller user to be admin;
- allows `ai_agent`, `system`, or `admin` actor types;
- creates an open escalation row;
- writes a unified moderation history row with `actor_type` and `final_action=escalation_opened`.

### `GET /photos/escalations`

Xano API id: `2828`

Inputs:

- `actor_key`
- `actor_type`
- `status`

Contract:

- requires users auth;
- validates moderation service key;
- requires caller user to be admin;
- allows `ai_agent`, `system`, or `admin` actor types;
- returns escalation rows filtered by status when provided.

### `POST /photos/escalations/ack`

Xano API id: `2829`

Inputs:

- `actor_key`
- `actor_type`
- `escalation_id`
- `status`
- `note`

Contract:

- requires users auth;
- validates moderation service key;
- requires caller user to be admin;
- allows acknowledgement actor types `admin`, `system`, or `lord_xar`;
- updates escalation status/ack fields.

### `POST /photos/ai_recommendation`

Xano API id: `2830`

Inputs:

- `actor_key`
- `actor_type`
- `photo_id`
- `ai_verdict`
- `ai_confidence`
- `ai_reason_code`
- `ai_note`
- `run_id`
- `moderation_model`
- `vision_model_used`
- `fallback_model`
- `deterministic_checks_json`

Contract:

- requires users auth;
- validates moderation service key;
- requires caller user to be admin;
- allows `ai_agent` or `system` actor types;
- validates verdict is one of `approved`, `rejected`, `review`, `escalate`;
- validates confidence is 0..1 when supplied;
- rejects missing/deleted photos;
- writes only AI recommendation fields on `Photos` and `review_type_id=1`;
- does not update `photostatus_id`;
- writes a unified moderation history row;
- acceptance gate: every successful call must create exactly one moderation history row for the review/recommendation attempt, and the endpoint must not silently update `Photos` if history persistence fails.

### `POST /photos/ai_decide`

Xano API id: `2831`

Inputs:

- `actor_key`
- `actor_type`
- `photo_id`
- `decision`
- `reason_code`
- `note`
- `confidence`
- `run_id`

Contract:

- requires users auth;
- validates moderation service key;
- requires caller user to be admin;
- requires `actor_type=ai_agent`;
- allows `decision=approved|rejected` only;
- validates confidence is 0..1 when supplied;
- rejects missing/deleted/non-pending photos;
- requires an existing AI recommendation before final decision;
- updates `Photos.photostatus_id` to approved/rejected status and `review_type_id=1`;
- writes `admin_notes` when rejected or note present;
- writes a unified moderation history row;
- acceptance gate: final approve/reject must not proceed unless moderation-history persistence succeeds or the final action is explicitly recorded in the same history transaction/path.

## Current-state vs history sync rule

Live schema check on 2026-04-30 confirmed `Photos` table id `12` already contains current-state AI recommendation fields:

- `ai_verdict`
- `ai_confidence`
- `ai_reason_code`
- `ai_note`
- `review_type_id`
- `photostatus_id`

Existing `POST /photos/decide` also accepts `reject_reason_code` and `note`; when rejected or note is present, it writes an `admin_notes` row for `target_type = user_photo`. A generic `Photos.rejection_reason` column was **not** found in the inspected `Photos` schema; the closest confirmed current-state fields are `ai_reason_code` / `ai_note` plus the `/photos/decide` `reject_reason_code` → `admin_notes` behavior.

Required behavior once writes are enabled:

- `Photos` remains the current-state snapshot.
- Unified moderation history remains the immutable ledger.
- A rejection/review reason must not live only in history if the current UI/admin flow expects it on `Photos` or `admin_notes`.
- AI recommendation writes must keep `Photos.ai_reason_code` / `Photos.ai_note` aligned with the corresponding moderation-history row.
- Final rejection writes must pass the canonical `reject_reason_code` into the final decision path and ensure the same reason appears in unified moderation history.
- If final decision uses existing `/photos/decide`, it must preserve the current `reject_reason_code` → `admin_notes` behavior.
- No current-state update may succeed if the required moderation-history row fails, and no history-only rejection should leave `Photos`/admin-visible reason fields stale.

## Shared moderation ledger rule

Target shared ledger fields, subject to approved schema path:

- `photo_id`
- `user_id`
- `actor_type`: `user | admin | ai_agent | system`
- `actor_id` / `actor_label`
- `is_ai` boolean, or derive from `actor_type == "ai_agent"`
- `decision`: e.g. `approved | rejected | review | escalate`
- `reason_code`
- `note`
- `confidence` nullable
- `model` / `moderation_model` nullable
- `action` / `final_action`
- `created_at`

AI-specific data must be nullable metadata in the same ledger shape, not a separate moderation silo.

Minimum behavior for moderation tracking:

- AI reviews a photo → write a moderation ledger row.
- Human/admin moderates a photo → write the same style of moderation ledger row, with non-AI fields/model fields empty and `actor_type=admin` or the appropriate human/source type.
- Future user/community moderation, if added, should use the same record format instead of a separate truth store.
- AI recommends `approved`, `rejected`, `review`, or `escalate` → write ledger row.
- AI finalizes approve/reject later → write ledger row containing `final_action`, or link to the earlier recommendation row once a link field is approved.
- AI errors, skips, cannot fetch image, hits low confidence, or uses fallback model → write ledger row with `error_code` / `error_note` or the appropriate reason fields.
- No photo may be silently changed by AI without a corresponding ledger row.
- Review/query surfaces should prefer the shared ledger view/format so Lord Xar can inspect AI and human moderation in one place.

## Schema freeze note

No additional tables, fields, or global schema changes are approved after this point without explicit Lord Xar confirmation. Existing new tables are treated as provisional/supporting objects already created and must remain inert until review confirms they are required. Preferred implementation must check existing photo/photo-management tables first; new-table usage is allowed only if existing structures cannot support unified moderation history plus escalation lifecycle without destructive changes.

## Syntax/creation notes

Initial create attempts for `photos/ai_recommendation` and `photos/ai_decide` failed because one-line precondition bodies are not accepted by XanoScript. They were corrected and then created successfully as API ids `2830` and `2831`.

## Acceptance criteria for later review

- [ ] Xano branch `photo-ai-moderation-worker` exists and production `v1` is not replaced without separate approval.
- [ ] No Xano delete/truncate/drop/destructive-replace actions were used.
- [ ] Existing `POST /photos/decide` remains untouched.
- [ ] `photo_ai_moderation_audit` table exists with the fields listed above, but remains inert until review confirms whether it should be reused, renamed, deprecated, or replaced by existing table usage.
- [ ] `photo_moderation_escalations` table exists with the fields listed above, but remains inert until review confirms whether existing photo/photo-management tables cannot support escalation lifecycle without destructive changes.
- [ ] All five new endpoints exist and are visible in moderation API listing/OpenAPI.
- [ ] New endpoints require users auth and moderation service key.
- [ ] New endpoints do not expose raw model output or secrets.
- [ ] Preferred path reviewed first: existing photo/photo-management tables before using newly-created tables.
- [ ] New tables are used only if existing structures cannot support unified moderation history plus escalation lifecycle without destructive changes.
- [ ] Created tables remain inert until that review is complete.
- [ ] Every moderated photo action is recorded in the same moderation history format, regardless of actor type.
- [ ] Current-state fields are kept in sync: AI recommendations populate `Photos.ai_reason_code`/`ai_note` where applicable, final rejections pass canonical `reject_reason_code` through the final decision path, and the same reason/action is recorded in moderation history.
- [ ] Existing `/photos/decide` `reject_reason_code` → `admin_notes` behavior is preserved if that endpoint remains in the final decision path.
- [ ] Moderation evidence uses one shared ledger format for AI and human/admin/user moderation; actor/source fields distinguish who/what made the decision.
- [ ] Shared ledger contract includes common fields for `photo_id`, `user_id`, `actor_type`, `actor_id`/`actor_label`, `decision`, `reason_code`, `note`, nullable `confidence`, nullable `model`, `action`/`final_action`, and `created_at`.
- [ ] Every AI-moderated photo writes at least one moderation ledger row, including approve/reject/review/escalate, dry-run, retry, skip, low-confidence, fallback, and error paths.
- [ ] Human/admin moderation can be represented in the same ledger shape without AI flags/model fields being required.
- [ ] No AI final approve/reject occurs if ledger/audit persistence fails.
- [ ] Recommendation endpoint does not change `photostatus_id`.
- [ ] Final decision endpoint requires prior recommendation and `actor_type=ai_agent`.
- [ ] Escalation endpoints support open/list/ack flow.
- [ ] Before live use, perform safe auth/test-photo validation and document request/response samples with secrets redacted.

## Remaining validation before worker writes

- Further table/schema/field changes are paused pending explicit Lord Xar confirmation of additive-global-table posture.
- Need a safe worker auth/JWT/service-account path.
- Need test photo ids approved for branch validation.
- Need model/vision contract verification.
- Need live request/response validation on branch endpoints with redacted evidence.
- Need acceptance decision before publishing branch live or enabling worker write gates.
