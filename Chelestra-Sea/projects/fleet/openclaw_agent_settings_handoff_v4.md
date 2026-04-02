# OpenClaw Agent Settings Resolution & Final Handoff (v4)

## Purpose

This document is the revised final handoff for the current OpenClaw settings design. It is intended to be usable by the Claude admin without guesswork and now incorporates the observed sandbox/access concerns from live use.

This version explicitly includes:

- the agreed agent-to-profile mapping
- all 7 profile types
- full explicit config blocks for every profile type
- the rule that all matrix fields must be surfaced explicitly
- explicit row 56 (`logging.level`) handling
- per-agent logging overrides where agents share a profile type but require different audit intensity
- revised sandbox guidance based on real operational needs
- explicit notes on profile overrides for Alfred, Jonathon, Sinistrad, Vasu, and Limbeck
- a note that we will still review agents one by one, in tandem, before final instantiation

---

# Working agreement

We are **not** assigning every agent blindly from a matrix alone.

We will:

1. review each agent's intended role
2. compare that role against the baseline profiles
3. pick the closest baseline
4. make only targeted changes when justified
5. keep the family coherent and maintainable

This means the system will use:

- shared role-based profile standards
- case-by-case review of real agents
- limited and justified exceptions

---

# Final profile family

The agreed profile family is:

1. **Standard Work Agent**
2. **Standard Companion Agent**
3. **Senior Dev Coder**
4. **Architect Dev Coder**
5. **Assistant Orchestrator**
6. **Lead Orchestrator**
7. **Capital-Risk Operator**

---

# Final agreed agent-to-profile mapping

## Lead Orchestrator
- **Zifnab**

## Assistant Orchestrator
- **Alfred**
- **Jonathon**
- **Sinistrad**

## Architect Dev Coder
- **Haplo**
- **Vasu**
- **Samah**

## Senior Dev Coder
- **Marit**
- **Paithan**
- **Limbeck**
- **Balthazar**
- **Drugar**
- **Devon**

## Standard Companion Agent
- **Iridal**
- **Edmund**
- **Rega**

## Standard Work Agent
- **Ciang**
- **Trian**
- **Ramu**

## Capital-Risk Operator
- **Hugh**

## Mapping notes
- **Alfred** is intentionally placed at **Assistant Orchestrator** rather than Lead Orchestrator.
- **Ramu** is intentionally placed at **Standard Work Agent**, even though he is a high-context standard role and may be revisited later if scope grows.
- **Marit** is intentionally placed in **Senior Dev Coder** because her QA/testing role is deeply technical and tied to developer code validation.
- **Hugh** is intentionally placed in a separate **Capital-Risk Operator** profile because live capital risk deserves stricter controls than the normal 6 profiles.

---

# Explicit configuration rule

Every finalized profile in this system should surface **all matrix fields explicitly**, even when we are intentionally choosing the default value.

Reason:
- no hidden inheritance assumptions
- no guessing by another AI
- no ambiguity during review
- easier diffing across profiles
- safer handoff to Claude admin

This means each profile should explicitly include every surfaced setting row from the matrix:

- `thinkingDefault`
- `sandbox.mode`
- `bootstrapMaxChars`
- `bootstrapTotalMaxChars`
- `memory.backend`
- `memory.citations`
- `memory.qmd.command`
- `memory.qmd.searchMode`
- `memory.qmd.includeDefaultMemory`
- `memory.qmd.update.interval`
- `memory.qmd.update.debounceMs`
- `memory.qmd.limits.maxResults`
- `memory.qmd.limits.timeoutMs`
- `memorySearch.enabled`
- `memorySearch.provider`
- `memorySearch.experimental.sessionMemory`
- `hybrid.enabled`
- `hybrid.vectorWeight`
- `hybrid.textWeight`
- `hybrid.mmr.enabled`
- `hybrid.mmr.lambda`
- `hybrid.temporalDecay.enabled`
- `hybrid.temporalDecay.halfLifeDays`
- `compaction.mode`
- `compaction.reserveTokensFloor`
- `memoryFlush.enabled`
- `memoryFlush.softThresholdTokens`
- `memoryFlush.prompt`
- `memoryFlush.systemPrompt`
- `contextPruning.mode`
- `contextPruning.ttl`
- `contextPruning.keepLastAssistants`
- `tools.exec.security`
- `tools.profile`
- `tools.alsoAllow`
- `tools.web.search.apiKey`
- `tools.sessions.visibility`
- `tools.agentToAgent.enabled`
- `tools.elevated.enabled`
- `acp.enabled`
- `acp.dispatch.enabled`
- `acp.backend`
- `acp.allowedAgents`
- `acp.maxConcurrentSessions`
- `subagents.maxConcurrent`
- `subagents.maxSpawnDepth`
- `subagents.maxChildrenPerAgent`
- `discord.historyLimit`
- `discord.textChunkLimit`
- `discord.streaming`
- `discord.retry.attempts`
- `discord.retry.minDelayMs`
- `discord.retry.maxDelayMs`
- `discord.threadBindings.spawnAcpSessions`
- `browser.enabled`
- `logging.level`
- `cron.enabled`
- `hooks.internal.enabled`
- `hooks.session-memory.enabled`
- `hooks.bootstrap-extra-files.paths`
- `commands.restart`

