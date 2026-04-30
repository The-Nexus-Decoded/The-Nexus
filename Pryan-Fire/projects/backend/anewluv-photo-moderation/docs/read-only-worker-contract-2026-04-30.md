# Read-only Worker Contract — 2026-04-30

## Scope

This document records the staged proof contract for the ANewLuv photo moderation worker.

Implementation remains gated. Documentation-only updates are allowed; worker execution, provider calls, queue reads, queue writes, and API mutations are not allowed until the gates below are cleared.

## Current Worker Expectation

The staged worker uses a pre-issued worker JWT/token.

It must not wire or depend on the app login flow unless Lord Xar explicitly chooses that path later.

## Required Worker Environment

Use project-specific environment names only.

Canonical env contract:

```txt
ANEWLUV_API_BASE_URL
ANEWLUV_AUTH_API_BASE_URL
ANEWLUV_ACTOR_KEY
ANEWLUV_WORKER_JWT or ANEWLUV_WORKER_TOKEN
```

Alias only:

```txt
ANEWLUV_MODERATION_ACTOR_KEY -> ANEWLUV_ACTOR_KEY
```

Do not use generic aliases unless Lord Xar explicitly approves them.

```txt
XANO_JWT
XANO_ACTOR_KEY
```

## Environment Meanings

```txt
ANEWLUV_API_BASE_URL = moderation API group base
ANEWLUV_ACTOR_KEY = moderation service gate key
ANEWLUV_WORKER_JWT = users JWT for service/admin AI account
```

Secrets must be read from approved secret/env paths only. Do not print token, password, key, cookie, credential header, query-string secret, or OAuth material.

## Auth Split

### Codex image analysis route

```txt
Codex OAuth from ~/.codex/auth.json
never print token material
```

Provider order:

```txt
1. OpenClaw/Codex OpenAI image-input route
2. OpenAI Moderations API supplement
3. MiniMax VL / image-analysis fallback
4. OpenRouter multimodal fallback
```

Provider path:

```txt
codex-openai-image
model_route: gpt-5.5 + gpt-image-2 configured image route
input_text + input_image
image_generation_events=0
output_type=text_json
```

Implementation lesson:

```txt
gpt-image-2 route can analyze existing image input
```

Codex route stays provider execution only.

Auth proof boundary:

```txt
route + request shape + redacted sample output only
no OAuth/session/token material printed
```

Adapter guardrail:

```txt
strict JSON parse
verdict enum validator
safe-only normalization: reject -> rejected
uncertainty flags force review/escalate, never approved
dry_run=true
write_enabled=false
/photos/decide not called
```

Adapter output must be strictly JSON-validated before normalization or report inclusion.

### Xano moderation/admin API

```txt
JWT + actor_key required
```

JWT alone is not sufficient.

## Recorded App Auth Path

This is app behavior context, not the staged worker path.

```txt
login route: POST /auth/login
auth base: /api:X_P2XjJo
fields: email, password
JWT field: authToken
app variable: AuthKey2
```

Evidence:

```txt
anewluvExpo/apis/AuthApi.js:43-49
anewluvExpo/apis/AuthApi.js:530-546
anewluvExpo/app/LoginNewScreen.js:396-405
```

## Doc-only Auth/Queue Seal

```txt
auth base: ANEWLUV_AUTH_API_BASE_URL
login: POST /auth/login
fields: email, password
token: authToken

queue: GET /photos/queue
auth: users JWT + ANEWLUV_ACTOR_KEY
actor_type: ai_agent
```

Auth base stays distinct from queue/API base.

The staged worker must not read or mutate app/global/AuthKey2/AsyncStorage state.

## Two-seal Gate

Identity seal, enforced by the server/API:

```txt
users JWT/token for AI moderation service user
server/API verifies users.is_admin = true
server/API verifies users.is_ai_agent = true
```

Moderation seal, presented by the worker:

```txt
ANEWLUV_ACTOR_KEY
alias only: ANEWLUV_MODERATION_ACTOR_KEY
```

This prevents a normal user JWT plus a leaked actor key from being enough. The worker must not locally re-verify users rows or treat possession of either seal as sufficient by itself.

## Verified Worker Code Contract

```txt
GET /photos/queue only
Authorization: Bearer ***
actor_key param
actor_type=ai_agent
no local account creation
no local users row verification
```

The staged worker relies on Xano/API enforcement for the service-user identity seal. User/admin verification stays server-side. The worker only presents the two seals; it must not invent trust locally. Local row verification is not part of the worker code contract.

## Execution Gate

No live queue access until all of the following are true:

```txt
approved env/secret path exists for ANEWLUV_API_BASE_URL
approved env/secret path exists for ANEWLUV_WORKER_JWT or ANEWLUV_WORKER_TOKEN
approved env/secret path exists for ANEWLUV_ACTOR_KEY or approved alias ANEWLUV_MODERATION_ACTOR_KEY
JWT identifies the AI moderation service user
users.is_admin = true
users.is_ai_agent = true
actor_key present
```

Allowed first live proof after approval:

```txt
GET /photos/queue only
users JWT
actor_key
actor_type=ai_agent
users.is_admin=true
users.is_ai_agent=true metadata/audit marker
small limit
redacted report
zero writes
strict JSON validator
normalize reject -> rejected only after validation
/photos/decide not called
```

The `users.is_admin=true` and `users.is_ai_agent=true` metadata/audit marker is descriptive only unless the endpoint actually accepts or returns that field. The worker must not invent local trust.

Still forbidden until explicitly approved:

```txt
queue run
API mutation
/photos/decide call
Photos.ai_* write
provider request beyond approved staged proof
```

Non-scope for first proof:

```txt
no /photos/decide
no Profiles.is_ai
no worker writes
tables 162/163 inert
```

## Leak-Risk Seal

```txt
actor_key is query-param transport
secret-only
no logs
no Discord
no raw command echo with values
```

Any proof command must show placeholders only, never the real query string.

## Output Redaction Gate

Reports and channel-shared output must not include raw image or user identifying fields. Use this replacement field instead:

```txt
source_field = redacted_image_reference
```

This gate applies to every output path, including:

```txt
successful final reports
error reports
exceptions
validation failures
dry-run summaries
debug/status output shared back to channel
```

## Validation Recorded

```txt
PYTHONPATH=src python3 -m unittest discover -s tests -q
Ran 12 tests — OK
```

Final handoff must include that exact green validation line.

## Current Frozen State

Before any live read-only proof, still required:

```txt
branch/status summary
approved secret/env path
explicit read-only small-limit command
confirmation that error paths apply the same redaction rules
```
