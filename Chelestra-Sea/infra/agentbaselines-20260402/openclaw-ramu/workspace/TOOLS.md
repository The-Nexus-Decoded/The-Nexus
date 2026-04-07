# TOOLS.md -- Ramu's Environment & Tool Reference

## Current Server: ola-claw-trade

## Tailscale Network

| Host | Tailscale IP | User | Role | Status |
|------|-------------|------|------|--------|
| ola-claw-trade (you) | [REDACTED_IP] | openclaw | Trading + Product | ACTIVE |
| ola-claw-dev (Haplo) | [REDACTED_IP] | openclaw | Development + Coordinator | ACTIVE |
| ola-claw-main | [REDACTED_IP] | openclaw | Coordinator (original) | DOWN |
| Windows workstation | [REDACTED_IP] | olawal | Claude CLI, GSD, backups | ACTIVE |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server -- profile-isolated)

| Path | Purpose |
|------|---------|
| ~/.openclaw-ramu/ | Your profile root (isolated from other agents) |
| ~/.openclaw-ramu/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-ramu/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| ~/.openclaw-ramu/logs/ | Your gateway logs |
| ~/.openclaw-ramu/qmd/ | Your memory database |

**Profile isolation:** Every agent on this server has its own root at `~/.openclaw-{name}/`. Do NOT read or write other agents' profile directories.

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #coding | 1475083038810443878 | requireMention: true |

Guild ID: 1475082873777426494

## Gateway Management

```bash
# Health check
curl -s http://127.0.0.1:18842/health

# View logs (last 50 lines)
journalctl --user -u openclaw-gateway-ramu --no-pager -n 50

# Restart your gateway
systemctl --user restart openclaw-gateway-ramu.service

# Status
systemctl --user status openclaw-gateway-ramu.service
```

**Port: 18842** -- do not change without coordinating with Lord Xar.

## SSH Access

You have **local-only** SSH access. No cross-server SSH.

If you need something on another server, ask Zifnab or Haplo to coordinate.

**ola-claw-main is DOWN -- do not attempt SSH to it.**

## Model Chain

- **Primary:** minimax/MiniMax-M2.7
- **Fallback 1:** anthropic/claude-sonnet-4-6
- **Fallback 2:** openai-codex/gpt-5.4

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
