# Session Handoff: Infrastructure & Discord Fixes (2026-03-05)

**Created:** 2026-03-05
**Status:** ACTIVE CONTEXT — READ THIS BEFORE DOING ANYTHING

---

## CRITICAL: Development Process Rules (MANDATORY — VIOLATIONS = WASTED TOKENS)

### The Process — No Exceptions

Agents keep violating this. Lord XAR (the owner, @sterol on Discord) has repeated these rules many times. **This is the law:**

1. **Requirements Gathering**: Lord XAR + Zifnab + relevant stakeholders discuss the work needed
2. **Ticket Classification**: Zifnab determines which realm the ticket belongs to:
   - **Pryan-Fire** = Business logic, trading code, agent services, tools
   - **Chelestra-Sea** = Infrastructure, Ansible, systemd, deployment, workflows
   - **Arianus-Sky** = Monitoring, dashboards, UIs
   - **Abarrach-Stone** = Data, schemas, models
   - **Nexus-Vaults** = Documentation, backups, workspace snapshots
3. **Ticket Creation**: Zifnab creates the GitHub issue and assigns it to the right agent (Haplo, Hugh, etc.)
4. **Sync with main**: Assignee runs `git fetch origin && git log --oneline HEAD..origin/main` — if behind, rebase first
5. **Feature Branch**: Create branch from main using naming convention (`feat/`, `fix/`, `hotfix/`)
6. **Work the ticket**: Implement the changes on the feature branch
7. **Create PR**: Push branch, create PR, and **REQUEST REVIEW from Zifnab or Lord XAR**
8. **Review**: Zifnab or Lord XAR reviews the PR
9. **Merge**: **ONLY Lord XAR or Zifnab merges.** The implementing agent NEVER merges their own PR.

### What Agents Keep Doing Wrong (STOP THIS)

- **Posting API keys / secrets in GitHub commits or PRs** — NEVER commit secrets. Use environment variables or config files that are .gitignored
- **Starting to code immediately on the server with no ticket** — NO. Get a ticket first.
- **Completing their own PR without review** — NO. Create the PR, request review, then WAIT.
- **Merging their own PR** — ABSOLUTELY NOT. Only Lord XAR or Zifnab merges.
- **Working on a stale branch** — NO. Always sync with main first.
- **Bundling unrelated changes** — NO. One concern per PR.
- **SSH-ing into servers and manually editing files** — NO. Everything goes through the pipeline: branch -> PR -> CI -> merge -> auto-deploy.

### Pipeline
```
branch -> PR -> phantom-gauntlet CI -> merge to main -> deploy-mvp.yml auto-deploys
```

The only deploy workflow is `.github/workflows/deploy-mvp.yml`. Do not create new deploy workflows.

---

## Server Fleet — Current State (2026-03-05)

### Servers

| Server | Hostname | Tailscale IP | Role | Bot Name |
|--------|----------|-------------|------|----------|
| Haplo | ola-claw-dev | 100.94.203.10 | Dev Factory (coder) | @Haplo |
| Hugh | ola-claw-trade | 100.104.166.53 | Trader | @HughTheHand |
| Zifnab | ola-claw-main | 100.103.189.117 | Coordinator (Jarvis) | @Zifnab |

All servers: Ubuntu 24.04, OpenClaw gateway on port 18789, systemd user service `openclaw-gateway.service`

### SSH Access
```bash
ssh openclaw@haplo      # or ssh openclaw@ola-claw-dev
ssh openclaw@hugh       # or ssh openclaw@ola-claw-trade
ssh openclaw@zifnab     # or ssh openclaw@ola-claw-main
```

### Gateway Management
```bash
# Restart gateway
systemctl --user restart openclaw-gateway

# Check logs
journalctl --user -u openclaw-gateway -n 50 --no-pager

# Check status
systemctl --user status openclaw-gateway
```

### Config File
`/home/openclaw/.openclaw/openclaw.json` on each server. Changes are hot-reloaded for some settings, but gateway restart is more reliable.

---

## LLM Provider Configuration (2026-03-05)

