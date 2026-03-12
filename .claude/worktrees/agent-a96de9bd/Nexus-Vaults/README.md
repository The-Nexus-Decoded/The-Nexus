# Nexus-Vaults — The Realm of Preservation

**Layer:** Memory & Governance  
**Org:** [The-Nexus-Decoded](https://github.com/The-Nexus-Decoded)

Workspace backups, documentation vault, and governance artifacts for the OpenClaw homelab.

## The Nexus Decoded

<pre>
The-Nexus-Decoded/
├── Pryan-Fire/          — Business logic, agent services, tools
├── Chelestra-Sea/       — Networking, communication, integration
├── Arianus-Sky/         — UIs, dashboards, visualizations
├── Abarrach-Stone/      — Data, schemas, storage
└── <b>Nexus-Vaults/</b>        — Workspace snapshots, fleet docs, memory           ◀ you are here
</pre>

## Structure

```
Nexus-Vaults/
├── memory/               # Agent memory files, decision logs
├── agent-backups/        # Daily workspace .md snapshots (10 agents)
│   ├── haplo/
│   ├── alfred/
│   ├── marit/
│   ├── paithan/
│   ├── orla/
│   ├── zifnab/
│   ├── rega/
│   ├── sangdrax/
│   ├── hugh/
│   └── samah/
├── new-agent-souls/      # Soul templates and updates
├── agency-agents-raw/    # Agency agent role definitions
├── projects/             # Project tracking
└── research-agency-agents.md
```

## Purpose

- Preserve long-term institutional memory across agent sessions
- Store daily backups of agent workspace .md files (no secrets)
- Maintain fleet security policies and access logs
- Provide audit trail for compliance and incident review

---

## Backup System

The fleet runs a dual backup system. Both tiers run daily at 3:00 AM via systemd timers.

### Tier 1: Local Archives (all 3 servers)

**Script:** `/data/openclaw/scripts/private/openclaw-backup-local.sh`
**Timer:** `openclaw-backup-local.timer` (daily 3:00 AM)
**Output:** `/data/backups/openclaw/`
**Retention:** 7 days

Creates compressed archives of each agent's state + workspace. Contains sensitive data (API keys in openclaw.json) — never committed to git.

| Server | Profiles | Method |
|--------|----------|--------|
| Haplo (ola-claw-dev) | haplo, alfred, marit, paithan, orla | haplo: manual tar (essentials only); others: `openclaw backup create` |
| Zifnab (ola-claw-main) | zifnab, rega, sangdrax | zifnab: manual tar (essentials only); others: `openclaw backup create` |
| Hugh (ola-claw-trade) | hugh, samah | hugh: manual tar (essentials only); samah: `openclaw backup create` |

Main profiles (haplo/zifnab/hugh) use manual tar because their state dir (`/data/openclaw`) is too large (50-170GB) for `openclaw backup create`. The tar only includes: `openclaw.json`, `workspace/` (excluding git repos, actions-runner, node_modules, venvs), `memory/`, `agents/`.

Sub-profiles use `openclaw --profile <name> backup create --output /data/backups/openclaw --verify` which handles small state dirs cleanly.

### Tier 2: Git Sync to Nexus-Vaults (Haplo only)

**Script:** `/data/openclaw/scripts/private/openclaw-backup-vaults.sh`
**Timer:** `openclaw-backup-vaults.timer` (daily 3:15 AM)
**Output:** `Nexus-Vaults/agent-backups/{agent}/*.md`

Collects workspace `.md` files from all 10 agents across all 3 servers via SSH (SCP), commits changes to `Nexus-Vaults/agent-backups/`, and pushes to GitHub. Contains NO secrets — only workspace markdown files (SOUL.md, AGENTS.md, TEAM.md, etc.).

**Server connectivity:**
- Haplo agents: local copy (localhost)
- Zifnab agents: SCP via Tailscale (100.103.189.117)
- Hugh agents: SCP via Tailscale (100.104.166.53)

### Logs

| Log | Location |
|-----|----------|
| Local backup | `/data/openclaw/logs/backup-local.log` (each server) |
| Vault sync | `/data/openclaw/logs/backup-vaults.log` (Haplo only) |

### Manual Run

```bash
# Run local backup on any server
bash /data/openclaw/scripts/private/openclaw-backup-local.sh

# Run vault sync (Haplo only)
bash /data/openclaw/scripts/private/openclaw-backup-vaults.sh
```

### Restore from Local Backup

```bash
# Sub-profiles: use openclaw restore
openclaw --profile alfred backup restore --input /data/backups/openclaw/<archive>.tar.gz

# Main profiles: manual extract
cd /data/openclaw
tar xzf /data/backups/openclaw/<archive>.tar.gz
```

### Restore from Vault (workspace .md only)

```bash
# Copy .md files from Nexus-Vaults back to agent workspace
cp Nexus-Vaults/agent-backups/alfred/*.md /data/openclaw/workspace-alfred/
```

### Important Notes

- `agentbaselines/` in the repo = CONTROL BASELINE for comparison only. Never modify.
- Server workspace .md files = LIVING DOCUMENTS that evolve. Never overwrite with baseline versions.
- To add new content to server files: use targeted SSH edits (append/insert specific sections).
- To compare/audit agent drift: diff server version against `agentbaselines/` baseline.
