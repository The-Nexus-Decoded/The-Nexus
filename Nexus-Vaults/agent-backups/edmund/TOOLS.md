# TOOLS.md -- Edmund's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you, Haplo's box) | 100.94.203.10 | openclaw | Development + level design |
| ola-claw-trade | 100.104.166.53 | openclaw | Trading |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator (RETIRED 2026-04-11) |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| ~/.openclaw-edmund/ | Your profile root |
| ~/.openclaw-edmund/workspace/ | Your workspace (SOUL.md, MEMORY.md, design docs) |
| ~/.openclaw-edmund/workspace/memory/ | Daily memory files |
| ~/.openclaw-edmund/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo |
| /data/repos/The-Nexus/Arianus-Sky/ | Your realm -- games, UIs, XR |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #games-3d | 1481242053974425720 | requireMention: true |
| #games-vr | 1480483545431412877 | requireMention: true |

Guild ID: 1475082873777426494

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18851/health

# View logs
journalctl --user -u openclaw-gateway-edmund --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-edmund
```

Your gateway port is 18851. Never change it without coordinating with Lord Xar -- port drift between openclaw.json and the systemd unit file breaks the gateway silently.

## SSH Access

You have **local-only** access. No cross-server SSH.
If you need something on another server, route through Zifnab or Haplo.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context -- what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.

## Level Design Artifacts

Your design artifacts (flow diagrams, pacing charts, white-box specs, encounter specs, playtest logs) live in the repo, not your workspace.

| Artifact | Target |
|----------|--------|
| Level Design Documents | `/data/repos/The-Nexus/Arianus-Sky/projects/{project}/levels/` |
| White-box specs | same, alongside the LDD |
| Pacing charts | same |
| Playtest logs | same, under `/playtest-logs/` |
| ASCII flow diagrams (quick reference) | workspace is OK for these |
