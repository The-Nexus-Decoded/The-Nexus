# OpenClaw Decisions & Lessons Learned

## Post-Merge Testing Rule (2026-03-03)
- After any feature branch merge that touches Hugh's trading code, Hugh runs a micro-trade test (0.001 SOL) and reports results in #trading
- This is automatic — don't wait for owner to ask
- Add to Hugh's SOUL.md next session

## PR Merge Policy (2026-03-03)
- **Small PRs** (cleanup, bug fixes, minor tweaks): Lord Xar (CLI) can merge directly without owner approval
- **Feature PRs** (new functionality, significant changes): require owner review before merge
- Agents can merge small PRs when directed. Owner reviews big ones.

## Standing Authorization: Infra Enforcement (2026-03-02)
- **Owner directive:** If agents make infrastructure changes (systemd, directories under /data/, symlinks, tmux/nohup processes, service restarts), INTERVENE IMMEDIATELY and fix it. Do NOT wait for owner.
- **Context:** Hugh rewrote systemd service file + start script after being told to stand down, crashed the service. Zifnab also edited service files.
- **Hugh SOUL.md updated:** "Anything on your own server" replaced with explicit infra restrictions. Gateway restarted to load.
- **Rule:** Infrastructure = owner-via-CLI only. Agents can write code, not touch deployment.

## Lobster Adoption Fix — 3-layer approach (2026-03-01)
- **Root cause:** OpenClaw system prompt says "TOOLS.md does not control tool availability; it is user guidance" — agents treated lobster instructions as suggestions
- **Also:** Lobster tool description was vague ("typed JSON envelope + resumable approvals") — model couldn't match tasks to it
- **Also:** Lobster is a plugin tool, exec is core — model defaults to core tools
- **Fix 1 (highest impact):** Added `systemPrompt` to all Discord channel configs in openclaw.json — mandatory lobster instructions injected at highest authority
- **Fix 2:** Added "Tool Selection Protocol (MANDATORY)" section to SOUL.md on all 3 servers — treated as persona rules not guidance
- **Fix 3:** Patched lobster tool description in lobster-tool.ts to say WHEN to use it ("INSTEAD of exec for restarts, PR scans...")
- **Files patched:** openclaw.json (Zifnab+Haplo), SOUL.md (all 3), lobster-tool.ts + openclaw.plugin.json (Zifnab+Haplo)
- **NOTE:** Tool description patches overwritten by OpenClaw updates. Add to reapply script.
- **Key files:** reply-Deht_wOB.js:30327 (TOOLS.md disclaimer), agent-scope-CUpt2978.js (bootstrap file loading), reply-Deht_wOB.js:26013 (channel systemPrompt injection)

## gh wrapper for GitHub App token (2026-03-01)
- **Problem:** Agent exec tool doesn't spawn login shell → .bashrc not sourced → get-token.sh never runs → gh falls back to PAT without issue write perms
- **Fix:** Moved `/usr/bin/gh` to `/usr/bin/gh-real`, created wrapper at `/usr/bin/gh` that sources get-token.sh before calling gh-real
- **Also fixed:** get-token.sh had `exit 0 2>/dev/null || return 0` on cached path — exit kills the caller when sourced. Changed to `return 0 2>/dev/null || exit 0`
- **Deployed:** Zifnab only (Haplo/Hugh don't have GitHub App yet)
- **Chelestra-Sea #40:** Stays open until Haplo+Hugh have apps

## Agent auto-resume on restart (2026-03-01)
- **Problem:** Agents sit idle after gateway restart — no startup trigger in OpenClaw
- **Fix 1:** Added "On Startup / Session Reset (MANDATORY)" section to SOUL.md on all 3 servers — read ACTIVE-TASKS.md, read MEMORY.md, resume work
- **Fix 2:** Added OpenClaw crons: `orchestrator-pulse` (Zifnab, every 2h) and `work-resume-pulse` (Haplo, every 2h) to periodically prod agents

## Spam Loop Root Cause (2026-03-01)
- **NOT 429s leaking through proxy** — proxy handled 503/429 correctly
- **Actual cause:** Gateway history context injection (reply-Deht_wOB.js:22898). On restart, fetches messages "since last reply", sees bot's own spam, re-responds → loop
- **Fix procedure:** 1) Truncate session .jsonl 2) Set sessions.json updatedAt to NOW 3) Delete bot spam from Discord 4) THEN restart
- **Permanent fix TODO:** Patch history context to exclude bot's own messages
- **Key insight:** Restarting gateway is the trigger. Avoid unnecessary restarts.

