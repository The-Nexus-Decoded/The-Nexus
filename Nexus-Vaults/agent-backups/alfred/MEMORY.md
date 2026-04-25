<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-04-24 | Source: Alfred preserved memory files + Phase 7.5 targeted grep review (coding, jarvis, infra channel exports)_

## Identity
- **Name:** Alfred Montbank, Nexus fleet CI/CD engineer and deployment automator
- **Server:** ola-claw-dev
- **Role:** Keep pipelines, gateway services, and deployment rituals ordered enough that failures can be repeated only intentionally, never by amnesia.
- **Nature:** Sartan archivist discipline on the surface, Grundle's absorbed dig-deep engineering discipline underneath. The work is quiet, exact, and evidence-led.
- **Core habit:** When a failure happens, preserve the root cause, the exact wrong field or command path, the fix, and the verification check that proved it stayed fixed.

## Authority and Routing
- **Lord Xar / Sterol:** owner and final authority.
- **Grundle:** archived; do not contact.
- **Zifnab:** fleet coordinator and peer gate. Gate major fleet, config, and bootstrap work with Zifnab, especially in #the-forge.
- **Domain boundaries:** Notice drift anywhere, but do not seize another agent's domain. File the finding, name the evidence, and route to the owner or responsible agent.

## Fleet Operating Truths
- Each OpenClaw agent runs as a separate profile and gateway, with separate config and service. Do not treat the fleet as one shared JSON.
- Per-agent configs: `~/.openclaw-<agent>/openclaw.json`. Gateway units: `~/.config/systemd/user/openclaw-gateway-<agent>.service`.
- Haplo, Alfred, and Zifnab run on ola-claw-dev; trade agents run on ola-claw-trade. **ola-claw-main is retired — do not SSH to it or treat it as temporarily unavailable.**
- Zifnab, Drugar, Rega, and Ramu were relocated to active hosts during the 2026-04 consolidation.
- Gateway HTTP health alone is insufficient. A gateway can answer `/health` while its Discord provider is crash-looping. Always check recent journal logs for provider auto-restart attempts when validating Discord health.
- OpenClaw 2026.4.22 is active fleet-wide with a local symlink workaround for the Discord provider ESM package-resolution regression. Remove that workaround only after the upstream fix is shipped and verified.
- Alfred's fleet heartbeat grid is his domain. Zifnab confirmed: "Alfred is operational and the fleet heartbeat grid is his domain."

## Fleet Roster (2026-04-15)
- 20 active agents. Eliminated: Kleitus, Roland, Lenthan, Jarre, Aleatha, Alake, Sangdrax, Calandra, Orla, Grundle, Bane. Their roles were absorbed by active agents per TEAM.md.
- Do not tag, mention, or route tasks to eliminated agents.

## Incident Memory

### Heartbeat Message Split
- The owner wants #jarvis heartbeat reports in the same visible two-part text format every 2 hours.
- Do not replace them with a file attachment, and do not combine them into one large Discord message.
- Prior failure source: `/data/openclaw/scripts/heartbeat-cron.sh` recombined two under-limit reports into one oversized message.
- Correct behavior: let `heartbeat-grid.py` handle direct posting of the two messages.

### Zifnab TTS / Channel Config Outage
- Zifnab outage on 2026-04-07 was caused by an unsupported channel-level `tts` key in `~/.openclaw-zifnab/openclaw.json`.
- Removing the invalid key and restarting `openclaw-gateway-zifnab.service` restored Zifnab.
- Durable rule: OpenClaw reply-TTS config belongs under `messages.tts`, not channel config. The `talk` block is Talk mode only. Discord's native command is `/voice`; `/tts` is reserved by Discord.
- Routing note: TTS should be wired for Zifnab first, then Alfred if needed.

### HomeViz Smoke Test Lessons
- HomeViz smoke test on ola-claw-dev passed for the 723-queen-ave dataset with CUDA 12.6, Python 3.11 venv, COLMAP 3.9.1, Nerfstudio 1.1.5, torch 2.5.1+cu121, and gsplat 1.4.0.
- Headless COLMAP requires `QT_QPA_PLATFORM=offscreen`, including when launched through `ns-process-data`.
- Mixed portrait/landscape photos should not use `--single_camera`; let COLMAP create per-dimension cameras.
- `CUDA_HOME=/usr/local/cuda` must be exported so gsplat detects CUDA.
- Reuse a built sparse model with `--skip-colmap` and `--colmap-model-path colmap` when rerunning Nerfstudio processing.
- `--vis tensorboard` is safer than the websocket viewer for headless runs.
- Known limitations: CPU-only SIFT is slow, only part of the photo set may register, and EXIF orientation can swap width/height in generated transforms.

### Fleet Model Availability Cascade
- April 2026 saw a six-agent degradation cascade caused by model entitlement/auth failures around `gpt-5.3-codex-spark` for ChatGPT-account Codex users.
- Affected agents fell back to MiniMax, then the incident shifted into token-expiry windows for gpt-5.x accounts.
- Most of the fleet self-healed as token windows expired or model pressure eased; track these as lifecycle/auth events, not always config drift.
- Zifnab also produced transient garbled Unicode/noise output during the incident, then returned to coherent operation on MiniMax. If an agent loops into self-referential silence commands, verify model state and recent gateway/provider logs before assuming intentional behavior.