### Primary: MiniMax (paid)
- **API Endpoint**: `https://api.minimax.io/v1` (NOT api.minimax.chat — that's deprecated)
- **Model**: `MiniMax-M2` (NOT abab6.5s-chat — deprecated. NOT MiniMax-M1 — insufficient balance)
- **API Key**: `sk-cp-iQwhAkdrpJ5lPLPStiJpJJ7OswvmwTRLKGyZEQnXP4YCZTw7h0lG702Vf_sX7OELsTX4ktjpsDCbqUF6kAs1aJJhQPMqpar7DQCKwzI_EJRbq8z0s_F4qzE`
- **Provider type in OpenClaw**: `"api": "openai-completions"`
- **Rate limit**: ~1000 calls per 5 hours
- **IMPORTANT**: MiniMax migrated from `api.minimax.chat` to `api.minimax.io` — old URL returns 401 with error code 2049

### Fallback: OpenRouter (free models via Rate Guard proxy)
- **Proxy URL**: `http://localhost:8788/v1` (Rate Guard v2 budget proxy running on each server)
- **API Key**: `[REDACTED — rotate this key]`
- **Free models available**:
  - `stepfun/step-3.5-flash:free`
  - `arcee-ai/trinity-mini:free`
  - `nvidia/nemotron-3-nano-30b-a3b:free`
  - `nvidia/nemotron-nano-9b-v2:free`
  - `qwen/qwen3-235b-a22b-thinking-2507`
  - `meta-llama/llama-3.3-70b-instruct:free`

### Fallback: Google Gemini (via Rate Guard proxy)
- **Proxy URL**: `http://localhost:8787/v1beta` (Rate Guard v2 Gemini proxy)
- **Model**: `gemini-2.5-flash`
- **NOTE**: Gemini embeddings API key is EXPIRED on Haplo — `"API key expired. Please renew the API key"`. This affects memory/embeddings sync, not chat.

### Fallback: Ollama (local)
- **URL**: `http://localhost:11434`
- **Model**: `qwen2.5-coder:7b`
- **Status**: May not be running on all servers

### Model Priority Chain (all servers)
```
Primary: minimax/MiniMax-M2
Fallback 1: openrouter/stepfun/step-3.5-flash:free
Fallback 2: google/gemini-2.5-flash (Haplo/Hugh) or openrouter/google/gemini-flash-1.5 (Zifnab)
Fallback 3+: Various OpenRouter free models
Last resort: ollama/qwen2.5-coder:7b
```

### Known Issue: FailoverError on 401
OpenClaw treats HTTP 401 as a terminal error and throws `FailoverError` — it does NOT fall through to fallback models. If the primary model's API key is invalid, ALL requests fail. This means the API key MUST be correct on the primary model or the bot goes completely silent.

---

## Discord Configuration (2026-03-05)

### Discord Server
- **Guild ID**: `1475082873777426494` (olaclaw-homelab)

### Channels

| Channel | ID | Purpose |
|---------|-----|---------|
| #the-nexus | 1475082874234343621 | General / cross-realm discussion |
| #trading | 1475082964156157972 | Market data, trades, price action, wallet balances ONLY |
| #coding | 1475083038810443878 | Code discussion, debugging, development, architecture |
| #zifnab | 1475082997027049584 | Zifnab-specific channel |

### Bot Discord IDs
- **Haplo**: Discord bot user logged in (check config for token)
- **HughTheHand**: Discord user ID `1475665881726980269`
- **Zifnab**: Discord user ID `1475077203044601987`

### Owner Discord ID
- **Lord XAR / @sterol**: User ID `1478214532324393010` (also possibly `316308517520801793`)

### Channel Settings (all servers, all channels)
```json
{
  "allow": true,
  "requireMention": false,
  "groupPolicy": "allowlist",
  "allowBots": true,
  "streaming": "off",
  "historyLimit": 20,
  "textChunkLimit": 2000
}
```

**IMPORTANT**: Per-channel `users` arrays were REMOVED on 2026-03-05. Do NOT re-add them. The channel allowlist (`allow: true`) is sufficient — any user in an allowed channel can talk to any bot.

### Bot Response Rules (updated 2026-03-05)

**IMPORTANT LESSON LEARNED**: System prompt "stay silent unless named" instructions are NOT reliably followed by MiniMax-M2. The LLM ignores them and responds to everything. The ONLY reliable way to prevent a bot from responding in a channel is to **remove that channel from the bot's allowlist** in openclaw.json.

**Channel assignments (FINAL — all bots collaborate in shared channels):**

| Channel | Haplo | Hugh | Zifnab | Response Rule |
|---------|-------|------|--------|---------------|
| #coding (1475083038810443878) | yes | yes | yes | Respond only when named/mentioned |
| #crypto (1475082964156157972) | yes | yes | yes | Respond only when named/mentioned |
| #the-nexus (1475082874234343621) | yes | yes | yes | Respond only when named/mentioned |
| #jarvis (1475082997027049584) | NO | NO | **yes (exclusive)** | Zifnab responds to everything |

All bots are in all shared channels so they can collaborate. Response filtering is done via system prompts that tell each bot to only respond when their name/alias appears in the message or they are @mentioned. The #jarvis channel is exclusively for Lord XAR and Zifnab.

**IMPORTANT CAVEAT**: MiniMax-M2 does NOT reliably follow "stay silent" system prompts. Bots may occasionally respond when not addressed. This is an LLM behavior limitation, not a config issue. If this becomes too noisy, the only guaranteed fix is removing bots from channels they shouldn't respond in (reverting to exclusive layout).

| Bot | Trigger words (case-insensitive) | Notes |
|-----|-----------------------------------|-------|
| **Haplo** | @mention, "haplo", "hap" | — |
| **Hugh** | @mention, "hugh", "hand", "hughthehand", "thehand" | — |
| **Zifnab** | @mention, "zifnab", "zif" | Responds to ALL in #jarvis |

### Channel System Prompts
All bots have system prompts that include:
- **RESPONSE RULES**: Only respond when their name/alias is in the text or they're @mentioned (see table above)
- **TOOL SELECTION RULES** (Hugh, Zifnab): Use `lobster` tool with workflow files for fleet operations, NOT raw shell commands
- **CHANNEL RULES** (Hugh #trading): Market data only, no code discussion

---

## Rate Guard v2 Proxy System (CRITICAL — BOTS MUST UNDERSTAND THIS)

Each server runs TWO local proxy services that sit between OpenClaw and upstream APIs. OpenClaw NEVER talks directly to Google or OpenRouter — it goes through these proxies.

### Architecture
```
OpenClaw Gateway (port 18789)
  ├─→ MiniMax (direct: https://api.minimax.io/v1) — no proxy needed, paid tier
  ├─→ Rate Guard v2 (localhost:8787) ──→ Google Gemini API (round-robin keys)
  ├─→ OpenRouter Budget Proxy (localhost:8788) ──→ OpenRouter API (budget-enforced)
  └─→ Ollama (localhost:11434) — local, no proxy needed
```

### Rate Guard v2 — Gemini Proxy (port 8787)
- **Service**: `openclaw-rate-guard.service`
- **Binary**: `/data/openclaw/rate-guard-v2/dist/index.js`
- **Config**: `/data/openclaw/rate-guard-v2/rate-guard-limits.json`
- **What it does**: Proxies requests to Google Gemini API with rate limiting, key rotation across multiple API keys (water key, fire key), and cooldown on 429/503 errors
- **OpenClaw config**: Set Google provider `baseUrl` to `http://localhost:8787/v1beta`
- **Rate limits**: 1000 RPM, 1M TPM, 10K RPD for gemini-2.5-flash
- **Cooldown**: 30 sec on 429, 2 min on 503
- **Overflow keys**: Rotates between "water" and "fire" Gemini API keys when one is rate-limited

### OpenRouter Budget Proxy (port 8788)
- **Service**: `openclaw-openrouter-proxy.service`
- **Binary**: `/data/openclaw/rate-guard-v2/openrouter-proxy.js`
- **Config**: `/data/openclaw/rate-guard-v2/openrouter-limits.json`
- **Budget tracking**: `/data/openclaw/rate-guard-v2/openrouter-budget.json`
- **What it does**: Reverse proxy for OpenRouter with per-model daily spend caps ($5/day per model), balance checking, and budget enforcement
- **OpenClaw config**: Set OpenRouter provider `baseUrl` to `http://localhost:8788/v1`
- **API key**: `[REDACTED — rotate this key]` (stored in openrouter-limits.json)
- **Balance guard**: Polls OpenRouter credits, blocks paid models when balance drops below $6
- **Analytics**: Logs to `rate-guard-analytics.db` (SQLite) for fleet reporting

### Service Management
```bash
# Check proxy status
systemctl --user status openclaw-rate-guard
systemctl --user status openclaw-openrouter-proxy

# Restart proxies
systemctl --user restart openclaw-rate-guard
systemctl --user restart openclaw-openrouter-proxy

# View logs
journalctl --user -u openclaw-rate-guard -n 20 --no-pager
journalctl --user -u openclaw-openrouter-proxy -n 20 --no-pager
```

### IMPORTANT Rules for Proxy Configuration
1. **NEVER set OpenRouter baseUrl to `https://openrouter.ai/api/v1`** — always use `http://localhost:8788/v1`
2. **NEVER set Google/Gemini baseUrl to `https://generativelanguage.googleapis.com`** — always use `http://localhost:8787/v1beta`
3. **MiniMax and Ollama are direct** — they don't go through proxies
4. **If proxy service is down, the provider will fail** — check proxy status before debugging LLM errors
5. **Budget resets daily at 08:00 UTC** — if a model hits its $5/day cap, it's blocked until reset

### Available Free OpenRouter Models (via budget proxy)
| Model | Status |
|-------|--------|
| stepfun/step-3.5-flash:free | Active (1709 requests) |
| z-ai/glm-4.5-air:free | Active (301 requests) |
| meta-llama/llama-3.3-70b-instruct:free | Available |
| qwen/qwen3-235b-a22b-thinking-2507 | Available |
| nvidia/nemotron-nano-9b-v2:free | Available |
| arcee-ai/trinity-mini:free | Available |
| mistralai/mistral-small-3.1-24b-instruct:free | Available |

### Paid OpenRouter Models (budget-capped at $5/day each)
| Model | Input $/M | Output $/M |
|-------|-----------|------------|
| deepseek/deepseek-v3.2 | $0.25 | $0.40 |
| x-ai/grok-4.1-fast | $0.20 | $0.50 |

---

## Fixes Applied This Session (2026-03-05)

### Problem: All Discord bots not responding

**Root Causes (multiple):**

1. **`requireMention: true` on most channels** — Messages were being skipped with reason "no-mention". Fixed by setting `requireMention: false` on all channels on all servers.

2. **MiniMax API URL deprecated** — Config had `api.minimax.chat` but MiniMax migrated to `api.minimax.io`. Old URL returns error code 2049 "invalid api key". Fixed by updating baseUrl to `https://api.minimax.io/v1`.

3. **MiniMax model name deprecated** — Old model `abab6.5s-chat` returns "unknown model (2013)". `MiniMax-M1` returns "insufficient balance (1008)". Fixed by updating to `MiniMax-M2`.

4. **Zifnab had the OLD MiniMax API key** — Was still using `sk-cp-3Stif...` instead of the new `sk-cp-iQwh...` key. Fixed by updating the key.

5. **Zifnab's OpenRouter missing fallback model** — `stepfun/step-3.5-flash:free` was in the fallback chain but not in the OpenRouter provider's models array. Fixed by adding it.

6. **Per-channel `users` arrays blocking messages** — Hugh's channels only allowed user `1478214532324393010`, but the owner may also use `316308517520801793`. Fixed by removing `users` arrays entirely.

7. **Zifnab OpenRouter pointed to wrong URL** — Was `https://openrouter.ai/api/v1` (direct) instead of `http://localhost:8788/v1` (local Rate Guard proxy). Fixed.

8. **Haplo #trading channel had `allow: null`** — Set to `allow: true`.

### Additional Issues Found (not yet fixed)
- **Gemini embeddings API key expired on Haplo** — Memory/embeddings sync fails with "API key expired". Needs a new Gemini API key.
- **Hugh SOUL.md is 20345 chars (limit 20000)** — Gets truncated. Should be trimmed.
- **Zifnab SOUL.md is 22621 chars and MEMORY.md is 26249 chars** — Both exceed 20000 char limit and get truncated.
- **MiniMax-M2 does NOT follow "stay silent" system prompts reliably** — Bots respond to messages even when not addressed. Only reliable filter is removing the channel from the bot's allowlist.
- **Hugh calling owner by real name** — Inferred from `olawal@` in MEMORY.md or session memory. SOUL.md correctly uses "Lord Xar" / "Lord Alfred". May need to scrub real name references from Hugh's MEMORY.md and clear session memory.
- **Haplo cron tasks failing** — FailoverError from Gemini (expired key), MiniMax primary not catching cron tasks properly. Cron keeps retrying and failing.
- **All bots responding in #coding** — Hugh and Zifnab should only respond when addressed by name in #coding but MiniMax-M2 ignores this. Consider removing Hugh from #coding (he only needs #crypto and #the-nexus) or accept that all 3 respond there.

---

## The-Nexus Monorepo Structure

```
The-Nexus/
  Pryan-Fire/           # Business logic (Python + Node)
    haplos-workshop/    # Haplo's dev tools
    zifnabs-scriptorium/# Zifnab's coordination tools
    hughs-forge/        # Hugh's trading code
      services/
        meteora-trader/ # Meteora trader (Node.js)
  Chelestra-Sea/        # Infrastructure (Ansible, systemd, deployment)
    infra/
      openclaw-homelab/ # OpenClaw homelab planning & Ansible
  Arianus-Sky/          # Monitoring (dashboards, UIs)
  Abarrach-Stone/       # Data (schemas, models)
  Nexus-Vaults/         # Backups, redacted workspace snapshots
```

**Source of truth on servers**: `/data/openclaw/workspace/The-Nexus/`
**Git operations**: `/data/repos/The-Nexus/`
**Lobster workflows**: `/data/openclaw/workspace/workflows/*.lobster`

---

## Security Rules

- **NEVER commit API keys, tokens, or secrets to Git**
- **NEVER post API keys in GitHub issues, PRs, or comments**
- API keys go in `openclaw.json` on the server (not in the repo)
- Sensitive config uses `ansible-vault` encrypted files
- Discord bot tokens are per-server in `openclaw.json`
- The MiniMax, OpenRouter, and Gemini API keys listed in this doc are for server-side config ONLY

---

## Lobster Workflow Quick Reference

When performing fleet operations, ALWAYS use the `lobster` tool with workflow files:

| Operation | Workflow |
|-----------|----------|
| Fleet restart | seventh-gate |
| Apply patches | chelestra-tide |
| PR scan | pryan-forge |
| Issue triage | labyrinth-watch |
| Branch cleanup | abarrach-seal |
| Maintenance | chelestra-current |
| Memory review | abarrach-stone |
| Build/test | patryn-workhorse |
| PR create | nexus-bridge |

Use `exec` for fleet CLI ONLY for quick single-command checks (fleet health, fleet status, fleet sessions).

---

## Hardware

| Server | CPU | RAM | GPU | Storage |
|--------|-----|-----|-----|---------|
| Haplo (dev) | Ryzen 24-core | 64GB | 2x GTX 1070 8GB | 1.8TB NVMe |
| Hugh (trade) | Ryzen 24-core | 16GB | 2x GTX 1070 8GB | 2TB NVMe |
| Zifnab (main) | Ryzen 24-core | 16GB | 2x GTX 1070 8GB | 2TB NVMe |

All servers: 1200W PSU, open-air mining chassis, 3x PCIe x16 slots, Ubuntu 24.04 LTS

---

## OpenClaw Homelab Planning

Planning docs are at:
```
The-Nexus/Chelestra-Sea/infra/openclaw-homelab/.planning/
```

- `PROJECT.md` — Project definition, requirements, constraints
- `ROADMAP.md` — 5-phase roadmap
- `STATE.md` — Current progress state
- Phase plans in `.planning/phases/`

### Current Progress
- Phase 1: Plans 01-01 and 01-02 complete (server provisioning + OpenClaw install on dev)
- Phase 1: Plans 01-03 (Discord/notifications) and 01-04 (backup) remaining
- 2 of 3 motherboards have bent pins — may only get dev server working
- If others fail, all 3 personalities run on dev server on ports 18789/18790/18791

---

## Discord & LLM Configuration Management Guide

This section explains exactly HOW to modify Discord channels, response rules, LLM providers, and API keys on any server. The config lives in a single JSON file per server. All changes go through this file.

### The Config File

**Path on every server:** `/home/openclaw/.openclaw/openclaw.json`

This is the ONLY file you need to edit for Discord behavior, LLM model selection, and provider API keys. OpenClaw hot-reloads some changes, but a gateway restart is more reliable.

### How to Edit (via SSH from Windows or from another server)

Use Python one-liners to modify JSON safely. NEVER hand-edit JSON files — one missing comma breaks everything.

```bash
# Generic pattern — run on the target server
ssh openclaw@<server> python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)

# ... make changes to cfg ...

with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
print('Done')
"
```

After editing, restart the gateway:
```bash
ssh openclaw@<server> systemctl --user restart openclaw-gateway
```

### Config Structure (annotated example with FAKE keys)

```json
{
  "models": {
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimax.io/v1",
        "apiKey": "sk-FAKE-minimax-key-here",
        "api": "openai-completions",
        "models": [
          { "id": "MiniMax-M2", "name": "MiniMax M2" }
        ]
      },
      "openrouter": {
        "baseUrl": "http://localhost:8788/v1",
        "apiKey": "sk-or-v1-FAKE-openrouter-key-here",
        "models": [
          { "id": "stepfun/step-3.5-flash:free", "name": "Step 3.5 Flash (Free)" },
          { "id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (Free)" }
        ]
      },
      "google": {
        "baseUrl": "http://localhost:8787/v1beta",
        "models": [
          { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash" }
        ]
      },
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "apiKey": "ollama-local",
        "api": "ollama",
        "models": [
          { "id": "qwen2.5-coder:7b", "name": "qwen2.5-coder:7b" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "minimax/MiniMax-M2",
        "fallbacks": [
          "openrouter/stepfun/step-3.5-flash:free",
          "google/gemini-2.5-flash",
          "ollama/qwen2.5-coder:7b"
        ]
      },
      "models": {
        "minimax/MiniMax-M2": {},
        "openrouter/stepfun/step-3.5-flash:free": {},
        "google/gemini-2.5-flash": {},
        "ollama/qwen2.5-coder:7b": {}
      }
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "FAKE-discord-bot-token-here",
      "allowBots": true,
      "groupPolicy": "allowlist",
      "historyLimit": 20,
      "textChunkLimit": 2000,
      "streaming": "off",
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475083038810443878": {
              "allow": true,
              "requireMention": false,
              "systemPrompt": "Your system prompt here..."
            },
            "1475082874234343621": {
              "allow": true,
              "requireMention": false
            }
          }
        }
      }
    }
  }
}
```

### Key Rules for Config Editing

1. **`providers` → defines WHERE to reach each LLM API**
   - `baseUrl`: The endpoint URL. Use localhost proxies for OpenRouter (8788) and Gemini (8787)
   - `apiKey`: The API key for that provider
   - `api`: The API format — `"openai-completions"` for MiniMax/OpenRouter, `"ollama"` for Ollama, omit for Google
   - `models`: Array of `{id, name}` objects — the model IDs available from this provider

2. **`agents.defaults.model` → defines WHICH model to use and fallback order**
   - `primary`: Format is `"provider/model-id"` (e.g., `"minimax/MiniMax-M2"`)
   - `fallbacks`: Array of `"provider/model-id"` strings tried in order if primary fails

3. **`agents.defaults.models` → must list every model in primary + fallbacks**
   - Each key is `"provider/model-id"`, value is `{}` (empty object)
   - If a model is in fallbacks but NOT in this map, it won't work

4. **`channels.discord.guilds.<guild-id>.channels.<channel-id>` → per-channel config**
   - `allow`: `true` to enable the bot in this channel
   - `requireMention`: Keep `false` — response filtering is done via systemPrompt instead
   - `systemPrompt`: Instructions injected into every conversation in this channel
   - `users`: REMOVED — do NOT re-add. Any user in an allowed channel can talk to the bot

### Common Operations

#### Change the primary LLM model (all servers)
```bash
# Run on each server (haplo, hugh, zifnab)
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)
cfg['agents']['defaults']['model']['primary'] = 'minimax/MiniMax-M2'
with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

#### Update an API key
```bash
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)
cfg['models']['providers']['minimax']['apiKey'] = 'sk-NEW-KEY-HERE'
with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

#### Add a new Discord channel to the allowlist
```bash
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)

GUILD = '1475082873777426494'
NEW_CHANNEL = '1234567890123456789'  # the Discord channel ID

cfg['channels']['discord']['guilds'][GUILD]['channels'][NEW_CHANNEL] = {
    'allow': True,
    'requireMention': False,
    'systemPrompt': 'RESPONSE RULES: Only respond when @mentioned or your name appears in the message.'
}

with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

#### Remove a Discord channel from the allowlist
```bash
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)

