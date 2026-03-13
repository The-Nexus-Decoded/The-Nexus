# OpenClaw Model Configuration

## API Accounts
- Google Paid Tier 1 account — $300 free credits (~$80 used)
- SEPARATE Google Cloud projects per server (FIXED 2026-02-26):
  - ola-claw-main: project `ola-claw-main`, key `AIzaSyDd...FSN3os`
  - ola-claw-trade: project `ola-claw-trade`, key `AIzaSyCy...Kzz9s`
  - ola-claw-dev: project `ola-claw-dev`, key `AIzaSyCO...a4Nvg`
- Each server gets own 1M TPM quota (3M total vs old shared 1M)
- TPM limit: ~1M per PROJECT on Tier 1 (rate limits are PER PROJECT, not per key!)
- Google API rate limits are PER PROJECT. Multiple projects = multiplied quota.
- Auth-profiles path: `/data/openclaw/agents/main/agent/auth-profiles.json`
- OpenRouter key: `sk-or-v1-ad8eb96b...` — $9 added 2026-03-01. Now PRIMARY provider via budget proxy.
- Budget proxy at localhost:8788 enforces $5/day per model hard cap
- DO NOT put claude-sonnet on any fallback chain — expensive and unnecessary

## Current Model Chains (2026-03-02 session 10 — UNIQUE PER SERVER)
- **Strategy**: Shared primary + unique fallbacks per server. No fallback overlap.
- **Rule**: Never more than 1 server on the same fallback model (preserves free tier limits)
- **Registry**: `/data/openclaw/rate-guard-v2/free-model-registry.json` — master list of all 20 free models
- Primary (all 3): `openrouter/stepfun/step-3.5-flash:free` (84% success)
- **Zifnab fallbacks**: trinity-mini → solar-pro-3 → nemotron-30b → qwen3-235b-thinking
- **Hugh fallbacks**: nemotron-9b-v2 → nemotron-12b-v2 → qwen3-vl-30b → llama-3.3-70b
- **Haplo fallbacks**: glm-4.5-air → qwen3-vl-235b → trinity-large → qwen3-4b
- **Shared tail** (all servers): deepseek → grok → gemini-2.5-flash → ollama
- **Order rationale**: cheapest paid first (deepseek $0.13/M cached), gemini LAST (expensive — owner ran up $100)
- Balance guard: $6 (production)
- **TESTING IN PROGRESS**: StepFun + DeepSeek + Grok blacklisted in proxy to force free fallback testing
- **Blacklist location**: `openrouter-limits.json` → `blacklist` array. Remove entries to re-enable.
- OpenRouter routes through budget proxy (localhost:8788), Google through rate-guard (localhost:8787)
- **DIST PATCH required** — see rate-guard-ops.md for reapply procedure
- DO NOT change chains without explicit user instruction. The chain order matters.
- GitHub: Chelestra-Sea #57 (CLOSED)

## Free Model Provider Map (session 10 — 8 NEW models found working)
- **StepFun**: step-3.5-flash — workhorse, 84% success (degrades at 08:00 UTC)
- **Arcee AI**: trinity-mini (1.4s, FAST!) + trinity-large (empty response in test — retry)
- **Upstage**: solar-pro-3 (2.6s) — brand new provider, tool calling works
- **Nvidia**: nemotron-nano-9b-v2 (3.9s), nemotron-nano-12b-v2-vl (2.7s), nemotron-3-nano-30b (3.9s) — ALL v2/v3 work!
- **Qwen**: qwen3-vl-30b-thinking (3.7s), qwen3-vl-235b-thinking (5.8s), qwen3-235b-thinking-2507 (6.6s)
- **Z.AI**: glm-4.5-air — intermittent 429s, 65s avg response, works in bursts
- **Meta**: llama-3.3-70b — 13% success (was Venice-limited, testing solo now)
- **Venice**: qwen3-coder (3%), mistral-small (0%), qwen3-next-80b (0%) — EXHAUSTED, retesting after spread
- **Dead/404**: gpt-oss-120b, gpt-oss-20b, gemma-3-27b-it
- Free tier limits: 1,000 req/day per model, 20 RPM per model (limits are PER-MODEL per API key)
- **KEY INSIGHT**: All 3 servers share 1 API key. Spreading models = 3x throughput. Venice 0% may have been from 3-server collision.

