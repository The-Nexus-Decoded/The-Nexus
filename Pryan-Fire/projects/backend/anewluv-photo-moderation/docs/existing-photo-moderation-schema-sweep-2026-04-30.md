# Anewluv Photo Moderation — Existing Schema Sweep

Date: 2026-04-30  
Mode: evidence-only / read-only Xano MCP metadata and reference-table checks. No endpoint execution, no writes, no schema changes.

## Why this exists

Lord Xar flagged that the product already has a manual moderation system and that Devon may be rebuilding existing structures. This pass checks existing schema before any further design or implementation.

## Result

The existing moderation system is real and should be treated as the first place to integrate.

Confirmed existing structures include:

- `Photos` table id `12` for photo current state.
- `PhotoStatus` table id `22` for current photo status.
- `photo_review_type` table id `159` for Agent vs Human review source.
- `admin_notes` table id `153` for admin-visible moderation notes, including photo decisions via `target_type = user_photo`.
- `moderation_audit_log` table id `149` for endpoint-level moderation audit.
- `moderation_keywords` table id `161` for reason-code-keyed moderation evidence scanning.
- Existing user moderation append-only tables with reason fields: `user_warnings`, `user_suspensions`, `user_bans`, `user_appeals`, `pending_ban_decisions`, `banned_emails`, `rejected_reports`.

No separate table literally named `photo_rejection_reasons` / `photo_reason` was found in the 124-table workspace list. That does **not** mean reason handling is absent: reason codes exist in endpoint contracts/functions and in moderation-related tables.

## Photo current-state tables

### `Photos` — id `12`

Relevant fields:

- `photostatus_id` → `PhotoStatus` id `22`
- `ai_verdict`
- `ai_confidence`
- `ai_reason_code`
- `ai_note`
- `review_type_id` → `photo_review_type` id `159`

A generic `Photos.rejection_reason` column was not present in the inspected schema. Current-state AI recommendation/reason fields are already present and should be preferred before adding anything.

### `PhotoStatus` — id `22`

Rows:

- `1` = `Uploaded`
- `2` = `Approved`
- `3` = `Dissaproved` *(misspelled in existing data)*

### `photo_review_type` — id `159`

Rows:

- `1` = `Agent`
- `2` = `Human`

This already supports Lord Xar's point that the product distinguishes AI/agent-originated photo review from human review without needing a separate moderation truth store.

## Existing manual/admin moderation path

### `/photos/decide`

Previously inspected behavior remains important:

- accepts `decision = approved | rejected`
- accepts `reject_reason_code`
- accepts `note`
- updates `Photos.photostatus_id`
- writes `admin_notes` when rejected or note is present:
  - `target_type = user_photo`
  - `target_id = photo_id`
  - `note_text = reject_reason_code ~ ": " ~ note`

This is the current app/admin-visible path for rejection reason/note behavior. Any future AI-capable reject path must preserve this contract or explicitly replace it only after approval.

## Existing reason-code infrastructure

### `moderation/validate_reason_code` function

Prior evidence showed the canonical Xano-supported moderation reason codes live in function logic, including values such as:

- `spam`
- `off_platform_contact`
- `harassment`
- `fake_profile`
- `inappropriate_photos`
- `money_request`
- `hate_speech`
- `bot_behavior`
- `sexual_content`
- `minor_targeting`
- `underage`
- `manual_admin_decision`

The AI worker must map its normalized findings into this canonical set before writing current state or history.

### `moderation_keywords` — id `161`

Fields:

- `reason_code`
- `keyword`
- `match_type`
- `case_sensitive`
- `is_active`
- `added_by_id`
- `notes`

Sample rows confirm this table is keyed by existing moderation reason codes such as `money_request` and `off_platform_contact`.

## Existing moderation ledgers / queues

These are not photo-specific history rows, but they prove the manual moderation system already has append-only/current-state patterns that should be reused or mirrored before creating new structures:

- `user_warnings` id `145`: `reason_code`, `reason_text`, `issued_by_type`
- `user_suspensions` id `146`: `reason_code`, `reason_text`, `issued_by_type`, `lift_reason`
- `user_bans` id `147`: `reason_code`, `reason_text`, `issued_by_type`, `lift_reason`
- `user_appeals` id `148`: `moderation_action_type`, `status`, `review_notes`
- `pending_ban_decisions` id `151`: `trigger_reason`, `status`, `decision_notes`
- `banned_emails` id `152`: `reason_code`, `lift_reason`
- `rejected_reports` id `150`: `reason`

## Implications for photo AI work

- Preferred path is existing schema first.
- `Photos` remains canonical current state.
- `/photos/decide` + `admin_notes` is the confirmed current rejection reason/note path.
- `photo_review_type` already distinguishes Agent vs Human.
- Reason-code mapping must use canonical moderation reason codes from existing validation logic.
- The provisional `photo_ai_moderation_audit` and `photo_moderation_escalations` tables must remain inert until the existing moderation system is reviewed and a non-duplicative data contract is approved.
- If unified moderation history is still needed, it should align with existing manual moderation patterns instead of creating a parallel AI-only lane.

## Acceptance correction

Before any worker writes:

- [ ] Confirm the current app/admin UI fields for photo rejection reason/note.
- [ ] Confirm whether `/photos/decide` remains the canonical final decision path or whether an AI-capable wrapper must call/preserve the same behavior.
- [ ] Confirm normalized AI reason codes map to existing moderation reason codes.
- [ ] Confirm whether existing `admin_notes`, `moderation_audit_log`, and `profile_change_audit` satisfy the required history/evidence needs before using any new table.
- [ ] Keep tables `162` and `163` inert until that review is complete.
- [ ] Keep worker writes disabled.
