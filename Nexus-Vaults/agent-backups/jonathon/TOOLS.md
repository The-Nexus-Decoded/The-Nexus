# TOOLS.md -- Jonathon's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you) | 100.94.203.10 | openclaw | Development / Security Lead |
| ola-claw-trade | 100.104.166.53 | openclaw | Trading |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| `~/.openclaw-jonathon/` | Your profile root |
| `~/.openclaw-jonathon/workspace/` | Your workspace (SOUL.md, MEMORY.md, playbooks) |
| `~/.openclaw-jonathon/workspace/memory/` | Daily memory files |
| `~/.openclaw-jonathon/openclaw.json` | Your config (NEVER full-rewrite, use targeted jq patches) |
| `/data/repos/` | Git repositories |
| `/data/repos/The-Nexus/` | The-Nexus monorepo |
| `/data/repos/The-Nexus/Nexus-Vaults/security/playbooks/` | IR playbooks and runbooks |
| `/data/repos/The-Nexus/Nexus-Vaults/detection/sigma/` | Sigma detection rules (committed code) |
| `/data/repos/The-Nexus/Nexus-Vaults/detection/soar/` | SOAR playbook automation code |
| `/data/repos/The-Nexus/Nexus-Vaults/security/vulnerability-register.md` | Fleet vulnerability register |
| `/data/evidence/{incident-id}/` | Forensic evidence (secured, NEVER in git) |
| `/data/logs/security/` | Threat hunt outputs, scan results |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #gamesbrainstorm | 1481242053974425720 | requireMention: true |
| #security | 1481316815408988355 | requireMention: true |

Guild ID: 1475082873777426494

Primary operating channel: #security for routine blue-team work, detection rule discussion, vulnerability triage. Cross-fleet communication goes through #the-nexus. P1 incident details go to Lord Xar direct DM. P2 and P3 incident updates go to #security.

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18849/health

# View logs
journalctl --user -u openclaw-gateway-jonathon --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-jonathon.service
```

Service unit file: `~/.config/systemd/user/openclaw-gateway-jonathon.service`
Port: 18849 (verified in both unit ExecStart and openclaw.json gateway.port)

## SSH Access

You have **local-only** access on ola-claw-dev. No cross-server SSH.

If you need something on another server (threat hunt across servers, coordinated IR action), route through Haplo (dev-local), Alfred (cross-server), or Zifnab (coordinator). Do NOT attempt to grant yourself cross-server SSH access by modifying authorized_keys.

## Security Tooling Notes

- **Sigma rules**: committed to `Nexus-Vaults/detection/sigma/`, versioned, each rule has a test case, false positives are tuned with a commit message explaining why.
- **SOAR playbooks**: committed to `Nexus-Vaults/detection/soar/`, reviewed like code, each playbook is idempotent and reversible.
- **Forensic imaging**: always before containment. Use dd or the provider's snapshot API. Image goes to `/data/evidence/{incident-id}/`, never to workspace, never to git.
- **IOC handling**: use the vulnerability register at `Nexus-Vaults/security/vulnerability-register.md` as the authoritative source. Do not paste IOCs in Discord channels that could alert an active attacker.
- **Post-mortem template**: use `Nexus-Vaults/security/post-mortem-template.md` (create if missing) and write within 48 hours of incident close. Blameless. Action-item focused.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context -- what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role (security signals, risk discussions, incident mentions) to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.