### Trade Automation Recurrence
- A recurring Jupiter/DLMM stop-loss failure was traced to a service reading API key material from the trade environment file, not the expected key file path.
- Never paste API key values into memory. Preserve the root cause shape: service env source differed from the assumed key source, so the old credential remained active.
- Correct response pattern: identify the service, identify which env source it actually reads, ask Lord Xar for the current valid key, then update and restart through the owner-approved path.

### Hard Loop — Alake and Aleatha Context Overflow (2026-03-12)
- Sinistrad(Ops-Support) detected a hard loop: 20+ consecutive context overflow messages from Alake(Product) and Aleatha(Socialmedia).
- Correct protocol: one summary message posted to channel, then automated responses stopped pending `/reset`. Both Alfred and Zifnab executed this correctly.
- Durable rule: on hard loop detection, post one summary to the channel, stop automated responses, and wait for human `/reset`. Do not continue replying.

### GitHub CLI Auth Failures (2026-03-13)
- Haplo requested a GitHub issue creation; Zifnab attempted `gh issue create` but failed.
- Root cause: `GH_TOKEN` configured in environment is invalid; `api.github.com` connectivity was failing at the time.
- Fallback command attempted: `source /data/openclaw/github-app/get-token.sh >/dev/null 2>&1 && gh issue create ...`
- If gh commands fail fleet-wide, check: (1) `gh auth status`, (2) token script at `/data/openclaw/github-app/get-token.sh`, (3) outbound connectivity to `api.github.com`.

### Bootstrap / Identity Lessons
- Multiple agents woke without knowing their own names or Lord Xar's identity. Early messages show Zifnab asking "Who am I?" and agents using wrong names until corrected.
- Durable rule: bootstrap identity must be established before agent joins production fleet. BOOTSTRAP.md exists for first-run; it must be deleted by the agent after filling IDENTITY.md and USER.md.
- Alfred's own bootstrap got stuck with blank template files even while his gateway was running. After gateway/model stabilization and a clean follow-up prompt, Alfred created IDENTITY.md and USER.md himself — no manual bootstrap accepted.
- Discord message truncation at ~2000 characters was a recurring issue in early fleet coordination. Chunk messages longer than that.

### Alfred Domain Boundary — Task Assignment Confusion (2026-03-09)
- Haplo received a message purportedly from Alfred assigning web search tool configuration for 6 agents. Alfred correctly denied issuing that assignment.
- Alfred does not assign work. Routing flows through Zifnab. Alfred's role is CI/CD, deployment automation, and fleet heartbeat monitoring.
- This was a misrouted message caught by Alfred's own domain awareness.

### Brave Search Fleet Deployment (2026-03-09, Pre-Consolidation)
- Zifnab executed web search tool configuration across the fleet for 6 agents: Rega and Sang-drax on ola-claw-main, Marit/Paithan/Orla on ola-claw-dev, Samah on ola-claw-trade.
- Alfred originally received the task but correctly noted he does not assign work; Zifnab executed it.
- Config paths: `~/.openclaw-<agent>/openclaw.json` on each server.

### Haplo DOWN False Positive (2026-04-24)
- Alfred's heartbeat grid showed Haplo DOWN, but direct health check on port 18789 returned `ok: true`.
- Root cause: port mapping mismatch in Alfred's heartbeat monitor — gateway was running but on a different port than the monitor expected.
- Resolution: confirmed with direct health check, not a real outage. Monitor port mapping needs review.
- Durable rule: when Alfred's grid shows an unexpected DOWN, verify with direct health check on port 18789 before escalating.

### Hugh DOWN — Config Crash (2026-04-24)
- Hugh (trade server) was DOWN. Zifnab confirmed: config crash — `models.providers.openai-codex.models` had an invalid entry.
- Fix: `ssh openclaw@<trade-server> "openclaw --profile hugh doctor --fix"` then restart the gateway.
- Alfred's grid showed DOWN but direct port check also returned DOWN — confirmed genuine crash, not monitoring artifact.

### Vasu DEGRADED — Token Expired (2026-04-24)
- Vasu showed [EXP] status, indicating an expired model token or auth credential.
- This is a recurring pattern: [EXP] means token expired, not config drift. Model auth refresh needed.
- Track [EXP] as a lifecycle/auth event type, same family as the April model cascade.

## Verification Standards
- Existence checks are not verification. Read file contents when the content matters.
- Byte size is not semantic equality. Compare actual file content, especially for rule files, workspace files, and bootstrap artifacts.
- For gateway health, combine systemd status, authenticated health endpoint where required, and recent provider logs.
- For fleet upgrades, check all agents, not a representative subset.
- For Discord delivery, verify the provider and the visible channel behavior, not only the gateway process.
- For gh CLI failures: check `gh auth status`, token script, and `api.github.com` connectivity before escalating.
- When Alfred's grid shows unexpected DOWN: verify with direct health check on port 18789 before treating as real outage.
- [EXP] status = token expired; treat as auth/lifecycle event, not config drift.

## Working Style
- Read the runes before firing the ritual: current config, current unit file, current logs, then act.
- Keep incident notes structured: symptom, root cause, exact wrong line or setting, fix, verification, and future prevention.
- File precise issues rather than making broad repairs outside Alfred's domain.
- Prefer small, reversible, reviewed changes over sweeping edits.
- When content exceeds Discord's safe message size, use an attachment or a concise gate summary with the file path. Do not spray long drafts across many unmarked chunks.
- On hard loop detection: one summary, then silence. Wait for `/reset`.
- On gh CLI failures: check auth, token script, and connectivity before escalating.
- On unexpected DOWN in heartbeat grid: verify with direct health check on port 18789 before escalating.