There should be no final profile where a value is merely implied.

---

# Core design principles

## 1) Do not make every agent equally powerful
Separate workers, coders, orchestrators, companions, and capital-risk roles by what they actually do.

## 2) Use strong defaults, not universal maximal autonomy
Not every role needs full autonomy, full exec, elevated permissions, or auto-dispatch.

## 3) Long-term memory should be selective
Transcript memory is useful, but not every role benefits equally from it.

## 4) ACP should remain available, but auto-dispatch should be selective
ACP can be enabled broadly while auto-dispatch is reserved for specific leadership roles.

## 5) Logging must be explicit
The real matrix field is `logging.level`, so it must be explicitly set in every final profile and final instantiated agent config.

## 6) Sandbox must match actual operational needs
If agents need SSH, git, CI, MCP, deploy access, web scraping, email access, or remote inspection, then `sandbox.mode: all` is often too restrictive. In this environment, many operational and technical roles should prefer `sandbox.mode: non-main`.

---

# Logging policy

## Row 56 rule
Use:
- `logging.level: debug` for hard-logged agents
- `logging.level: info` for normal agents

## Hard-logged agents
These should explicitly use:
```yaml
logging.level: debug
```

- **Zifnab**
- **Alfred**
- **Haplo**
- **Hugh**
- **Jonathon**
- **Marit**
- **Drugar**
- **Sinistrad**
- **Vasu**
- **Limbeck**

## Normal-logged agents
These should explicitly use:
```yaml
logging.level: info
```

- **Ramu**
- **Rega**
- **Iridal**
- **Edmund**
- **Ciang**
- **Trian**
- **Balthazar**
- **Paithan**
- **Devon**
- **Samah**

## Important implementation note
The shared baseline type configs below may use `logging.level: info` as their base value. When an actual agent is instantiated, the final agent config must explicitly override row 56 if that agent belongs in the hard-logged list.

---

# Sandbox policy revision

## Revised default view
The earlier assumption that orchestrators could safely stay on `sandbox.mode: all` was too optimistic for this environment.

Observed operational reality:
- orchestrators sometimes need SSH to other boxes
- devs need real tool access
- full sandboxing can break coding, git, CI, MCP, scraping, and email workflows

## Revised recommendation
Use `sandbox.mode: non-main` for most operational and technical roles.

Reserve `sandbox.mode: all` primarily for softer roles that truly do not need broad host/tool access.

## Current recommended sandbox split

### `sandbox.mode: non-main`
- Assistant Orchestrator
- Lead Orchestrator
- Senior Dev Coder
- Architect Dev Coder
- Capital-Risk Operator if live APIs or real tooling require it
- Standard Work Agent if that specific role uses local tools
- Standard Companion Agent if that specific role uses real repo/tool access

### `sandbox.mode: all`
- Standard Companion Agent for purely documentation/content roles
- Standard Work Agent for purely documentation/content roles

## Important practical rule
If an agent needs:
- SSH
- git control
- CI interaction
- remote inspection
- Docker
- Tailscale
- deploy support
- MCP integration
- web scraping
- email access

then default that instantiated agent to:

```yaml
sandbox.mode: non-main
```

---

# Specific concerns and agreed handling

## 1) Alfred as messaging profile might be too restrictive for code review
Agreed. Alfred remains **Assistant Orchestrator** by role, but his instantiated config may need execution/tooling capability beyond the pure messaging baseline.

