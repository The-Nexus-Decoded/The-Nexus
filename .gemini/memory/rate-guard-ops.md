# Rate Guard v2 Operations Guide

## Architecture (v2.1 — deployed 2026-02-28)
- TypeScript HTTP proxy at localhost:8787 on ALL 3 servers
- Systemd: `openclaw-rate-guard.service` | Log: `/data/openclaw/logs/rate-guard-v2.log`
- Config: `/data/openclaw/rate-guard-v2/rate-guard-limits.json` (hot-reloadable, PER-SERVER)
- Counters: `/data/openclaw/rate-guard-v2/counters.json` (persisted every 30s + on each request + on SIGTERM)
- Analytics: `/data/openclaw/rate-guard-v2/rate-guard-analytics.db` (SQLite: requests, model_events, rate_limit_events tables)
- Priority chain: gemini-2.5-flash → gemini-3-flash-preview → gemini-2.5-pro → gemini-3.1-pro-preview → ollama → 429
- flash-lite REMOVED from chain (2026-02-28) — causes thought_signature errors with thinking-mode requests
- **Retry-on-429/503 loop** — proxy retries up to 5x with next route on 429/503
- **v2.1 Changes (Chelestra-Sea#32):**
  - Per-server primary key naming: Zifnab=`main`, Haplo=`dev`, Hugh=`trade`
  - Partitioned overflow keys: Zifnab=earth+air, Haplo=water+fire, Hugh=labyrinth+nexus
  - State keys: `serverName:model` format (e.g. `main:gemini-2.5-flash`), no more bare model keys
  - 429 body parsing: extracts quota_metric, quota_limit_value, retry_delay from Google response
  - TPM wall detection: if aggregated TPM >80% of model limit, marks ALL keys cooldown, skips to next model
  - `rate_limit_events` table in SQLite for 429 quota analysis
  - Health endpoint: `server_name`, `rate_limit_events_today`, `tpm_wall_events_today`, `last_429_quota`
  - Fleet parse updated: uses `server_name` from health JSON, shows per-server keys, TPM wall data
  - Rollback: `.bak-pre-v21` files on all 3 servers
- **Gateway FailoverError fix:** When gateway shows "API rate limit reached" loop: (1) stop gateway, (2) kill stale `openclaw-agent` processes, (3) rm `.jsonl.lock` files in agents/main/sessions/, (4) clear `exhaustedUntil` in counters.json, (5) `rm -rf ~/.cache/node/compile_cache`, (6) start gateway

## Vendor Patches (reapply after OpenClaw updates)
- **Reapply script:** `/data/openclaw/rate-guard-v2/reapply-rate-guard-patches.sh` on Zifnab
- Contains: rate guard proxy patches + Discord channel ID resolution fix
- Run on ALL 3 servers after any `openclaw` npm update, then restart gateways

## Counter Persistence (built by Zifnab, patched 2026-02-27)
- `loadState()` reads counters.json on startup
- `saveState()` writes every 30s + on each request + on SIGTERM
- **tpmDayTotal**: cumulative daily TPM counter, resets at 08:00 UTC (= midnight PT = 2 AM CT). Now corrected with actual tokens from response (was estimate-only before 2026-02-28).
- **rpmPeak / tpmPeak**: highest sliding window values seen today, reset at 08:00 UTC (added 2026-02-27)
- **Reset time**: 08:00 UTC via offset math (`now - 8h`), no timezone lib. Matches Google API daily quota reset.
  - **BUG FIX (2026-02-27 evening)**: `checkBudget()` was using `Math.max(tpmWindow, tpmDayTotal)` which permanently exhausted models once daily cumulative exceeded per-minute budget (~800K tokens). Changed to `tpmUsed = tpmWindow` (sliding window only). This was causing ALL Gemini models to show `available: false` on Zifnab, triggering constant FailoverErrors.
  - **Patch file**: `dist/budget-tracker.js` on ALL 3 servers (backup: `.bak-20260227-*`)

## Counter Sync Procedure
**CRITICAL**: To modify counters.json, you MUST stop → edit → start (NOT restart). The SIGTERM handler in `saveState()` writes in-memory state to disk on shutdown, which overwrites any file edits made before restart.

```bash
systemctl --user stop openclaw-rate-guard   # stop first — SIGTERM saves current state
# NOW edit counters.json (process is stopped, won't overwrite)
systemctl --user start openclaw-rate-guard  # loads your edited file
```

`systemctl --user restart` is ONLY safe when you don't need to edit counters.json (config-only changes are fine since rate-guard-limits.json is hot-reloadable).

## counters.json Format
```json
{
  "timestamp": "2026-02-27T15:00:00.000Z",
  "models": {
    "gemini-3-flash-preview": {
      "rpmWindow": [],
      "tpmWindow": [{"id":"sync-1","timestamp":1740700000000,"tokens":1980000,"estimated":true}],
      "tpmDayTotal": 1980000,
      "rpmPeak": 8,
      "tpmPeak": 319776,
      "rpdCount": 150,
      "rpdResetDate": "2026-02-27"
    }
  }
}
```

## Vendor Patches (RE-APPLY AFTER OPENCLAW UPDATES)
All `.bak-rg2` backups on each server.

**The file that actually matters** (OpenClaw uses `@mariozechner/pi-ai`, not `@google/genai`):
- `/usr/lib/node_modules/openclaw/node_modules/@mariozechner/pi-ai/dist/models.generated.js` (23 occurrences)

**Belt-and-suspenders patches** (`@google/genai` SDK):
- All 5 files in `@google/genai/dist/` (node/index.mjs, node/index.cjs, index.cjs, index.mjs, web/index.mjs)
- 15 OpenClaw dist files (runner-*.js, manager-*.js, etc.)
- `playwright-core/lib/mcpBundleImpl/index.js` (1 occurrence)

**Patch command**: `sudo sed -i 's|https://generativelanguage\.googleapis\.com|http://localhost:8787|g' <file>`

**After patching**: `rm -rf ~/.cache/node/compile_cache` + restart gateway ONLY.
**Rate guard restart IS safe** — SIGTERM handler saves counters before exit, loadState() restores on start. Old warning about losing counters was pre-persistence-patch.

## Env Vars (systemd drop-in: rate-guard.conf)
- `GEMINI_NEXT_GEN_API_BASE_URL`
- `GOOGLE_GEMINI_BASE_URL`
- `NODE_OPTIONS=--import=/home/openclaw/fetch-tracer.mjs`

## Config in openclaw.json
- `models.providers.google.baseUrl` = `http://localhost:8787/v1beta`

## 429-Learning (DEPLOYED 2026-02-27d on ALL 3 servers)
- When upstream Google returns 429, proxy calls `markExhausted429(model, 5min)`
- `budget-tracker.js`: new fields `exhaustedUntil` (epoch ms) and `count429Today` per model
- `checkBudget()` availability check includes `cooldownOk = !s.exhaustedUntil || Date.now() >= s.exhaustedUntil`
- `getModelStatus()` returns `"429-cooldown"` reason when model is in cooldown
- 5-minute cooldown per 429 event — model skipped during routing, next in priority chain used
- `count429Today` resets at midnight PT with other daily counters
- Counters persisted in counters.json (survives restart)

## Google API Limitations (confirmed 2026-02-27)
- Google Gemini API returns NO rate limit headers in responses
- `usageMetadata` in response body only has per-request token counts, not quota remaining
- Cloud Monitoring API might expose quota metrics (needs investigation)
- No way to auto-sync quota usage from API — manual Google dashboard sync is the only option for now
- 429-learning deployed (see above) — handles the case where budget estimation is wrong or another box used quota

## ThinkingConfig Strip Patch (2026-02-27b)
- **Problem**: When rate guard rewrites model (e.g., flash-3 → 2.5-pro), the request body still has `thinkingConfig` from the original model. Some models reject it with "Thinking level is not supported for this model."
- **Fix**: In `proxy.js`, when `route.rewritten` is true, parse body JSON and `delete parsed.generationConfig.thinkingConfig` before forwarding.
- **Deployed**: All 3 servers, backup at `proxy.js.bak-*`
- **RE-APPLY AFTER OPENCLAW UPDATES** (alongside the vendor baseUrl patches)

## Allowlist Fix (2026-02-27 evening, updated 2026-02-28)
- Removed `google/gemini-2.0-flash` from `agents.defaults.models` on ALL 3 servers (deprecated, returns 404)
- `gemini-2.5-flash-lite` FULLY REMOVED from everything (2026-02-28) — see Model Removal below

## Model Removal Procedure (LEARNED THE HARD WAY — 2026-02-28)
To fully remove a model from the fleet, you must clean ALL of these locations on ALL 3 servers:
1. `openclaw.json`: `agents.defaults.model.primary`, `agents.defaults.model.fallbacks`, `agents.defaults.models` (allowed list)
2. `rate-guard-limits.json`: the `models` object (model definitions with rpm/tpm/rpd) AND `priority_chain` array
3. `counters.json`: all entries including elemental key variants (e.g., `earth:model-name`, `air:model-name`, etc.)
4. Restart rate guard: `systemctl --user restart openclaw-rate-guard`

**WHY counters.json matters**: Rate guard serves ALL models from counters via `/health` endpoint. Even if model is removed from limits, stale counter entries survive restarts (loadState reads them back). Rate guard creates entries for models in limits.json on startup, but does NOT delete stale entries that are only in counters.

## Health Endpoint & Fleet Monitor (updated 2026-02-28)
- **health.js** returns structured `budget: { rpd_pct, rpm_peak_pct, tpm_peak_pct }` instead of single `budget_fraction`
- Per-model response includes: `tpmDayTotal`, `rpmPeak`, `tpmPeak` alongside existing rpm/tpm/rpd
- **`active_key`** now comes from SQLite DB (`SELECT api_key_name FROM requests ORDER BY id DESC LIMIT 1`) — shows the LAST key actually used, not just what the router would pick next
  - `request-log.js`: added `getLastKeyUsed()` function + export
  - `health.js`: imports request-log.js, calls `getLastKeyUsed()` for `active_key` field
  - Backups: `.bak-20260228-lastkey` on all 3 servers
- **fleet_parse.py** (Zifnab only, `/data/openclaw/workspace/fleet_parse.py`):
  - Aggregates RPD, TPM-day, and 429s across ALL keys (primary + overflow) per base model
  - Shows active key from health endpoint at top: `(key: earth)` etc.
  - Clean output — no per-model key breakdown, just the active key at top
  - Backup: `.bak-20260228`
- **fleet_status_monitor.sh** (Zifnab only, `/data/openclaw/workspace/fleet_status_monitor.sh`):
  - Runs every 10m via crontab, posts to #jarvis
  - SSHes to Haplo/Hugh for remote health, local curl for Zifnab
  - Pipes health JSON through fleet_parse.py

## Multi-Key Cascade (PLANNED 2026-02-27)

### Overflow API Keys (6 new Google Cloud projects)
| Name      | API Key                                    |
|-----------|-------------------------------------------|
| earth     | <REDACTED>  |
| air       | <REDACTED>  |
| water     | <REDACTED>  |
| fire      | <REDACTED>  |
| labyrinth | <REDACTED>  |
| nexus     | <REDACTED>  |

### Primary Keys (existing, per-server)
| Server  | Project        | Key Prefix       |
|---------|---------------|------------------|
| Zifnab  | ola-claw-main | [REDACTED] |
| Hugh    | ola-claw-trade| [REDACTED] |
| Haplo   | ola-claw-dev  | [REDACTED] |

### Cascade Design (UPDATED 2026-02-28 — per-model key rotation)
Each rate guard has ALL keys. Router tries ALL keys for each model before falling to next model:
```
flash-3:    primary → earth → air → water → fire → labyrinth → nexus
2.5-flash:  primary → earth → air → water → fire → labyrinth → nexus
2.5-pro:    primary → earth → air → water → fire → labyrinth → nexus
3.1-pro:    primary → earth → air → water → fire → labyrinth → nexus
ollama      → 429
```
Between each overflow key, router re-checks primary (cooldown may have expired).

### Implementation (DEPLOYED 2026-02-27 late, ROUTING REWRITE 2026-02-28)
- `rate-guard-limits.json`: `overflow_keys` array with `{name, key}` objects
- `budget-tracker.js`: state keys are `keyName:model` for overflow, `model` for primary (backward compatible)
- `model-router.js`: per-model key rotation — tries all keys per model, re-checks primary between overflow keys
- `proxy.js`: `rewriteKeyInSearch()` swaps `?key=` when using overflow key
- `request-log.js`: SQLite logger at `/data/openclaw/rate-guard-v2/rate-guard-analytics.db`
- `index.js`: initializes SQLite on startup
- `better-sqlite3` npm package installed on all 3 servers
- `budget_percent` raised to 90 (2026-02-28) — was 80→30→50→90. 429/503-learning is the real guardrail now, budget_percent just prevents obvious over-sending
- Removed dead `gemini-3.1-pro` model (404), kept `gemini-3.1-pro-preview`
- No cross-server coordination — each learns from 429s independently
- Backups: `.bak-20260227-multikey` on all files, all 3 servers

### SQLite Analytics DB
- Path: `/data/openclaw/rate-guard-v2/rate-guard-analytics.db`
- Tables: `requests` (every API call), `model_events` (429s, rewrites, exhaustion)
- WAL mode, prepared statements, indexes on timestamp/model/429
- Query examples:
  ```sql
  -- 429s by model and key
  SELECT api_key_name, routed_model, COUNT(*) FROM requests WHERE is_429=1 GROUP BY 1,2;
  -- Avg response time by model
  SELECT routed_model, AVG(response_time_ms) FROM requests GROUP BY 1;
  -- Burst detection (RPM peaks)
  SELECT strftime('%H:%M', timestamp) as minute, COUNT(*) FROM requests GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
  ```

## Token Estimator Fix (DEPLOYED 2026-02-28)
- **Problem**: Old estimator used `body.length / 4` on full JSON request body — counted JSON keys, brackets, generationConfig, safetySettings as tokens. Inflated estimates by ~62% (121K estimated vs 47K with fix for same request).
- **Fix in `token-estimator.js`**: Parses request body JSON, extracts only text from `contents[].parts[].text`, `systemInstruction.parts[].text`, and `tools[]`. Divides by 4. Applies multiplier: 1.5x if `thinkingConfig` present (accounts for thinking + output tokens), 1.2x otherwise. Falls back to old `body.length / 4` if JSON parse fails.
- **Fix in `budget-tracker.js`**: `correctTokens()` now adjusts `tpmDayTotal` with the diff when actual tokens arrive (was never corrected before — only incremented by estimate).
- **Fix in `proxy.js`**: Streaming handler now tracks `lastUsage` and sets `logData.actual_tokens` before `logRequest()`. Previously `actual_tokens` was always NULL for streaming requests (100% of traffic).
- **Result**: est=46,895 vs old est=123,838 for same request type. actual_tokens=175,070 now recorded in DB.
- **Backups**: `.bak-20260228-estimator` on all 3 files, all 3 servers
- **Note**: Actual total tokens (175K) includes massive thinking tokens (~100K+) from flash-3-preview. Estimate (47K) is input-side approximation. `correctTokens()` adjusts sliding window to actuals once response streams in. Budget per key = 500K TPM (1M × 50% × 1.0), so ~3 large requests per key after correction.

## Configurable Cooldown (DEPLOYED 2026-02-28)
- **Config**: `rate-guard-limits.json` → `cooldown` section (hot-reloadable)
  ```json
  "cooldown": { "enabled": true, "minutes_429": 10, "minutes_503": 2 }
  ```
- **COOLDOWN vs EXHAUSTED** — two distinct states:
  - `COOLDOWN` = temporary pause after 429/503. Model goes back in rotation when timer expires.
  - `EXHAUSTED` = RPD at max, done for the day until 08:00 UTC reset.
- `config.js`: `getCooldownConfig()` reads from limits file. Backup: `.bak-20260228-cooldown`
- `proxy.js`: reads cooldown durations from config (was hardcoded 5m/2m). Backup: `.bak-20260228-cooldown`
- `budget-tracker.js`: tracks `cooldownReason` ("429"/"503"), returns `status_tag` + `cooldown_remaining_s` + `getNearestCooldownExpiry()` in checkBudget. Clears expired cooldowns. Backup: `.bak-20260228-cooldown`
- `fleet_parse.py`: shows `[COOLDOWN 12m]` vs `[EXHAUSTED]` tags. Backup: `.bak-20260228-cooldown`
- 429 cooldown: 10 min (was 5m → 20m → 10m). 503 cooldown: 2 min (unchanged).

## Hold-and-Wait (DEPLOYED 2026-02-28)
- **Problem**: When all routes exhausted, rate guard returned 429 to OpenClaw gateway. Gateway's internal retry blocked the Discord event listener for 200-290s, causing timeouts.
- **Fix**: `proxy.js` now calls `getNearestCooldownExpiry()` and holds the request until that cooldown expires (max 2 min hold). Gateway never sees 429, Discord listener never blocks.
- `budget-tracker.js`: added `getNearestCooldownExpiry()` — scans all state entries for nearest `exhaustedUntil` in the future.
- Old behavior: blind 30s retry (too short for 10-20 min cooldowns).
- New behavior: precise wait until cooldown expires, up to 120s max.

## Thinking Token Fix (DEPLOYED 2026-02-28)
- **Problem**: Google's `usageMetadata.totalTokenCount` INCLUDES `thoughtsTokenCount` (thinking/reasoning tokens). Rate guard was using `totalTokenCount` for budget tracking, inflating counts by ~3-7x vs Google's actual quota usage. Google does NOT count thinking tokens toward TPM/RPD quota.
- **Fix**: `token-estimator.js` now computes `quotaTokenCount = totalTokenCount - thoughtsTokenCount`. `proxy.js` uses `quotaTokenCount` for `correctTokens()` and DB `actual_tokens`.
- **Impact**: tpmDayTotal now matches Google dashboard numbers. Budget checks are accurate.

## Vendor Patches Checklist (RE-APPLY AFTER EVERY OPENCLAW UPDATE)
1. `token-estimator.js` — JSON-aware text-only estimation + thinking multiplier + `quotaTokenCount` (excludes `thoughtsTokenCount`). Backup: `.bak-20260228-estimator`
2. `budget-tracker.js` — tpmUsed sliding window + tpmDayTotal correction + 429/503-learning + cooldown status_tag + `getNearestCooldownExpiry()`. Backup: `.bak-20260228-cooldown`
3. `config.js` — getCooldownConfig() for hot-reloadable cooldown durations. Backup: `.bak-20260228-cooldown`
4. `health.js` — structured budget object + `active_key` from SQLite DB via `getLastKeyUsed()`. Backup: `.bak-20260228-lastkey`
5. `request-log.js` — SQLite logger + `getLastKeyUsed()` function. Backup: `.bak-20260228-lastkey`
6. `model-router.js` — per-model key rotation (all keys per model, primary re-check between overflows). Backup: `.bak-20260228-permodel`
7. `proxy.js` — thinkingConfig strip + 429/503 detection + streaming actual_tokens + configurable cooldowns + hold-and-wait. Backup: `.bak-20260228-cooldown`
   - 503 = Google infra overloaded (per-model, not per-key). Marks model on ALL keys with configurable cooldown (default 2min)
   - 429 = YOUR quota exceeded (per-key). Marks only that key:model with configurable cooldown (default 10min)
   - Hold-and-wait: when all routes exhausted, holds request up to 2min until nearest cooldown expires (prevents 429 reaching gateway)
8. `@mariozechner/pi-ai/dist/models.generated.js` — baseUrl redirect to localhost:8787
9. `@google/genai/dist/*` — belt-and-suspenders baseUrl redirects
10. 15 OpenClaw dist files — baseUrl redirects
11. `playwright-core` mcpBundleImpl — baseUrl redirect
