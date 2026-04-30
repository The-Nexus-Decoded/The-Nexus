# Anewluv Photo Moderation — #306/#307 Architecture Evidence

Date: 2026-04-30  
Mode: docs/evidence only. No worker implementation, no production writes, no Xano mutation.

## Evidence sources

Read-only Xano MCP metadata calls inspected:

- functions: `mailgun_basic_send`, `mailgun_dynamic_send`, `mailgun_get_templates`, `sendgrid_basic_send`, `sendgrid_dynamic_send`, `moderation/validate_reason_code`, `moderation/log_admin_call`
- endpoints: `GET /mailgun/templates`, `POST /mailgun/send`, `POST /sendgrid/validate`, `GET /stats/dashboard`, `GET /notes/list`, `POST /notes/add`, `GET /users/dev_info`

No endpoint was called for live business behavior. Only metadata/XanoScript was inspected.

## Existing reusable backend pieces

### `moderation/log_admin_call`

Function id: `296`  
Purpose: writes a row to `moderation_audit_log` at the start of admin endpoint calls.

Inputs:

- `endpoint`
- `caller_type`
- `target_user_id` optional

Observed write fields:

- `endpoint`
- `caller_type`
- `response_status = 0`
- `target_user_id`

Architecture use:

- usable as endpoint-level attempt audit;
- not enough for AI photo review evidence;
- should remain a shared low-level audit hook even if a new photo AI audit table is added.

### `moderation/validate_reason_code`

Function id: `295`  
Purpose: validates moderation reason codes against existing Phase 04 enum.

Existing codes observed:

- `spam`
- `off_platform_contact`
- `harassment`
- `fake_profile`
- `inappropriate_photos`
- `money_request`
- `multiple_accounts`
- `hate_speech`
- `bot_behavior`
- `threats`
- `sexual_content`
- `minor_targeting`
- `fraud`
- `underage`
- `doxxing`
- `stalking`
- `ban_evasion`
- `auto_escalation_3reports_30d`
- `auto_escalation_2warnings_90d`
- `auto_escalation_2suspensions_180d_queued`
- `manual_admin_decision`
- `admin_dismiss_pending_ban`
- `appeal_overturn_lift`

Assignment proposed codes that do not exactly match existing enum:

- `minor_safety_risk`
- `graphic_violence`
- `hate_symbol`
- `self_harm`
- `contact_info_or_ad`
- `not_a_profile_photo`
- `ai_generated_image`
- `low_quality_or_unusable`
- `manual_review_needed`
- `policy_unclear`

Architecture implication:

- worker needs an explicit reason-code mapping layer;
- rejection finalization can only use canonical Xano-supported codes unless Xano branch extends the enum;
- recommendation-only fields can store assignment codes if approved, but final reject path currently documents only a subset: `inappropriate_photos`, `fake_profile`, `underage`, `sexual_content`.

### `GET /stats/dashboard`

API id: `2435`  
Auth: `users` JWT + moderation service key  
Actor types allowed: `ai_agent`, `admin`, `system`

Architecture use:

- potential source for Jarvis summary counts if direct reporting wants backend counts;
- still blocked by auth/service-key contract;
- not a replacement for worker run summary.

### `GET /notes/list` and `POST /notes/add`

API ids: `2438` and `2439`  
Auth: `users` JWT + moderation service key  
Actor types allowed: `ai_agent`, `admin`, `system`

`POST /notes/add` supports:

- `actor_key`
- `actor_type`
- `target_type`
- `target_id`
- `note_text`
- `author_user_id` optional
- `parent_note_id` optional

Architecture use:

- possible partial admin-visible evidence channel for AI recommendations or escalation notes;
- not sufficient as the required structured audit store;
- should not be used as the only audit path because notes are human-readable and polymorphic, not structured model evidence.

### Email functions/endpoints

Existing functions:

- `mailgun_basic_send`
- `mailgun_dynamic_send`
- `mailgun_get_templates`
- `sendgrid_basic_send`
- `sendgrid_dynamic_send`

Existing endpoints:

- `GET /mailgun/templates`
- `POST /mailgun/send`
- `POST /sendgrid/validate`

Observed provider env names inside XanoScript:

- `mailgun_private_key`
- `mailgun_domain`
- `mailgun_from_email`
- `sendgrid_api_key`
- `sendgrid_from_email`

