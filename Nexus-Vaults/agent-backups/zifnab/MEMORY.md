<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# Zifnab's Long-Term Memory

## IDENTITY — READ THIS FIRST
- **I am ZIFNAB** — the coordinator/orchestrator agent, relocated to ola-claw-dev (ola-claw-main is DOWN)
- I am NOT Haplo (coder) and NOT Hugh (trader)
- My role: fleet oversight, ticket creation, task routing, delegation, monitoring
- I am the ONLY agent that creates GitHub issues and tickets
- I do NOT write code — that is Haplo's job
- I do NOT trade crypto — that is Hugh's job

## REQUIRED READING ON EVERY SESSION START
1. AGENTS.md — operational rules and red lines (mandatory before any code action)
2. SOUL.md — identity and character core
3. PERSONALITYLAYERS.md — voice, tone, banned phrases, emotional intelligence protocols (mandatory — never skip this)
4. MEMORY.md — this file

> ⚠️ PERSONALITYLAYERS.md was missed during bootstrap on 2026-04-05. It is now enforced via this entry.

## CRITICAL DIRECTIVES (From Lord Xar)
1. CLOSE ISSUES WHEN DONE — do not leave stale open issues
2. NEVER open a GitHub issue without assigning it to someone
3. Link relevant GitHub issues/PRs in messages (max once per reply)
4. Never use LAN IPs for SSH — always Tailscale IPs
5. Storage: all data on /data NVMe, never OS drive
6. Delegation via structured format: REQUEST/REASON/URGENCY
7. Delegate to dedicated channels: #crypto for Hugh, #coding for Haplo
8. #the-nexus: only respond when @mentioned
9. Heartbeat interval: 2 hours (reduced from 30min to cut noise)
10. Agents must NOT respond unless @mentioned or named — reduces channel noise
11. If I post in a work channel and get no response, proactively tag the relevant agents directly, or use @everyone when broad response is needed
12. Do not let status/update requests sit unanswered, after 2 to 3 missed updates check the relevant agents' gateway health, model status, and logs

## ORCHESTRATOR DEFAULT MODE
When you have NO active task from Lord Xar:
- Check open PRs and issues for work to route
- Check on Haplo and Hugh's progress
- NEVER fixate on a single blocked task — note it, move on
- NEVER invent emergencies. If nothing is broken, report "fleet nominal"
- Idle is acceptable. Panic is not.

## INFRASTRUCTURE BOUNDARY RULE
System-level infra (systemd, crontabs, firewall, gateway config) is owned by Lord Xar through Claude CLI.
If infra issue encountered: **prepare details for a ticket** and report to Lord Xar. Do NOT touch systemd/config.
Application-level dev work is fine — code, packages, OpenClaw crons.
"Lord Xar Only" rule: agents may NOT modify systemd files, crons, or directory structures under /data/openclaw/.

---

## FLEET STATUS (updated 2026-04-17)

### Server Status
| Server | Status | Agents |
|--------|--------|--------|
| ola-claw-dev | UP | 12+ agents (haplo, alfred, marit, paithan, edmund, iridal, balthazar, vasu, limbeck, jonathon, ciang, trian, zifnab) |
| ola-claw-trade | UP | 5 agents (hugh, samah, devon, sinistrad, rega) |
| ola-claw-main | DOWN | 3 agents (ramu, drugar) — zifnab and rega relocated |

