# TOOLS.md

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-main (you) | [REDACTED_IP] | openclaw | Coordinator |
| ola-claw-trade (Hugh) | [REDACTED_IP] | openclaw | Trading (standby) |
| ola-claw-dev (Haplo) | [REDACTED_IP] | openclaw | Development |
| Windows workstation | [REDACTED_IP] | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| /data/openclaw/ | OpenClaw root (NVMe) |
| /data/openclaw/workspace/ | Agent workspace (SOUL.md, MEMORY.md, etc.) |
| /data/openclaw/workspace/memory/ | Daily memory files |
| /data/openclaw/workspace/skills/ | Installed skills |
| /data/openclaw/openclaw.json | Main config (NEVER full-rewrite, use targeted patches) |
| /data/openclaw/logs/openclaw.log | Gateway logs |
| /data/openclaw/logs/opus-usage.log | Opus query usage log |
| /data/openclaw/scripts/shared/ | Shared scripts (quota monitor, health check) |
| /data/openclaw/scripts/private/ | Private scripts (backup, opus-query) |
| /data/openclaw/keys/ | Vault and credential storage (700 perms) |
| /data/repos/ | Git repositories |
| /data/openclaw/staging/ | Owner profile staging files (8.9GB scan) |

The OS drive is sacrosanct. All data on /data NVMe only.

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-Nexus | 1475082874234343621 | requireMention: true |
| #jarvis | 1475082997027049584 | requireMention: false (your channel) |
| #coding | 1475083038810443878 | requireMention: false (supervise Haplo) |
| #trading | 1475082964156157972 | Not configured (Hugh's channel) |

Guild ID: 1475082873777426494

## Gateway Management

```bash
# Health check
curl -s http://127.0.0.1:18789/health

# View logs (last 50 lines)
journalctl --user -u openclaw-gateway --no-pager -n 50

# Quota monitor status
systemctl --user status quota-monitor.timer

# Restart Hugh
ssh openclaw@[REDACTED_IP] "systemctl --user restart openclaw-gateway"

# Restart Haplo
ssh openclaw@[REDACTED_IP] "systemctl --user restart openclaw-gateway"
```

## Self-Restart Protocol

1. Write state to /data/openclaw/workspace/.restart-state.md
2. SSH to Windows: `ssh olawal@[REDACTED_IP]`
3. From Windows: `ssh openclaw@[REDACTED_IP] "systemctl --user restart openclaw-gateway"`
4. On next boot: read .restart-state.md, delete after reading
5. **Fallback:** If SSH to Windows fails, report to Lord Xar via Discord and wait.

## Claude Opus (Deep Reasoning) -- Queue-Managed

Use the opus-deep-think workflow for all Opus queries. This manages the fleet-wide queue automatically.
Only one query runs at a time across the entire fleet. If another agent is using Opus, you will wait.

### How to Call

| Action | Pipeline | Args |
|--------|----------|------|
| Deep think | `/data/openclaw/workspace/workflows/opus-deep-think.lobster` | `prompt`, `reason`, `agent` |

**Example:**
```json
{
  "action": "run",
  "pipeline": "/data/openclaw/workspace/workflows/opus-deep-think.lobster",
  "argsJson": "{\"prompt\":\"Analyze the Meteora DLMM fee structure\",\"reason\":\"research\",\"agent\":\"zifnab\"}"
}
```

### WHEN to Use Opus (MANDATORY -- follow these rules)

USE Opus when:
- Deep research requiring multi-step reasoning across many sources
- Architecture decisions affecting multiple repos or the fleet
- Synthesizing conflicting information from large datasets
- You have tried Gemini 2+ times and the result is wrong or incomplete
- Lord Xar explicitly requests Opus usage
- Code review of critical/complex changes (>200 lines, security-sensitive)

NEVER use Opus for:
- Simple lookups, formatting, summarization
- Routine fleet checks, status queries, log scanning
- Anything Gemini handles adequately on the first try
- Quick questions with obvious answers
- Tasks you have NOT attempted with Gemini first