### Recommended Alfred overrides
- `sandbox.mode: non-main`
- `tools.profile: full`
- `tools.exec.security: allowlist` at first, raise to `full` only if needed
- `logging.level: debug`

This treats Alfred as an Assistant Orchestrator with review/governance responsibilities, not as a pure chat router.

## 2) Jonathon's security work might need more exec access than allowlist
Agreed. Security operations often require deeper inspection and tooling access than a normal coordinator.

### Recommended Jonathon overrides
- `sandbox.mode: non-main`
- `tools.exec.security: full` if real-world security workflows require it
- `tools.profile: full`
- `logging.level: debug`

Start conservative if desired, but be prepared to elevate if threat hunting, forensics, or incident tooling breaks under allowlist.

## 3) Sinistrad's web scraping/email might need network access that sandbox: all blocks
Agreed. This is a direct reason to avoid `sandbox.mode: all` for his instantiated configuration.

### Recommended Sinistrad overrides
- `sandbox.mode: non-main`
- `tools.profile: full` if needed for scraping/business tooling
- `tools.exec.security: allowlist` initially
- `logging.level: debug`

## 4) Vasu/Limbeck MCP overrides need to be layered on top of their profile
Agreed. This is the correct way to think about them.

They should keep their assigned baseline coder role, then add MCP-specific overrides on top.

### Recommended Vasu MCP overrides
- base role: **Architect Dev Coder**
- instantiated override: `sandbox.mode: non-main`
- instantiated override: `tools.exec.security: full`
- instantiated override: `tools.elevated.enabled: true`
- instantiated override: `logging.level: debug`

### Recommended Limbeck MCP overrides
- base role: **Senior Dev Coder**
- instantiated override: `sandbox.mode: non-main`
- instantiated override: `tools.exec.security: full`
- instantiated override: `tools.elevated.enabled: true`
- instantiated override: `logging.level: debug`

This keeps the role taxonomy stable while acknowledging that MCP can require a stronger access layer.

---

# Profile configs

## 1) Standard Work Agent

### Intended use
Use this for:
- routine work
- planning
- documentation
- general problem solving
- light research
- ad hoc support
- normal daily work that does not require deep long-term relationship memory

### Memory position
- `memorySearch.experimental.sessionMemory: false`

### ACP position
- ACP enabled
- auto-dispatch off

### Sandbox note
Use `sandbox.mode: all` only when the instantiated role is truly soft/non-operational. For tool-using roles, override to `non-main`.

### Full config

```yaml
thinkingDefault: adaptive
sandbox.mode: all
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 10m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 4
memory.qmd.limits.timeoutMs: 4000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: false

hybrid.enabled: true
hybrid.vectorWeight: 0.65
hybrid.textWeight: 0.35
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.70
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 30

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable work context:
  - project facts
  - decisions made
  - active deliverables
  - stable preferences
  - open follow-ups
  Do not save casual chat, duplicate summaries, or temporary reasoning.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Save concise, useful, durable facts only.

contextPruning.mode: cache-ttl
contextPruning.ttl: 2h
contextPruning.keepLastAssistants: 3

tools.exec.security: allowlist
tools.profile: coding
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: self
tools.agentToAgent.enabled: true
tools.elevated.enabled: false

acp.enabled: true
acp.dispatch.enabled: false
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
acp.maxConcurrentSessions: 3

subagents.maxConcurrent: 3
subagents.maxSpawnDepth: 2
subagents.maxChildrenPerAgent: 2

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: off
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: true

browser.enabled: true
logging.level: info
cron.enabled: false

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: true
```

Assigned:
- Ciang
- Trian
- Ramu

---

## 2) Standard Companion Agent

### Intended use
Use this for:
- long-running recurring work
- continuity across many sessions
- remembering preferences, decisions, and prior discussions
- relationship-style support
- daily partner behavior

### Memory position
- `memorySearch.experimental.sessionMemory: true`

### ACP position
- ACP enabled
- auto-dispatch off

### Sandbox note
Use `sandbox.mode: all` only for soft/non-operational companion roles. Override to `non-main` if the actual agent needs repo/tool access.

### Full config