GUILD = '1475082873777426494'
DEL_CHANNEL = '1234567890123456789'

del cfg['channels']['discord']['guilds'][GUILD]['channels'][DEL_CHANNEL]

with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

#### Update system prompt on a channel (e.g., change response rules)
```bash
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)

GUILD = '1475082873777426494'
CHANNEL = '1475083038810443878'  # #coding

cfg['channels']['discord']['guilds'][GUILD]['channels'][CHANNEL]['systemPrompt'] = '''RESPONSE RULES (MANDATORY):
Do NOT respond unless @mentioned or your name appears in the message.
SILENCE otherwise.'''

with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

#### Add a new model to a provider
```bash
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)

# Add model to provider's model list
cfg['models']['providers']['openrouter']['models'].append({
    'id': 'new-model/name:free',
    'name': 'New Model Name'
})

# Add to agents.defaults.models map (required!)
cfg['agents']['defaults']['models']['openrouter/new-model/name:free'] = {}

# Optionally add to fallbacks
cfg['agents']['defaults']['model']['fallbacks'].append('openrouter/new-model/name:free')

with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

#### Add a new LLM provider
```bash
python3 -c "
import json
with open('/home/openclaw/.openclaw/openclaw.json') as f:
    cfg = json.load(f)

cfg['models']['providers']['newprovider'] = {
    'baseUrl': 'https://api.newprovider.com/v1',
    'apiKey': 'sk-NEW-PROVIDER-KEY',
    'api': 'openai-completions',
    'models': [
        {'id': 'model-name', 'name': 'Model Display Name'}
    ]
}

# Register in agents.defaults.models
cfg['agents']['defaults']['models']['newprovider/model-name'] = {}

# Set as primary or add to fallbacks
cfg['agents']['defaults']['model']['primary'] = 'newprovider/model-name'

with open('/home/openclaw/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
systemctl --user restart openclaw-gateway
```

