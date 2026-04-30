# Anewluv Photo Moderation — API / Tool Availability Evidence

Date: 2026-04-30  
Mode: read-only / availability probes only. No production data writes.

## Environment names checked

Env file path checked:

```text
/data/Workspace/Anewluv/.env
```

Values were not printed. Availability checks reference env variable names only.

Confirmed present by name during this pass:

- `OPENAI_API_KEY`
- `XANO_MCP_TOKEN`
- `XANO_MCP_BASE`
- `XANO_MCP_STREAM_URL`
- `XANO_MCP_SSE_URL`
- `MINIMAX_API_KEY`

Still required or unresolved by exact canonical name:

- moderation service actor key for app API calls (`ANEWLUV_AI_ACTOR_KEY` or actual existing equivalent)
- user/admin JWT source for endpoints with `auth = users`
- owner alert email variable
- Jarvis/Discord reporting path variable
- backend email provider variable if Resend or existing provider is selected

## Xano MCP

Status: available through stream transport.

Observed:

- `XANO_MCP_STREAM_URL` initialized successfully and exposed Xano Metadata API tools.
- `XANO_MCP_BASE` returned 404 for GET/POST at the provided base path.
- `XANO_MCP_SSE_URL` was not usable as the active transport in this environment.

Workspace:

- workspace id `1`
- workspace name `AnewluvDB`
- live branch `v1`

Read-only Xano metadata operations used:

- `getWorkspaceContext`
- `getTableSchema`
- `getTableContent` for lookup tables only
- `listAPIGroups`
- `listAPIs`
- `getAPI`
- `getApiSwagger`

No Xano mutation tools were used.

## Existing Anewluv moderation API

Base API group discovered:

- group id `162`
- name `moderation`
- public group identifier: `/api:S8LKJE3D`

### `GET /photos/queue`

Status: schema and implementation inspected through MCP. Direct runtime call is blocked until a safe auth setup is provided.

Contract facts:

- API id: `2436`
- method: `GET`
- auth: `users` JWT required
- service input: `actor_key` required and sensitive
- actor types allowed: `ai_agent`, `admin`, `system`
- source: `Photos` physical table `x1_12`
- queue filter: `photostatus_id = 1 AND deleted = false`
- order: `created_at ASC`
- response shape: `{ items, total, page, per_page }`
- item fields include `id`, `users_id`, `photo_url`, `photostatus_id`, `gallery`, `created_at`, `user_name`, `user_email`

Risk: queue response includes `user_email`, so dry-run logs and Jarvis summaries must redact or omit raw queue item payloads.

Direct API dry-run blocker:

- endpoint requires both service key and user JWT/admin context. The currently documented env set does not provide a confirmed safe admin/user JWT path for the worker.

### `POST /photos/decide`

Status: schema and implementation inspected through MCP. Do not call until safe test photo + auth + actor-type contract are resolved.

Contract facts:

- API id: `2437`
- method: `POST`
- auth: `users` JWT required
- service input: `actor_key` required and sensitive
- input `decision`: `approved` or `rejected`
- reject note fields: `reject_reason_code`, `note`
- approve maps to `photostatus_id = 2`
- reject maps to `photostatus_id = 3`
- writes `admin_notes` row when rejected or note present, with `target_type = user_photo`

Blocking mismatch:

- Assignment says final decision calls should use `actor_type: ai_agent`.
- Real endpoint currently requires `actor_type == "admin"` for photo decisions.
- Direction from Zifnab: do not use admin impersonation to bypass this.

## AI recommendation write path

Status: fields exist, endpoint not confirmed.

Confirmed existing table fields on `Photos`:

- `ai_verdict`
- `ai_confidence`
- `ai_reason_code`
- `ai_note`

Not confirmed:

- dedicated endpoint to write recommendation fields only;
- exact allowed value contract for `ai_verdict` (`approve/review/reject` description vs assignment values `approved/rejected/review/escalate`);
- whether generic `PATCH /photos/{photos_id}` allows safe AI-only field updates.

Required before implementation:

- inspect generic photo PATCH endpoint or add a dedicated recommendation endpoint on a Xano branch after approval.

