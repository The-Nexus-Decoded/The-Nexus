# OpenClaw Fleet Scheduling

*Migrated to OpenClaw crons 2026-02-28. All systemd timers and old crontab entries removed.*

## OpenClaw Crons (Zifnab + Haplo — Hugh DISABLED)
| Job | Server | Schedule | Script | Notes |
|-----|--------|----------|--------|-------|
| health-check | Zifnab, Haplo | every 5m | `/data/openclaw/scripts/health-check.sh` | isolated, no-deliver |
| memory-guard | Zifnab, Haplo | every 5m | `/data/repos/Nexus-Vaults/scripts/memory-guard.sh` | isolated, no-deliver |
| discord-daily-digest | Zifnab | 8 AM CT daily | (built-in) | isolated, announces to #jarvis |
| redact-and-sync | Zifnab | 2 AM CT daily | `/data/repos/Nexus-Vaults/scripts/redact-and-sync.sh` | isolated, no-deliver |
| daily-tithe | Haplo | 10 AM CT daily | `/data/repos/Pryan-Fire/haplos-workshop/scripts/daily_tithe.sh` | isolated, no-deliver |
| orchestrator-pulse | Zifnab | every 2h | (built-in agentTurn) | current session, announces to #jarvis — keeps Zifnab orchestrating |
| work-resume-pulse | Haplo | every 2h | (built-in agentTurn) | current session, no-deliver — keeps Haplo working on tasks |

- Hugh's crons disabled (`openclaw cron disable`) to stop burning API quota when idle

## Crontab (Haplo + Hugh)
- `*/30` — `fleet session-guard --execute` (anti-spam: truncate oversized sessions)

## Crontab (Zifnab — DO NOT TOUCH)
- `*/5` — retrieve_windows_logs.sh (Zifnab's code)
- `*/10` — fleet_alert_monitor.sh (diff-based alerts to #jarvis, replaced fleet_status_monitor.sh 2026-03-01)
- `*/30` — `fleet session-guard --execute` (anti-spam: truncate oversized sessions)
- `0 */4` — `fleet health --json` -> `/data/openclaw/logs/fleet/health.json`
- `0 */2` — `fleet sessions --json` -> `/data/openclaw/logs/fleet/sessions.json`
- `0 */6` — `fleet pr-scan --json` -> `/data/openclaw/logs/fleet/pr-scan.json`
- `0 8 * * 1` — `fleet issue-scan --json --stale-days 14` -> `/data/openclaw/logs/fleet/issue-scan.json` (Monday 8am)

## Fleet Alert Monitor (replaced Fleet Status Monitor 2026-03-01)
- Script: `/data/openclaw/workspace/fleet_alert_monitor.sh`
- Uses `fleet status --json --diff --alert-only` on each server
- Only posts to #jarvis when rate guard status CHANGES (429s, cooldowns, key switches)
- Saves raw health JSON to `/data/openclaw/logs/fleet-health/{server}.json` every run
- Old script (`fleet_status_monitor.sh`) posted 432 messages/day; new one posts ~10-50
- Old script backed up at `fleet_status_monitor.sh.bak`

## Removed (2026-02-28)
openclaw-health-check systemd timer (all 3), memory-guard crontab (all 3), redact-and-sync crontab (Zifnab), daily_tithe crontab (Haplo), discord-digest systemd timer, rate-guard-monitor.sh crontab, rate-guard-report OpenClaw cron, memory-checkpoint cron

## Change Protocol
When creating/modifying/removing any scheduled job:
1. Update `Nexus-Vaults/docs/FLEET-SCHEDULING.md`
2. Commit+push to Nexus-Vaults
3. Update this file
4. Redact all sensitive data (IPs, tokens, keys)
