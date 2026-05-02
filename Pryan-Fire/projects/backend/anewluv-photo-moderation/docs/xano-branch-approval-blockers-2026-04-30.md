# Anewluv Photo Moderation — Xano Branch / Approval Blockers

Date: 2026-04-30  
Mode: blocker register only. No production mutation.

## Absolute Xano non-deletion gate

Lord Xar's Xano rule for this workflow: never delete Xano data, records, tables, fields, indexes, endpoints, functions, tasks, triggers, branches, or files. Anewluv normally works on Xano `v1`; do not create new Xano branches by default because branch testing requires client/API URL changes and Lord Xar merge handling. If functionality does not exist, propose additive use of existing `v1` objects first and create new objects only with explicit Lord Xar approval. Do not destructively replace existing behavior.

## Blocker 1 — `/photos/decide` rejects `ai_agent`

Assignment contract:

```text
actor_type: ai_agent
```

Real endpoint behavior from XanoScript:

```text
precondition ($input.actor_type == "admin")
```

Impact:

- Worker cannot use the assigned service actor contract for final approve/reject decisions.
- Zifnab explicitly directed: do not use admin impersonation to bypass this conflict.

Resolution options:

1. Xano `v1` additive change proposal, only after Lord Xar approval: allow `actor_type == "ai_agent"` for this endpoint when service key and admin/service-account auth are valid, with audit showing AI actor.
2. Add a separate AI final-decision endpoint with narrower policy checks and stronger audit.
3. Keep AI as recommendation-only and require human/admin final decision.

Approval needed before any final-decision implementation.

## Blocker 2 — recommendation write endpoint not confirmed

Real schema has fields:

- `Photos.ai_verdict`
- `Photos.ai_confidence`
- `Photos.ai_reason_code`
- `Photos.ai_note`

But no dedicated endpoint was confirmed for writing these fields only.

Impact:

- Worker cannot safely record AI recommendation without either using an unverified generic `PATCH /photos/{id}` or creating a dedicated endpoint.

Resolution options:

1. Inspect and approve existing generic `PATCH /photos/{photos_id}` if it safely permits only the needed AI fields under correct auth.
2. Xano `v1` additive change proposal, only after Lord Xar approval: add dedicated `POST /photos/ai_recommendation` or equivalent endpoint.

Endpoint should:

- accept `actor_key`, `actor_type=ai_agent`, `photo_id`, `ai_verdict`, `ai_confidence`, `ai_reason_code`, `ai_note`;
- reject writes to approved/rejected/deleted photos unless explicitly forced in test context;
- not finalize approve/reject;
- write audit detail.

Approval needed before any recommendation-write implementation.

## Blocker 3 — AI verdict value mismatch

Assignment expected values:

```text
approved | rejected | review | escalate
```

Real field description for `Photos.ai_verdict` says:

```text
approve / review / reject
```

Impact:

- Admin UI and data contract may disagree on value names.
- `escalate` may not currently render or be expected by UI.

Resolution options:

1. Standardize on assignment values and update UI/schema docs accordingly.
2. Map internal normalized values to existing storage values, e.g. `approved -> approve`, `rejected -> reject`, `escalate -> review` plus reason/note.
3. Add explicit `escalation_status`/queue path rather than overloading `ai_verdict`.

Approval needed before writing recommendation values.

## Blocker 4 — unified moderation history path is missing/narrow

Existing `moderation_audit_log` captures endpoint-level audit:

- `endpoint`
- `caller_type`
- `caller_ip`
- `request_body_hash`
- `response_status`
- `target_user_id`

Required unified moderation history includes:

- photo id
- user id
- actor type: `ai_agent`, `admin`, `user`, or `system`
- actor identity fields where available
- shared decision/action/reason/note/outcome fields
- timestamp
- nullable AI metadata for AI rows: model, confidence, fallback path, checks, model summaries, dry-run/error data
- AI metadata null for human/admin/system rows when not applicable

Impact:

- Required moderation history cannot be stored in the current endpoint-level audit table without schema/API changes, a compatible existing photo/photo-management table, or a reconciled generic history table.

Resolution options:

1. Preferred path: reuse/extend existing photo/photo-management tables if they can support unified moderation history without destructive changes.
2. Xano `v1` additive change proposal, only after Lord Xar approval: create or reconcile a generic `photo_moderation_history` table/contract only if existing structures cannot support the lifecycle safely.
3. Store minimal endpoint audit now and defer detailed moderation history, but this fails assignment acceptance until resolved.

Approval needed before non-dry-run review actions.

## Blocker 5 — escalation queue / ack path not confirmed

Assignment requires:

- escalation for uncertain/serious cases;
- ping Lord Xar;
- email Lord Xar;
- keep reminding until acknowledged;
- list and ack escalations through tool/MCP.

No confirmed tables/endpoints yet for:

- unresolved photo escalations;
- acknowledgement status;
- retry schedule state;
- owner/admin notification delivery.

Impact:

- Worker cannot safely escalate/retry/ack without inventing storage.

Resolution options:

1. Xano `v1` additive change proposal, only after Lord Xar approval: create dedicated `photo_moderation_escalations` table + endpoints.
2. Reuse an existing moderation queue table only if exact semantics are confirmed and approved.
3. Defer escalation writes and keep all uncertain photos as `review`, but this fails assignment escalation requirements.

Approval needed before escalation implementation.

## Blocker 6 — email / notification path not confirmed

Assignment says OpenClaw should not directly email Anewluv users; use backend/Xano notification path if present.

Observed only older email-related names in workspace context:

- Mailgun functions/API names
- SendGrid functions/API names

Not confirmed:

- active provider config;
- owner alert email path;
- user rejection email path;
- Resend approval;
- reason-code-based user email template path.

Impact:

- Worker cannot send owner or user email in compliance with assignment yet.

Resolution options:

1. Inspect existing Mailgun/SendGrid endpoints and provider configuration without exposing secrets.
2. Propose Resend-backed backend/Xano route if no current provider exists.
3. Defer user-facing emails until product approval.

Approval needed before email implementation.

## Blocker 7 — direct queue dry-run auth contract incomplete

`GET /photos/queue` requires:

- user JWT (`auth = users`);
- sensitive `actor_key`;
- caller user with `is_admin = true`.

Current env contract does not yet name a safe worker JWT/admin auth source.

Impact:

- Even dry-run queue reading cannot call production endpoint safely until auth source is confirmed.

Resolution options:

1. Add a service-account auth/token flow for worker reads.
2. Create a narrow read-only queue endpoint for `ai_agent` service key.
3. Use redacted fixtures until auth is resolved.

Approval needed before direct production queue dry-run.

## Blocker 8 — model availability not confirmed

Current state:

- OpenAI Moderations probe returned HTTP 429.
- OpenClaw image tool failed local image probe with `Failed to optimize image`.
- MiniMax key is present but endpoint contract not verified.

Impact:

- No automatic approve/reject path can be trusted yet.
- Without verified vision path, all photos must remain review/escalate.

Resolution options:

1. Verify OpenClaw/vision path with image URL input and strict JSON.
2. Verify MiniMax endpoint/request/response.
3. Select another cheap verified vision-capable model.

Approval not necessarily needed for read-only model probes, but any production review writes still depend on earlier Xano blockers.

## Approval summary

Before write-capable code, approve or resolve:

1. `ai_agent` final decision contract.
2. Dedicated AI recommendation write path.
3. Unified moderation history storage.
4. Escalation queue/ack route.
5. Backend-mediated email/notification route.
6. Auth source for direct queue dry-run.
7. Reason-code/value mapping.