### Rules
- ALWAYS try Gemini first. Opus is the escalation, not the default.
- ALWAYS use the opus-deep-think workflow. NEVER call opus-query.sh directly via exec.
- ALWAYS provide a valid reason: research | architecture | analysis | stuck | owner-requested | review
- Only one query runs fleet-wide at a time. You will wait in queue if another agent is using Opus.
- All queries are logged (prompt + response summary) and reviewed by Lord Xar.
- If the queue wait exceeds 10 minutes, your request times out. Retry later.
- No hard daily limit, but Lord Xar monitors usage. Abuse will result in limits being enforced.
- Queue status: run `/data/openclaw/scripts/shared/opus-queue.sh status` via exec for a quick check.

## Claude CLI on Windows

```bash
ssh olawal@[REDACTED_IP] "cd /path/to/project && claude --dangerously-skip-permissions 'task description'"
```
GSD project files: `H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_Tools_And_Information/openclaw-homelab/`

## ntfy.sh Alerts

- Topic: olaclaw-alerts
- Script: `/data/openclaw/scripts/ntfy-alert.sh "Title" "Message body"`
- Health check timer runs every 5 min (gateway + disk space)

## Backup System

### Workspace Backup (Primary -- Daily)
- **Nexus-Vaults** repo handles daily workspace file sync (SOUL, AGENTS, TOOLS, memory, workflows, learnings)
- Redacted before push -- safe for public or private repo
- See "Workspace Git Sync" section below for details

### Full System Backup (Secondary -- Weekly)
- Script: /data/openclaw/scripts/private/backup-to-windows.sh
- Timer: openclaw-backup.timer (**weekly** Sunday 3 AM, persistent)
- Flow: SSH into Hugh + Haplo → pull tar archives → push to Windows via scp
- Covers everything Nexus-Vaults doesn't: openclaw.json, keys vault, logs, exec-approvals, cron configs, scripts
- Windows dest: `H:/IcloudDrive/.../Backups/{server}/`
- Old backups auto-pruned (PowerShell keeps last 7 per server)
- ntfy notification on success/failure
- **NOTE:** Change timer from daily to weekly once Nexus-Vaults daily sync is confirmed working. Until then, keep daily.

## GitHub

- Org: The-Nexus-Decoded
- PAT configured via gh CLI on all servers
- Use `gh` CLI for all GitHub operations

## Fleet CLI & Lobster Workflows

Fleet CLI (`/usr/local/bin/fleet`) provides composable commands for fleet operations.
Lobster workflows chain these commands with approval gates. One tool call, deterministic execution.

### How to Call the Lobster Tool

The lobster tool takes these parameters:
- `action`: "run" (to run a workflow) or "resume" (to continue after approval)
- `pipeline`: ABSOLUTE path to the .lobster file
- `argsJson`: (optional) JSON string of arguments
- `token` / `approve`: (for resume only)

**CORRECT call example:**
```json
{
  "action": "run",
  "pipeline": "/data/openclaw/workspace/workflows/pryan-forge.lobster"
}
```

**With arguments:**
```json
{
  "action": "run",
  "pipeline": "/data/openclaw/workspace/workflows/nexus-bridge.lobster",
  "argsJson": "{\"repo_path\":\"/data/repos/Pryan-Fire\",\"branch\":\"my-branch\",\"title\":\"PR title\",\"body\":\"description\"}"
}
```

**Resume after approval gate:**
```json
{
  "action": "resume",
  "token": "<resumeToken from previous output>",
  "approve": true
}
```

**WRONG — DO NOT DO THESE:**
- Do NOT pass just the filename: `"pipeline": "pryan-forge.lobster"` — FAILS (relative path, gateway CWD is not the workflows dir)
- Do NOT pass CLI syntax: `"pipeline": "run --mode tool --file workflows/pryan-forge.lobster"` — FAILS
- Do NOT paste workflow YAML as the pipeline parameter — FAILS ("File name too long")
- Do NOT use `{args.x}` or `{{args.x}}` in workflow args — the correct Lobster syntax is `${x}`

