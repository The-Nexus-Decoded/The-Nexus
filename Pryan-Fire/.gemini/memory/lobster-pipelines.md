# Lobster Pipeline Reference

## Syntax (from source code — file.js resolveArgsTemplate/resolveStepRefs)
- **Args in commands:** `${argName}` — flat key, NOT `{args.x}` or `{{args.x}}`
- **Step output refs:** `$stepId.stdout`, `$stepId.json`, `$stepId.approved`
- **Step ref via stdin:** `stdin: $stepId.stdout`
- **Shell vars pass through:** `$myvar`, `$(command)`, `$((math))` — Lobster only intercepts `${key}` and `$id.field`
- **Approval gates:** `approval: required` — halts with resumeToken in tool mode
- **Conditional steps:** `condition: $stepId.approved` or `when: $stepId.approved`
- **Env vars:** `env:` block on step or workflow level, supports `${argName}` interpolation
- **Working dir:** `cwd:` on step or workflow level, supports `${argName}`
- **Timeouts:** `timeoutMs: 30000` per step

## WRONG syntax (existing workflows all had this wrong)
- `{args.target}` — NOT interpolated, passed as literal string to shell
- `{{args.target}}` — NOT interpolated
- `$args.target` — shell expands `$args` as empty, leaves `.target`

## Version & Install
- v2026.1.21-1 on all 3 servers at `/usr/bin/lobster`
- Package: `@clawdbot/lobster` at `/usr/lib/node_modules/@clawdbot/lobster/`
- State dir: `~/.lobster/state/`

## Built-in Workflows
- `github.pr.monitor` — fetch PR state, diff against last run
- `github.pr.monitor.notify` — emit message only on PR state change

## Available Commands
exec, head, json, pick, table, where, approve, clawd.invoke, state.get, state.set, diff.last, dedupe, groupBy, sort, map, template, commands.list, workflows.list, workflows.run, llm_task.invoke, email.triage, gog.gmail.search, gog.gmail.send

## Fleet CLI (25 commands, ALL TESTED on all 3 servers as of 2026-03-01)

Location: `/data/openclaw/fleet-cli/` on each server
Symlink: `/usr/local/bin/fleet` -> `/data/openclaw/fleet-cli/bin/fleet`
Config: `fleet.conf` (server-specific: FLEET_HOSTNAME, IPs)
Common lib: `lib/common.sh` (json_wrap, has_flag, get_flag_value, JSON_MODE)

### Commands — Monitoring
| Command | What | Flags |
|---------|------|-------|
| fleet health | Rate guard /health endpoint | --json |
| fleet sessions | Session .jsonl file sizes | --json |
| fleet status | Health diff detection, change alerts | --json --diff --alert-only |
| fleet agent-ping | Agent liveness via session timestamps | --json |
| fleet gateway-check | 8-point gateway diagnostic | --json --restart |
| fleet log-scan | Journal log pattern scanner | --json --hours N --pattern (429/spam/error/all) |
| fleet config-check | Scan openclaw.json for misconfigs | --json |
| fleet deps-check | Check tool versions + patch status | --json |
| fleet daily-summary | Activity briefing (git, sessions, disk) | --json --days N |

### Commands — Code & Issues
| Command | What | Flags |
|---------|------|-------|
| fleet pr-scan | Open PRs across all repos | --json |
| fleet issue-scan | Open issues + stale detection | --json --stale-days N |
| fleet branch-scan | Branches with PR state | --json |
| fleet branch-delete | Delete MERGED/CLOSED branches | --json |
| fleet deliver | Full git delivery cycle | --json --repo --branch --message --execute |
| fleet issues-batch | Bulk close/reopen issues | --json --action --issues --repo --execute |
| fleet gauntlet | Test+lint runner, auto-detects project type | --json --repo |

### Commands — Operations
| Command | What | Flags |
|---------|------|-------|
| fleet patch-status | Vendor patch markers grep | --json |
| fleet pre-restart | Session cleanup (dry-run default) | --json --execute |
| fleet maintenance | Disk/cache/journal sizes | --json --execute |
| fleet memory | Workspace memory files listing | --json |
| fleet agent-reset | Escalating reset levels 1-4 | --json --level N --execute |
| fleet session-guard | Anti-spam: truncate oversized sessions | --json --max-kb N --execute |
| fleet workspace-sync | Sync workspace files between servers | --json --from --to --files --execute |
| fleet env-setup | Bootstrap/verify workspace environment | --json --execute |
| fleet format | Human-readable from JSON stdin | auto-detects all 25 command types |

### Key Implementation Notes
- Vendor dir: `/usr/lib/node_modules/openclaw` (NOT @anthropic-ai/openclaw)
- grep -rl in patch-status needs `|| true` (pipefail kills on no match)
- Dispatcher uses `readlink -f "$0"` to resolve symlink to actual bin dir
- JSON output auto-detected when stdout is not a terminal (`[ ! -t 1 ]`)
- All JSON wrapped in `{"command":"...","status":"ok|error","timestamp":"...","data":{...}}`
- Scripts using system checks (ss, pgrep, find) need `set +eo pipefail` after common.sh
- agent-ping: sessions.json is at `$FLEET_AGENT_DIR/sessions/sessions.json`, timestamps are epoch ms
- log-scan: use `grep -ci || true` not `|| echo 0` (grep -c outputs 0 AND exits 1)
- log-scan: use `jq -Rs` for sample text escaping (sed insufficient for log lines)

## Death Gate Cycle Pipelines — Chelestra-Sea #18 (master tracker)