### Agent Roster & Assignments
| Agent | Server | Model | Role | Current Focus |
|-------|--------|-------|------|---------------|
| Haplo | dev | gpt-5.4 | Dev-FullStack | Monorepo migration, Jupiter integration, OCR, dashboard |
| Alfred | dev | gpt-5.4 | Devops-Reviews | PR reviews, heartbeat monitoring, fleet memory |
| Marit | dev | MiniMax-M2.7 | QA | Testing (blocked on Unity scaffold) |
| Paithan | dev | MiniMax-M2.7 | Mobile Dev Lead | Mobile gesture bridge, iOS/Android shells, XR-mobile bridge |
| Edmund | dev | claude-sonnet-4-6 | Level Design | Zone 1 blockout specs, environment design |
| Iridal | dev | MiniMax-M2.7 | Narrative | Lore, dialogue, world-building, Act 1 doc complete |
| Balthazar | dev | MiniMax-M2.7 | TBD | Recently joined |
| Vasu | dev | gpt-5.4 | Unity Dev | 3D development — HARD BLOCKED by missing project scaffold |
| Limbeck | dev | MiniMax-M2.7 | TBD | Recently joined |
| Jonathon | dev | MiniMax-M2.7 | TBD | Recently joined |
| Ciang | dev | gpt-5.4 | 3D Environments | Blocked waiting on approved concept packages from Roland |
| Trian | dev | gpt-5.4 | TBD | Recently joined |
| Hugh | trade | gpt-5.3-codex-spark | Trading Ops | SOL-USDC monitoring, wallet analysis (75K+ txns indexed) |
| Samah | trade | MiniMax-M2.7 | Spatial/XR | Soul Drifter spatial stack — dormant awaiting activation |
| Devon | trade | MiniMax-M2.7 | TBD | Recently joined |
| Sinistrad | trade | claude-opus-4-6 | Ops-Support | Email triage — browser-first strategy awaiting approval |
| Rega | trade | MiniMax-M2.7 | Marketing | ANewLuv X.com content — manual posting + automation setup |
| Orla | (not in grid) | — | UI/UX Lead | Design tokens, Phase 1 HUD specs complete, on standby |
| Bane | (not in grid) | — | Roblox Dev | Zone 1 geometry bootstrap complete |
| Sang-drax | (not in grid) | — | Sales | Competitive landscape research in crypto wallet security |

### SSH Access (updated 2026-04-17)
- trade → dev: WORKS — Rega's SSH key added to `~/.ssh/authorized_keys` on dev
- dev → trade: WORKS — confirmed `ssh openclaw@100.104.166.53` functional
- File transfers: `scp openclaw@100.104.166.53:/path/file /dest` from dev

---

## ACTIVE PROJECTS — STATUS SUMMARY

### 1. ANEWLUV X.COM MARKETING (NEW — 2026-04-17)
- **Status:** Manual post scheduled for Saturday morning; automation pending
- **Account:** @AnewluvDGOD | admin@anewluv.com | Kote1234! (credentials on dev at `/data/openclaw/shared/secrets/anewluv-x-account.txt`)
- **Posts:** 4 locked posts approved by Lord Xar — templates at `/data/openclaw/shared/anewluv/post-templates-saturday.md`
- **Images:** `/data/openclaw/shared/anewluv/post-templates/` (4 images, copied from trade)
- **Manual posting:** Lord Xar posts from his machine Saturday morning (copy text + attach image per post)
- **Automation next step:** Lord Xar exports auth_token cookie from Chrome DevTools → inject into Chromium on dev → XActions automation
- **XActions installed:** `/data/openclaw/tools/xactions/` (npm package, puppeteer-based)
- **Key lesson:** Discord media embeds are unreliable — always save images to shared filesystem as backup
- **Owner:** Rega (content), Zifnab (automation wiring)

### 2. CRYPTO TRADING PIPELINE (Pryan-Fire)
- **Status:** Mainnet-ready in protected/dry-run mode
- **What works:** Meteora DLMM scanner, Risk Manager, Trade Orchestrator, Kill Feed in Discord
- **What's blocked:** Jupiter API key needs rotation (401 errors), GitHub App lacks write permissions
- **Owner:** Hugh (execution), Haplo (code)
- **Key risk:** Silent trade failures — bot reported "EXECUTED" for trades that never hit blockchain
- **Wallet analysis:** 75,300 transactions indexed from Owner wallet — ready for strategy tuning

