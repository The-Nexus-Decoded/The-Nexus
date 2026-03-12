# Handoff — 2026-03-09 Agent Fleet Testing

## Resume With
"Continue from handoff session-2026-03-09-agent-testing"

---

## What Was Done This Session

### MiniMax Auth Fix (Rega/Sang-drax)
- Copied `auth-profiles.json` from `/home/openclaw/.openclaw/agents/main/agent/` to:
  - `/home/openclaw/.openclaw-rega/agents/main/agent/auth-profiles.json`
  - `/home/openclaw/.openclaw-sangdrax/agents/main/agent/auth-profiles.json`
- Both agents now use MiniMax M2.5 (200K context) as primary — context overflow FIXED

### Comprehensive Agent Fleet Testing
Sent identity, team, operations, security, git-rules, discord-rules, repo-map, and workspace file questions to all 6 new agents across all channels.

---

## Test Results

### FULLY WORKING — MiniMax M2.5 on Zifnab
| Agent | Identity | Team | Ops | Security | Git Rules | Discord Rules | Repo Map | User.md |
|-------|----------|------|-----|----------|-----------|---------------|----------|---------|
| **Rega** | ✅ | ✅ 5/10 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sang-drax** | ✅ | ✅ 9/10 | ✅ | ✅ | — | — | — | — |

- Rega correctly read: OPERATIONS.md, AGENTS.md, GIT-RULES.md, DISCORD-RULES.md, REPO-MAP.md, USER.md, HEARTBEAT.md
- Sang-drax correctly used "NO_REPLY" when question wasn't for him — smart routing
- Cross-chat loop in #growth self-stabilized after ~5 exchanges

### PARTIALLY WORKING — Ollama qwen3.5-9b-tools on Haplo
| Agent | Identity | Team | Ops/Security | Notes |
|-------|----------|------|-------------|-------|
| **Marit** | ✅ BEST | ✅ 10/10 | ❌ timed out | 4 messages unanswered due to Ollama contention |
| **Paithan** | ⚠️ | ⚠️ partial | ❌ | Leaks `<tool_call>` XML, said "no SOUL.md" (files exist) |
| **Orla** | ⚠️ | ⚠️ partial | ❌ timed out | Leaks chain-of-thought, responds to cross-chat over direct questions |

### BROKEN — Ollama qwen3.5:4b on Hugh
| Agent | Identity | Notes |
|-------|----------|-------|
| **Samah** | ❌ | Never answered identity question. Confused output: curl commands, JSON payloads, lobster workflow refs |

---

## 12 Issues Found

### CRITICAL (Fix Tomorrow)

1. **Ollama serialization on Haplo** — 3 agents share 1 Ollama instance. 2-min typing TTL expires before model finishes generating. Marit had 4+ messages unanswered.
   - **Fix options**: (a) Stagger agent channels so only 1 is active at a time, (b) increase typing TTL if configurable, (c) reduce to 2 agents on Haplo, (d) add MiniMax as primary for Haplo agents too

2. **Cross-agent chat loops** — Agents with `requireMention: false` + `allowBots: true` in shared channels trigger infinite conversations:
   - Rega + Sang-drax in #growth (self-stabilized after ~5 exchanges)
   - Paithan + Orla in #design (active)
   - Paithan + Orla + Samah in #games-vr (active VR game discussion)
   - **Fix**: Each agent gets ONE channel with `requireMention: false`. All other channels `requireMention: true`.

3. **Cross-chat starves user questions** — Orla responded to cross-chat in #games-vr but ignored 2 direct questions in #design. The cross-talk messages queue ahead of user messages.

4. **Paithan leaking `<tool_call>` XML** — Raw XML visible in Discord: `<tool_call><function=read>...`
   - `reasoning: true` is set correctly but doesn't strip tool calls
   - May be RENDERER/PARSER issue on Ollama Modelfile, or OpenClaw bug

5. **Chain-of-thought leaking** — Marit and Orla post internal reasoning to Discord:
   - Marit: "This is a formal identity verification request from Alfred..."
   - Orla: "The user wants me to verify what's actually in MEMORY.md..."
   - Orla: "Message delivery failed - likely a channel access issue..."

