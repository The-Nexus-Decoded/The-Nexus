# Codebase Concerns

**Analysis Date:** 2026-04-02

## Tech Debt

### Fleet Configuration Fragmentation

**Issue:** OpenClaw fleet has diverged from intended profile-specific root normalization despite infrastructure existing for per-agent isolation.

**Files:** 
- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/SPEC.md`
- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/TICKET-DRAFT.md`
- `Chelestra-Sea/infra/agentbaselines/{agent}/AGENTS.md`

**Impact:** 
- `zifnab` still uses legacy default root (`/home/openclaw/.openclaw`) instead of profile-specific root
- Inconsistent profile-root wiring causes config collision risk when multiple agents read/write shared locations
- Gateway processes may still exist from old default-unit paths creating orphaned state
- Makes config backup and restore unpredictable

**Fix approach:**
1. Migrate `zifnab`, `haplo`, and `hugh` to explicit profile-specific roots
2. Close legacy symlink `/home/openclaw/.openclaw → /data/openclaw`
3. Verify all three agents run from isolated `~/.openclaw-{name}/` roots
4. Test config isolation with targeted edits to each agent's `openclaw.json`

### Model Chain Inconsistency

**Issue:** Active agents running on divergent model chains with different token costs and fallback behavior.

**Files:**
- `Chelestra-Sea/docs/agent-model-chains.md`
- `Chelestra-Sea/infra/agentbaselines/zifnab/MEMORY.md`

**Impact:**
- `zifnab` configured on `anthropic/claude-opus-4-6` with old fallback chain instead of `codex-cli/gpt-5.4` 
- Causes unnecessary expensive token burn (Opus cost >> codex-cli cost)
- `codex-cli` agents (haplo, iridal, zifnab) use wrapper `/usr/local/bin/codex-wrapper` but config may not reflect this uniformly
- Fleet token spend optimization impossible until chains are uniform

**Fix approach:**
1. Move `zifnab` to Alfred's `codex-cli/gpt-5.4` chain with matching fallback sequence
2. Audit all agents for model chain consistency against `Chelestra-Sea/docs/agent-model-chains.md`
3. Run cost projection to verify savings post-migration
4. Document chain assignment rationale per agent tier in AGENTS.md files

### Workspace Hygiene Degradation

**Issue:** Agent workspaces contain mixed project code, assets, and artifacts that should exist only in repo worktrees or `/data/` directories.