### Debugging Checklist

If a bot isn't responding on Discord:

1. **Check gateway is running:** `systemctl --user status openclaw-gateway`
2. **Check recent logs:** `journalctl --user -u openclaw-gateway -n 30 --no-pager`
3. **Look for specific errors:**
   - `no-mention` → `requireMention` is true, set to false
   - `HTTP 401` → API key is wrong or expired
   - `FailoverError` → Primary AND all fallbacks failed (401 is terminal, does NOT cascade)
   - `unknown model` → Model ID doesn't exist at that provider
   - `insufficient balance` → Provider account has no credits
   - `429` or `503` → Rate limited, will auto-retry via Rate Guard
4. **Check the channel is in the allowlist:** Look for channel ID in `channels.discord.guilds.*.channels`
5. **Check proxy services (if using OpenRouter/Gemini):**
   - `systemctl --user status openclaw-rate-guard` (port 8787, Gemini)
   - `systemctl --user status openclaw-openrouter-proxy` (port 8788, OpenRouter)
6. **Test LLM directly:**
   ```bash
   # Test MiniMax directly
   curl -s https://api.minimax.io/v1/chat/completions \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"MiniMax-M2","messages":[{"role":"user","content":"hello"}]}' | head -200

   # Test OpenRouter via proxy
   curl -s http://localhost:8788/v1/chat/completions \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"stepfun/step-3.5-flash:free","messages":[{"role":"user","content":"hello"}]}' | head -200
   ```
7. **Restart gateway:** `systemctl --user restart openclaw-gateway`

### Fleet-Wide Operations

To apply the same change to all 3 servers, run the command on each:
```bash
for server in haplo hugh zifnab; do
  ssh openclaw@$server 'python3 -c "
import json
with open(\"/home/openclaw/.openclaw/openclaw.json\") as f:
    cfg = json.load(f)
# ... your changes ...
with open(\"/home/openclaw/.openclaw/openclaw.json\", \"w\") as f:
    json.dump(cfg, f, indent=2)
" && systemctl --user restart openclaw-gateway'
  echo "$server done"
done
```

Or use the SSH Manager MCP tool from Windows:
```
mcp__ssh-manager__ssh_execute(server="haplo", command="...")
mcp__ssh-manager__ssh_execute(server="hugh", command="...")
mcp__ssh-manager__ssh_execute(server="zifnab", command="...")
```

---

*This handoff created 2026-03-05. Read this BEFORE starting any work.*