| # | Name | What | Status |
|---|------|------|--------|
| 1 | Seventh Gate | Safe gateway restart | REFACTORED — uses fleet pre-restart, health |
| 2 | Pryan Forge | PR review monitor | REFACTORED — uses fleet pr-scan, format |
| 3 | Nexus Bridge | Full PR lifecycle | UNCHANGED (context-specific git ops) |
| 4 | Chelestra Tide | Post-update patch reapply | REFACTORED — uses fleet patch-status, health |
| 5 | Labyrinth Watch | Issue triage dashboard | REFACTORED — uses fleet issue-scan, format |
| 6 | Abarrach Seal | Stale branch cleanup | REFACTORED — uses fleet branch-scan, branch-delete |
| 7 | Sartan Cipher | Workspace sync | UNCHANGED (fixed path /tmp/sartan-vault) |
| 8 | Chelestra Current | Fleet maintenance | REFACTORED — uses fleet maintenance, format |
| 9 | Abarrach Stone | Memory consolidation | REFACTORED — uses fleet memory, health |
| 10 | Patryn Workhorse | CI pipeline | UNCHANGED (repo-specific) |
| 11 | Opus Deep Think | Queue-managed Opus escalation | NEW 2026-03-01 — Chelestra-Sea #50 |

## Operational Workflows (NEW 2026-03-01 — Chelestra-Sea #49/#53/#54)

All pure CLI, zero LLM calls. Deployed to all 3 servers.

| Workflow | Script | What |
|----------|--------|------|
| memory-guard | (systemd timer) | Memory backup every 5min |
| orchestrator-pulse | (systemd timer) | Fleet health pulse every 2h |
| daily-cost-report | daily-cost-report.sh | Fleet-wide API cost report |
| key-health-audit | key-health-audit.sh | Per-key success rate audit |
| rate-storm-detector | rate-storm-detector.sh | 429 rate storm detection |
| session-unstick | session-unstick.sh | Fix stuck sessions (dry-run default) |
| model-chain-swap | model-chain-swap.sh | Swap priority chains with presets |
| agent-health-ping | agent-health-ping.sh | Gateway + service liveness check |
| opus-query-health | opus-query-health.sh | Opus pipeline health check |
| fleet-model-chain-report | fleet-model-chain-report.sh | Full rate-guard config report |
| context-size-monitor | context-size-monitor.sh | Session size monitoring |
| research-mode-toggle | research-mode-toggle.sh | Fleet-wide research mode toggle |

### Fleet Totals
- 24 lobster workflows in `/data/openclaw/workspace/workflows/`
- 16 shared scripts in `/data/openclaw/scripts/shared/`

### Deployment Status (ALL SERVERS LIVE as of 2026-03-01)
- All 3 servers: Death Gate workflows + operational workflows DEPLOYED AND TESTED

## GitHub Issues
- #18 — Master tracker (Death Gate pipelines)
- #49 — Cost analysis + workflow candidates
- #50 — Opus queue pipeline
- #51 — Cron-to-systemd conversions
- #52 — Drop 3.1-pro + key fix
- #53 — Operational workflows batch 1
- #54 — Operational workflows batch 2

## Lobster Usage Tracking — 3 Data Sources for Dashboard

### 1. State Files (approval-paused workflows)
- Path: `~/.lobster/state/workflow_resume_*.json` on each server
- Key: `filePath` = workflow path, `createdAt` = timestamp
- Only captures runs that hit an `approval: required` step (not all executions)
- Counts (as of 2026-03-02):
  - Zifnab: 47 (seventh-gate:12, sartan-cipher:10, abarrach-stone:8, abarrach-seal:6, chelestra-tide:6, zifnab-memory-maintenance:3, hughs-forge-deploy:1, test-args:1)
  - Haplo: 17 (seventh-gate:5, abarrach-stone:3, zifnab-memory-maintenance:3, chelestra-tide:2, sartan-cipher:2, abarrach-seal:2)
  - Hugh: 10 (all 2 each: chelestra-tide, seventh-gate, abarrach-seal, sartan-cipher, abarrach-stone)

### 2. Systemd Journals (timer-based workflows — Zifnab only)
- `journalctl --user -u memory-guard` — every 5min, pure CLI
- `journalctl --user -u orchestrator-pulse` — every 2h, pure CLI
- Count via `grep "Started" | wc -l`

### 3. Gateway Logs (agent-initiated tool calls)
- Path: `/data/openclaw/logs/openclaw.log`
- Pattern: `"tool=lobster"` with `"start"` = invocation count
- Pattern: `"lobster plugin runtime"` = gateway-level plugin calls
- Workflow name only in ERROR messages (successful runs don't log workflow name)
- Need to correlate runId with state files for workflow identification

### Available Workflows Per Server (2026-03-02)
- **Zifnab (25)**: abarrach-seal, abarrach-stone, agent-health-ping, chelestra-current, chelestra-tide, context-size-monitor, daily-cost-report, fleet-model-chain-report, key-health-audit, labyrinth-watch, memory-guard, model-chain-swap, nexus-bridge, openrouter-budget, opus-deep-think, opus-query-health, orchestrator-pulse, patryn-workhorse, pryan-forge, rate-storm-detector, research-mode-toggle, sartan-cipher, session-unstick, seventh-gate, token-usage-audit
- **Haplo (30)**: all shared + haplo-build-test, haplo-create-pr, haplo-deploy-service, register-runner, zifnab-agent-restart, zifnab-github-issue-creation, zifnab-memory-maintenance
- **Hugh (30)**: all shared + death-gate-fleet-sync, fleet-status, haplo-build-test, haplo-deploy-service, hughs-forge-deploy, zifnab-agent-restart, zifnab-github-issue-creation

## Workflow File Location
- All servers: `/data/openclaw/workspace/workflows/*.lobster`
- Shared scripts: `/data/openclaw/scripts/shared/`
- Fleet CLI: `/data/openclaw/fleet-cli/` on each server
