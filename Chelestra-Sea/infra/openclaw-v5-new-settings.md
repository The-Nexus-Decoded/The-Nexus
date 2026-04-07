# New Settings to Add to Each v4 Profile Template

Settings below are NEW in v2026.4.5 or were previously unused. Add these to each agent's v5 profile on top of the existing v4 settings.

Organized by priority: must-have, recommended, optional.

---

## MUST-HAVE (add to every agent)

### Context/Token Optimization
```json
"agents.defaults.contextInjection": "continuation-skip"
```
Skips re-injecting workspace bootstrap files on safe continuation turns. Saves tokens every turn.

### Compaction Model
```json
"agents.defaults.compaction.model": "google/gemini-2.5-flash"
```
Use a cheaper model for compaction summaries instead of burning primary model tokens. Was INVALID before v2026.4.5, now supported.

### Compaction Silent
```json
"agents.defaults.compaction.notifyUser": false
```
No "compacting context..." messages in Discord.

### Compaction Cleanup
```json
"agents.defaults.compaction.truncateAfterCompaction": true
```
Truncates JSONL after compaction. Saves disk.

### Compaction Memory Sync
```json
"agents.defaults.compaction.postIndexSync": "async"
```
Reindexes memory after compaction without blocking.

### Disable Bonjour (FIXES GATEWAY SPAM)
```json
"discovery.mdns.mode": "off"
```
Stops the bonjour probing war between gateways on the same server. We don't use mDNS discovery.

### Group Policy Open
```json
"channels.discord.groupPolicy": "open"
```
Already applied during upgrade. requireMention handles access control.

---

## RECOMMENDED (add to all agents for better performance)

### Memory Search — Diversity Ranking
```json
"agents.defaults.memorySearch.query.hybrid.mmr.enabled": true,
"agents.defaults.memorySearch.query.hybrid.mmr.lambda": 0.75
```
Prevents returning 5 search results that all say the same thing. lambda 0.75 = 75% relevance, 25% diversity.

### Memory Search — Recency Boost
```json
"agents.defaults.memorySearch.query.hybrid.temporalDecay.enabled": true,
"agents.defaults.memorySearch.query.hybrid.temporalDecay.halfLifeDays": 30
```
Recent memories score higher. 30-day half-life means month-old memories get 50% weight.

### Heartbeat Isolated Session
```json
"agents.defaults.heartbeat.isolatedSession": true
```
Heartbeat runs in its own session. Doesn't pollute main conversation session with heartbeat context.

### Loop Detection
```json
"tools.loopDetection.enabled": true,
"tools.loopDetection.warningThreshold": 10,
"tools.loopDetection.criticalThreshold": 20,
"tools.loopDetection.globalCircuitBreakerThreshold": 30
```
Detects when agents are stuck repeating the same tool calls. Warns at 10, blocks at 20, circuit breaks at 30.

### Agent-to-Agent Ping-Pong Limit
```json
"session.agentToAgent.maxPingPongTurns": 5
```
Prevents infinite agent-to-agent message loops. Max 5 back-and-forth before stopping.

### Discord Context Visibility
```json
"channels.discord.contextVisibility": "all"
```
Controls supplemental context from quotes, threads, and fetched history. "all" = full context.

### Discord Auto-Presence
```json
"channels.discord.autoPresence.enabled": true,
"channels.discord.autoPresence.healthyText": "Online",
"channels.discord.autoPresence.degradedText": "Degraded",
"channels.discord.autoPresence.exhaustedText": "Credits exhausted"
```
Bot status auto-updates based on health. You can see at a glance which agents are healthy.

### Discord Interactive Components
```json
"channels.discord.agentComponents.enabled": true
```
Enables Discord buttons and interactive components in agent messages.

### Bootstrap Truncation Warning
```json
"agents.defaults.bootstrapPromptTruncationWarning": "once"
```
Warns once if bootstrap files are truncated. Not every turn.

---

## MINIMAX MEDIA ($50/month Max Plan — all included)