### Available Workflows (18 total)

All workflow files are at: `/data/openclaw/workspace/workflows/`

**Fleet Operations (use fleet CLI under the hood):**

| Task | Pipeline path | Args | When |
|------|--------------|------|------|
| Safe restart | `/data/openclaw/workspace/workflows/seventh-gate.lobster` | none | ALWAYS before restarting any gateway |
| Post-update patches | `/data/openclaw/workspace/workflows/chelestra-tide.lobster` | none | After OpenClaw update |
| Fleet health | `/data/openclaw/workspace/workflows/chelestra-current.lobster` | none | Daily or on-demand |
| Memory review | `/data/openclaw/workspace/workflows/abarrach-stone.lobster` | none | Every few days |
| PR review scan | `/data/openclaw/workspace/workflows/pryan-forge.lobster` | none | Check if any PRs need review |
| Issue triage | `/data/openclaw/workspace/workflows/labyrinth-watch.lobster` | none | Weekly or on-demand |
| Branch cleanup | `/data/openclaw/workspace/workflows/abarrach-seal.lobster` | none | Monthly or after merges |

**Code Operations:**

| Task | Pipeline path | Args | When |
|------|--------------|------|------|
| Create + merge PR | `/data/openclaw/workspace/workflows/nexus-bridge.lobster` | `repo_path`, `branch`, `title`, `body` | After code changes are ready |
| Build + test | `/data/openclaw/workspace/workflows/patryn-workhorse.lobster` | `repo_path` | Before creating a PR |
| Vault sync | `/data/openclaw/workspace/workflows/sartan-cipher.lobster` | none | After workspace changes |

**Agent Wrappers (thin wrappers for agent-specific tasks):**

| Task | Pipeline path | When |
|------|--------------|------|
| Token usage audit | `/data/openclaw/workspace/workflows/token-usage-audit.lobster` | Check token consumption |
| Opus deep think | `/data/openclaw/workspace/workflows/opus-deep-think.lobster` | Deep reasoning via Claude Opus (queue-managed) |
| Opus deep think |  | Deep reasoning via Claude Opus (queue-managed) |

### Direct Fleet Commands (25 commands)

For quick checks, use fleet CLI directly via the `exec` tool instead of lobster workflows.

**Monitoring:**

    fleet health [--json]                          # Rate guard /health endpoint
    fleet sessions [--json]                        # Session .jsonl file sizes
    fleet status [--json --diff --alert-only]      # Health diff detection, change alerts
    fleet agent-ping [--json]                      # Agent liveness via session timestamps
    fleet gateway-check [--json --restart]         # 8-point gateway diagnostic
    fleet log-scan [--json --hours N --pattern P]  # Journal log scanner (429/spam/error/all)
    fleet config-check [--json]                    # Scan openclaw.json for misconfigs
    fleet deps-check [--json]                      # Check tool versions + patch status
    fleet daily-summary [--json --days N]          # Activity briefing (git, sessions, disk)

**Code & Issues:**

    fleet pr-scan [--json]                         # Open PRs across all repos
    fleet issue-scan [--json --stale-days N]       # Open issues + stale detection
    fleet branch-scan [--json]                     # Branches with PR state
    fleet branch-delete [--json]                   # Delete MERGED/CLOSED branches
    fleet deliver [--json --repo R --branch B --message M --execute]  # Full git delivery
    fleet issues-batch [--json --action A --issues I --repo R --execute]  # Bulk close/reopen
    fleet gauntlet [--json --repo R]               # Test+lint runner, auto-detects project

**Operations:**

    fleet patch-status [--json]                    # Vendor patch markers grep
    fleet pre-restart [--json --execute]           # Session cleanup (dry-run default)
    fleet maintenance [--json --execute]           # Disk/cache/journal sizes + cleanup
    fleet memory [--json]                          # Workspace memory files listing
    fleet agent-reset [--json --level N --execute] # Escalating reset levels 1-4
    fleet session-guard [--json --max-kb N --execute]  # Truncate oversized sessions
    fleet workspace-sync [--json --from F --to T --files --execute]  # Sync between servers
    fleet env-setup [--json --execute]             # Bootstrap/verify workspace environment
    fleet format                                   # Human-readable from JSON stdin (auto-detects)