**Files:**
- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/SPEC.md` (lines 64-85: "Workspace hygiene" section)
- Agent workspace roots at `~/.openclaw-{agent}/workspace*/`

**Impact:**
- `zifnab` and `haplo` workspaces act as mixed project roots, containing large code trees, PDFs, images, scripts, and vendor trees
- Violates intended rule: agent workspaces should contain only `.md` files and control JSON/TOML/YAML
- Large workspace sizes slow backup, indexing, and memory operations
- Creates confusion about where actual code should live (repo vs agent workspace)

**Fix approach:**
1. Classify all non-markdown, non-control files in `zifnab` and `haplo` workspaces
2. Move project code to proper repo branches/worktrees
3. Move shared content to `/data/<agentname>/` or shared `/data/` locations
4. Delete or archive binary artifacts, PDFs, screenshots, and vendor trees
5. Document workspace rule in all agent SOUL.md files: markdown + control files only

### Agentbaselines Relocation Incomplete

**Issue:** `agentbaselines/` and `agentbaselines-backup-*` directories still at repository root instead of consolidated long-term location.

**Files:**
- Repository root: `./agentbaselines/`, `./agentbaselines-backup-20260311-*`
- Intended home: `Chelestra-Sea/infra/agentbaselines/` (partially in place)

**Impact:**
- Creates two copies of agent configuration (root-level and Chelestra-Sea/infra/)
- Unclear which is source of truth when discrepancies arise
- Root-level location conflicts with monorepo structure (`Pryan-Fire/`, `Arianus-Sky/`, etc.)
- All references to old location must be audited and updated

**Fix approach:**
1. Verify current state: which copy is authoritative (root-level or Chelestra-Sea)?
2. Merge any differences between copies
3. Delete root-level copies after Chelestra-Sea location is verified
4. Update all scripts and documentation referencing old paths
5. Update git hooks if any reference root-level location

### Uncommitted Agentbaselines Relocation

**Issue:** Working tree shows 1033 uncommitted file deletions from `agentbaselines/` directory.

**Files:** Output of `git status` shows bulk deletions pending

**Impact:**
- Large pending change set makes branch state unclear
- Risk of accidental commits or reverts if not staged properly
- Blocks PR merge on `sea/openclaw-fleet-normalization` branch
- May mask other important changes in the commit diff

**Fix approach:**
1. Explicitly stage file deletions: `git add agentbaselines/`
2. Create clean commit with only deletion metadata (files moved to Chelestra-Sea location)
3. Document relocation in commit message
4. Verify branch is clean before any PR operations

## Known Bugs

### OWNER-OVERRIDE.md Authority Not Yet Validated

**Symptoms:** Experimental `OWNER-OVERRIDE.md` file deployed to all 20 agents claims to enforce Lord Xar override authority, but has not been field-tested.

**Files:** `Chelestra-Sea/infra/agentbaselines/{agent}/OWNER-OVERRIDE.md` (deployed to 21 agents)

**Trigger:** Run commands from Lord Xar in Discord to test if agents refuse/defer to Zifnab or accept direct authority.

**Status:** EXPERIMENTAL — success criteria not yet confirmed:
- Do agents respond to `sterol`'s commands without asking Zifnab first?
- Do agents acknowledge Lord Xar's authority when explicitly challenged?
- Does co-coordinator model reduce bottlenecks?

**Mitigation:** If agents still defer to Zifnab despite OWNER-OVERRIDE.md, may need to:
1. Bake owner authority directly into individual SOUL.md files
2. Add override mechanism to OpenClaw gateway config at `agents.defaults.authorization`
3. Add explicit permission check in agent startup sequence

### Agent Consolidation Incomplete Across Baselines

**Symptoms:** Agent consolidation v2 merged 11 agents into 20 active agents, but baseline files may still reference old agent roster.

**Files:** 
- `Nexus-Vaults/memory/agent-consolidation-v2.md` (line 59-67: known issues section)
- `Chelestra-Sea/infra/agentbaselines/{agent}/AGENTS.md` (may reference eliminated agents)

**Trigger:** When agent reads `AGENTS.md` and finds references to Kleitus, Alake, Aleatha, etc., which are now absorbed into other agents.

**Workaround:** Current TEAM.md contains unified roster, but individual AGENTS.md files may be stale.

**Fix approach:**
1. Audit all `AGENTS.md` files in Chelestra-Sea/infra/agentbaselines/
2. Replace agent roster references with link to canonical roster in `Chelestra-Sea/docs/` or monorepo AGENTS.md
3. Update AGENTS.md to explicitly list which agents this one was merged into (for context)

### Stale Agent Workspaces Still Present

**Symptoms:** Agents marked as "eliminated" still have directories in `Chelestra-Sea/infra/agentbaselines/` (but not in active service).

**Files:**
- `Chelestra-Sea/infra/agentbaselines/_archived/` contains eliminated agents
- `Chelestra-Sea/infra/agentbaselines/` contains directories for: alake, aleatha, bane, grundle, jarre, kleitus, lenthan, orla, roland, sangdrax

**Trigger:** Cleanup script runs and tries to provision services for all directories, not just authoritative live list.

**Status:** Backups exist but cleanup step has not been completed.

**Workaround:** Manual filtering of authoritative live agent list before any provision/deploy operations.

**Fix approach:**
1. Complete server-side deployment to ola-claw-dev, ola-claw-main, ola-claw-trade
2. Verify workspace backups exist for all stale agents in `agentbaselines-backup-*` archives
3. Delete stale agent workspace directories only after live system confirms stale agents are not running
4. Confirm cron jobs, systemd units, and gateway configs do not reference stale agents

### Sinistrad Dual Workspace Issue

**Symptoms:** Sinistrad has workspace directories on both `ola-claw-main` and `ola-claw-trade`.

**Files:** Unknown exact locations but mentioned in `Nexus-Vaults/memory/agent-consolidation-v2.md` line 61

**Impact:** 
- Unclear which workspace is authoritative
- Risk of stale memory/config drift between servers
- May cause sync conflicts or duplicate processing

**Fix approach:**
1. Identify which server Sinistrad should canonically run on (likely ola-claw-trade given role)
2. Backup both workspaces
3. Delete non-canonical workspace
4. Verify no systemd units or gateway configs reference deleted location

## Security Considerations

### Sandbox Configuration Inconsistency

**Risk:** Fleet uses three different sandbox modes (`off`, `non-main`, `all`) without clear policy for which agent needs which access level.

**Files:**
- `Chelestra-Sea/projects/fleet/fleet-config-matrix.md` (sandbox.mode column)
- `Chelestra-Sea/projects/fleet/openclaw_agent_settings_handoff_v4.md` (sandbox guidance)

**Current mitigation:**
- `vasu`, `limbeck` have explicit `danger-full-access` override for MCP network access
- Most agents default to `sandbox.mode: all` but this may be overly restrictive for operational/technical roles
- Earlier design assumed orchestrators could safely use `sandbox.mode: all`

**Recommendations:**
1. Audit which agents need SSH, git, CI, MCP, deploy, scraping, or email access
2. Move operational/technical agents from `all` to `non-main` (safer than full sandbox, still functional)
3. Document sandbox policy per role/tier in `Chelestra-Sea/docs/`
4. Do NOT use `sandbox.mode: all` for agents that need external tool access
5. Require explicit exception approval (via OWNER-OVERRIDE.md) for any `danger-full-access` mode

### Memory Database Growth Risk

**Risk:** `sessionMemory` enabled on subset of agents without monitoring or size limits.

**Files:** 
- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/TICKET-DRAFT.md` (lines 40-44)
- Individual agent `openclaw.json` files