### MiniMax Video Generation
```json
"agents.defaults.videoGenerationModel": {
  "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
  "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
}
```
Available models (from extensions/minimax/video-generation-provider.ts):
- `MiniMax-Hailuo-2.3-Fast` — fast mode, 768P (2/day on your plan)
- `MiniMax-Hailuo-2.3` — standard quality, 768P (2/day on your plan)
- `MiniMax-Hailuo-02` — older model
- `I2V-01-Director` — image-to-video, director mode
- `I2V-01-live` — image-to-video, live mode
- `I2V-01` — image-to-video, standard

All support:
- Durations: 6s, 10s
- Custom resolution (supportsResolution: true)
- Image-to-video: pass a reference first_frame_image
- Base URL: `https://api.minimax.io/v1/video_generation`
- Async: polls every 10s, max 90 attempts (15 min timeout)
- Daily limit: 2 fast + 2 standard = 4 videos/day total

### MiniMax Music Generation
```json
"agents.defaults.musicGenerationModel": {
  "primary": "minimax/music-2.5+",
  "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
}
```
- API model ID: `music-2.5+` (source: extensions/minimax/music-generation-provider.ts)
- Fallbacks: `music-2.5` (previous gen), `music-2.0` (oldest)
- Base URL: `https://api.minimax.io`
- Async: returns task_id, poll for completion
- Daily limit: 4 tracks/day

### MiniMax Image Generation
```json
"agents.defaults.imageGenerationModel": {
  "primary": "minimax/image-01"
}
```
- API model ID: `image-01` (source: extensions/minimax/image-generation-provider.ts)
- Base URL: `https://api.minimax.io`
- Supported aspect ratios: 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9
- Supports image-to-image editing (pass reference image)
- Output: PNG base64
- Daily limit: 120 images/day

### MiniMax Text-to-Speech
```json
"talk.provider": "minimax",
"talk.providers.minimax.apiKey": "${MINIMAX_API_KEY}",
"talk.providers.minimax.model": "speech-2.8-hd"
```
- TTS model ID: `speech-2.8-hd` (from Zifnab/OpenClaw docs)
- API endpoint: `https://api.minimax.io/v1/t2a_v2`
- Config: voiceId (pick a voice), speed, volume, pitch
- Daily limit: 11,000 TTS HD calls/day
- Enables voice conversations in Discord voice channels

### MiniMax Web Search
```json
"tools.web.search.provider": "minimax"
```
- Built-in MiniMax search provider (included in Max plan)
- Alternative to Brave search

### MiniMax Image Understanding
Already configured — MiniMax-M2.7 supports image input natively. Agents can see and analyze images when using M2.7.

### All MiniMax API Auth
All MiniMax media APIs use the same MINIMAX_API_KEY. Set it once in env:
```json
"env": {
  "MINIMAX_API_KEY": "sk-cp-..."
}
```
All providers (text, image, video, music, TTS, search) resolve from this key automatically.

### MiniMax Models Summary (add to providers section if not auto-discovered)
```json
"models.providers.minimax": {
  "baseUrl": "https://api.minimax.io/anthropic",
  "apiKey": "${MINIMAX_API_KEY}",
  "api": "anthropic-messages",
  "authHeader": true,
  "models": [
    {"id": "MiniMax-M2.7", "name": "MiniMax M2.7", "reasoning": true, "input": ["text", "image"], "contextWindow": 204800, "maxTokens": 131072, "cost": {"input": 0.3, "output": 1.2, "cacheRead": 0.06, "cacheWrite": 0.375}},
    {"id": "MiniMax-M2.7-highspeed", "name": "MiniMax M2.7 Highspeed", "reasoning": true, "input": ["text", "image"], "contextWindow": 204800, "maxTokens": 131072, "cost": {"input": 0.6, "output": 2.4, "cacheRead": 0.06, "cacheWrite": 0.375}}
  ]
}
```
Note: Video (MiniMax-Hailuo-2.3), Music (music-2.5+), Image (image-01), and TTS are separate API endpoints on the same base URL. They are registered as media providers by the bundled MiniMax plugin, not as chat models.

