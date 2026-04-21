# TOOLS.md — Marit's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you) | 100.94.203.10 | openclaw | Development — 14 agents live here |
| ola-claw-trade (Hugh) | 100.104.166.53 | openclaw | Trading — 6 agents live here |
| ola-claw-main | 100.103.189.117 | openclaw | PERMANENTLY RETIRED — do not use |
| Windows workstation | 100.90.155.49 | olawal | Lord Xar's Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs — they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| ~/.openclaw-marit/ | Your profile root |
| ~/.openclaw/workspace-marit/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw/workspace-marit/memory/ | Daily memory files (`memory/YYYY-MM-DD.md`) |
| ~/.openclaw-marit/openclaw.json | Your config (NEVER full-rewrite, use targeted jq patches, always backup first) |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo (all code lives here) |
| /data/openclaw/logs/marit.log | Your gateway log |
| /data/openclaw/shared/ | Shared reference material (channel exports, etc.) |

## Discord Channels

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #coding | 1475083038810443878 | requireMention: true |

Guild ID: 1475082873777426494

(Additional channels may be added by Lord Xar via config patch. Check config if a new channel appears.)

## Gateway

```bash
# Your gateway runs on port 18811 on ola-claw-dev

# Health check
curl -s http://127.0.0.1:18811/health

# View logs
journalctl --user -u openclaw-gateway-marit --no-pager -n 50

# Restart (do NOT run destructively — only if needed)
systemctl --user restart openclaw-gateway-marit
```

## Model Chain

- **Primary:** minimax/MiniMax-M2.7
- **Fallbacks (in order):**
  1. openrouter/qwen/qwen3-coder:free
  2. openrouter/google/gemma-4-31b-it:free
  3. openrouter/nvidia/nemotron-3-super-120b-a12b:free

**NEVER add `minimax/MiniMax-M2.7-highspeed` to your fallback chain.** Lord Xar's account plan does not support the highspeed variant — it returns HTTP 500 errors on every call.

## SSH Access

You have **local-only** access to ola-claw-dev. **No cross-server SSH.**

If you need something on ola-claw-trade (Hugh's server), route through Zifnab or Haplo.
You do NOT test remotely — artifacts come to you via CI or git.

## Testing Tools & Conventions

This server (ola-claw-dev) is where builds happen before they ship. Expect to work with:
- **pytest** for Python test suites
- **npm test / vitest / jest** for JS/TS
- **Playwright** for end-to-end web tests
- **axe-core** or **pa11y** for accessibility
- **k6** or **autocannon** for performance / load
- **curl / httpie / REST Client** for API probing

When in doubt about a test runner, read the repo's README or the CI config at `.github/workflows/` in The-Nexus.

## Shared Channel Exports

Discord channel history exports are at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been tested, what decisions were made, what bugs were filed. Save ONLY information relevant to YOUR QA role into your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.

## TTS Voice

Your voice is **English_Graceful-Lady** (pitch 0, speed 1.0). If you need voice output, it's configured already.
