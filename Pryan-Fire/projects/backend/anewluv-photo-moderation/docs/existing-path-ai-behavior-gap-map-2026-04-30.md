# Anewluv Photo Moderation — Existing Path to AI Behavior Gap Map

Date: 2026-04-30  
Mode: documentation / read-only reconciliation. No Xano execution, no worker writes, no schema changes.

## Operating constraint

Lord Xar clarified Anewluv Xano work is effectively on `v1`; assume any Xano endpoint/table/schema change is live-impacting unless Lord Xar explicitly says otherwise.

Therefore this map starts from existing structures and identifies the smallest gap, if any. Provisional objects created earlier remain inert.

## Required AI behavior → existing path → gap

| Required AI behavior | Existing table / endpoint / function | Evidence | Gap / decision |
|---|---|---|---|
| Find photos pending moderation | `GET /moderation/photos/queue` / `/photos/queue` evidence; `Photos.photostatus_id = 1` (`Uploaded`) | Existing queue endpoint inspected earlier; `PhotoStatus` rows confirm `1=Uploaded`, `2=Approved`, `3=Dissaproved` | Need confirm canonical endpoint name/path and auth for worker read-only queue. No new schema needed. |
| Record AI recommendation/current state without final decision | `Photos.ai_verdict`, `Photos.ai_confidence`, `Photos.ai_reason_code`, `Photos.ai_note`, `Photos.review_type_id` | `Photos` id `12`; `photo_review_type` id `159` (`Agent`, `Human`) | Existing fields likely satisfy recommendation state. Gap is safe write path/auth: existing generic update vs approved narrow endpoint. No new fields needed. |
| Distinguish AI vs human review | `photo_review_type` id `159`; `users.is_ai_agent`; moderation actor fields in existing tables | `photo_review_type`: `1=Agent`, `2=Human`; `users.is_ai_agent` exists | Existing support is sufficient. Need contract: use `review_type_id=1` for AI/agent recommendation and preserve human path as `2`. |
| Final approve/reject decision | Existing `/photos/decide` | Endpoint accepts `decision`, `reject_reason_code`, `note`; updates `Photos.photostatus_id`; writes `admin_notes` for rejected/note | Current endpoint rejects `actor_type=ai_agent`. Decision: keep AI recommendation-only, or approve minimal `v1` additive/compatible change for AI final decisions. |
| Store rejection reason visible to admin/manual system | `/photos/decide` → `admin_notes` (`target_type=user_photo`, `target_id=photo_id`, `note_text=reason: note`) | Existing inspected path writes reason/note into admin notes | Existing path already exists. Gap: confirm current admin/mobile UI reads this note format for photo rejection display. |
| Normalize reason codes | `moderation/validate_reason_code`; `moderation_keywords` id `161` | Canonical codes include `spam`, `off_platform_contact`, `harassment`, `fake_profile`, `inappropriate_photos`, `money_request`, `hate_speech`, `bot_behavior`, `sexual_content`, `minor_targeting`, `underage`, `manual_admin_decision`; `moderation_keywords` keyed by reason_code | Existing source should be used. Gap: map AI detector labels into canonical Xano codes and reject/hold any unmapped labels. |
| Endpoint-level audit | `moderation_audit_log` id `149` | Existing table described as forensic log of every admin/AI moderation endpoint call | Likely sufficient for call-level audit. Gap: confirm endpoint writes happen for photo endpoints and whether worker calls should be logged through existing pattern. |
| Admin-visible notes / explanations | `admin_notes` id `153` | Supports `author_type = admin | ai_agent | system`; notes hang off moderation actions | Existing table likely sufficient for human-readable rationale. Gap: decide whether AI rationale belongs here only after final decision or also for recommendation. |
| Immutable detailed model evidence | No confirmed existing photo-specific evidence ledger; provisional `photo_ai_moderation_audit` id `162` exists but is inert | Existing manual ledgers store reason/action patterns, not raw model evidence; provisional table has model/evidence fields | Real gap only if detailed AI model/evidence retention is required. Prefer not using provisional table unless Lord Xar approves after existing path review. |
| Escalation queue / acknowledgement | No confirmed existing photo-specific escalation lifecycle; provisional `photo_moderation_escalations` id `163` exists but is inert | Existing moderation queues exist for reports/appeals/pending bans; not proven exact fit for photo AI escalation | Real gap only if AI needs tracked escalation ACK/reminders. Prefer existing queue/admin workflow if it can show `review` photos. |
| AI/profile tracking | `users.is_ai_agent`; `Profiles.user_id`; `Photos.users_id`; `Profiles.ProfilePicture_id` | `users.is_ai_agent` tracks AI/bot service-account users; profiles link to users; photos link to users/profile picture | Existing support is sufficient. Gap: clarify whether AI-owned profile photos should be excluded, treated differently, or audited separately. |
| Worker safety gate | Repo/worker config only; no Xano writes | Current project posture: worker writes disabled | No Xano gap. Keep write gates disabled until contract is approved. |

