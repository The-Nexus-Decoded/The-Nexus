# Handoff — 2026-03-06 Zifnab Discord Silence Debug

## Resume With
"Continue from handoff session-2026-03-06-zifnab-fix"

---

## Problem
Zifnab (@Zifnab bot, openclaw-gateway on ola-claw-main) is silent in #coding but works fine in #jarvis.

## Root Cause (Confirmed)
The openclaw wizard ran `onboard` today at 10:06 UTC and regenerated the system prompt for #coding, #the-nexus, #crypto. The new prompt says "ONLY respond if you are @mentioned" but the model can't recognize `<@1475077203044601987>` as a mention without being told explicitly. The #jarvis channel has a different prompt ("respond to all") so it works.

## Fix Ready to Apply (NOT YET APPLIED)

### Fix 1: openclaw.json — system prompt (MAIN FIX)
**File**: `/home/openclaw/.openclaw/openclaw.json`
**Channels to fix**: 
- #coding: `1475083038810443878`
- #the-nexus: `1475082874234343621`  
- #crypto: `1475082964156157972`

Replace `systemPrompt` for each with:
```
You are Zifnab. ONLY respond if ANY of these conditions are met:\n1. The message contains <@1475077203044601987> (that is your @mention)\n2. The word \"zifnab\" appears in the message (case-insensitive)\n3. The word \"zif\" appears as a standalone word (case-insensitive)\nIf NONE of these conditions are met, output NOTHING. Complete silence.
```

Keep `requireMention: false` — needed for text triggers to work.
Leave #jarvis (`1475082997027049584`) unchanged.

### Fix 2: gemini.conf cleanup
**File**: `/home/openclaw/.config/systemd/user/openclaw-gateway.service.d/gemini.conf`
Replace entire file with ONLY:
```
[Service]
Environment="GEMINI_API_KEY=AIzaSyCByvtJUxWRbmQ23TJG266jq0tyq8PsbJc"
```
Then: `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`

## Other Findings
- vLLM is running (`vllm.service` system-level, Qwen3.5-4B-AWQ, port 8000) — user said "thought it was broken", it works
- openclaw-node restarts 265x = normal, caused by gateway cycling not actual crashes
- Discord WebSocket drops every ~30min (codes 1006/1005) — separate issue, ticket #147
- GEMINI_API_KEY is for embeddings only, primary model stays minimax/MiniMax-M2.5
- Bot ID: 1475077203044601987

## Ticket
#147 — https://github.com/The-Nexus-Decoded/The-Nexus/issues/147

## Key Paths
- openclaw config: `/home/openclaw/.openclaw/openclaw.json`
- gemini conf: `/home/openclaw/.config/systemd/user/openclaw-gateway.service.d/gemini.conf`
- gateway logs: `/tmp/openclaw/openclaw-2026-03-06.log`
