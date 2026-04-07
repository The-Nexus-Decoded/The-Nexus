# TOOLS.md -- Rega's Environment (ola-claw-trade)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-trade (you) | 100.104.166.53 | openclaw | Trading |
| ola-claw-dev (Haplo) | 100.94.203.10 | openclaw | Development |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator (DOWN) |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| ~/.openclaw-rega/ | Your profile root |
| ~/.openclaw-rega/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-rega/workspace/memory/ | Daily memory files |
| ~/.openclaw-rega/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #product | 1481316823982149634 | requireMention: true |
| #reports | 1481316829803843616 | requireMention: true |
| #growth | 1480481255303676087 | requireMention: true |

Guild ID: 1475082873777426494

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18841/health

# View logs
journalctl --user -u openclaw-gateway-rega --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-rega
```

## SSH Access

You have **local-only** access. No cross-server SSH.
If you need something on another server, route through Zifnab or Haplo.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