## Recommended integration path

1. **Read queue** from the existing moderation/photo queue path.
2. **Run AI checks in dry-run only** until write contract is approved.
3. **Map AI result to canonical reason code** from existing moderation reason infrastructure.
4. **For recommendation-only mode**, write only to existing `Photos.ai_*` fields and `review_type_id=1` if Lord Xar approves a safe `v1` write path.
5. **For final decisions**, preserve `/photos/decide` semantics so `Photos.photostatus_id` and `admin_notes` remain the current-state/manual-system source.
6. **Use existing `moderation_audit_log` and `admin_notes` first** for call-level audit and human-readable rationale.
7. **Do not use provisional tables `162/163`** unless existing structures are explicitly found insufficient and Lord Xar approves the smallest additive `v1` usage.

## Minimal gaps that may remain

### Gap A — safe AI write path

Existing data fields support AI recommendation state, but the approved write path is not settled.

Options:

1. Recommendation-only narrow endpoint on `v1` that writes only `Photos.ai_*` and `review_type_id=1`.
2. Existing generic photo update endpoint if it can be constrained safely by auth/service key.
3. No writes; Jarvis/admin report only.

Recommendation: option 1 only if Lord Xar approves; otherwise stay dry-run/report-only.

### Gap B — AI final decision authority

Existing `/photos/decide` is the manual final decision path, but it currently requires `actor_type=admin`.

Options:

1. Keep AI recommendation-only; human admin uses existing manual flow.
2. Add explicit `ai_agent` support to the existing final-decision path with service-key/auth/audit gates.
3. Add a separate AI final-decision wrapper that preserves `/photos/decide` side effects.

Recommendation: option 1 until the AI quality gate is proven. Do not give AI final rejection authority yet.

### Gap C — detailed evidence retention

Existing tables cover current state, admin notes, reason codes, and endpoint audit. They do not obviously store full model response/evidence JSON per photo.

Options:

1. Do not retain detailed model evidence; store normalized verdict/reason/note only.
2. Store redacted evidence in an existing notes/audit pattern if approved.
3. Use/reconcile provisional table `162` only after approval.

Recommendation: start without detailed evidence writes; produce Jarvis/dry-run reports. If evidence retention is required, approve a generic moderation history contract first.

### Gap D — escalation lifecycle

Existing manual moderation queue may already cover `review` state. A dedicated escalation table may be unnecessary.

Options:

1. Route uncertain photos to existing manual queue via `Photos.ai_verdict=review` / `review_type_id=1` and admin notes.
2. Use existing moderation queues if exact semantics fit.
3. Use/reconcile provisional escalation table `163` only after approval.

Recommendation: prefer option 1; confirm UI behavior with Paithan/admin flow before adding anything.

## Non-goals / blocked actions

- No Xano schema/table additions.
- No endpoint execution of provisional endpoints.
- No worker writes.
- No second audit table.
- No deletion/rename/destructive cleanup.
- No claim that provisional tables are production-ready.

## Next evidence checks

- Confirm exact queue endpoint and auth contract for read-only worker access.
- Confirm admin/mobile UI source for photo rejection reason/note display.
- Confirm whether `moderation_audit_log` is written by existing photo moderation endpoints.
- Confirm whether `Photos.ai_*` fields appear in admin moderation UI.
- Confirm policy for AI-owned/seed profile photos via `users.is_ai_agent` / `users.is_seed`.
