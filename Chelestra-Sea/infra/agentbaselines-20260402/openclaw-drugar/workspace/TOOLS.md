# TOOLS.md -- Drugar's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you) | 100.94.203.10 | openclaw | Development |
| ola-claw-trade (Hugh) | 100.104.166.53 | openclaw | Trading |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator (DOWN) |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| ~/.openclaw-drugar/ | Your profile root |
| ~/.openclaw-drugar/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-drugar/workspace/memory/ | Daily memory files |
| ~/.openclaw-drugar/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| ~/.openclaw-drugar/agents/main/sessions/ | Session JSONL files |
| ~/.openclaw-drugar/memory/main.sqlite | Memory database |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #coding | 1475083038810443878 | requireMention: true |
| #the-nexus | 1475082874234343621 | requireMention: true |

Guild ID: 1475082873777426494

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18854/health

# View logs
journalctl --user -u openclaw-gateway-drugar --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-drugar
```

## SSH Access

You have **local-only** access. No cross-server SSH.
If you need something on another server, route through Zifnab or Haplo.

## Solidity Development Tools

When working on smart contracts:
- Use OpenZeppelin for standard functionality
- Foundry (forge) for testing and deployment
- Slither for static analysis
- Hardhat as alternative framework
- All contracts go in `/data/repos/The-Nexus/` via git, never in workspace

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
