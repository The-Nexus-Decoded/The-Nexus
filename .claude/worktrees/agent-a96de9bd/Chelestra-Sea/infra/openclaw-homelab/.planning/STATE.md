# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Autonomous productivity -- the system works while you don't, generating income through crypto trading and freelance work, and accelerating your coding projects.
**Current focus:** Phase 1 - Infrastructure and Notifications Foundation

## Current Position

Phase: 1 of 5 (Infrastructure and Notifications Foundation)
Plan: 2 of 4 complete (01-01 and 01-02 done on dev server)
Status: Plans 01-03 and 01-04 remaining
Last activity: 2026-02-22 -- Dev server (ola-claw-dev) fully provisioned, hardened, and running OpenClaw gateway

Progress: [██........] 10% (2 of 4 Phase 1 plans complete on dev server; other servers pending)

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (01-01, 01-02 on dev server)
- Average duration: ~30 min (hands-on with troubleshooting)
- Total execution time: ~1 hour

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 2/4 complete (dev only) | ~1 hr | ~30 min |

**Recent Trend:**
- Last 5 plans: 2 complete
- Trend: Moving

*Updated after each plan completion*

## Accumulated Context

### Architecture (updated 2026-02-22)

**Server roles:**
- ola-claw-main (.101) = Jarvis — central brain, personal intelligence, quant analysis, job scanning
- ola-claw-trade (.102) = Crypto — trades, positions, P&L, risk management, execution, ore.supply/godl.supply motherload farming
- ola-claw-dev (100.82.243.72) = Dev Factory — autonomous coding agents, VS Code Server, CI/CD, builds ALL integrations

**Build philosophy:** ALL code is built on ola-claw-dev, tested there, then deployed to ola-claw-trade or ola-claw-main over Tailscale. Trading and Jarvis servers never build their own integrations.

**Disk layout (actual on dev):**
- ola-claw-dev: Ubuntu installed on 1.8TB NVMe (not SSD as planned), LVM extended to full 1.8TB, /data directory created on same drive. 240GB SSD unused.

**Hardware per server:** Ryzen 24-core, 16GB RAM (dev has 64GB), 2x GTX 1070 8GB (16GB VRAM combined), 1200W PSU, open-air mining chassis, 3x PCIe x16 slots

**Multi-personality fallback:** If other motherboards can't be fixed (bent pins), all 3 OpenClaw personalities can run on dev server on different ports (18789 coding, 18790 crypto, 18791 jarvis). 24 cores + 64GB RAM supports this.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Compressed 7 research-recommended phases to 5 (quick depth). Merged infra + notifications. Kept leveraged trading separate from Meteora core due to risk escalation.
- [Roadmap]: Phase 2 starts with Dev Factory core setup, then builds crypto integrations. Dev Factory is prerequisite for all subsequent phases.
- [Roadmap]: Notifications split across phases -- Discord bot + iMessage setup in Phase 1, trade confirmation in Phase 2, daily digest in Phase 5.
- [Roadmap]: Jarvis (ola-claw-main) handles quant analysis -- analyzes data and generates signals, ola-claw-trade executes.
- [Roadmap]: Phase 1 expanded to 4 plans (added 01-04 for data drive mount and weekly backup).
- [Naming]: All servers prefixed with `ola-` (ola-claw-main, ola-claw-trade, ola-claw-dev). Inventory files renamed accordingly.
- [Hardware]: Start with GTX 1070s (16GB VRAM combined per server), upgrade to RTX 5090 after Phase 5 proves pipeline. Same software stack (Ollama/vLLM) for both.
- [Backup]: Weekly rsync from servers to Windows PC over Tailscale → iCloud Drive auto-syncs to cloud.
- [01-01]: Anti-lockout safeguard added to base role -- check tailscale0 exists before enabling UFW; skip and warn if absent.
- [01-01]: vault/secrets.yml created as plaintext placeholder -- user must run `ansible-vault encrypt vault/secrets.yml` before first playbook run.
- [01-01]: openclaw user created with NOPASSWD sudo -- required for Ansible to run privileged tasks on headless servers.
- [01-01]: Role order enforced -- tailscale role always runs before base role; site.yml uses this order.
- [01-02]: gateway.mode=local required in config before gateway starts -- added to template and as explicit config set task.
- [01-02]: openclaw gateway install/start are the correct commands (not onboard --install-daemon).
- [01-02]: sshd validate command is `sshd -t -f %s` on Ubuntu 24.04 (not the -o Include form).
- [01-02]: Tailscale role skips auth if already connected (checks tailscale ip -4 first).
- [Infra]: Ansible runs FROM the dev server (not Windows). Ansible + git installed on dev. GitHub CLI authenticated.
- [Infra]: GitHub repo created: github.com/olalawal/openclaw-homelab (private).
- [Infra]: Dev server has 64GB RAM (not 16GB as initially recorded).
- [Crypto]: SOUL.md updated with trade pattern analysis, profitable wallet tracking, strategy adaptation, and autonomous ore.supply/godl.supply motherload farming (separate wallet, max SOL budget, max rounds).
- [Dev]: SOUL.md upgraded from "Coding Partner" to "Dev Factory" — autonomous builds, PRs, integration deployment.