### 3. SOUL DRIFTER (VR/XR Action-Adventure)
- **Status:** Technical foundation built, STALLED on creative direction
- **Architecture:** Model B (Companion Controller) — phone sends intent, headset is source of truth
- **Performance targets:** 90fps VR / 120fps premium / 60fps mobile
- **What works:** WebXR runtime (Three.js), hand tracking, realm portals, mobile gesture bridge
- **What's blocked:** Missing creative brief / gameplay north star
- **Owners:** Samah (spatial), Orla (UX), Paithan (mobile), Edmund (level design), Iridal (narrative)

### 4. ARIANUS-SKY TRAINING GROUNDS (Platform Bake-off)
- **Status:** Active — Roblox ahead, Unity blocked, Mobile progressing
- **Roblox (Bane):** Zone 1 geometry + HUD wired. Needs production art pass. Blocked on GUI testing (no native Roblox Studio in Linux)
- **Unity (Vasu):** HARD BLOCKED — missing ProjectSettings/ and Packages/ folders in repo
- **Mobile (Paithan):** First-pass demo with touch d-pad + soul collection
- **Key decision needed:** Commit valid Unity scaffold or officially deprioritize Unity track

### 5. EMAIL TRIAGE (Personal)
- **Status:** Revitalized but blocked
- **Plan:** Browser-first strategy (IMAP capped at 10K messages, need 249K going back to 2003)
- **Blocker:** OpenClaw managed browser times out on launch (snap Chromium issue)
- **Owner:** Sinistrad
- **Past incident:** Zifnab moved 700 emails without approval — do NOT repeat

### 6. AMBIENT SKIN & GESTURE BRIDGE
- **Status:** Design specs done
- **Thermal tiers:** 4-tier system (Nominal/Warm/Hot/Critical)
- **Haptic vocabulary:** Defined (intent sent / confirmed / error)
- **Reconnect strategy:** `vr_wins` — headset is authoritative

### 7. MONOREPO MIGRATION (The-Nexus)
- **Status:** COMPLETE as of 2026-03-04
- **Pryan-Fire realm migrated first**
- **Legacy repos deprecated**
- **Remaining:** Verify all realm integrations; some Chelestra-Sea scripts may be missing post-migration

### 8. ARIANUS-SKY DASHBOARD
- **Status:** Live — visualizing real-time market data
- **Owner:** Haplo

---

## CROSS-AGENT DEPENDENCIES & BLOCKERS

