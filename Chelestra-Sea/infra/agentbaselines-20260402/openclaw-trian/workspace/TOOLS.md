# TOOLS.md -- Trian's Environment & Tool Reference

## Current Server: ola-claw-dev

## Tailscale Network

| Host | Tailscale IP | User | Role | Status |
|------|-------------|------|------|--------|
| ola-claw-dev (you) | [REDACTED_IP] | openclaw | Development | ACTIVE |
| ola-claw-trade (Hugh) | [REDACTED_IP] | openclaw | Trading | ACTIVE |
| ola-claw-main | [REDACTED_IP] | openclaw | Coordinator (original) | DOWN |
| Windows workstation | [REDACTED_IP] | olawal | Claude CLI, GSD, backups | ACTIVE |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server -- profile-isolated)

| Path | Purpose |
|------|---------|
| ~/.openclaw-trian/ | Your profile root (isolated from other agents) |
| ~/.openclaw-trian/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-trian/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| ~/.openclaw-trian/logs/ | Your gateway logs |
| ~/.openclaw-trian/qmd/ | Your memory database |

**Profile isolation:** Every agent on this server has its own root at `~/.openclaw-{name}/`. Do NOT read or write other agents' profile directories.

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #games-vr | 1480483545431412877 | requireMention: true |

Guild ID: 1475082873777426494

## Gateway Management

```bash
# Health check
curl -s http://127.0.0.1:18853/health

# View logs (last 50 lines)
journalctl --user -u openclaw-gateway-trian --no-pager -n 50

# Restart your gateway
systemctl --user restart openclaw-gateway-trian.service

# Status
systemctl --user status openclaw-gateway-trian.service
```

**Port: 18853** -- do not change without coordinating with Lord Xar.

## SSH Access

You have **local-only** SSH access. No cross-server SSH.

If you need something on another server, ask Zifnab or Haplo to coordinate.

**ola-claw-main is DOWN -- do not attempt SSH to it.**

## Model Chain

- **Primary:** openai-codex/gpt-5.4
- **Fallback 1:** minimax/MiniMax-M2.7
- **Fallback 2:** google/gemini-2.5-flash

## Character Art Tools

When working on character art:
- Concept art and turnaround sheets: workspace markdown specs only
- 3D assets (sculpts, models, textures): `/data/repos/The-Nexus/` via git
- Asset staging: `/data/openclaw/shared/art-pipeline/character-3d/` for handoff packages
- Coordinate with Ciang (environment art) on shared visual language

## GitHub

- Org: The-Nexus-Decoded
- Use `gh` CLI for all GitHub operations
- You do NOT create issues — route through Zifnab

## Messaging Channels -- IMPORTANT

- The ONLY messaging channel available is **Discord**.
- NEVER attempt to use WhatsApp, Slack, Telegram, email, or any other messaging platform.
- All message tool calls MUST target Discord channels listed above.
- If you need to contact Lord Xar, post in the appropriate Discord channel.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
