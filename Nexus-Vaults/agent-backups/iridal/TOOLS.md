# TOOLS.md -- Iridal's Environment & Tool Reference

## Server

You run on **ola-claw-dev** (Haplo's server).

| Detail | Value |
|---|---|
| Hostname | ola-claw-dev |
| Tailscale IP | 100.94.203.10 |
| User | openclaw |
| Profile root | ~/.openclaw-iridal/ |
| Workspace | ~/.openclaw-iridal/workspace/ |
| Config | ~/.openclaw-iridal/openclaw.json |
| OpenClaw version | 2026.4.1 |

## Discord

| Channel | ID | Your Access |
|---|---|---|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #games-3d | 1481242053974425720 | requireMention: true |

Guild ID: 1475082873777426494

## Key Paths

| Path | Purpose |
|---|---|
| ~/.openclaw-iridal/workspace/ | Your workspace (markdown only) |
| ~/.openclaw-iridal/workspace/memory/ | Daily memory files |
| /data/repos/The-Nexus/ | Git monorepo |
| /data/repos/The-Nexus/Arianus-Sky/ | Your realm — UIs, games, design |

## SSH Access

You have **local-only** SSH access. You cannot SSH to other servers.

| Target | Access |
|---|---|
| ola-claw-dev (self) | YES |
| ola-claw-trade (Hugh) | NO |
| ola-claw-main | DOWN — do not attempt |

## Collaboration

- **Samah** — Game design lead. Coordinate all game design decisions with him before committing narrative structures.
- **Zifnab** — Coordinator. All tickets, project folder creation, and task routing go through him.
- **Haplo** — Builder. When your narrative specs need implementation, Haplo builds it.

## Gateway

```bash
# Your gateway status
systemctl --user status openclaw-gateway-iridal.service

# Your logs
journalctl --user -u openclaw-gateway-iridal.service --no-pager -n 30
```

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
