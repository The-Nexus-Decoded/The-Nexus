# Anewluv Photo Moderation — Gate 1 Schema / Endpoint Discovery

Date: 2026-04-30
Owner: Devon(Dev-Rapid)
Mode: read-only discovery only. No writes, no schema mutation, no production decisions.

## Inputs checked

- Env file exists: `/data/Workspace/Anewluv/.env`
- Env file mode: `0600`
- Present env variable names only: `OPENAI_API_KEY`, `XANO_MCP_TOKEN`, `XANO_MCP_BASE`, `XANO_MCP_STREAM_URL`, `XANO_MCP_SSE_URL`
- Missing from Devon env at discovery time: `ANEWLUV_AI_ACTOR_KEY`, `XANO_MODERATION_SERVICE_KEY`, `MINIMAX_API_KEY`, `RESEND_API_KEY`, `JARVIS_REPORT_CHANNEL`, `DISCORD_WEBHOOK_URL`, owner alert email variable.
- Ticket pack path requested by Zifnab was not present on this host: `/data/openclaw/shared/anewluv/photo-moderation-ticket-pack-2026-04-30.md`

## Xano MCP availability

- `XANO_MCP_STREAM_URL` is the working MCP transport.
- `POST initialize` to stream URL returned HTTP 200 and server info: `Xano Metadata API`.
- `XANO_MCP_BASE` returned HTTP 404 for GET/POST at the provided base path.
- `XANO_MCP_SSE_URL` timed out on GET and returned HTTP 404 on POST initialize.
- Workspace discovered: `id=1`, `name=AnewluvDB`, live branch `v1`.

## Relevant real tables

### `users` table

Xano table: `users`, id `1`.

Relevant fields:

- `id` int
- `created_at` timestamp
- `name` text
- `email` email
- `password` password
- `is_active` bool — controls discovery/match eligibility; synced from `moderation_state`
- `moderation_state` text — enum documented as `active|warned|suspended|banned`
- `suspended_until` timestamp
- `banned_at` timestamp
- `moderation_note` text — user-visible moderation rationale
- `last_warning_at` timestamp
- `is_admin` bool — gates admin-only routes and admin endpoint actor validation
- `is_ai_agent` bool — metadata only; explicitly does not grant admin endpoint access
- `is_seed` bool

### `Profiles` table

Xano table: `Profiles`, id `2`.

Relevant fields:

- `id` int
- `created_at` timestamp
- `updated_at` timestamp
- `user_id` int
- `FirstName` text
- `LastName` text
- `DateOfBirth` date
- `Bio_TEXT` text
- `ProfilePicture_id` int
- `ScreenName` text
- `PhoneNumber` text
- location/profile preference fields

### `Photos` table

Xano table: `Photos`, id `12`; physical table referenced in XanoScript as `x1_12`.

Relevant fields:

- `id` int
- `created_at` timestamp
- `users_id` int
- `PhotoUrl` text
- `PhotoData` image
- `Description` text
- `UploadDate` timestamp
- `photostatus_id` int
- `Gallery` bool
- `size` int
- `ImageHash` int
- `deleted` bool
- `deleted_on` timestamp
- `ai_verdict` text — description says `approve / review / reject`; assignment says expected write values may be `approved / rejected / review / escalate`, so this needs policy alignment before writes.
- `ai_confidence` decimal
- `ai_reason_code` text
- `ai_note` text
- `review_type_id` int — FK to `photo_review_type`; null until decision recorded

### `PhotoStatus` table

Xano table: `PhotoStatus`, id `22`.

Rows discovered:

- `1` = `Uploaded`
- `2` = `Approved`
- `3` = `Dissaproved` (misspelled in real data)

Operational mapping observed from endpoint code:

- queue source filters `photostatus_id = 1` and `deleted = false`
- approve sets `photostatus_id = 2`
- reject sets `photostatus_id = 3`

### `photo_review_type` table

Xano table: `photo_review_type`, id `159`.

Rows discovered:

- `1` = `Agent`
- `2` = `Human`

### Audit / notes tables

#### `moderation_audit_log`

Xano table: `moderation_audit_log`, id `149`.

Fields:

- `id` int
- `created_at` timestamp
- `called_at` timestamp
- `endpoint` text
- `caller_type` text — `ai_agent | admin | system`
- `caller_ip` text
- `request_body_hash` text — hash only, no PII
- `response_status` int
- `target_user_id` int

Important limitation: current audit table does not have photo-specific columns, model fields, deterministic check fields, verdict/confidence/reason fields, or image URL fields required by the new AI moderation audit spec.

#### `admin_notes`

Xano table: `admin_notes`, id `153`.

Fields:

- `id` int
- `created_at` timestamp
- `author_user_id` int nullable for `ai_agent`/`system`
- `author_type` text — `admin | ai_agent | system`
- `target_type` text — polymorphic; endpoint uses `user_photo` for photo decisions
- `target_id` int
- `note_text` text
- `parent_note_id` int

#### `profile_change_audit`

Xano table: `profile_change_audit`, id `160`.

Relevant fields:

- `user_id`, `changed_by_id`, `source`, `field_name`, `old_value`, `new_value`
- `field_name` description includes `photo_added`, `photo_removed`, `moderation_state`, `moderation_note`

### Related moderation tables discovered

- `rejected_reports`, id `150`
- `pending_ban_decisions`, id `151`
- `banned_emails`, id `152`
- `moderation_keywords`, id `161`

No dedicated photo escalation queue table, user rejection email queue table, or AI photo audit detail table was confirmed in this pass.

## Existing moderation API group

