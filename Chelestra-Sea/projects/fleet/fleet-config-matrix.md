# Fleet Config Decision Matrix

## How to read this

- **⚡ CRITICAL** = directly affects token spend or stability
- **🔵 SET** = currently configured on that agent
- **⬜ UNSET** = not configured (uses OpenClaw default or nothing)
- **TARGET** = fill in what you want for ALL agents (or per-tier if different)

Agents grouped by current tier: **BARE** (primaries), **LIGHT** (secondary ops), **FULL** (secondary dev)

---

## ⚡ CRITICAL — Token Spend & Stability

These settings directly control how many tokens your agents burn.

| Setting | Description | Options | Default | TARGET | haplo | zifnab | hugh | marit | paithan | drugar | ramu | rega | devon | samah | sinistrad | alfred | balthazar | ciang | edmund | iridal | jonathon | limbeck | trian | vasu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **thinkingDefault** | Reasoning depth. Higher=more tokens | off/minimal/low/medium/high/xhigh/adaptive | model decides | ___ | 🔵off | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **reasoningDefault** | Show thinking in Discord? | on/off/stream | off | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **memory.backend** | Memory system | builtin/qmd/honcho | builtin | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵builtin | 🔵builtin | 🔵builtin | 🔵builtin | 🔵builtin | 🔵builtin | 🔵builtin | 🔵builtin | 🔵builtin |
| **memorySearch.provider** | Embedding API (builtin only) | gemini/openai/ollama/local | auto | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵gemini | 🔵gemini | 🔵gemini | 🔵gemini | 🔵gemini | 🔵gemini | 🔵gemini | 🔵gemini | 🔵gemini |
| **sessionMemory** | Index sessions into DB (GB DBs!) | true/false | false | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true |
| **compaction.mode** | Session compression | default/safeguard | default | ___ | ⬜ | ⬜ | ⬜ | 🔵safe | 🔵safe | 🔵safe | 🔵safe | 🔵safe | 🔵safe | 🔵safe | 🔵safe | 🔵default | 🔵default | 🔵default | 🔵default | 🔵default | 🔵default | 🔵default | 🔵default | 🔵default |
| **memoryFlush.enabled** | Auto-save before compaction | true/false | true | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true | 🔵true |
| **streaming** | Stream to Discord | on/off | off | ___ | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off | 🔵off |
| **historyLimit** | Discord msgs loaded for context | number | 25 | ___ | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 | 🔵25 |

---

## QMD Settings (if backend = qmd)