## OpenAI Moderations API

Status: env key present, API probe returned rate limit instead of success.

Probe attempted:

- endpoint: `POST https://api.openai.com/v1/moderations`
- model: `omni-moderation-latest`
- harmless text-only input

Observed:

- HTTP `429`
- response contained only `error`

Conclusion:

- API path and auth are syntactically reachable, but availability is currently blocked by rate limit/quota state.
- This API remains optional broad safety screening only and cannot satisfy Anewluv-specific photo rules.

## Primary image / vision path

Status: not yet available through OpenClaw image tool on this host.

Probe attempted:

- generated harmless local PNG/JPG fixture under the allowed workspace path;
- called OpenClaw `image` analysis tool with a strict JSON availability prompt.

Observed:

- tool returned `Failed to optimize image` for both PNG and JPG synthetic fixtures.

Conclusion:

- OpenClaw image analysis path is not verified available yet for this worker.
- Do not implement auto-approval path until a real vision-capable reviewer is verified with image URL input and strict JSON output.

## MiniMax image / vision fallback

Status: `MINIMAX_API_KEY` name is present, but image/vision endpoint contract is not yet verified.

Still required:

- exact endpoint/tool name;
- request body shape;
- response body shape;
- auth header/env name;
- whether remote image URL input works;
- whether strict JSON output can be enforced cheaply and reliably.

## Deterministic local image checks

Local Python/tool availability observed:

```text
python=3.12.3
PIL=True
numpy=True
pytesseract=True
file_bin=True
cv2=False
pyzbar=False
zxing=False
tesseract_bin=False
zbarimg_bin=False
```

Implications:

- Basic dimensions, file type, size, blank/solid-color, exposure/darkness, and simple blur-like metrics can likely be done with Python/Pillow/Numpy.
- OCR is not actually ready despite `pytesseract` module being importable because `tesseract` binary is missing.
- QR detection is not ready because `pyzbar`/`zbarimg`/`zxing` are missing.
- OpenCV-based blur/QR/collage checks are not ready because `cv2` is missing.

Implementation choice needed later:

- either add dependencies to a worker runtime manifest and document install/rollback;
- or choose lighter pure-Python/Pillow checks and mark OCR/QR as vision-model responsibilities until approved.

## Audit logging

Status: existing audit path is insufficient for AI action detail.

Confirmed existing table:

- `moderation_audit_log`, id `149`

Limitation:

- existing fields cover endpoint/caller/status/hash/target user, not required photo-review details such as photo id, image URL, model path, deterministic checks, summarized moderation result, normalized verdict/confidence/reason, or escalation state.

Required before implementation:

- create/add a dedicated AI photo audit path on a Xano branch, or approve an alternate audit design.

## Email / notification / Jarvis

Status: not confirmed.

Workspace context shows older email-related functions/API groups, including Mailgun/SendGrid names, but no photo-moderation owner escalation path or Jarvis reporting path was confirmed in this pass.

Known function/API names observed in workspace context:

- `mailgun_basic_send`
- `mailgun_dynamic_send`
- `mailgun_get_templates`
- `sendgrid_basic_send`
- `sendgrid_dynamic_send`
- `GET /mailgun/templates`
- `POST /mailgun/send`
- `POST /sendgrid/validate`

Unresolved:

- whether any provider is currently configured and approved for Anewluv user/owner email;
- whether Resend should be introduced;
- Jarvis report destination or Discord webhook mechanism;
- escalation acknowledgement storage and route.

## Availability conclusion

Safe-to-use now:

- Xano MCP read-only metadata discovery;
- repo docs under the Fire project path;
- local Pillow/Numpy inspection for future deterministic checks after runtime design.

Blocked before write-capable implementation:

- direct queue API dry-run needs safe user JWT/admin auth + service actor key contract;
- final decision path has `ai_agent` vs `admin` mismatch;
- AI recommendation write endpoint is absent/unverified;
- audit logging path is too narrow;
- vision reviewer is not verified;
- OpenAI Moderations probe returned 429;
- email/Jarvis/escalation paths are unconfirmed.
