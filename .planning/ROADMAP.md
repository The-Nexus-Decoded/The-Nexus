# Roadmap: OpenClaw Agent Management & Normalization

## Overview

Take the OpenClaw fleet from its current broken state (2/20 agents stopped, post-upgrade breakage across the board) to a fully healthy, observable, and manageable fleet of 20 agents. The journey starts with emergency stabilization of stopped agents, proceeds through config cleanup and fleet-wide verification, then builds the tooling, processes, and coordination layer needed to keep everything running without manual firefighting.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Critical Stabilization** - Fix stopped agents, broken model registration, ACPX permissions, and sandbox issues
- [ ] **Phase 2: Fleet Cleanup** - Normalize workspace paths, model chains, SOULs, archive old root, remove orphan configs
- [ ] **Phase 3: Fleet Health Verification** - Verify all 20 agents running correctly with proper config, models, and Discord presence
- [ ] **Phase 4: Config Management** - Build drift detection, upgrade runbook, and onboarding/offboarding procedures
- [ ] **Phase 5: Fleet Dashboards & Tooling** - Health dashboard, CLI skills, coordination harness, cost monitoring
- [ ] **Phase 6: Agent Coordination** - Discord-based task assignment via Alfred, completion tracking, sub-project workflows

## Phase Details

### Phase 1: Critical Stabilization
**Goal**: All 20 agents running and responsive -- no stopped agents, no model fallback failures, no permission blocks
**Depends on**: Nothing (first phase)
**Requirements**: STAB-01, STAB-02, STAB-03, STAB-04, STAB-05
**Success Criteria** (what must be TRUE):
  1. Zifnab agent responds to a Discord message in #jarvis within 60 seconds
  2. Hugh agent responds to a Discord message in #trading within 60 seconds
  3. codex-cli agents (Haplo, Iridal, Zifnab) use gpt-5.4 model without falling back to MiniMax
  4. ACPX permissions allow agents to write to node_modules without manual chown
  5. Sandbox mode has a working resolution applied fleet-wide (Docker installed or documented alternative)
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Fleet Cleanup
**Goal**: Fleet configuration is normalized -- single workspace convention, clean model chains, real SOULs deployed, legacy artifacts removed
**Depends on**: Phase 1
**Requirements**: STAB-06, STAB-07, STAB-08, STAB-09, STAB-10
**Success Criteria** (what must be TRUE):
  1. All 20 agents use a single consistent workspace path convention (no dev vs main/trade split)
  2. Model chains on all agents match their v4 role profile spec with no contamination from old root config
  3. Every active agent workspace contains its real SOUL.md (not a blank auto-created template)
  4. Old default root /data/openclaw/ is archived with documentation of what was preserved and why
  5. No orphan .service.d/ override directories exist on any server for stale/eliminated agents
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Fleet Health Verification
**Goal**: Every agent in the fleet is verified healthy -- correct gateway, Discord presence, model chain, workspace, and MCP tools
**Depends on**: Phase 2
**Requirements**: HLTH-01, HLTH-02, HLTH-03, HLTH-04, HLTH-05
**Success Criteria** (what must be TRUE):
  1. Gateway health endpoint returns 200 for all 20 agents
  2. Every agent responds to a test message in its assigned Discord channel
  3. Every agent's active model chain matches the expected chain for its role profile
  4. Every agent's workspace path resolves to the correct profile-specific root
  5. All 10 coding agents have AnswerOverflow MCP responding to tool calls
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Config Management
**Goal**: Fleet has repeatable processes for detecting config drift, upgrading OpenClaw, and adding/removing agents
**Depends on**: Phase 3
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04
**Success Criteria** (what must be TRUE):
  1. Config drift detection script runs and reports mismatches for requireMention, model chains, streaming key, and Discord tokens across all 20 agents
  2. Upgrade runbook covers pre-check, backup, upgrade, vendor patch reapply, and post-verify -- tested against 2026.4.1 as reference upgrade
  3. Onboarding procedure can take a new agent from baseline definition to running in production with verified Discord presence
  4. Offboarding procedure cleanly removes an agent's config, service, workspace, and Discord presence without leaving orphans
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Fleet Dashboards & Tooling
**Goal**: Owner has real-time visibility into fleet health and operational CLI tools for common fleet management tasks
**Depends on**: Phase 3
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. Fleet health dashboard shows all 20 agents with live status, current model, uptime, and error rate
  2. Agent coordination harness can send a task message to any agent via Alfred's Discord account and confirm delivery
  3. CLI skills exist for: restart agent, check agent config, rotate keys, check fleet health -- each callable as a single command
  4. Cost monitoring shows per-agent and per-model token spend for at least the last 7 days
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Agent Coordination
**Goal**: Owner can assign work to agents, track completion, and spin up structured sub-projects for agent-driven development
**Depends on**: Phase 5
**Requirements**: COORD-01, COORD-02, COORD-03
**Success Criteria** (what must be TRUE):
  1. Owner can message any of the 20 agents via Alfred's Discord account using MCP tools and get a response
  2. Owner can assign a task to an agent via Discord, and the task appears as a trackable GitHub issue with the agent tagged
  3. Sub-project creation workflow produces a GSD project structure that an agent can execute (AI tools, apps, crypto, gaming domains)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4/5 (parallel possible) -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Critical Stabilization | 0/3 | Not started | - |
| 2. Fleet Cleanup | 0/3 | Not started | - |
| 3. Fleet Health Verification | 0/2 | Not started | - |
| 4. Config Management | 0/3 | Not started | - |
| 5. Fleet Dashboards & Tooling | 0/3 | Not started | - |
| 6. Agent Coordination | 0/2 | Not started | - |