| Setting | Description | Options | Default | TARGET |
|---|---|---|---|---|
| qmd.searchMode | Search type | search/vsearch/query | search | ___ |
| qmd.includeDefaultMemory | Auto-index MEMORY.md + memory/*.md | true/false | true | ___ |
| qmd.sessions.enabled | Index session transcripts | true/false | false | ___ |
| qmd.sessions.retentionDays | Keep sessions for N days | number | - | ___ |
| qmd.update.interval | Re-index interval | time | 5m | ___ |
| qmd.update.debounceMs | Debounce changes | ms | 15000 | ___ |
| qmd.update.onBoot | Re-index on start | true/false | true | ___ |
| qmd.update.waitForBootSync | Block startup until indexed | true/false | false | ___ |
| qmd.limits.maxResults | Max search results | number | 6 | ___ |
| qmd.limits.timeoutMs | Search timeout | ms | 4000 | ___ |
| memory.citations | Source footer | auto/on/off | auto | ___ |

---

## Memory Search Tuning (if keeping builtin on any agents)

| Setting | Description | Default | TARGET | 9 FULL currently |
|---|---|---|---|---|
| query.hybrid.enabled | Vector + keyword | true | ___ | 🔵true |
| query.hybrid.vectorWeight | Vector weight | 0.7 | ___ | 🔵0.7 |
| query.hybrid.textWeight | Keyword weight | 0.3 | ___ | 🔵0.3 |
| query.hybrid.candidateMultiplier | Candidate pool | 4 | ___ | ⬜ |
| query.hybrid.mmr.enabled | Result diversity | false | ___ | 🔵true |
| query.hybrid.mmr.lambda | 0=diverse 1=relevant | 0.7 | ___ | 🔵0.7 |
| query.hybrid.temporalDecay.enabled | Prefer recent | false | ___ | 🔵true |
| query.hybrid.temporalDecay.halfLifeDays | Half-life | 30 | ___ | 🔵30 |
| cache.enabled | Cache embeddings | false | ___ | ⬜ |
| multimodal.enabled | Index images/audio | false | ___ | ⬜ |
| extraPaths | Additional dirs to index | [] | ___ | ⬜ |

---

## Compaction & Context

| Setting | Description | Options | Default | TARGET | haplo | zifnab | hugh | LIGHT(8) | FULL(9) |
|---|---|---|---|---|---|---|---|---|---|
| compaction.reserveTokensFloor | Min tokens after compaction | number | 24000 | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵20000 |
| compaction.identifierPolicy | Preserve IDs | strict/off/custom | strict | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| compaction.model | Cheaper model for compaction | model ID | primary | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| memoryFlush.softThresholdTokens | Token trigger for flush | number | 6000 | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵40000 |
| memoryFlush.prompt | What to save | string | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵custom |
| contextPruning.mode | Drop old context | cache-ttl | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵cache-ttl |
| contextPruning.ttl | Context lifetime | time | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵6h |
| contextPruning.keepLastAssistants | Keep N recent | number | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵3 |

---

## Agent Capabilities

| Setting | Description | Options | Default | TARGET | haplo | zifnab | hugh | LIGHT(8) | FULL(9) |
|---|---|---|---|---|---|---|---|---|---|
| acp.enabled | Codex/Claude/Gemini backends | true/false | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵true |
| acp.allowedAgents | Which backends | string[] | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵[pi,claude,codex,opencode,gemini] |
| acp.maxConcurrentSessions | Max ACP sessions | number | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵8 |
| subagents.maxConcurrent | Parallel subagents | number | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵8 |
| subagents.maxSpawnDepth | Nesting depth | number | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵2 |
| subagents.maxChildrenPerAgent | Children per parent | number | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵5 |
| subagents.model | Cheaper subagent model | model ID | primary | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| browser.enabled | Headless Chrome | true/false | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵true |
| tools.exec.security | Exec security | full/ask/off | - | ___ | 🔵full | 🔵full | 🔵full | ⬜ | ⬜ |
| tools.profile | Tool access | full/coding/minimal | - | ___ | ⬜ | ⬜ | ⬜ | 🔵full | 🔵full |
| tools.elevated.enabled | Elevated access | true/false | - | ___ | ⬜ | ⬜ | ⬜ | 🔵true | 🔵true |
| tools.agentToAgent.enabled | Cross-agent comms | true/false | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵true |
| sandbox.mode | Sandbox | off/non-main/all | - | ___ | ⬜ | ⬜ | ⬜ | 🔵off | 🔵off |

---

## Discord & Networking

| Setting | Description | Default | TARGET | haplo | zifnab | hugh | LIGHT(8) | FULL(9) |
|---|---|---|---|---|---|---|---|---|
| textChunkLimit | Max chars/msg | 2000 | ___ | 🔵2000 | ⬜ | 🔵2000 | 🔵2000 | 🔵(missing ciang,trian) |
| retry.attempts | Retry failed | - | ___ | 🔵1 | ⬜ | ⬜ | ⬜ | 🔵1(missing alf,jon,lim) |
| retry.minDelayMs | Min delay | 1000 | ___ | 🔵1000 | ⬜ | ⬜ | ⬜ | 🔵1000(missing 3) |
| retry.maxDelayMs | Max delay | 60000 | ___ | 🔵60000 | ⬜ | ⬜ | ⬜ | 🔵60000(missing 3) |
| threadBindings.spawnAcpSessions | ACP in threads | - | ___ | 🔵true | ⬜ | ⬜ | ⬜ | 🔵true(missing 3) |
| allowBots | Accept bot msgs | - | ___ | 🔵true | 🔵true | 🔵true | 🔵true | 🔵(missing ciang,trian) |
| gateway.bind | Network bind | - | ___ | ⬜ | ⬜ | ⬜ | 🔵loopback | 🔵loopback |
| gateway.port | Agent port | - | ___ | ⬜ | ⬜ | ⬜ | 🔵set | 🔵set |
| logging.level | Log verbosity | - | ___ | ⬜ | ⬜ | ⬜ | 🔵info | 🔵info |
| logging.file | Per-agent log | - | ___ | ⬜ | ⬜ | ⬜ | 🔵set | 🔵set |

---

## Bootstrap & Other

| Setting | Description | Default | TARGET | haplo | zifnab | hugh | LIGHT(8) | FULL(9) |
|---|---|---|---|---|---|---|---|---|
| bootstrapMaxChars | Max bootstrap file chars | - | ___ | ⬜ | ⬜ | ⬜ | 🔵30000 | ⬜ |
| bootstrapTotalMaxChars | Total bootstrap limit | - | ___ | ⬜ | ⬜ | ⬜ | 🔵180000 | ⬜ |
| cron.enabled | Agent cron jobs | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵false |
| mentionPatterns | Name triggers | - | ___ | ⬜ | ⬜ | ⬜ | 🔵(some) | 🔵(some) |
| env.GEMINI_API_KEY | In-config key | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵set |
| env.MINIMAX_API_KEY | In-config key | - | ___ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵set |
| plugins.allow | Enabled plugins | - | ___ | ⬜ | ⬜ | ⬜ | 🔵[acpx,discord] | 🔵[acpx,discord] |

---

## QMD Deployment Requirements

| Server | QMD binary | Bun | Symlink | Model | Status |
|---|---|---|---|---|---|
| Haplo (dev) | ~/.bun/bin/qmd | installed (not on PATH) | NEEDED: /usr/local/bin/qmd | ✅ cached (340MB) | PARTIAL |
| Zifnab (main) | NOT INSTALLED | unknown | NEEDED | NOT CACHED | NEEDS FULL INSTALL |
| Hugh (trade) | NOT INSTALLED | unknown | NEEDED | NOT CACHED | NEEDS FULL INSTALL |

Install per server: `bun install -g @tobilu/qmd && ln -sf ~/.bun/bin/qmd /usr/local/bin/qmd && qmd query 'test'`

---

## Agent-Specific Overrides

| Agent | Setting | Current Value | Reason |
|---|---|---|---|
| vasu | codex-cli args | danger-full-access | MCP network for Unity |
| limbeck | codex-cli args | danger-full-access | MCP network for Roblox |
| sinistrad | browser.profiles | CDP attach 127.0.0.1:9222 | Specific browser setup |
| haplo | thinkingDefault | off | Was set to stop token waste |
I WAMNT 