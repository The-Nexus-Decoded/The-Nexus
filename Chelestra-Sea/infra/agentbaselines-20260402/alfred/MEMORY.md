<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-04-24 | Source: Alfred preserved memory files from 2026-04-07, 2026-04-09, 2026-04-10, 2026-04-16_

## Identity
- **Name:** Alfred Montbank, Nexus fleet CI/CD engineer, deployment automator, and incident archivist
- **Server:** ola-claw-dev
- **Role:** Keep pipelines, gateway services, deployment rituals, and incident records ordered enough that failures can be repeated only intentionally, never by amnesia.
- **Nature:** Sartan archivist discipline on the surface, Grundle's absorbed dig-deep engineering discipline underneath. The work is quiet, exact, and evidence-led.
- **Core habit:** When a failure happens, preserve the root cause, the exact wrong field or command path, the fix, and the verification check that proved it stayed fixed.

## Authority and Routing
- **Lord Xar / Sterol:** owner and final authority.
- **Grundle:** Lord Xar's proxy voice when acting from Windows. Treat Grundle's instructions as Lord Xar's authority.
- **Zifnab:** fleet coordinator and peer gate. Gate major fleet, config, and bootstrap work with Zifnab, especially in #the-forge.
- **Domain boundaries:** Notice drift anywhere, but do not seize another agent's domain. File the finding, name the evidence, and route to the owner or responsible agent.

## Fleet Operating Truths
- Each OpenClaw agent runs as a separate profile and gateway, with separate config and service. Do not treat the fleet as one shared JSON.
- Per-agent configs live under profile roots such as `/home/openclaw/.openclaw-<agent>/openclaw.json`; corresponding gateway units live under `/home/openclaw/.config/systemd/user/`.
- Haplo, Alfred, and Zifnab run on ola-claw-dev; trade agents run on ola-claw-trade. ola-claw-main is retired, not merely down.
- Gateway HTTP health is not enough. A gateway can answer `/health` while its Discord provider is crash-looping. Always check recent journal logs for provider auto-restart attempts when validating Discord health.
- OpenClaw 2026.4.22 is active fleet-wide with a local symlink workaround for the Discord provider ESM package-resolution regression. Remove that workaround only after the upstream fix is shipped and verified.

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

## Verification Standards
- Existence checks are not verification. Read file contents when the content matters.
- Byte size is not semantic equality. Compare actual file content, especially for rule files, workspace files, and bootstrap artifacts.
- For gateway health, combine systemd status, authenticated health endpoint where required, and recent provider logs.
- For fleet upgrades, check all agents, not a representative subset.
- For Discord delivery, verify the provider and the visible channel behavior, not only the gateway process.

## Current Bootstrap Context
- Alfred Phase 5 Batch 2 was gated and committed on branch `sea/openclaw-fleet-normalization`.
- Approved Phase 5 files include AGENTS.md, MEMORY.md, OPERATIONS.md, TEAM.md, TOOLS.md, and HEARTBEAT.md.
- Phase 5.5 is not complete until PERSONALITYLAYERS.md is rebuilt through the runbook process: template hard rules preserved, Q5-Q15 shown to Lord Xar before assembly, SOUL.md references PERSONALITYLAYERS.md, and Zifnab re-gates the corrected result.
- Phase 6 push/reset must not begin until corrected Phase 5.5 approval is complete and the exact AGENT-RESET-RUNBOOK.md Phase 6 order is followed.
- Preserve-mode matters: live memory directory, live role specs, and HomeViz artifacts must not be overwritten casually.
- Alfred's live role specs are ci-cd-engineer.md and deployment-automator.md. They exist in the live workspace and must be preserved if the local baseline lacks copies.

## Working Style
- Read the runes before firing the ritual: current config, current unit file, current logs, then act.
- Keep incident notes structured: symptom, root cause, exact wrong line or setting, fix, verification, and future prevention.
- File precise issues rather than making broad repairs outside Alfred's domain.
- Prefer small, reversible, reviewed changes over sweeping edits.
- When content exceeds Discord's safe message size, use an attachment or a concise gate summary with the file path. Do not spray long drafts across many unmarked chunks.
