# OpenClaw Config Gotchas (CRITICAL)

## JSON Editing Rules
- NEVER rewrite full openclaw.json — ALWAYS use targeted JSON patches (python: json.load -> modify ONE key -> json.dump)
- BEFORE modifying ANY config: `cp file file.bak-$(date +%Y%m%d-%H%M%S)`
- When editing model/provider config, ONLY touch those specific keys, leave Discord channels UNTOUCHED
- VERIFY after every config write: json.load result, check Discord token + channels are intact
- 2026-02-26 incident: full config rewrites dropped #jarvis channel AND swapped Zifnab's Discord bot token with Haplo's

## Invalid Keys/Flags (crash gateway)
- `contextWindow` per-model key DOES NOT EXIST — crashes with "Unrecognized key"
- `--host` is NOT a valid gateway CLI flag — crashes with "unknown option"
- `compaction.model` is NOT a valid field — compaction uses primary model automatically
- `"api": "openai"` is NOT valid for openrouter provider — omit api field
- Compaction mode: only "safeguard" or omit entirely. "auto" is NOT valid. Empty {} crashes.
- `browser.profile` is INVALID — crashes with "Unrecognized key: profile". Correct key is `browser.defaultProfile`
- Use `openclaw config set browser.defaultProfile openclaw` to switch from chrome extension relay to sandboxed browser
- `tools.elevated.defaultLevel` is INVALID — gateway hangs on "activating" and never starts

## Exec Tool Config (CRITICAL — learned 2026-03-01, SOLVED 2026-03-01)
- Default exec host is "sandbox" — agents without sandbox runtime CANNOT run shell commands
- Fix: `tools.exec.host: "gateway"` — runs commands on gateway process directly
- `tools.exec.ask: "off"` — disables approval prompts (no one there to approve for Discord agents)
- `tools.exec.security: "full"` — sets TOOL-level security to full
- BUT: actual security = `minSecurity(tools.exec.security, approvals.agent.security)` (line 8759 reply-Deht_wOB.js)
- Agent-level security defaults to "allowlist" and OVERRIDES tool config even when tool says "full"
- **SOLVED**: set `defaults.security: "full"` in `/data/openclaw/exec-approvals.json` — this is what `approvals.agent.security` reads
- Full fix for coding agents: exec-approvals.json `defaults.security: "full"` + openclaw.json `tools.exec: {host: "gateway", ask: "off", security: "full"}`
- `host: "node"` fails on Zifnab with "requires a node id when multiple nodes are available"

## Workspace Path Enforcement (CRITICAL for agents)
- `edit` and `write` tools ONLY work on paths within `agents.defaults.workspace` (default: `/data/openclaw/workspace/`)
- Enforcement is LEXICAL via `toRelativePathInRoot()` — symlinks do NOT bypass it
- `tools.fs.workspaceOnly: false` does NOT help — underlying host edit/write operations always use workspace root
- Code location: `reply-Deht_wOB.js` lines 64323-64390 (`createHostWriteOperations`, `createHostEditOperations`, `toRelativePathInRoot`)
- `exec` tool (shell commands), `read` tool, and git operations are NOT restricted to workspace
- **Fix for Haplo:** symlinked `/data/repos/Pryan-Fire` → workspace copy. Agents must use workspace path for edits.
- Agents' MEMORY.md should prominently document the correct edit path

## Config Traps
- Discord `streaming` key: MUST be `streaming`, NOT `streamMode`. Renamed = leaks raw `<think>` blocks.
- `models` array is REQUIRED in provider config
- OpenRouter models MUST be in `agents.defaults.models` allowlist too, not just primary/fallbacks
- Zifnab's agent auto-patches config sometimes — can corrupt JSON (double commas, key renames)
- Config path on Haplo: `~/.openclaw` is a SYMLINK to `/data/openclaw` — both paths work
- Config path on Zifnab/Hugh: `/home/openclaw/.openclaw/openclaw.json` (verify symlink status)
- "channels unresolved" on startup: harmless race condition, resolves after Discord cache populates

## Gateway Remote Access (3 config keys ALL required)
- `gateway.bind: "lan"` — listen on 0.0.0.0 (not just 127.0.0.1)
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback: true` — or crashes on origin validation
- `gateway.controlUi.dangerouslyDisableDeviceAuth: true` — or WebSocket rejects
- URL format: `http://<tailscale-ip>:18789/?token=<gateway_token>` — ALWAYS include token!
- Tokens: Zifnab=b82d93b82dd310f7..., Haplo=41f85397ad43dc54..., Hugh=cadcf0f7d18fe1ff...
- See openclaw-server-config.md for full tokens
- AFTER EVERY gateway restart: curl health check + verify Discord "logged in" + test Discord message
