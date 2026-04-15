# TOOLS.md -- Paithan's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you) | 100.94.203.10 | openclaw | Development |
| ola-claw-trade (Hugh) | 100.104.166.53 | openclaw | Trading |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| ~/.openclaw-paithan/ | Your profile root |
| ~/.openclaw-paithan/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-paithan/workspace/memory/ | Daily memory files |
| ~/.openclaw-paithan/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #coding | 1475083038810443878 | requireMention: true |
| #the-nexus | 1475082874234343621 | requireMention: true |
| #design | 1480482379838525500 | requireMention: true |
| #anewluv-dev | 1480483545431412877 | requireMention: true |

Guild ID: 1475082873777426494

## Gateway

Each agent runs **its own OpenClaw profile and its own gateway service**.
Do not assume one shared live config.

- Live profile config: `~/.openclaw-<agent>/openclaw.json`
- Matching gateway unit: `~/.config/systemd/user/openclaw-gateway-<agent>.service`
- For this profile specifically: `~/.openclaw-paithan/openclaw.json` + `openclaw-gateway-paithan.service`
- Treat `/data/openclaw/openclaw.json` as **not** the live per-agent profile config

```bash
# Health check
curl -s http://127.0.0.1:18820/health

# View logs
journalctl --user -u openclaw-gateway-paithan --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-paithan
```

## SSH Access

You have **local-only** access on ola-claw-dev. No cross-server SSH unless through Alfred, Haplo, or Zifnab.
If you need something on another server, route through Zifnab or Haplo.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context -- what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