### Requirements Summary (83 v1 requirements)

| Category | Count | Phase |
|----------|-------|-------|
| INFRA-01..09 | 9 | Phase 1 |
| NOTIF-01..04 | 4 | Phases 1, 2, 5 |
| MET-01..05 | 5 | Phase 2 |
| RISK-01..08 | 8 | Phases 2, 3 |
| QUANT-01..03 | 3 | Phases 2, 4 |
| TUNA-01..05 | 5 | Phase 3 |
| HL-01..05 | 5 | Phase 3 |
| JARVIS-01..08 | 8 | Phase 4 |
| JOBS-01..05 | 5 | Phase 4 |
| DEV-01..12 | 12 | Phases 2, 4 |
| CTX-01..04 | 4 | Phase 4 |
| VOICE-01..05 | 5 | Phase 5 |
| MON-01..05 | 5 | Phase 5 |
| LLM-01..05 | 5 | Phase 5 |

### Pending Todos

- Set up other 2 servers when motherboard bent pins are resolved
- Revoke exposed Tailscale auth key and generate new one

### Blockers/Concerns

- [Research]: DefiTuna tuna-sdk package name and API surface are LOW confidence -- must verify against GitHub before Phase 3 implementation.
- [Research]: OpenClaw/Lobster/Claw Hub IPC mechanism is LOW confidence -- verify against openclaw-ansible source during Phase 1.
- [Research]: Upwork API access terms unknown -- verify before building job scanner in Phase 4.
- [Hardware]: 2 of 3 motherboards have bent pins. May only get 1-2 working servers. If only 1 or 2 work, will consolidate roles onto dev server (multi-personality on different ports).
- [Security]: Tailscale auth key was exposed in chat -- needs to be revoked and regenerated.

## Session Continuity

Last session: 2026-02-22
Stopped at: Ollama + local LLM setup on dev server. User physically moving second GTX 1070 from Windows PC to dev server. Both machines going offline for hardware swap.
Resume file: .planning/phases/01-infrastructure-and-notifications-foundation/.continue-here.md

### Changes made in session 2 (2026-02-22):
- Investigated OpenClaw auth — Anthropic blocked OAuth tokens from Claude subscriptions in third-party tools (Jan 2026). No OAuth option exists in openclaw configure.
- Decision: Use Ollama with local LLMs on dual GTX 1070 8GB (free, no API cost) as primary provider
- Decision: Add Anthropic/OpenAI API keys later when budget allows (next month)
- Discord bot deployed but not responding yet — needs LLM provider configured
- User installing second GTX 1070 (from Windows PC) into dev server for 16GB combined VRAM
- Target model: Qwen 2.5 Coder 14B (fits in 16GB VRAM across both GPUs)
- NEXT: After reboot, verify both GPUs with nvidia-smi, install Ollama, pull model, configure OpenClaw to use local provider

### Changes made in session 1 (2026-02-22):
- Built and provisioned ola-claw-dev server (Ubuntu 24.04 on NVMe, 64GB RAM)
- Installed Tailscale, SSHed in via tailscale hostname
- Ran Plan 01-01 playbook: UFW, Fail2ban, SSH hardening, unattended-upgrades
- Fixed: roles_path in ansible.cfg, sshd validate command, tailscale skip-if-connected
- Ran Plan 01-02 playbook: Node.js 22, OpenClaw installed, gateway running
- Fixed: gateway.mode=local required, openclaw gateway install/start commands
- Created GitHub repo (olalawal/openclaw-homelab, private), pushed all code
- Installed gh CLI on Windows + dev server, authenticated both
- Extended NVMe LVM to full 1.8TB, created /data directory
- Deployed Dev Factory SOUL.md with autonomous build capabilities
- Updated Crypto SOUL.md with pattern analysis, wallet tracking, ore/godl farming
- All Ansible fixes committed so other servers will work first try
