# OpenClaw Agent Settings Resolution & Final Handoff (v3)

## Purpose

This document is the cleaned-up final handoff for the current OpenClaw settings design. It is intended to be usable by the Claude admin without guesswork.

This version explicitly includes:

- the agreed agent-to-profile mapping
- all 7 profile types
- full explicit config blocks for every profile type
- the rule that all matrix fields must be surfaced explicitly
- explicit row 56 (`logging.level`) handling
- per-agent logging overrides where agents share a profile type but require different audit intensity
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

### Full config

```yaml
thinkingDefault: medium
sandbox.mode: off
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

tools.exec.security: full
tools.profile: full
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

### Full config

```yaml
thinkingDefault: adaptive
sandbox.mode: off
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

tools.exec.security: full
tools.profile: full
tools.alsoAllow:
  - lobster
tools.web.search.apiKey: set
tools.sessions.visibility: agent
tools.agentToAgent.enabled: true
tools.elevated.enabled: true

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

### Full config

```yaml
thinkingDefault: medium
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

# What was previously missed

The main implementation miss was:
- row 56 `logging.level` was discussed conceptually but not fully translated into the actual configs and agent overrides

The other miss was a deliverable problem:
- the final full corrected config blocks were not re-issued after the agent mapping was updated and after Capital-Risk Operator was added

This v3 corrects both.

---

# Final review process note

Even with this handoff, we will still go through each actual agent **one by one, in tandem**, and confirm:

- whether the role assignment is still right
- whether the chosen baseline profile fits
- whether any small field changes are justified
- whether logging, session memory, or ACP behavior should be tightened further

That keeps the system grounded in real roles instead of assumptions.