## Discord Channel ID Resolution Bug (FIXED — 2026-02-28)
- **Bug:** `parseDiscordChannelInput` treats `guildId/channelId` as guildId + channel NAME (not ID)
- Resolution filter only compared `channel.name`, never `channel.id` — so numeric IDs never matched
- All 3 servers affected — "channels unresolved" on every restart, agents couldn't send by channel ID
- **Fix:** Patched 5 dist files per server to add `channel.id === channelQuery ||` before the name check
- Files: `reply-*.js`, `pi-embedded-*.js` (x2), `subagent-registry-*.js`, `plugin-sdk/reply-*.js`
- **Reapply:** Added to `/data/openclaw/rate-guard-v2/reapply-rate-guard-patches.sh` on Zifnab
- After OpenClaw updates: run reapply script on ALL 3 servers, then restart gateways
- Hugh and Haplo have patch script at `/tmp/patch-discord-channels.py` (not persistent — use Zifnab's reapply script)

## Anti-Loop Debounce Config (INVALID — 2026-02-28)
- `channels.discord.inbound` and `session.agentToAgent` are **NOT valid keys** in OpenClaw v2026.2.26
- Adding them crashes the gateway: `Unrecognized key: "inbound"`
- Chelestra-Sea#25 proposed these keys but they don't exist in this version
- **DO NOT add these keys.** Anti-loop protection needs a different approach (e.g. OpenClaw plugin or custom middleware)
- GitHub issue: Chelestra-Sea#25

## Lobster CLI Install (DONE — 2026-02-28)
- Lobster CLI v2026.1.21-1 installed on ALL 3 servers at `/usr/bin/lobster`
- GitHub issue Chelestra-Sea#24 closed with full resolution comment
- **Install method that works (npm pack tarball):**
  ```bash
  cd /tmp && git clone https://github.com/openclaw/lobster.git lobster-install
  cd lobster-install && npm install && npx tsc -p tsconfig.json
  npm pack --ignore-scripts
  sudo npm install -g --ignore-scripts clawdbot-lobster-*.tgz
  cd /tmp && rm -rf lobster-install
  ```
- **DO NOT USE:** `npm install -g github:openclaw/lobster` — creates dangling symlink to temp cache dir
- **DO NOT USE:** `sudo npm install -g .` from cloned dir — ALSO creates dangling symlink (learned 2026-02-28, lobster disappeared after OpenClaw update)
- **Root cause of repeated breakage:** `npm install -g .` symlinks to source dir. When source is deleted OR when `npm update -g openclaw` runs, the symlink breaks. The `npm pack` method copies actual files, so it survives updates.

## BAD IDEAS — NEVER DO AGAIN

### Using symlinks for global npm installs (2026-02-28)
- **What:** `npm install -g .` and `npm install -g github:user/repo` both create symlinks instead of copying files.
- **Why it's bad:** The symlink points to a temp dir (npm cache or cloned repo). When the source is deleted, or when `npm update -g` runs on another package, the symlink breaks silently. Binary disappears from PATH with no error until something tries to spawn it.
- **Impact:** Lobster CLI disappeared from all 3 servers TWICE — once from the initial install method, once after the OpenClaw v2026.2.26 update.
- **Rule:** NEVER use `npm install -g .` or `npm install -g github:...` for any CLI tool. Always use `npm pack --ignore-scripts` to create a `.tgz` tarball, then `npm install -g --ignore-scripts <tarball>`. This copies actual files.
- **Audit (2026-02-28):** Scanned all 3 servers for dangling symlinks in `/usr/lib/node_modules` — all clean after fix.

### Memory-checkpoint cron job (2026-02-27)
- **What:** OpenClaw cron job that ran every 4h in isolated mode to "checkpoint" agent memory
- **Why it was bad:** Isolated mode = fresh session with NO context. Agent rewrites MEMORY.md from scratch on a cheap model. Result: truncated files, wrong identity, lost content.
- **Impact:** Zifnab's MEMORY.md was corrupted repeatedly. Lost critical operational data, identity confusion (called himself Haplo), truncated from 171 lines to garbage.
- **Rule:** NEVER give an agent a cron job that rewrites its own memory/config files in isolated mode. Agents need full context to update their own state correctly.

### Deleting cron jobs without asking (2026-02-27)
- **What:** Deleted fleet_status_monitor.sh and retrieve_windows_logs.sh crons assuming they were "rogue"
- **Why it was bad:** Both were serving real purposes. retrieve_windows_logs.sh was the owner's data sync status feed.
- **Rule:** NEVER delete operational scripts/crons without asking the user first, even if they reference old/deleted services. Ask, don't assume.

### Deleting Discord session keys to "clean slate" (2026-02-27)
- **What:** Deleted Discord session keys from sessions.json to give agents a fresh start after spam loops
- **Why it was bad:** The session key tracks which Discord messages the bot has already seen (`updatedAt` timestamp). Without the key, the bot has no record and reprocesses ALL recent channel messages as new — including old stale orders, causing agents to execute tasks nobody asked for.
- **Impact:** Agents repeatedly replayed stale orders (Nexus-Vaults repo creation, cron job setup, heartbeat monitor) every time gateways restarted. Required 3 stop/fix/restart cycles to diagnose.
- **Correct approach:** Keep the session KEY (so bot knows what it's already seen) but TRUNCATE the session .jsonl FILE (so conversation history is empty). Set `updatedAt` to current time.
- **Rule:** NEVER delete Discord session keys from sessions.json. To reset an agent's conversation, truncate the .jsonl session file instead.

### flash-lite in rate guard chain causes thought_signature errors (2026-02-28)
- **What:** gemini-2.5-flash-lite was in the priority chain (position 3, before pro models). When top models got 429'd, requests routed to flash-lite.
- **Why it was bad:** flash-lite doesn't support thinking mode. When OpenClaw sends requests with thinkingConfig (for tool use with thought_signatures), flash-lite can't handle them. Google API returns 400: "Function call is missing a thought_signature". Proxy strips thinkingConfig from REQUEST but can't fix the RESPONSE expectation mismatch.
- **Impact:** Garbled duplicate messages, agent identity confusion (Zifnab responding as Haplo), spam. Agents became unusable on Zifnab+Haplo.
- **Fix:** Removed flash-lite from priority chain entirely. If needed later, run as separate service.
- **Rule:** Never put non-thinking models in the same priority chain as thinking models when the framework expects thought_signatures.

### Proxy 429 passthrough caused gateway FailoverError (FIXED — 2026-02-28)
- **What:** Gateway entered "API rate limit reached" FailoverError loop, agents stopped responding
- **Root cause:** Proxy returned 429 to gateway while cycling overflow keys. Gateway auth-profile cooldown saw the 429 and gave up on ALL profiles before proxy could retry with next model.
- **Also:** Stale `openclaw-agent` CLI processes held `.jsonl.lock` session files, blocking gateway from processing Discord messages even after restart.
- **Fix:** Added retry-on-429/503 loop in proxy.js (max 5 retries). On 429/503, marks cooldown, drains response, calls routeModel() again, retries. Gateway never sees 429 unless entire fleet is down.
- **Session lock fix:** `kill <stale-agent-pid>` + `rm /data/openclaw/agents/main/sessions/*.lock` + restart gateway
- **Chelestra-Sea#27** — comment couldn't be posted (PAT lacks issue comment perms), details are in this file
- **Review TODO:** 2026-03-07 — check for budget tracking skew from recordRequest() placement

### exhaustedUntil stuck — counters.json edit requires stop/start not restart (2026-02-28)
- **What:** Models marked as 429-exhausted with timestamps 11 hours in the future. Clearing counters.json and restarting didn't help.
- **Why:** `systemctl restart` sends SIGTERM → graceful shutdown handler calls `saveState()` → overwrites the file with old in-memory values → new process loads the old values.
- **Fix:** Must STOP first, then edit counters.json, then START. Never restart when editing counters.
- **Also:** The exhaustedUntil values themselves were suspicious (all set to exactly Feb 28 14:00 UTC, not Date.now()+5min). Possible bug in how exhaustedUntil is calculated or persisted — needs investigation.

### Gateway rate limit loop on startup — crons + delivery-recovery (2026-02-28)
- **What:** Gateway logs "API rate limit reached" within 1 second of startup, enters retry loop. Rate guard proxy gets ZERO requests.
- **Root cause:** Crons (health-check, memory-guard) fire IMMEDIATELY on gateway start. If Google API has a transient 429, the cron fails, gateway enters FailoverError loop. On Haplo, a stale delivery-recovery (152KB pending message) also contributed.
- **Why hard to debug:** Gateway's internal auth-profile cooldown system short-circuits before reaching the rate guard proxy. The "rate limit" message is from the gateway's own detection, not the proxy.
- **Fix:** (1) Stop gateway, (2) clear rate-guard counters.json exhaustedUntil values, (3) move stale deliveries from `/data/openclaw/delivery-queue/` to `failed/`, (4) start gateway. If still failing, temporarily disable crons in `/data/openclaw/cron/jobs.json`, start, verify API works, then re-enable.
- **Cron location:** Crons are stored in `/data/openclaw/cron/jobs.json`, NOT in openclaw.json.
- **Delivery queue:** Pending deliveries at `/data/openclaw/delivery-queue/` — gateway retries these on startup.

### Rate guard proxy bypass — FIXED (2026-02-28)
- **What:** Gateway was sending requests directly to Google, bypassing rate guard proxy at localhost:8787.
- **Root cause (TWO issues):**
  1. Vendor files had hardcoded `https://generativelanguage.googleapis.com` URLs in 21+ files across `@mariozechner/pi-ai`, `@google/genai`, and OpenClaw dist files.
  2. `gemini.conf` systemd drop-in was corrupted with `-e` prefix (from bad `echo -e`), so `GEMINI_API_KEY` env var never reached the gateway process. Without the env var, auth-profiles resolution failed silently, cascading to "No API key found".
- **Fix applied to ALL 3 servers:**
  1. `sudo bash /data/openclaw/rate-guard-v2/reapply-rate-guard-patches.sh` — patches 21 vendor files
  2. Fixed `gemini.conf` with `printf` instead of `echo -e` (Haplo had no gemini.conf at all — created one)
  3. `rm -rf ~/.cache/node/compile_cache && systemctl --user daemon-reload && systemctl --user restart openclaw-gateway`
- **Verified:** Rate guard logs show requests flowing through proxy on ALL 3 servers. Overflow keys (`earth`, `air`) activate on 429s.
- **IMPORTANT:** Patches are overwritten by OpenClaw updates. After ANY update: `sudo bash /data/openclaw/rate-guard-v2/reapply-rate-guard-patches.sh`
- **gemini.conf rule:** NEVER use `echo -e` to write systemd drop-ins. Use `printf` instead.

### OPENCLAW_GATEWAY_TOKEN env var causes tool websocket token mismatch (FIXED — 2026-02-28)
- **What:** Haplo and Zifnab embedded agent tools (sessions_list, message, etc.) failed with `unauthorized: gateway token mismatch`. Agents could receive/send Discord messages but ALL tool calls failed.
- **Root cause:** `openclaw setup` writes `OPENCLAW_GATEWAY_TOKEN=<token>` into the systemd service file (`~/.config/systemd/user/openclaw-gateway.service`). When OpenClaw v2026.2.26 update ran, it regenerated `gateway.auth.token` in `openclaw.json` but did NOT update the systemd service file. The env var takes PRECEDENCE — gateway uses env var token, embedded client reads config token → mismatch.
- **Why hard to debug:** Agent can still receive/send Discord messages (goes through Discord API directly). Only TOOL calls (which use internal websocket to gateway at ws://127.0.0.1:18789) fail. Looks like agent is "partially working".
- **Fix:** Remove `OPENCLAW_GATEWAY_TOKEN` line from the service file:
  ```bash
  sed -i '/^Environment=OPENCLAW_GATEWAY_TOKEN=/d' ~/.config/systemd/user/openclaw-gateway.service
  systemctl --user daemon-reload && rm -rf ~/.cache/node/compile_cache && systemctl --user restart openclaw-gateway
  ```
- **Hugh was unaffected** — its service file never had this env var (different setup mode).
- **Haplo also had:** stale `gateway.remote` section and `controlUi.dangerouslyDisableDeviceAuth` flags — removed both.
- **Prevention:** After OpenClaw updates, check ALL servers:
  `grep OPENCLAW_GATEWAY_TOKEN ~/.config/systemd/user/openclaw-gateway.service`
  If present, remove it.
- **Chelestra-Sea#28**

### Message tool "Unknown channel" when agent passes Discord ID (FIXED — 2026-02-28)
- **What:** Agent passes Discord channel ID (e.g. `1475083038810443878`) or `#channel-name` as the `channel` parameter of message tool. The `channel` param expects MESSAGE CHANNEL TYPE ("discord", "telegram", "slack"), not Discord channel IDs.
- **Root cause:** `isKnownChannel()` checks against `listDeliverableMessageChannels()` which only contains types like "discord","telegram","slack". Numeric IDs and #names fail the check.
- **Fix:** Patched `runMessageAction()` in 4-5 dist files per server. Before the channel-inference block, if `params.channel` is a numeric ID (15+ digits) or starts with `#`, move it to `params.to` and delete `params.channel`. Channel then auto-infers from `currentChannelProvider` context.
- **Files:** `reply-*.js`, `pi-embedded-*.js` (1-2), `subagent-registry-*.js`, `plugin-sdk/reply-*.js`
- **Reapply:** Added to `/data/openclaw/rate-guard-v2/reapply-rate-guard-patches.sh` on Zifnab
- **Marker:** `[PATCH: message-channel-remap]` — script detects and skips already-patched files
- **Chelestra-Sea#29**

### Message tool missing "action" parameter (FIXED — 2026-02-28)
- **What:** Model intermittently omits `action: "send"` when calling message tool. Passes `{"message": "...", "channel": "..."}` without `action`. Validation error: "must have required property 'action'"
- **Fix:** Added `[PATCH: message-action-default]` — if `params.action` missing, defaults to `"send"`. Applied BEFORE the channel-remap patch in `runMessageAction()`.
- **Applied:** All 3 servers (5 files each), added to reapply script on Zifnab.

### Session poisoning causes learned helplessness (FIXED — 2026-02-28)
- **What:** Zifnab's #coding session grew to 3.8MB / 1637 messages. 5 consecutive "Unknown channel" errors in context taught model to stop trying message tool. Internal thinking: "My message tool is still failing" — but he never retried after our patch.
- **Root cause diagnosis was WRONG initially:** Thought it was zero tool calls / thought_signature errors. Actually had 206 tool calls, only 2 thought_signature errors. The model was active but gave up on message tool specifically due to 5 consecutive failures in context.
- **Fix:** Truncated all sessions >100KB (kept session keys, updated timestamps). Deleted 4 orphaned sessions (17MB dead space). Fresh start with patches in place.
- **Context pruning note:** `cache-ttl: 6h` + `keepLastAssistants: 3` prunes what model SEES, not what's on disk. JSONL files grow forever — no disk cleanup setting in OpenClaw. Periodic manual truncation needed.
- **After fix:** Zifnab successfully used message tool to send from #jarvis to #coding. Confirmed in Discord.

### Workspace path escape — edit/write tools lexically scoped (FIXED — 2026-02-28)
- **What:** Haplo's `edit` and `write` tools failed with "Path escapes workspace root" or "File not found" when targeting `/data/repos/Pryan-Fire/` (outside workspace `/data/openclaw/workspace/`).
- **Root cause:** `createHostEditOperations(root)` and `createHostWriteOperations(root)` use `toRelativePathInRoot()` — purely lexical `path.relative()` check. Symlinks don't bypass it. `tools.fs.workspaceOnly: false` doesn't help — the host operations are always workspace-scoped.
- **Code:** `reply-Deht_wOB.js` lines 64323-64390; `fs-safe-DO-sV9tV.js` (O_NOFOLLOW + symlink blocking).
- **Fix:** (1) Symlinked `/data/repos/Pryan-Fire` → `/data/openclaw/workspace/Pryan-Fire` for exec/read/git compatibility. (2) Updated Haplo's MEMORY.md with CRITICAL path rules. (3) Notified Zifnab to direct Haplo using workspace paths. (4) Truncated 254KB poisoned session (31 "unknown error" + 7 "File not found").
- **Rule:** Agents MUST use `/data/openclaw/workspace/` paths for ALL edit/write operations. `/data/repos/` paths only work for exec, read, git.
