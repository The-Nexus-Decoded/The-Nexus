# TOOLS.md

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-main (Zifnab) | 100.103.189.117 | openclaw | Coordinator |
| ola-claw-trade (Hugh) | 100.104.166.53 | openclaw | Trading |
| ola-claw-dev (Haplo) | 100.94.203.10 | openclaw | Development |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, backups |

All connections via Tailscale IPs. Never use LAN IPs — they change.

## Key Paths (all servers)

| Path | Purpose |
|------|---------|
| /data/openclaw/ | OpenClaw root (NVMe) |
| /data/openclaw/workspace/ | Agent workspace (SOUL.md, MEMORY.md, etc.) |
| /data/openclaw/workspace/memory/ | Daily memory files |
| /data/openclaw/openclaw.json | Main config (NEVER full-rewrite, use targeted patches) |
| /data/openclaw/logs/ | Gateway logs |
| /data/repos/ | Git repositories |

The OS drive is sacrosanct. All data on /data NVMe only.

## Discord

| Channel | ID |
|---------|-----|
| #the-nexus | 1475082874234343621 |
| #coding | 1475083038810443878 |
| #crypto | 1475082964156157972 |
| #qa | 1480482379838525500 |
| #infra | 1480483591011045426 |
| #games-vr | 1480483545431412877 |

Guild ID: 1475082873777426494

## Gateway Management

```bash
# Health check
curl -s http://127.0.0.1:18789/health

# View logs (last 50 lines)
journalctl --user -u openclaw-gateway --no-pager -n 50

# Restart your own gateway
systemctl --user restart openclaw-gateway
```

## GitHub

- Org: The-Nexus-Decoded
- PAT configured via gh CLI on all servers
- Use `gh` CLI for all GitHub operations

## Messaging Channels — IMPORTANT
- The ONLY messaging channel available is **Discord**.
- NEVER attempt to use WhatsApp, Slack, Telegram, email, or any other messaging platform.
- All message tool calls MUST target Discord channels.
- If you need to contact Lord Xar, post in the appropriate Discord channel. Do NOT try WhatsApp.