**Current state:** Inconsistent `sessionMemory` configuration across fleet with no unified policy.

**Impact:**
- Large memory databases can consume disk space and slow indexing
- No visibility into memory DB size across fleet
- Risk of silent performance degradation if one agent's memory DB grows unchecked

**Recommendations:**
1. Standardize `sessionMemory` behavior across fleet (enable or disable uniformly)
2. If enabled, set size limits and compaction policies per `Chelestra-Sea/docs/agent-memory-limits.md`
3. Monitor memory DB size per agent weekly
4. Archive or purge old sessions if DB grows beyond policy threshold
5. Document memory policy in all agent SOUL.md and OPERATIONS.md files

### ACPX Permission Escalation Risk (Unresolved)

**Risk:** OpenClaw 2026.4.1 upgrade introduced ACPX permission system but agent baseline deployments may not reflect required permission bits.

**Files:** Unknown exact location of ACPX config

**Current state:** Mentioned in handoff context but not found in current codebase analysis. May be on live servers only.

**Impact:** 
- Agents may lack necessary permission bits after OpenClaw upgrade
- Tool access restrictions may prevent legitimate operations
- Could block agent execution entirely if bits are missing

**Recommendations:**
1. Verify ACPX permission bits for all 20 active agents against OpenClaw 2026.4.1 requirements
2. Document permission matrix in `Chelestra-Sea/docs/agent-permissions.md`
3. Add ACPX validation to deployment/provisioning workflow
4. Create runbook for permission bit debugging if agents fail after upgrade

## Performance Bottlenecks

### Gateway Memory Bloat Under Rate Limit Stress

**Problem:** Zifnab gateway balloons to 5.5-6GB RAM during rate-limit storms.

**Files:** No specific code location identified; behavior documented in CLAUDE.md global memory

**Cause:** Unknown — may be:
- History context injection on restart causing memory accumulation
- Rate guard retry loop accumulating connection state
- Message buffer not being freed after 429/503 responses

**Improvement path:**
1. Add memory profiling instrumentation to gateway startup
2. Monitor memory growth during rate-limit stress test
3. Identify which component (history, cache, connections, retry queue) is growing
4. Add explicit cleanup/purge step if certain threshold exceeded
5. Consider heap size limits in systemd service config

### Metadata Indexing for Large Workspaces

**Problem:** Zifnab and Haplo workspaces containing large code trees and assets cause slow indexing and backup operations.

**Files:** Agent workspace roots

**Cause:** Workspace hygiene issue (see tech debt section) causes index operations to process irrelevant files.

**Improvement path:**
1. Clean up workspace hygiene (move code/assets out)
2. Add explicit workspace ignore patterns (`.gitignore` style) to gateway config
3. Consider shallow indexing for non-markdown files
4. Benchmark backup/index time before and after cleanup

## Fragile Areas

### OpenClaw Version Upgrade Compatibility