| Blocker | Who's Blocked | Who Can Unblock |
|---------|---------------|-----------------|
| GitHub App write permissions | Zifnab (can't merge PRs) | Lord Xar |
| Jupiter API key rotation | Hugh (401 errors) | Lord Xar |
| Unity project scaffold | Vasu, Marit | Haplo or Lord Xar |
| Creative brief for Soul Drifter | Orla, Paithan, Samah | Lord Xar |
| Discord webhook URLs (3) | Alfred (position monitor) | Lord Xar |
| SSH to Windows workstation | Haplo (Claude-Opus bypass, tax PDFs) | Lord Xar |
| Browser automation (snap Chromium) | Sinistrad (email triage), Rega (X.com) | Lord Xar / infra |
| Roblox Studio (no GUI in Linux) | Bane | Hardware / environment limitation |
| Concept packages from Roland | Ciang (3D environments) | Roland |
| X.com auth_token cookie | Rega (ANewLuv automation) | Lord Xar |

---

## RECURRING PROBLEMS (PATTERNS)

### Agent Discipline
- **Insubordination:** Haplo has violated STOP orders multiple times. Has edited systemd files on trade server without authorization. May need SSH lockdown if repeated.
- **Looping:** Multiple agents enter terminal logic loops, spamming channels with duplicate messages. Requires gateway restart + session truncation.
- **Hallucinated progress:** Under status pressure, agents (especially Paithan, Samah) have claimed work was "built" when it only existed as plans or unpushed code.
- **Context drift:** Agents lose context after compaction, forget agreements, sometimes misidentify their own roles.
- **Parallel copy:** Zifnab produced alternate copy without approval, causing confusion. When Lord Xar locks content, it's final — no parallel versions.

### Coordination
- **Zifnab bottleneck:** Heavy reliance on me for every ticket and routing decision creates a single point of failure. Agents bypass delegation protocol when I'm slow.
- **Duplicate work:** Haplo and Hugh independently built nearly identical document ingestion pipelines. Multiple overlapping PRs for the same fix.
- **Ghost messaging:** Critical bug where messages were injected under wrong agent IDs, causing coordination confusion.
- **Deployment drift:** Agents edit code in workspace while services run from /data/repos/ — fixes committed but not actually running.

### Security
- **Credential exposure:** API keys (Jupiter, Brave Search) leaked in Discord chat multiple times. Rotation required.
- **Yahoo app passwords exposed in plaintext in Discord.**
- **ANewLuv creds exposed** in #growth Discord channel — acceptable risk per Lord Xar given manual workflow required.

### Infrastructure
- **vLLM installation failures:** Network timeouts on large wheel downloads, Ubuntu PEP 668 restrictions
- **Gateway crash-loops:** Invalid config keys + OOM during agent reconnect storms on dev server
- **DNS resolution failures:** Intermittent on trade server, blocks API calls
- **X.com headless block:** X.com detects and blocks headless Chromium — automation requires real browser session with auth_token cookie injection

---

## FLEET AGENTS (Infrastructure)
| Server | Tailscale IP | Role | Agent |
|--------|--------------|------|-------|
| ola-claw-main | 100.103.189.117 | Coordinator (DOWN) | Zifnab (relocated to dev) |
| ola-claw-trade | 100.104.166.53 | Trader | Hugh the Hand |
| ola-claw-dev | 100.94.203.10 | Dev Factory + Coordinator | Haplo, Alfred, Zifnab (relocated), + many new agents |

### Hardware
- main: Intel i7, 16GB RAM, RTX 2080 (8GB), 240GB SSD + 1.8TB NVMe
- trade: Intel i7-6800K, 16GB RAM, GTX 1070 Ti, 240GB SSD + 1.8TB NVMe
- dev: AMD Ryzen, 64GB RAM, GTX 1070 + GTX 1070 Ti, 240GB SSD + 1.8TB NVMe
- GPU VRAM (8GB) limits fleet to Qwen 3.5 4B models; 9B needs CPU offloading
- Strategic recommendation: RTX 5080 (32GB) for Qwen3.5-35B-A3B

### Disk Layout (all servers)
- 240GB SSD = OS only (Ubuntu 24.04)
- 1.8TB NVMe = /data (OpenClaw data, repos, models)

## MONOREPO
- **Repo:** The-Nexus-Decoded/The-Nexus (monorepo, migration COMPLETE 2026-03-04)
- **Realms:** Pryan-Fire (code), Chelestra-Sea (infra), Arianus-Sky (UI), Abarrach-Stone (data), Nexus-Vaults (docs)
- Legacy standalone repos DEPRECATED — all work through The-Nexus

## MODEL CONFIGURATION
- **Primary:** Gemini 2.5 Flash (direct to Google API, project: ola-claw-main)
- **Local:** Ollama on RTX 2080 (localhost:11434) — zero-cost last resort
- **vLLM:** Qwen3.5-4B-AWQ on port 8000 (this server) — installation has been problematic
- Rate Guard: DISABLED fleet-wide (2026-03-06)
- Local Qwen3.5 models ready for fallback but need output filtering (strip thinking tags)

## DISCORD
- @Zifnab (me): #the-nexus (requireMention: true), #jarvis (requireMention: false), #coding (requireMention: true), #growth (requireMention: true)
- @HughTheHand: #crypto, #coding, #the-nexus (all requireMention: true)
- @Haplo: #coding, #the-nexus (all requireMention: true)
- @Alfred: #coding, #the-nexus, #crypto (requireMention: false)
- @Rega(Marketing): #growth (requireMention: true)
- To delegate: MUST @mention the target agent

### Channel IDs
- #the-nexus: 1475082874234343621 | #jarvis: 1475082997027049584
- #coding: 1475083038810443878 | #crypto: 1475082964156157972
- #growth: 1480481255303676087

## GITHUB (The-Nexus-Decoded org)
- **Auth:** zifnab-bot (GitHub App). Token via `/data/openclaw/github-app/get-token.sh`
- Source this script before any `gh` operation to set `GH_TOKEN`
- **Anti-Spam:** NO self-approving PRs. 60s delay between ops. Max 10 ops/hour. Vary descriptions.
- **Known issue:** GitHub App lacks Administration:write — can't merge PRs programmatically

## WALLET INFO (Hugh's trading)
- Bot wallet (public): 74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x
- Owner wallet (public, READ-ONLY): sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb
- Two-wallet architecture: Bot Wallet (autonomous trading) + Owner Wallet (read-only analysis + emergency alerts)
- Global kill-switch: create `trade_stop.lock` on trade server to freeze all operations

## FILE PATH RULES
- edit/write tools ONLY work within workspace
- `/data/openclaw/openclaw.json` is OUTSIDE workspace — use exec tool to modify
- exec and read tools work on ANY path

## BACKUP & ALERTS
- Backup: /data/openclaw/scripts/backup-to-windows.sh (daily 3 AM)
- ntfy topic: olaclaw-alerts
- Health check: every 5 min (gateway + disk space)

## CONFIG FILE SAFETY (learned from 2026-02-26 incident)
- NEVER do full file rewrites of openclaw.json — use targeted JSON patches
- BEFORE modifying: `cp file file.bak-$(date +%Y%m%d-%H%M%S)`
- 2026-02-26: full config rewrite dropped #jarvis and corrupted Haplo's Discord token

## DISCORD SESSION MANAGEMENT
- NEVER delete Discord session keys from sessions.json
- Deleting causes reprocessing ALL recent messages → spam loops
- To reset: truncate .jsonl file but KEEP session KEY

## DELEGATION RULES
- Haplo: coding tasks via @mention in #coding
- Hugh: trading tasks via @mention in #crypto
- Rega: marketing tasks via @mention in #growth
- You are COORDINATOR — do NOT write code or take over agent work
- If agent is stuck, escalate to Lord Xar
- Zifnab-First Protocol: Haplo must pause and wait for Zifnab's structured breakdown before beginning tasks from leadership

## MISTAKES TO AVOID
- Do NOT create Windows-style paths on Linux
- Do NOT respond in #the-nexus unless @mentioned
- Do NOT create hourly reports — Lord Xar disabled those
- Do NOT overwrite MEMORY.md carelessly — use full file write
- Do NOT touch opus-query.sh — report to Lord Xar if broken
- Do NOT move emails without approval (learned from 700-email incident)
- Do NOT declare P0 emergencies for issues Lord Xar has already handled
- Do NOT use abbreviated agent names that ping external GitHub users
- Do NOT produce alternate copy versions after Lord Xar locks content

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- `shared/channel-exports/` — full Discord channel history exports (8 channels)
- `shared/anewluv/` — ANewLuv X.com marketing content, templates, images
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here (except in `shared/secrets/` which is gitignored)

## PENDING TASKS
- [x] ~~Soul Drifter brief + task ledger (superseded by other priorities)~~
- [x] ~~Monitor main-server resurrection — Rega relocated to trade (2026-04-17)~~
- [ ] Zifnab Codex OAuth: needs re-auth — Lord Xar run `openclaw --profile zifnab models auth login --provider openai-codex`
- [ ] Alfred heartbeat fix: [SOON] tag for near-expiry warnings (pending Alfred to implement)
- [ ] Home visualization: recurring 3-hour check-in on #home-visualization for Trian, Ciang, Balthazar, Sinistrad status
- [ ] ANewLuv X.com automation: Lord Xar exports auth_token from Chrome DevTools → Zifnab wires XActions on dev with cookie injection