### RULES
- NEVER restart a gateway without running seventh-gate first
- ALWAYS run patryn-workhorse before nexus-bridge (test before PR)
- Use workflows for multi-step ops. Use fleet commands directly for quick checks.
- ALWAYS use absolute paths starting with /data/openclaw/workspace/workflows/



- **Primary:** google/gemini-3.1-pro-preview
- **Fallback 1:** google/gemini-3-flash-preview
- **Fallback 2:** google/gemini-2.5-flash
- **Fallback 3:** ollama/qwen2.5-coder:7b (LOCAL on RTX 2080, localhost:11434)
- OpenRouter REMOVED -- too expensive
- Each server has its own Google Cloud project = own 1M TPM quota

## API Key Troubleshooting

If you or any agent reports "API Key not found" or "API_KEY_INVALID":

**Keys live in TWO places on every server. BOTH must match.**

| Location | Path |
|----------|------|
| Auth profiles | `~/.openclaw/agents/main/agent/auth-profiles.json` |
| Systemd env | `~/.config/systemd/user/openclaw-gateway.service.d/gemini.conf` (or `ollama.conf` on Haplo) |

**Fix procedure:**
1. SSH into the affected server
2. Check both files -- identify which has the wrong/old key
3. Update the key in BOTH locations
4. `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway`
5. Verify: `journalctl --user -u openclaw-gateway --no-pager -n 20 | grep -i "error\|api.key"`

**Per-server systemd override file:**
- Zifnab: `gemini.conf`
- Haplo: `ollama.conf` (NOT gemini.conf)
- Hugh: `gemini.conf`

You have SSH access to all 3 servers. Fix this yourself -- do not escalate unless the key itself needs regenerating (that requires Lord Xar in Google AI Studio).

## Hardware (this server)

- Intel i7, 16GB RAM, RTX 2080 (8GB VRAM)
- 240GB SSD (OS only) + 1.8TB NVMe (/data)

## Workspace Git Sync

All three agents' workspace folders should be version-controlled in GitHub for backup, config drift tracking, and easy migration to new hardware.

**Repo:** The-Nexus-Decoded/Nexus-Vaults (public)
**What to sync:** `/data/openclaw/workspace/` contents -- SOUL.md, AGENTS.md, TOOLS.md, IDENTITY.md, USER.md, LEARNING.md, ACTIVE-TASKS.md, HEARTBEAT.md, memory/, workflows/

**CRITICAL: Redaction before any push.**
A redaction script MUST run before every commit. It strips:
- API keys, tokens, PATs (grep for patterns: `[REDACTED]`, `[REDACTED]`, `[REDACTED]`, `Bearer`, env var values)
- Wallet addresses (public and private keys)
- Tailscale IPs (replace with `[REDACTED_IP]`)
- Discord bot tokens
- Any string matching known secret patterns from `/data/openclaw/keys/`
- Phone numbers, email addresses, personal identifiers

**Workflow:**
1. Zifnab owns this process across the fleet
2. Run redaction script on workspace copy (NEVER on live workspace)
3. Diff the redacted output against last commit -- review for any new secrets that slipped through
4. Commit and push
5. Schedule as a weekly cron or run manually after major config changes

**Script location:** `/data/openclaw/scripts/redact-and-sync.sh` (Haplo to build)
**Git hook:** Pre-commit hook that greps for known secret patterns and blocks push if found

This is a TODO until Lord Xar greenlights the repo creation and Haplo builds the redaction script.

## Messaging Channels — IMPORTANT
- The ONLY messaging channel available is **Discord**. 
- NEVER attempt to use WhatsApp, Slack, Telegram, email, or any other messaging platform.
- All message tool calls MUST target Discord channels: #coding, #trading, #jarvis, or #the-Nexus.
- If you need to contact Lord Xar, post in the appropriate Discord channel. Do NOT try WhatsApp.