Architecture implication:

- backend-mediated email primitives exist;
- provider configuration and approval are not confirmed;
- existing `POST /mailgun/send` and `POST /sendgrid/validate` appear unauthenticated in metadata and must not be adopted for photo moderation without security review;
- assignment prefers Resend if no provider exists, but current workspace already has Mailgun/SendGrid primitives that need policy/cost/security decision.

### `GET /users/dev_info`

API id: `2443`  
Purpose: dev-only PII lookup.

Architecture warning:

- Not needed for photo moderation worker.
- Returns PII and should not be used for worker dry-runs or Jarvis summaries.
- Its XanoScript excerpt appears to write extra audit-like fields beyond the earlier `moderation_audit_log` schema view; this should be reviewed separately before relying on it as a model for audit expansion.

## Proposed worker architecture, still docs-only

```text
photo-sweeper CLI / cron
  ├─ config loader (env names only, no secret printing)
  ├─ lock manager (prevents overlapping runs)
  ├─ queue client (GET /photos/queue or fixture until auth resolved)
  ├─ image fetcher (read-only; no raw image logging)
  ├─ deterministic checks adapter
  ├─ broad safety adapter (OpenAI Moderations optional)
  ├─ vision adapter (primary + fallback)
  ├─ normalizer (strict normalized result JSON)
  ├─ policy combiner (planned action)
  ├─ dry-run reporter (sanitized evidence)
  └─ write adapters (disabled until gates open)
       ├─ recommendation writer
       ├─ final decision writer
       ├─ AI audit writer
       ├─ escalation writer/ack tracker
       └─ backend email/Jarvis reporter
```

Agent-facing MCP/tool wrapper should call the same service layer as the CLI. Do not build separate decision logic for cron and agents.

## Configuration contract draft

Names only, no values:

Required for read-only discovery:

- `XANO_MCP_TOKEN`
- `XANO_MCP_STREAM_URL`

Required for direct queue dry-run later:

- `XANO_MODERATION_API_BASE` or existing API base equivalent
- `ANEWLUV_AI_ACTOR_KEY` or canonical moderation service key env name
- `ANEWLUV_WORKER_USER_JWT` or approved service-account auth path

Model-related:

- `OPENAI_API_KEY`
- `MINIMAX_API_KEY`
- optional `ANEWLUV_VISION_PROVIDER`
- optional `ANEWLUV_VISION_MODEL`

Write-mode gates, later only:

- `ANEWLUV_ENABLE_WRITES=false` by default
- `ANEWLUV_ENABLE_FINAL_DECISIONS=false` by default
- `ANEWLUV_ENABLE_ESCALATION_ALERTS=false` by default
- `ANEWLUV_ENABLE_USER_EMAIL=false` by default

Reporting/email, unresolved:

- `ANEWLUV_OWNER_ALERT_EMAIL`
- `DISCORD_WEBHOOK_URL` or Jarvis-specific destination
- provider-specific backend email env names, selected after approval

## Recommended issue-to-architecture mapping

- #306: availability proof for Xano MCP, APIs, model paths, deterministic deps, audit/email/Jarvis.
- #307: architecture, env contract, lock/idempotency, write gates, CLI/MCP shared core.
- #308: queue reader design; implementation waits on safe auth or fixture strategy.
- #314: recommendation write endpoint design; implementation waits on Xano endpoint/branch approval.
- #315: final decision path; implementation waits on `ai_agent` actor conflict resolution.
- #316: structured AI audit; implementation waits on schema/API approval.

## Architecture decision records

1. **Shared core:** CLI, cron, and agent-facing tool must share one review engine and one policy combiner.
2. **Dry-run first:** default execution mode remains dry-run until explicit write gates are implemented and approved.
3. **No admin impersonation:** final decisions cannot fake `admin` to bypass current `/photos/decide` restrictions.
4. **Recommendation before decision:** every reviewed photo should get a recommendation record before finalization, once a safe endpoint exists.
5. **Structured audit separate from notes:** `admin_notes` may supplement admin visibility but must not be the only AI audit record.
6. **Unverified vision means no approve/reject:** if model path fails or is unavailable, planned action is review/escalate only.
7. **Reason-code mapper required:** assignment reason codes and Xano canonical codes differ; mapper must be explicit and tested.