API group: `moderation`, id `162`, base group identifier shown by Swagger as `/api:S8LKJE3D`.

Group description confirms:

- User-facing endpoints use JWT auth.
- Admin endpoints require `actor_key` validated against an environment moderation service key.
- Admin calls write to `moderation_audit_log`.

## `GET /photos/queue`

Xano API id: `2436`, group id `162`, name `photos/queue`, verb `GET`.

Inputs:

- `actor_key` text, required, sensitive
- `actor_type` text, required, lowercased
- `per_page` int optional, default `50`, min `1`, max `200`
- `page` int optional, default `1`, min `1`

Auth:

- `auth = users`; this requires a user JWT in addition to service-key validation.

XanoScript behavior:

- calls function `moderation/log_admin_call` with endpoint `/moderation/photos/queue` and caller type
- validates `actor_key` against an env moderation service key
- loads `$auth.id` from `users` and requires `is_admin = true`
- allows `actor_type` of `ai_agent`, `admin`, or `system`
- direct SQL query returns pending, undeleted photos:
  - source table `x1_12` (`Photos`)
  - filter `ph.photostatus_id = 1`
  - filter `ph.deleted = false`
  - ordered by `ph.created_at ASC`
- selected output fields:
  - `ph.id`
  - `ph.users_id`
  - `ph.PhotoUrl AS photo_url`
  - `ph.photostatus_id`
  - `ph.Gallery AS gallery`
  - `ph.created_at`
  - `u.name AS user_name`
  - `u.email AS user_email`
- count query: `COUNT(*) FROM x1_12 WHERE photostatus_id = 1 AND deleted = false`
- response: `{ items, total, page, per_page }`

Risk note: queue response includes user email. Worker logs and Jarvis summaries must avoid printing queue item payloads raw.

## `POST /photos/decide`

Xano API id: `2437`, group id `162`, name `photos/decide`, verb `POST`.

Inputs:

- `actor_key` text, required, sensitive
- `actor_type` text, required, lowercased
- `photo_id` int, required
- `decision` text, required; must be `approved` or `rejected`
- `reject_reason_code` text optional; description says required when rejected. Existing enum subset in Swagger: `inappropriate_photos`, `fake_profile`, `underage`, `sexual_content`
- `note` text optional; saved to `admin_notes`

Auth:

- `auth = users`; this requires a user JWT in addition to service-key validation.

XanoScript behavior:

- calls function `moderation/log_admin_call` with endpoint `/moderation/photos/decide` and caller type
- validates `actor_key` against an env moderation service key
- loads `$auth.id` from `users` and requires `is_admin = true`
- IMPORTANT: current code requires `actor_type == "admin"`; it rejects `ai_agent` for final photo decisions.
- validates final decision values only: `approved` or `rejected`
- maps approved to status id `2`; rejected to status id `3`
- edits `Photos.photostatus_id`
- when rejected or note present, writes `admin_notes` row:
  - `author_type = actor_type`
  - `target_type = "user_photo"`
  - `target_id = photo_id`
  - `note_text = reject_reason_code ~ ": " ~ note`
- response: `{ success: true, photo_id, new_status: decision }`

Blocking mismatch: assignment says use `actor_type: ai_agent` for final approve/reject, but real endpoint currently refuses anything except `admin`. This must be resolved before implementing an AI final-decision write path.

## AI recommendation write path

The real `Photos` table already has these fields:

- `ai_verdict`
- `ai_confidence`
- `ai_reason_code`
- `ai_note`

No dedicated existing API endpoint for writing only these recommendation fields was confirmed in this pass.

Likely candidate if no dedicated endpoint exists: generic `PATCH /photos/{photos_id}` in app group id `1`, API id `63`, but this has not yet been inspected and must not be used until exact auth/allowed fields are verified.

## Email / notification / escalation path

Confirmed existing relevant tables only:

- `admin_notes`
- `moderation_audit_log`
- `pending_ban_decisions`
- `banned_emails`

Not confirmed in this pass:

- user rejection email queue table
- owner/admin notification table
- photo-specific escalation queue table
- escalation acknowledgement endpoint
- Resend-backed backend path

## Repo state blocker

Requested app repo path from assignment is Windows-local: `H:\Projects\AnewluvDraftbitStuff\AnewluvExpo`.

On Devon host:

- `/data/repos/anewluvExpo` exists but is not a git repository.
- That local copy does not contain the named files `apis/ModerationAdminApi.js`, `app/admin/PhotoQueueScreen.js`, or `docs/moderation-and-trust-phase-spec.md`.
- No code mutation should start until canonical repo/worktree/branch is confirmed.

## Gate 1 conclusions

1. Xano schema discovery is working through `XANO_MCP_STREAM_URL`.
2. Real photo table is `Photos` / `x1_12`; pending queue is `photostatus_id=1 AND deleted=false`.
3. AI recommendation fields already exist on `Photos`.
4. Final decision endpoint currently only accepts final values `approved|rejected` and maps to `PhotoStatus` ids `2|3`.
5. Final decision endpoint currently refuses `actor_type=ai_agent`; assignment expects `ai_agent`. This is a blocking contract mismatch.
6. Existing audit table is too narrow for required AI action audit details unless a new audit path/table is added or `admin_notes` is used only as partial evidence.
7. No dedicated AI recommendation write endpoint, photo escalation queue, or email queue was confirmed yet.
8. Devon env has MCP/OpenAI keys only; it does not currently expose a moderation actor key variable for direct API dry-run calls.
9. Ticket pack path is missing on this host, so implementation sequence is being inferred from Lord Xar/Zifnab Discord assignment until the file appears.