6. **Samah completely broken** — qwen3.5:4b (16384 context) too small for 15KB TOOLS.md + other workspace files. Posts confused output (Discord API curl commands, JSON payloads).
   - **Fix**: Either trim TOOLS.md for Samah, upgrade to 9B model, or add MiniMax as primary

7. **`qwen2.5-coder:7b` fallback not installed** on Haplo — Causes FailoverError when primary model fails:
   ```
   FailoverError: Ollama API error 404: {"error":"model 'qwen2.5-coder:7b' not found"}
   ```
   - **Fix**: `ollama pull qwen2.5-coder:7b` on Haplo, or remove from fallbacks in all per-agent configs

8. **Paithan completely unresponsive** — Even with sole Ollama access + historyLimit:3, zero log entries, no typing indicator, no response. NOT Ollama contention. Possible causes: startup race condition, broken conversation state, or model-specific issue with Paithan's workspace context. Needs deep investigation.
   - Tested: solo with Orla stopped, lowered historyLimit from 20→3, sent messages to both #design and #games-vr — NOTHING
   - Marit works fine solo with same model/settings — the issue is Paithan-specific

### CONFIG ISSUES

8. **Paithan in wrong channels** — Currently in #design and #games-vr with `requireMention: false`. Needs dedicated #mobile channel (user approved creating it).

9. **Tavily plugin warning** on ALL Haplo agents — "tools.allow allowlist contains unknown entries (tavily)"
   - **Fix**: Remove tavily from tools.allow in per-agent configs, or install tavily plugin

10. **Rega IDENTITY.md confusion** — Rega said IDENTITY.md "is Zifnab's file" — may have wrong/shared IDENTITY.md in workspace

11. **Orla tried reading PROJECTS.md** — File doesn't exist: `ENOENT: no such file or directory, access '/home/openclaw/.openclaw/workspace-orla/PROJECTS.md'`

12. **Samah service unit** still has `OPENCLAW_SERVICE_VERSION=2026.3.7` (upgraded to 2026.3.8)

---

## Channel → Agent Mapping (Current — WITH PROBLEMS)

```
Channel       | Agents (requireMention: false)   | Problem
#growth       | Rega, Sang-drax                  | Cross-chat loop
#qa           | Marit                            | OK (sole occupant)
#design       | Paithan, Orla                    | Cross-chat loop
#games-vr     | Paithan, Orla, Samah             | 3-way cross-chat
#coding       | (all agents, requireMention: true)| OK
#the-nexus    | (all agents, requireMention: true)| OK
```

### Recommended Fix
```
Channel       | Agent (requireMention: false)
#growth       | Rega only (Sang-drax → requireMention: true)
#qa           | Marit (no change)
#design       | Orla only (remove Paithan)
#games-vr     | Samah only (remove Paithan, Orla)
#mobile       | Paithan (NEW channel, user approved)
```

---

## Fixes Already Applied This Session
1. ✅ MiniMax auth-profiles.json copied to Rega + Sang-drax
2. ✅ Sang-drax service started
3. ✅ Rega service restarted with MiniMax working
4. ✅ All config changes from previous session (bootstrap limits, allowBots, historyLimit)
5. ✅ Paithan historyLimit lowered from 20→3 (didn't fix his unresponsiveness)
6. ✅ Orla restored (was temporarily stopped for testing, now running again)

## Still TODO
- [ ] Fix channel overlap (requireMention changes)
- [ ] Create #mobile channel in Discord
- [ ] Install/remove `qwen2.5-coder:7b` on Haplo
- [ ] Fix Samah (model upgrade or workspace trim)
- [ ] Remove tavily from tools.allow on Haplo agents
- [ ] Investigate tool_call XML and chain-of-thought leaking
- [ ] TEAM.md cleanup (#191)
- [ ] Commit README + Ansible changes and create PR (#P4)

## Open Tickets
- #188 — Web search setup
- #189 — Tavily API key rotation
- #191 — TEAM.md cleanup
- #174 — Strip thinking tags from vLLM
- #131 — SHYFT_API_KEY on Hugh