**Files:** 
- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/TICKET-DRAFT.md` (references to 2026.4.1 upgrade)
- `Chelestra-Sea/infra/agentbaselines/{agent}/AGENTS.md`

**Why fragile:** 
- Recent upgrade to OpenClaw 2026.4.1 broke codex-cli model registration and introduced ACPX permissions system
- Model chains may have become invalid or unsupported after version change
- Sandbox defaults may have changed in new version, silently breaking agent access
- Agent baseline deployment depends on specific version assumptions

**Safe modification:**
1. Test model chain changes in non-production agent first (e.g., `iridal` or `marit`)
2. Verify gateway logs for model-registration errors before fleet-wide rollout
3. Run ACPX permission audit after any OpenClaw version change
4. Document version-specific config in agent baselines (e.g., "requires OpenClaw >= 2026.4.0")
5. Create rollback plan with backed-up agent configs before upgrade

**Test coverage gaps:**
- No automated test for model chain validity after OpenClaw upgrade
- ACPX permission bits not validated in CI pipeline
- Gateway memory behavior under stress not monitored

### Codex Wrapper Dependency

**Files:**
- `/usr/local/bin/codex-wrapper` (on ola-claw-dev, ola-claw-main)
- Agent configs referencing `codex-cli/gpt-5.4`
- `Chelestra-Sea/docs/agent-model-chains.md`

**Why fragile:**
- Wrapper script must exist on each server for codex-cli agents to function
- If wrapper is deleted or corrupted, all `codex-cli` agents fail silently
- No health check for wrapper in gateway or agent startup
- Wrapper behavior (stripping unsupported flags) is undocumented in baselines

**Safe modification:**
1. Document wrapper behavior and location in `Chelestra-Sea/docs/codex-cli-setup.md`
2. Add wrapper checksum validation to systemd PreStart= hook
3. Include wrapper source code in repo (currently not found in codebase analysis)
4. Add integration test: codex-cli model registration with wrapper
5. Create fallback model chain if wrapper fails

**Test coverage gaps:**
- No test for wrapper presence/health on deploy
- Model chain fallback not tested when wrapper missing
- Agent behavior not validated after wrapper updates

### Memory Normalization Incomplete

**Files:**
- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/TICKET-DRAFT.md` (lines 87-104: memory direction section)
- Individual agent `openclaw.json` files (memory settings not normalized)

**Why fragile:**
- Fleet uses mixed memory backends (QMD on Haplo, others unknown)
- Memory search settings differ across agents
- Session indexing inconsistently applied
- No fleet-wide memory policy documented

**Safe modification:**
1. Standardize on Haplo's QMD memory setup as reference
2. Use Iridal as editable review target for comparing settings
3. Apply changes to one tier at a time (not all agents simultaneously)
4. Monitor memory performance and size metrics during rollout
5. Document final memory policy in `Chelestra-Sea/docs/fleet-memory-policy.md`

**Test coverage gaps:**
- No test for memory backend consistency across fleet
- Memory performance regression not caught by CI
- Session indexing behavior not validated per agent tier

## Scaling Limits

### Agent Workspace Storage Growth

**Current capacity:** Zifnab and Haplo workspaces contain significant non-markdown content (exact size unknown from analysis).

**Limit:** Workspace backup operations become slow when workspaces exceed ~500MB; indexing degrades significantly above 1GB.

**Scaling path:**
1. Complete workspace cleanup (move large files out)
2. Implement periodic workspace archive strategy (backup, then delete old sessions)
3. Set per-agent workspace size limits in gateway config: `workspace.maxSize`
4. Add monitoring alert if workspace grows faster than expected
5. Consider separate storage backend for workspace vs project code

### Model Chain Fallback Depth

**Current capacity:** Some agents have 4-5 model fallbacks (e.g., `trinity-mini -> solar-pro-3 -> nemotron-30b -> qwen3-235b-thinking`).

**Limit:** Deep fallback chains increase latency when primary fails; complex chains become hard to debug.

**Scaling path:**
1. Limit fallback chain to 3 models maximum per agent tier
2. Document rationale for each fallback in agent AGENTS.md
3. Monitor fallback usage frequency to validate chain order
4. Remove unused fallbacks quarterly

## Dependencies at Risk

### aiohttp in venv/requirements

**Risk:** `aiohttp` vendored in `Pryan-Fire/hughs-forge/risk-manager/venv/lib/python3.12/site-packages/aiohttp/` contains multiple TODOs and FIXMEs indicating incomplete/deprecated code paths.

**Files:**
- `aiohttp/client_proto.py` — "FIXME: log this somehow?"
- `aiohttp/client_reqrep.py` — Session initialization issues in tests
- `aiohttp/web_urldispatcher.py` — "TODO cache file content"
- `aiohttp/web_exceptions.py` — "FIXME: this should include a date or etag header"

**Impact:**
- Vendored version may be outdated and contain security patches not applied
- TODOs suggest incomplete error handling or logging
- If aiohttp is upgraded, these workarounds may need revisiting

**Migration plan:**
1. Verify aiohttp version in `Pryan-Fire/hughs-forge/risk-manager/requirements.txt`
2. Check official release notes for security patches since version
3. Consider using poetry/pipenv lock file instead of venv directory
4. Do NOT vendor dependencies — use proper package manager
5. Upgrade aiohttp to latest patch version and test risk-manager thoroughly