## Fallback Chain (VERIFIED WORKING — 2026-03-02 session 7)
- **Chain works correctly**: DeepSeek→429 → Grok→429 → free→SUCCESS (Gemma 3 4B responded)
- **Key finding**: 4 copies of `runWithModelFallback` in dist files. Embedded agent uses `reply-Deht_wOB.js` (line 31382), NOT `subagent-registry-CVXe4Cfs.js`
- All 5 candidates present in list. Each failed model takes ~20s (internal retry with backoff)
- `isAuthCooldownBypassedForProvider` returns true for openrouter → cooldown skip never triggers
- `parseModelRef` correctly handles `openrouter/openrouter/free` → provider=openrouter, model=openrouter/free

## Balance Guard (DEPLOYED — ALL 3 servers)
- Polls `openrouter.ai/api/v1/credits` every 60s
- Current threshold: `$99` (testing mode — blocks all paid models)
- Production threshold: `$6` (switch back when testing complete)
- Config: `balance_threshold_usd`, `balance_poll_interval_sec` in openrouter-limits.json
- `isFreeTierModel` checks both `/free` and `:free` suffix
- Health endpoint shows 9 models, 7 free correctly detected
- Blacklist array still available but empty (no longer using openrouter/free router)
- **BUG FOUND session 9**: Haplo's proxy crash-looped and restarted with OLD config, allowing DeepSeek through for 4hrs. Always verify proxy startup logs show correct model count after restarts.

## Fleet Analytics Sync (NEW — session 9)
- Each server writes to local `rate-guard-analytics.db` (resilience — survives if box dies)
- Zifnab syncs Hugh + Haplo into `fleet_requests` table every 5 min via `analytics-sync.timer`
- Script: `/data/openclaw/rate-guard-v2/sync-analytics.sh`
- State: `/data/openclaw/rate-guard-v2/sync-state.json`
- Dedup: unique index on `(source_server, source_id)`
- Query unified data: `SELECT * FROM fleet_requests` on Zifnab

## Proxy Cost Fix (DONE — 2026-03-02 session 6)
- Proxy now uses `usage.cost` from OpenRouter response instead of hardcoded pricing
- DeepSeek prompt caching makes real cost ~$0.13/M (vs hardcoded $0.25/M) — roughly HALF
- Old proxy tracked $1.55, OpenRouter account showed $9.06 monthly ($8.44 daily)
- Gap was: (a) pre-SSE-fix forwarded but uncounted requests, (b) wrong hardcoded pricing
- Fix in `openrouter-proxy.js`: `actualCost` extracted from `usage.cost` field in both JSON and SSE paths
- Deployed to ALL 3 servers

## Removed/Deprecated Models
- `gemini-2.5-flash-lite` — removed from all chains, fallbacks, and allowed models (2026-02-27d). Cannot do thinking mode.
- `gemini-2.0-flash` + `gemini-2.0-flash-001` — Google returned 404 (2026-02-27). `gemini-2-flash` never valid.
- OpenRouter removed from all chains

## Performance Notes
- gemini-3.x preview models have SLOW thinking (22s+), 2.5-flash is 30x faster (0.7s)
- CRITICAL BUG: when ALL models fail (FailoverError), agent spams cached response in loop. Mitigated by rate-guard.

## Ollama (local 7B fallback)
- main: RTX 2070 Super + RTX 2080 (16GB), qwen2.5-coder:7b, 1075 tok/s prompt
- trade: GTX 1070 + GTX 1070 Ti (16GB), qwen2.5-coder:7b, 475 tok/s prompt
- dev: GTX 1070 + GTX 1070 Ti (16GB), qwen2.5-coder:7b + 32b + qwen3:30b + llama3.1:8b
- IMPORTANT: Ollama 7b CANNOT do tool use — hallucinates results

## Agent System Prompt Sizes
- Zifnab SOUL.md: ~5KB (97 lines), MEMORY.md: ~9KB (171 lines)
- Total runtime system prompt is larger (framework + context injected by OpenClaw)