```yaml
thinkingDefault: adaptive
sandbox.mode: all
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 10m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 6
memory.qmd.limits.timeoutMs: 5000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: true

hybrid.enabled: true
hybrid.vectorWeight: 0.65
hybrid.textWeight: 0.35
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.70
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 30

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable companion context:
  - stable preferences
  - recurring goals
  - long-running project facts
  - meaningful decisions
  - unresolved follow-ups
  Do not save routine filler, duplicate summaries, or raw transcript noise.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Save concise, durable, continuity-oriented memory.

contextPruning.mode: cache-ttl
contextPruning.ttl: 3h
contextPruning.keepLastAssistants: 3

tools.exec.security: allowlist
tools.profile: coding
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: self
tools.agentToAgent.enabled: true
tools.elevated.enabled: false

acp.enabled: true
acp.dispatch.enabled: false
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
acp.maxConcurrentSessions: 3

subagents.maxConcurrent: 3
subagents.maxSpawnDepth: 2
subagents.maxChildrenPerAgent: 2

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: off
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: true

browser.enabled: true
logging.level: info
cron.enabled: false

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: true
```

Assigned:
- Iridal
- Edmund
- Rega

---

## 3) Senior Dev Coder

### Intended use
Use this for:
- implementation
- debugging
- patching
- code-level problem solving
- file editing
- practical development work

### Memory position
- `memorySearch.experimental.sessionMemory: false`

### ACP position
- ACP enabled
- auto-dispatch off

### Sandbox note
For this environment, instantiated agents in this profile should normally use `sandbox.mode: non-main`.

### Full config

```yaml
thinkingDefault: adaptive
sandbox.mode: non-main
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 10m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 5
memory.qmd.limits.timeoutMs: 5000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: false

hybrid.enabled: true
hybrid.vectorWeight: 0.60
hybrid.textWeight: 0.40
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.75
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 30

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable implementation knowledge:
  - architecture decisions
  - file locations
  - APIs used
  - unresolved bugs
  - active constraints
  Do not save transient chatter, raw logs, or duplicate summaries.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Write concise, structured, non-duplicative durable notes only.

contextPruning.mode: cache-ttl
contextPruning.ttl: 1h
contextPruning.keepLastAssistants: 3

tools.exec.security: full
tools.profile: full
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: tree
tools.agentToAgent.enabled: true
tools.elevated.enabled: true

acp.enabled: true
acp.dispatch.enabled: false
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
  - opencode
acp.maxConcurrentSessions: 4

subagents.maxConcurrent: 4
subagents.maxSpawnDepth: 2
subagents.maxChildrenPerAgent: 3

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: partial
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: true

browser.enabled: true
logging.level: info
cron.enabled: false

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: true
```

Assigned:
- Marit
- Paithan
- Limbeck
- Balthazar
- Drugar
- Devon

### Per-agent row 56 overrides inside this type
Set:
```yaml
logging.level: debug
```
for:
- Marit
- Limbeck
- Drugar

Keep:
```yaml
logging.level: info
```
for:
- Paithan
- Balthazar
- Devon

---

## 4) Architect Dev Coder

### Intended use
Use this for:
- higher-level design
- architecture
- tradeoff analysis
- multi-step technical planning
- solution shaping
- delegating limited specialist work while still remaining technical

### Memory position
- `memorySearch.experimental.sessionMemory: true`

### ACP position
- ACP enabled
- auto-dispatch off initially

### Sandbox note
For this environment, instantiated agents in this profile should normally use `sandbox.mode: non-main`.

### Full config

```yaml
thinkingDefault: adaptive
sandbox.mode: non-main
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 10m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 6
memory.qmd.limits.timeoutMs: 5000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: true

hybrid.enabled: true
hybrid.vectorWeight: 0.60
hybrid.textWeight: 0.40
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.75
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 30

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable architecture knowledge:
  - system decisions
  - technical tradeoffs
  - rejected options and why
  - interfaces and integration assumptions
  - cross-project constraints
  Do not save repetitive discussion, raw transcript debris, or transient implementation chatter.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Save concise architectural knowledge and durable design context only.

contextPruning.mode: cache-ttl
contextPruning.ttl: 2h
contextPruning.keepLastAssistants: 3

tools.exec.security: full
tools.profile: full
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: tree
tools.agentToAgent.enabled: true
tools.elevated.enabled: true

acp.enabled: true
acp.dispatch.enabled: false
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
  - opencode
acp.maxConcurrentSessions: 5

subagents.maxConcurrent: 5
subagents.maxSpawnDepth: 2
subagents.maxChildrenPerAgent: 3

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: partial
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: true

browser.enabled: true
logging.level: info
cron.enabled: false

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: true
```

