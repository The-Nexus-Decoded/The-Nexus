# Requirements: OpenClaw Agent Management & Normalization

**Defined:** 2026-04-02
**Core Value:** All 20 agents running perfectly, doing their assigned jobs with minimal issues

## v1 Requirements

Requirements for initial stabilization and fleet management foundation.

### Fleet Stabilization (Post-Upgrade Critical)

- [ ] **STAB-01**: Zifnab agent running and responding in Discord after channel access config fix
- [ ] **STAB-02**: Hugh agent running and responding in Discord after channel access config fix
- [ ] **STAB-03**: codex-cli/gpt-5.4 model registered and working in OpenClaw 2026.4.1 (agents no longer falling back to MiniMax)
- [ ] **STAB-04**: ACPX node_modules permissions fixed so agents can write without chown workaround
- [ ] **STAB-05**: Sandbox mode resolved — either Docker installed or alternative approach documented and applied
- [ ] **STAB-06**: Workspace paths consistent across all 20 agents (single convention, no dev vs main/trade split)
- [ ] **STAB-07**: Model chains cleaned — v4 profile specs applied without contamination from old root config
- [ ] **STAB-08**: Real agent SOULs deployed to all active workspaces (replacing blank auto-created templates)
- [ ] **STAB-09**: Old default root /data/openclaw/ archived and documented
- [ ] **STAB-10**: Orphan .service.d/ override dirs for stale agents removed from all servers

### Fleet Health Verification

- [ ] **HLTH-01**: All 20 agents verified running with correct gateway health response
- [ ] **HLTH-02**: All 20 agents verified responding to Discord messages in their assigned channels
- [ ] **HLTH-03**: All 20 agents verified using correct model chain per their role profile
- [ ] **HLTH-04**: All 20 agents verified using correct workspace path
- [ ] **HLTH-05**: AnswerOverflow MCP verified active on 10 coding agents after gateway restart

### Config Management

- [ ] **CONF-01**: Config drift detection script that checks requireMention, model chains, streaming key, Discord tokens
- [ ] **CONF-02**: Standardized OpenClaw upgrade runbook documenting pre-check, backup, upgrade, patch reapply, verify steps
- [ ] **CONF-03**: Agent onboarding procedure documented — add new agent from baseline to running in production
- [ ] **CONF-04**: Agent offboarding procedure documented — cleanly remove agent (config, service, workspace, Discord)

### Fleet Dashboards & Tooling

- [ ] **TOOL-01**: Fleet health dashboard showing all 20 agents with status, model, uptime, error rate
- [ ] **TOOL-02**: Agent coordination harness — send tasks to agents via Alfred's Discord account
- [ ] **TOOL-03**: CLI skills for common fleet ops (restart agent, check config, rotate keys, check health)
- [ ] **TOOL-04**: Cost monitoring dashboard showing per-agent and per-model token spend

### Agent Coordination

- [ ] **COORD-01**: Able to communicate with any agent via Alfred's Discord account using MCP
- [ ] **COORD-02**: Able to assign tasks to agents and track completion via Discord + GitHub issues
- [ ] **COORD-03**: Sub-project creation workflow — spin up GSD project for agent-driven work (AI tools, apps, crypto, gaming)

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Advanced Fleet Intelligence

- **INTEL-01**: Automated model chain optimization based on agent success rates and cost
- **INTEL-02**: Predictive health alerts — detect agent issues before they spiral
- **INTEL-03**: Automated config remediation — fix drift without human intervention
- **INTEL-04**: Cross-agent task routing — automatically assign work to best-suited agent

### Platform Expansion

- **PLAT-01**: Web dashboard for fleet management (Arianus-Sky)
- **PLAT-02**: Mobile notifications for fleet alerts
- **PLAT-03**: Multi-fleet support (manage multiple OpenClaw installations)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New agent creation beyond 20 | Focus on making existing fleet healthy first |
| Server hardware changes | Infrastructure ownership — owner handles |
| OpenClaw platform migration | Committed to OpenClaw, optimize within it |
| Direct server config editing by agents | Security/ownership boundary — owner's CLI only |
| Rate Guard v3 rewrite | Rate Guard v2 is stable, not broken |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 1 | Pending |
| STAB-02 | Phase 1 | Pending |
| STAB-03 | Phase 1 | Complete |
| STAB-04 | Phase 1 | Pending |
| STAB-05 | Phase 1 | Pending |
| STAB-06 | Phase 2 | Pending |
| STAB-07 | Phase 2 | Pending |
| STAB-08 | Phase 2 | Pending |
| STAB-09 | Phase 2 | Pending |
| STAB-10 | Phase 2 | Pending |
| HLTH-01 | Phase 3 | Pending |
| HLTH-02 | Phase 3 | Pending |
| HLTH-03 | Phase 3 | Pending |
| HLTH-04 | Phase 3 | Pending |
| HLTH-05 | Phase 3 | Pending |
| CONF-01 | Phase 4 | Pending |
| CONF-02 | Phase 4 | Pending |
| CONF-03 | Phase 4 | Pending |
| CONF-04 | Phase 4 | Pending |
| TOOL-01 | Phase 5 | Pending |
| TOOL-02 | Phase 5 | Pending |
| TOOL-03 | Phase 5 | Pending |
| TOOL-04 | Phase 5 | Pending |
| COORD-01 | Phase 6 | Pending |
| COORD-02 | Phase 6 | Pending |
| COORD-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