---

## VOICE MODE (per-agent voice conversations)

### Enable Voice
```json
"channels.discord.voice.enabled": true,
"channels.discord.voice.daveEncryption": true
```
Master switch for voice conversations in Discord.

### Auto-Join Voice Channel
```json
"channels.discord.voice.autoJoin": [
  {"guildId": "1475082873777426494", "channelId": "<voice-channel-id>"}
]
```
Agent auto-joins a specific voice channel on startup.

### Talk Mode Settings
```json
"talk.provider": "minimax",
"talk.providers.minimax.apiKey": "${MINIMAX_API_KEY}",
"talk.interruptOnSpeech": true,
"talk.silenceTimeoutMs": 1500
```
Which TTS provider, interrupt on speech, how long to wait after silence.

---

## BROWSER (already enabled on dev, configure for more agents)

### Enable Browser Tool
```json
"browser.enabled": true,
"browser.executablePath": "/usr/bin/chromium-browser",
"browser.headless": true,
"browser.noSandbox": true,
"browser.defaultProfile": "openclaw",
"browser.evaluateEnabled": true,
"browser.ssrfPolicy.dangerouslyAllowPrivateNetwork": true
```
Agents can browse websites, take screenshots, fill forms. Good for: Sinistrad (intel), Rega (marketing research), Haplo (docs lookup).

---

## DREAMING (experimental memory consolidation)

### Memory Dreaming Setup
```json
"agents.defaults.compaction.memoryFlush.enabled": true,
"agents.defaults.compaction.memoryFlush.softThresholdTokens": 40000,
"agents.defaults.compaction.memoryFlush.prompt": "Save durable knowledge: decisions, tradeoffs, rejected options, integration assumptions.",
"agents.defaults.compaction.memoryFlush.systemPrompt": "You are performing a pre-compaction memory flush. Save concise knowledge only."
```
Before compaction, agent saves important context to memory. This is the "dreaming" mechanism — consolidating short-term into long-term.

---

## OPTIONAL (per-agent or situational)

### Per-Agent Skills
```json
"agents.defaults.skills": ["*"]
```
or per agent:
```json
"agents.list[].skills": ["specific-skill-1", "specific-skill-2"]
```

### Subagent Nesting
```json
"agents.defaults.subagents.maxSpawnDepth": 2,
"agents.defaults.subagents.maxChildrenPerAgent": 3
```
Already in Haplo's config. Allow 2 levels of nesting, max 3 children.

### Session Disk Budget
```json
"session.maintenance.maxDiskBytes": "500mb"
```
Prevents runaway session storage per agent.

### Thread Bindings
```json
"channels.discord.threadBindings.enabled": true,
"channels.discord.threadBindings.idleHours": 24,
"channels.discord.threadBindings.spawnAcpSessions": true
```
Discord threads get their own sessions. Already on for Haplo.

### Plan Tool (experimental)
```json
"tools.experimental.planTool": true
```
Enables update_plan tool for agents to maintain and update plans.

### Provider Request Transport (replaces rate-guard)
```json
"models.providers.<id>.request.proxy.mode": "explicit-proxy",
"models.providers.<id>.request.proxy.url": "http://localhost:8787"
```
Legitimate proxy config per provider. Could replace vendor patches if you ever need a proxy again.

---

## DAILY LIMITS REFERENCE (MiniMax Free Tier)

| API | Daily Limit | Reset |
|---|---|---|
| Text Generation | 15,000 per 5hr window | Every 5 hours |
| Text-to-Speech HD | 11,000/day | Midnight UTC |
| Hailuo Video Fast (768P 6s) | 2/day | Midnight UTC |
| Hailuo Video Standard (768P 6s) | 2/day | Midnight UTC |
| Music 2.5 | 4/day | Midnight UTC |
| Image-01 | 120/day | Midnight UTC |