### OpenRouter Budget Proxy Dependency

**Risk:** Fleet depends on custom budget proxy at `localhost:8788` enforcing $5/day per model cap. If proxy fails, fleet has no cost control.

**Files:** 
- `openclaw-openrouter-proxy.service` (all 3 servers)
- Proxy config: `/data/openclaw/openrouter-proxy/rate-guard-limits.json`

**Impact:** 
- Single point of failure for cost control
- Stalled proxy means unbounded spending
- No fallback mechanism to disable expensive models

**Mitigation:**
1. Monitor proxy health in cron: `curl -s localhost:8788/health`
2. Add alert if proxy down for >5 minutes
3. Document emergency shutdown of OpenRouter fallback models
4. Keep backup of `rate-guard-limits.json` on all servers
5. Test proxy restart procedure quarterly

## Missing Critical Features

### Workspace Governance Documentation

**Problem:** Agent workspace rules documented informally in SOUL.md and SPEC.md, not in centralized governance document.

**Blocks:** 
- New agents cannot reliably determine what belongs in workspace vs `/data/` vs repo
- Workspace cleanup lacks clear decision criteria
- Backups may include unwanted artifacts

**Solution:** Create `Chelestra-Sea/docs/workspace-governance.md` covering:
- What is allowed (markdown, control JSON/YAML)
- What is forbidden (code trees, binaries, assets)
- Where each type of content belongs
- Workspace size targets per agent role
- Cleanup procedure and cadence

### Fleet-Wide Memory Policy Document

**Problem:** Memory settings scattered across individual agent configs with no unified policy or rationale.

**Blocks:**
- Cannot reliably standardize memory behavior
- No visibility into whether settings are intentional or accidental defaults
- Memory performance issues hard to debug without policy context

**Solution:** Create `Chelestra-Sea/docs/fleet-memory-policy.md` covering:
- Memory backend selection (QMD vs builtin)
- Session indexing policy (when enabled, size limits)
- Memory search tuning (model, hybrid settings)
- Cache and vector store behavior
- Compaction strategy per agent tier
- Monitoring and alerting for memory DB growth

### OpenClaw Upgrade Runbook

**Problem:** Recent 2026.4.1 upgrade broke codex-cli and introduced ACPX permissions, but no runbook exists for version changes.

**Blocks:**
- Cannot safely plan future upgrades
- Breaking changes discovered ad-hoc on live systems
- No validation that upgrades are compatible with agent baselines

**Solution:** Create `Chelestra-Sea/docs/openclaw-upgrade-runbook.md` covering:
- Pre-upgrade checklist (backup, health checks, model validation)
- Breaking changes in each major version
- Version-specific agent baseline adjustments
- Post-upgrade validation (model registration, permission bits, gateway logs)
- Rollback procedure if upgrade fails

## Test Coverage Gaps

### Workspace Rule Validation

**What's not tested:** Whether agent workspaces actually contain only allowed file types.

**Files affected:** `Chelestra-Sea/infra/agentbaselines/{agent}/workspace*/`

**Risk:** Workspace bloat accumulates silently until backup/indexing operations fail.

**Test implementation:**
- Script: for each agent, list non-markdown files in workspace and fail if any found
- Frequency: daily CI check
- Tolerance: allow `.json`, `.yaml`, `.toml` up to 10KB total
- Alert owner if workspace contains `.py`, `.js`, `.zip`, `.pdf`, `.png`

### Model Chain Validity

**What's not tested:** Whether all model chains in agent configs are valid after OpenClaw upgrade.

**Files affected:** Individual agent `openclaw.json` files (stored on live servers, not in repo)

**Risk:** Model chains become invalid after version upgrade; agents fail with unclear error messages.

**Test implementation:**
- Script: for each agent, attempt model registration dry-run with `codex-cli`
- Validate fallback chain is properly ordered
- Verify all models in chain are available in current OpenClaw version
- Frequency: post-upgrade verification (manual today, should be automated)

### Sandbox Mode Capability Testing

**What's not tested:** Whether agents with restricted sandbox modes can still access required tools.

**Files affected:** Agent-specific `sandbox.mode` settings

**Risk:** Sandbox change silently breaks agent capability (e.g., agent can't run git commands).

**Test implementation:**
- Script: for each agent, verify critical tool access based on assigned sandbox mode
- Operational agents need: SSH, git, CI, email access (require `non-main` at minimum)
- Coordinators need: Discord, GitHub API, systemd access (require specific tool permissions)
- Frequency: weekly, or after any sandbox mode change

---

*Concerns audit: 2026-04-02*
