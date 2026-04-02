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
- 3 Ubuntu servers on Tailscale mesh network (coordinator, coder, trader)
- 20 agents across 3 servers using profile-specific roots (`~/.openclaw-{name}/`)
- Server details, IPs, SSH config, and tokens are in private memory files only (public repo)

**Current State (2026-04-02):**
- 18/20 agents running (2 stopped — channel access + reasoning loop)
- OpenClaw 2026.4.1 across all servers
- Multiple post-upgrade issues from hasty config merge
- PR #275 open with agentbaseline deletions (owner handling)

**Communication:**
- Discord guild with domain-specific channels
- Alfred bot used for cross-agent coordination via MCP
- Agent details, bot IDs, and channel IDs are in private memory files only

**Agent Roles (7 profile tiers, 20 agents):**
| Profile | Count |
|---|---|
| Lead Orchestrator | 1 |
| Assistant Orchestrator | 3 |
| Architect Dev Coder | 3 |
| Senior Dev Coder | 6 |
| Standard Companion | 3 |
| Standard Work Agent | 3 |
| Capital-Risk Operator | 1 |

## Constraints

- **Public repo — NO SECRETS**: This repo is public. NEVER commit IPs, tokens, API keys, bot IDs, SSH paths, Tailscale addresses, wallet addresses, or any information that could compromise security. All sensitive details live in memory files and vault only.
- **Monorepo silo discipline**: All deliverables from this project go into `Chelestra-Sea/` (infrastructure realm). GSD's `.planning/` at root is internal tracking only — scripts, configs, runbooks, dashboards go in the correct realm folder (`Chelestra-Sea/infra/` for fleet ops, `Arianus-Sky/` for dashboards).
- **Infrastructure ownership**: All systemd, crontabs, scripts, firewall changes via owner's Claude CLI only — never delegated to agents
- **Config safety**: NEVER rewrite full openclaw.json — always targeted JSON patches with backups
- **Server access**: SSH MCP tools available for reads/checks; owner runs destructive operations
- **Discord rules**: PLAIN TEXT only, requireMention: true on all channels except monitoring channel
- **Pipeline discipline**: No manual deploys for Pryan-Fire — always use Actions pipeline
- **Budget**: Free-tier primary models preferred, hard daily cap per model enforced by budget proxy

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
