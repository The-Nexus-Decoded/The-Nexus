# OpenClaw Agent Management & Normalization

## What This Is

A fleet management system for 20 OpenClaw AI agents running across 3 homelab servers (Zifnab/ola-claw-main, Haplo/ola-claw-dev, Hugh/ola-claw-trade). Covers post-upgrade stabilization, ongoing configuration optimization, tooling/dashboards for fleet health, agent coordination via Discord, and sub-project management for the work agents do (AI tools, apps, crypto trading, gaming).

## Core Value

All 20 agents running perfectly, doing their assigned jobs with minimal issues — and the owner has the tools, dashboards, and processes to keep it that way without manual firefighting.

## Requirements

### Validated

- ✓ Fleet normalization complete — 7 role-based profiles applied to 20 agents
- ✓ Profile roots verified on all 3 primaries (haplo/zifnab/hugh)
- ✓ Default root symlinks removed
- ✓ QMD upgraded to 2.0.1 on all servers
- ✓ OpenClaw upgraded to 2026.4.1 on all 3 servers
- ✓ Agentbaselines relocated to Chelestra-Sea/infra/
- ✓ Zifnab workspace cleaned (937MB → 1.4MB)
- ✓ AnswerOverflow MCP + skill deployed to 10 coding agents

### Active

**Critical — Post-Upgrade Breakage (2026.4.1):**
- [ ] Fix Zifnab/Hugh channel access configs and restart (both STOPPED, spiraling in Discord)
- [ ] Resolve codex-cli/gpt-5.4 model unknown — codex agents falling back to MiniMax
- [ ] Fix ACPX permissions — new version needs writable node_modules
- [ ] Resolve sandbox Docker requirement — currently disabled as workaround
- [ ] Fix workspace path inconsistency across agents (dev uses ~/.openclaw/workspace-{name}, main/trade use profile path)
- [ ] Clean contaminated model chains from old root config merge
- [ ] Push real agent SOULs into auto-created workspaces (currently blank templates)
- [ ] Archive old default root contents at /data/openclaw/
- [ ] Remove orphan .service.d/ override dirs for stale agents

**Fleet Management Tooling:**
- [ ] Fleet health dashboard (beyond current embed-based monitoring)
- [ ] Agent coordination harness — use Alfred's Discord account to assign tasks and communicate with agents
- [ ] OpenClaw CLI skills and harnesses for common fleet operations
- [ ] Config drift detection and auto-remediation
- [ ] Upgrade runbooks — standardized process for OpenClaw version upgrades
- [ ] Agent onboarding/offboarding procedures

**Ongoing Optimization:**
- [ ] Model chain optimization per agent role
- [ ] OpenClaw settings mastery — deep understanding of all config options
- [ ] Cost monitoring and budget enforcement
- [ ] Sub-project creation and management for agent work (AI tools, apps, crypto, gaming)

### Out of Scope

- Building new agents beyond the current 20 — focus on making existing fleet healthy first
- Changing server hardware or adding new servers
- Migrating away from OpenClaw platform
- Manual file editing on servers without owner knowledge

## Context

**Infrastructure:**
- 3 Ubuntu servers on Tailscale mesh network
- ola-claw-main (Zifnab): coordinator, 100.103.189.117
- ola-claw-dev (Haplo): coder, 100.94.203.10 — hosts 19 agents
- ola-claw-trade (Hugh): trader, 100.104.166.53
- SSH user: `openclaw`, key: `C:/Users/olawal/.ssh/id_ed25519`
- All agents use profile-specific roots: `~/.openclaw-{name}/`

**Current State (2026-04-02):**
- 18/20 agents running (Zifnab + Hugh stopped)
- OpenClaw 2026.4.1 across all servers
- Multiple post-upgrade issues from hasty config merge
- PR #275 open with agentbaseline deletions (owner handling)

**Communication:**
- Discord guild with domain-specific channels
- Alfred bot (ID: 1478214532324393010) used for cross-agent coordination
- MCP discord tool sends AS Alfred
- XAR prefix required so bots know message is from owner

**Agent Roles:**
| Profile | Agents |
|---|---|
| Lead Orchestrator | Zifnab |
| Assistant Orchestrator | Alfred, Jonathon, Sinistrad |
| Architect Dev Coder | Haplo, Vasu, Samah |
| Senior Dev Coder | Marit, Paithan, Limbeck, Balthazar, Drugar, Devon |
| Standard Companion | Iridal, Edmund, Rega |
| Standard Work Agent | Ciang, Trian, Ramu |
| Capital-Risk Operator | Hugh |

## Constraints

- **Infrastructure ownership**: All systemd, crontabs, scripts, firewall changes via owner's Claude CLI only — never delegated to agents
- **Config safety**: NEVER rewrite full openclaw.json — always targeted JSON patches with backups
- **Server access**: SSH MCP tools available for reads/checks; owner runs destructive operations
- **Discord rules**: PLAIN TEXT only, include "This is Lord Xar", requireMention: true on all channels except #jarvis
- **Pipeline discipline**: No manual deploys for Pryan-Fire — always use Actions pipeline
- **Budget**: OpenRouter $5/day hard cap per model, free-tier primary models preferred

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Profile-specific roots (~/.openclaw-{name}/) | Eliminates config collision between agents sharing default root | ✓ Good |
| 7 role-based profile tiers | Standardized config by role reduces per-agent customization | ✓ Good |
| Sandbox mode off (workaround) | Docker not installed, new OpenClaw enforces it | ⚠️ Revisit — need Docker or alternative |
| codex-cli disabled (fallback to MiniMax) | Model unknown in 2026.4.1 | ⚠️ Revisit — research model registration |
| AnswerOverflow MCP on 10 coding agents | Community Discord knowledge for debugging | — Pending verification |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after initialization*