Assigned:
- Haplo
- Vasu
- Samah

### Per-agent row 56 overrides inside this type
Set:
```yaml
logging.level: debug
```
for:
- Haplo
- Vasu

Keep:
```yaml
logging.level: info
```
for:
- Samah

---

## 5) Assistant Orchestrator

### Intended use
Use this for:
- light coordination
- routing tasks
- watching status
- helping manage workflow
- keeping structured awareness of ongoing work

### Memory position
- `memorySearch.experimental.sessionMemory: true`

### ACP position
- ACP enabled
- auto-dispatch off

### Sandbox note
For this environment, instantiated agents in this profile should normally use `sandbox.mode: non-main`.

### Full config

```yaml
thinkingDefault: medium
sandbox.mode: non-main
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 15m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 6
memory.qmd.limits.timeoutMs: 5000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: true

hybrid.enabled: true
hybrid.vectorWeight: 0.70
hybrid.textWeight: 0.30
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.70
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 21

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable coordination knowledge:
  - who is handling what
  - current status
  - blocked items
  - dependencies
  - routing notes that matter later
  Do not save implementation debris, repetitive summaries, or short-lived chatter.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Save concise routing and coordination facts only.

contextPruning.mode: cache-ttl
contextPruning.ttl: 1h
contextPruning.keepLastAssistants: 4

tools.exec.security: allowlist
tools.profile: messaging
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: agent
tools.agentToAgent.enabled: true
tools.elevated.enabled: false

acp.enabled: true
acp.dispatch.enabled: false
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
  - opencode
acp.maxConcurrentSessions: 3

subagents.maxConcurrent: 3
subagents.maxSpawnDepth: 2
subagents.maxChildrenPerAgent: 2

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: progress
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: true

browser.enabled: true
logging.level: info
cron.enabled: true

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: true
```

Assigned:
- Alfred
- Jonathon
- Sinistrad

### Per-agent row 56 overrides inside this type
Set:
```yaml
logging.level: debug
```
for:
- Alfred
- Jonathon
- Sinistrad

### Important instantiated overrides for specific Assistant Orchestrators

#### Alfred
```yaml
sandbox.mode: non-main
tools.profile: full
tools.exec.security: allowlist
logging.level: debug
```

#### Jonathon
```yaml
sandbox.mode: non-main
tools.profile: full
tools.exec.security: full
logging.level: debug
```

#### Sinistrad
```yaml
sandbox.mode: non-main
tools.profile: full
tools.exec.security: allowlist
logging.level: debug
```

---

## 6) Lead Orchestrator

### Intended use
Use this for:
- top-level coordination
- higher-authority routing
- deciding who should do what
- supervising multiple workstreams
- controlled delegation
- cross-agent planning

### Memory position
- `memorySearch.experimental.sessionMemory: true`

### ACP position
- ACP enabled
- auto-dispatch on

### Sandbox note
For this environment, instantiated agents in this profile should normally use `sandbox.mode: non-main`.

### Full config

```yaml
thinkingDefault: adaptive
sandbox.mode: non-main
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 15m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 6
memory.qmd.limits.timeoutMs: 5000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: true

hybrid.enabled: true
hybrid.vectorWeight: 0.70
hybrid.textWeight: 0.30
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.70
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 21

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable lead-coordination memory:
  - workstream ownership
  - escalation decisions
  - delegation logic
  - critical blockers
  - important project status changes
  Do not save repetitive chatter, raw tool noise, or unnecessary detail.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Save concise leadership, delegation, and coordination memory only.

contextPruning.mode: cache-ttl
contextPruning.ttl: 1h
contextPruning.keepLastAssistants: 4

tools.exec.security: allowlist
tools.profile: messaging
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: agent
tools.agentToAgent.enabled: true
tools.elevated.enabled: false

acp.enabled: true
acp.dispatch.enabled: true
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
  - opencode
acp.maxConcurrentSessions: 4

subagents.maxConcurrent: 4
subagents.maxSpawnDepth: 2
subagents.maxChildrenPerAgent: 3

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: progress
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: true

browser.enabled: true
logging.level: info
cron.enabled: true

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: true
```

Assigned:
- Zifnab

### Per-agent row 56 override inside this type
Set:
```yaml
logging.level: debug
```
for:
- Zifnab

---

## 7) Capital-Risk Operator

