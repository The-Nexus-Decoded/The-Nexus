# Handoff — 2026-03-09 Multi-Agent Fleet Deployment

## Resume With
"Continue from handoff session-2026-03-09-multi-agent-deploy"

---

## What Was Done This Session

### 6 New Agents Deployed Fleet-Wide — Issues #187, #186, #128 (ALL CLOSED)

**Haplo** (ola-claw-dev):
- Marit (QA, port 18811), Paithan (Mobile, port 18820), Orla (UI/UX, port 18830)
- Model: Ollama `qwen3.5-9b-tools` (GGUF with RENDERER/PARSER for tool support)
- Created tool-capable model via Modelfile: `RENDERER qwen3.5` + `PARSER qwen3.5`

**Zifnab** (ola-claw-main):
- Rega (Content, port 18811), Sang-drax (Sales, port 18812)
- Model: vLLM `qwen3.5-9b` (AWQ), `api: openai-completions`
- vLLM bumped: `--max-model-len 16384→32768`, added `--enable-auto-tool-choice --tool-call-parser hermes`

**Hugh** (ola-claw-trade):
- Samah (XR/Games, port 18811)
- Model: Ollama `qwen3.5:4b`

### Config Fixes Applied
- Removed invalid `web.search` top-level key from ALL 6 new agent configs (Zifnab gave bad instructions)
- Added `"api": "openai-completions"` to vllm provider on Rega/Sang-drax
- Added `"reasoning": true` to all qwen3.5 model configs (strips thinking tokens from Discord output)
- Samah: Added game dev roles to SOUL.md, updated all TEAM.md files

### Workspace Restoration
- Accidentally deleted workspace files, restored from `agentstructure/` repo (all 30 files)
- Full backups created: `/tmp/openclaw-full-backup-2026-03-09-{server}.tar.gz` (configs + workspaces + services)

### README & Memory Updated
- README.md: Added full Agent Fleet section (10 agents, ports, channels, workspace structure, LLM backends)
- CLAUDE.md: Added file protection rules (NEVER delete .md files)
- Memory: Created `agent-workspaces.md`, updated MEMORY.md with config gotchas and hard rules

---

## Immediate TODO — Next Session

### P0: Upgrade OpenClaw Fleet
- Current: Haplo/Zifnab on 2026.3.2, Hugh on 2026.3.7
- Latest: **2026.3.8**
- Upgrade all 3 servers: `sudo npm install -g openclaw@latest`
- Restart all 10 agent services after upgrade

### P1: Web Search Setup (#188 — OPEN)
- Zifnab gave wrong config (`web.search` at root → crashes). Needs proper setup.
- Correct location: `tools.web.search` (verify against OpenClaw docs first)
- Apply to all 6 new agents + verify existing 4

### P2: Rotate Tavily API Key (#189 — OPEN)
- Key `BSAsHuPyDtux...` was posted in plaintext in Discord by Zifnab
- Rotate in Tavily dashboard, update configs with new key

### P3: Sang-drax/Rega Context Overflow
- vLLM bumped to 32768 — verify overflow is fixed by testing in Discord
- If still overflowing, check OpenClaw framework prompt size

### P4: Commit & PR
- Branch `feat/ansible-multi-agent-deploy` has uncommitted README changes
- Push and create PR for the Ansible playbooks + README updates

---

## Open Tickets
- #188 — Web search install (botched, needs redo)
- #189 — Tavily API key rotation
- #174 — Strip thinking tags from vLLM (may be fixed by `reasoning: true`)
- #173 — Local Qwen3.5 review + Open WebUI
- #166 — Auto-delete killfeed messages >24h
- #163 — PnL calculation bug
- #154 — Voice message transcription
- #146 — Phase 2 SL/TP Automation
- #145 — Phase 1 Position Monitor
- #131 — SHYFT_API_KEY on Hugh

## Key Lessons Learned
1. `web.search` is NOT a valid top-level OpenClaw config key — crashes gateway
2. vLLM provider MUST have `"api": "openai-completions"` explicitly
3. NEVER delete .md files from workspaces — fix infrastructure instead
4. Always backup workspaces (not just JSON configs) before making changes
5. Ollama GGUF needs `RENDERER` + `PARSER` directives for tool support
