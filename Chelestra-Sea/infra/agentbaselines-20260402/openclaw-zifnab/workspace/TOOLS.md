# TOOLS.md -- Zifnab's Environment & Tool Reference

## Current Server: ola-claw-dev (relocated from ola-claw-main)

ola-claw-main is DOWN until further notice. You are temporarily sharing ola-claw-dev with Haplo and other dev agents. Your profile is isolated via profile-specific root.

## Tailscale Network

| Host | Tailscale IP | User | Role | Status |
|------|-------------|------|------|--------|
| ola-claw-dev (you + Haplo) | [REDACTED_IP] | openclaw | Development + Coordinator | ACTIVE |
| ola-claw-trade (Hugh) | [REDACTED_IP] | openclaw | Trading | ACTIVE |
| ola-claw-main | [REDACTED_IP] | openclaw | Coordinator (original) | DOWN |
| Windows workstation | [REDACTED_IP] | olawal | Claude CLI, GSD, backups | ACTIVE |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server -- profile-isolated)

| Path | Purpose |
|------|---------|
| ~/.openclaw-zifnab/ | Your profile root (isolated from other agents) |
| ~/.openclaw-zifnab/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-zifnab/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| ~/.openclaw-zifnab/logs/ | Your gateway logs |
| ~/.openclaw-zifnab/qmd/ | Your memory database |
| /data/openclaw/logs/zifnab.log | Gateway log file |

**Profile isolation:** Every agent on this server has its own root at `~/.openclaw-{name}/`. Do NOT read or write other agents' profile directories. Do NOT use the old default root at `~/.openclaw/` or `/data/openclaw/` -- those are legacy.

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #jarvis | 1475082997027049584 | requireMention: false (your channel) |
| #coding | 1475083038810443878 | requireMention: false (supervise Haplo) |
| #trading | 1475082964156157972 | Not configured (Hugh's channel) |

Guild ID: 1475082873777426494

## Gateway Management

Your gateway runs as a profile-specific systemd user service.

```bash
# Health check
curl -s http://127.0.0.1:18850/health

# View logs (last 50 lines)
journalctl --user -u openclaw-gateway-zifnab --no-pager -n 50

# Restart your gateway
systemctl --user restart openclaw-gateway-zifnab.service

# Status
systemctl --user status openclaw-gateway-zifnab.service
```

**Port: 18850** -- do not change without coordinating with Lord Xar.

## SSH Access

You have cross-server SSH access. Only three agents have this privilege: Alfred, Haplo, and Zifnab.

```bash
# Restart Hugh's gateway
ssh openclaw@[REDACTED_IP] "systemctl --user restart openclaw-gateway-hugh.service"

# Check Hugh health
ssh openclaw@[REDACTED_IP] "curl -s http://127.0.0.1:18810/health"
```

**ola-claw-main is DOWN -- do not attempt SSH to it.**

## Model Chain

- **Primary:** anthropic/claude-opus-4-6
- **Fallback 1:** anthropic/claude-sonnet-4-6
- **Fallback 2:** minimax/MiniMax-M2.7
- **Fallback 3:** google/gemini-2.5-flash
- **Emergency:** OpenRouter free models (configured as provider, not in active chain)

## Fleet CLI & Lobster Workflows

**NOTE:** Fleet CLI and Lobster workflows were installed on ola-claw-main. They may not be available on dev yet. If you need fleet tooling, ask Lord Xar to install it on this server.

If installed, workflows live at: `/data/openclaw/workspace/workflows/`
Fleet CLI: `/usr/local/bin/fleet`

### Key Workflows (when available)

| Task | Pipeline | When |
|------|----------|------|
| Safe restart | seventh-gate.lobster | ALWAYS before restarting any gateway |
| Post-update patches | chelestra-tide.lobster | After OpenClaw update |
| Fleet health | chelestra-current.lobster | Daily or on-demand |
| PR review scan | pryan-forge.lobster | Check if any PRs need review |
| Create + merge PR | nexus-bridge.lobster | After code changes are ready |

### Rules
- NEVER restart a gateway without running seventh-gate first (if available)
- ALWAYS test before creating a PR
- ALWAYS use absolute paths for workflow files

## GitHub

- Org: The-Nexus-Decoded
- PAT configured via gh CLI
- Use `gh` CLI for all GitHub operations

## Messaging Channels -- IMPORTANT

- The ONLY messaging channel available is **Discord**.
- NEVER attempt to use WhatsApp, Slack, Telegram, email, or any other messaging platform.
- All message tool calls MUST target Discord channels listed above.
- If you need to contact Lord Xar, post in the appropriate Discord channel.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
