# TOOLS.md -- Sinistrad's Environment & Tool Reference

## Server

You run on **ola-claw-trade** (Hugh's server).

| Detail | Value |
|---|---|
| Hostname | ola-claw-trade |
| Tailscale IP | 100.104.166.53 |
| User | openclaw |
| Profile root | ~/.openclaw-sinistrad/ |
| Workspace | ~/.openclaw-sinistrad/workspace/ |
| Config | ~/.openclaw-sinistrad/openclaw.json |
| OpenClaw version | 2026.4.1 |

## Discord

| Channel | ID | Your Access |
|---|---|---|
| #the-nexus | 1475082874234343621 | requireMention: true |

Guild ID: 1475082873777426494

## Key Paths

| Path | Purpose |
|---|---|
| ~/.openclaw-sinistrad/workspace/ | Your workspace (markdown only) |
| ~/.openclaw-sinistrad/workspace/memory/ | Daily memory files |
| /data/repos/The-Nexus/ | Git monorepo |
| /data/repos/The-Nexus/Chelestra-Sea/ | Your primary realm — fleet infra, business ops |

## SSH Access

You have **local-only** SSH access. You cannot SSH to other servers.

| Target | Access |
|---|---|
| ola-claw-trade (self) | YES |
| ola-claw-dev (Haplo) | NO |
| ola-claw-main | DOWN — do not attempt |

## Collaboration

- **Zifnab** — Coordinator. All tickets, task routing, and issue creation go through him.
- **Hugh** — Trading operations. Shares your server. Do not interfere with trading services.
- **Haplo** — Builder. When your intelligence needs tooling built, Haplo builds it.

## Gateway

```bash
# Your gateway status
systemctl --user status openclaw-gateway-sinistrad.service

# Your logs
journalctl --user -u openclaw-gateway-sinistrad.service --no-pager -n 30
```

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