### Intended use
Use this for:
- agents that can influence or execute decisions involving real capital
- live trading or financial operations
- on-chain monitoring connected to real positions
- systems where monetary loss is possible from incorrect action

### Memory position
- `memorySearch.experimental.sessionMemory: true`

### ACP position
- ACP enabled
- auto-dispatch off

### Sandbox note
If the live execution stack or API access requires it, use `sandbox.mode: non-main`. Start with this profile at `non-main` in this environment.

### Full config

```yaml
thinkingDefault: medium
sandbox.mode: non-main
bootstrapMaxChars: 30000
bootstrapTotalMaxChars: 180000

memory.backend: qmd
memory.citations: auto
memory.qmd.command: ~/.bun/bin/qmd
memory.qmd.searchMode: search
memory.qmd.includeDefaultMemory: true
memory.qmd.update.interval: 10m
memory.qmd.update.debounceMs: 30000
memory.qmd.limits.maxResults: 6
memory.qmd.limits.timeoutMs: 5000

memorySearch.enabled: true
memorySearch.provider: local
memorySearch.experimental.sessionMemory: true

hybrid.enabled: true
hybrid.vectorWeight: 0.70
hybrid.textWeight: 0.30
hybrid.mmr.enabled: true
hybrid.mmr.lambda: 0.70
hybrid.temporalDecay.enabled: true
hybrid.temporalDecay.halfLifeDays: 14

compaction.mode: default
compaction.reserveTokensFloor: 20000
memoryFlush.enabled: true
memoryFlush.softThresholdTokens: 40000
memoryFlush.prompt: |
  Before compaction, save only durable capital-risk context:
  - open theses
  - active guardrails
  - stop-loss state
  - wallet and execution constraints
  - recent significant market context
  Do not save hype chatter, duplicate commentary, or noisy short-lived observations.
memoryFlush.systemPrompt: |
  You are performing a pre-compaction memory flush.
  Save concise trade-governance, guardrail, and capital-risk memory only.

contextPruning.mode: cache-ttl
contextPruning.ttl: 1h
contextPruning.keepLastAssistants: 4

tools.exec.security: allowlist
tools.profile: coding
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: self
tools.agentToAgent.enabled: false
tools.elevated.enabled: false

acp.enabled: true
acp.dispatch.enabled: false
acp.backend: acpx
acp.allowedAgents:
  - claude
  - codex
  - gemini
acp.maxConcurrentSessions: 1

subagents.maxConcurrent: 1
subagents.maxSpawnDepth: 1
subagents.maxChildrenPerAgent: 1

discord.historyLimit: 25
discord.textChunkLimit: 2000
discord.streaming: off
discord.retry.attempts: 2
discord.retry.minDelayMs: 1000
discord.retry.maxDelayMs: 60000
discord.threadBindings.spawnAcpSessions: false

browser.enabled: true
logging.level: debug
cron.enabled: true

hooks.internal.enabled: true
hooks.session-memory.enabled: true
hooks.bootstrap-extra-files.paths:
  - AGENTS.md
  - IDENTITY.md

commands.restart: false
```

Assigned:
- Hugh

---

# Final row 56 assignments by actual agent

## Set `logging.level: debug`
- Zifnab
- Alfred
- Haplo
- Hugh
- Jonathon
- Marit
- Drugar
- Sinistrad
- Vasu
- Limbeck

## Set `logging.level: info`
- Ramu
- Rega
- Iridal
- Edmund
- Ciang
- Trian
- Balthazar
- Paithan
- Devon
- Samah

---

# What changed in this revision

This revision corrects the following:

1. earlier sandbox assumptions were too restrictive for orchestrators and operational roles
2. Alfred may need more than the pure messaging baseline to do real code review / CI supervision
3. Jonathon may need more execution authority for security operations
4. Sinistrad may need network-capable non-main access for scraping/email/business ops
5. Vasu and Limbeck need MCP overrides layered on top of their baseline role instead of being treated as a separate role family

---

# Final review process note

Even with this handoff, we will still go through each actual agent **one by one, in tandem**, and confirm:

- whether the role assignment is still right
- whether the chosen baseline profile fits
- whether any small field changes are justified
- whether logging, session memory, sandboxing, or ACP behavior should be tightened further
- whether MCP or security-specific overrides need to be layered on top

That keeps the system grounded in real roles instead of assumptions.
