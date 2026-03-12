# OpenClaw Homelab

## What This Is

A 3-server home lab running OpenClaw personal AI assistants, each specialized for a different workload: autonomous crypto trading on Solana/Meteora, job hunting and income generation, and coding assistance. The system runs 24/7, handling tasks overnight while the owner sleeps.

## Core Value

Autonomous productivity — the system works while you don't, generating income through crypto trading and freelance work, and accelerating your coding projects.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 3 Ubuntu 24.04 LTS Server machines provisioned bare-metal (no Docker, no VMs)
- [ ] OpenClaw installed native on all 3 servers via `openclaw onboard --install-daemon`
- [ ] Tailscale VPN mesh connecting all servers + Windows workstation
- [ ] Server 2 (Crypto): Meteora LP farming — open/close positions, farm fees
- [ ] Server 2 (Crypto): DefiTuna leveraged LP — manage positions with liquidation protection
- [ ] Server 2 (Crypto): Hyperliquid leveraged + spot trading via Python/Rust SDKs
- [ ] Server 2 (Crypto): Auto-add funding when approaching liquidation threshold
- [ ] Server 2 (Crypto): Always maintain reserve funds to cover longs/shorts
- [ ] Server 2 (Crypto): Auto-execute trades under $250, confirm above $250 (raise limit as system proves itself)
- [ ] Server 2 (Crypto): Quant-style token trend analysis and signal generation
- [ ] Server 1 (Jarvis): Central brain — proactive personal intelligence, orchestrates other servers, reads files, emails, messages, preempts needs
- [ ] Server 1 (Jarvis): Scan freelance platforms (Upwork, Fiverr, Toptal) for opportunities
- [ ] Server 1 (Jarvis): Surface full-time job openings matching skills
- [ ] Server 1 (Jarvis): Identify AI-completable tasks for autonomous income
- [ ] Server 2 (Crypto): Meteora LP farming, DefiTuna leveraged LP, Hyperliquid spot/perps, risk management
- [ ] Server 3 (Dev Factory): Autonomous coding agents that build complete apps, create integrations for trade+main servers, VS Code Server, GitHub CI/CD, API integration builder (Xano, Supabase, any REST/GraphQL)
- [ ] Remote monitoring dashboard accessible via Tailscale
- [ ] Notification system for trade confirmations and job matches

### Out of Scope

- Mobile app — web dashboard sufficient for monitoring
- Cloud hosting — home lab only, no recurring cloud costs
- iCloud sync to Linux — use Git for code sync instead
- Docker/VMs for OpenClaw — bare-metal for full native performance on all 24 cores
- Building custom trading bots from scratch — leverage existing SDKs (MeteoraAg, DefiTuna, Hyperliquid)

## Context

- Owner is an active manual Meteora/Solana trader looking to automate
- Trading APIs/SDKs to integrate:
  - MeteoraAg (https://github.com/MeteoraAg) — standard LP pools, fee farming
  - DefiTuna (https://github.com/DefiTuna/tuna-sdk) — leveraged LP positions
  - Hyperliquid Python SDK (https://github.com/hyperliquid-dex/hyperliquid-python-sdk) — leveraged + spot trading
  - Hyperliquid Rust SDK (https://github.com/infinitefield/hypersdk) — alternative Rust client
- Hardware: 3x Ryzen 24-core CPUs, 16GB RAM each, 2x GTX 1070 8GB per server (6 total, 16GB VRAM per server), 240GB SSDs (20 available) + 3x 2TB NVMe (one per server), 1200W PSUs, open-air mining board chassis with 3x PCIe x16 slots each (being built). Note: 2 of 3 motherboards have bent pins — may not POST
- Existing deployment guide: `OpenClaw_3Box_Deployment_Guide.docx` covers full bare-metal setup
- Deployment approach: Bare-metal Ubuntu 24.04 (no Docker for OpenClaw, no VMs)
- Server hostnames: ola-claw-main (.101, Jarvis), ola-claw-trade (.102, Crypto), ola-claw-dev (.103, Dev Factory)
- Node.js 22+ required for OpenClaw
- Each box runs independent OpenClaw gateway on default port 18789
- Agent customization via SOUL.md in ~/openclaw/workspace/ per box
- Channel integration: Discord (per-agent channels, primary), iMessage (critical alerts to phone)
- Optional Grafana + Prometheus monitoring on Box 1
- Owner is Windows-primary, new to Ubuntu/Linux — deployment guide provides step-by-step commands
- Claw Hub provides a skill directory for extending OpenClaw capabilities
- Lobster (workflow shell) enables composable automation pipelines
- GSD (Get Shit Done) — spec-driven development system for Claude Code (https://github.com/gsd-build/get-shit-done, npm: get-shit-done-cc). Installed globally on ola-claw-dev for autonomous project management. Configured with skip-permissions and auto flags so coding agents can run full project lifecycles (new-project, plan-phase, execute-phase, verify-work) without manual prompts.
- Planning and project management happens on Windows workstation (iCloud-synced)
- Deployment to servers happens via SSH from Windows workstation

## Constraints

- **Hardware**: 3x Ryzen 24-core / 16GB RAM + 240GB SSDs (OS) + 3x 2TB NVMe (data, one per server) + 2x GTX 1070 8GB per server (16GB VRAM/server). Open-air mining board chassis, 1200W PSUs, 3x PCIe x16 slots per board. 17 spare 240GB SSDs. GPU upgrade to RTX 5090 planned after Phase 5 proves pipeline on 1070s. Note: 2 motherboards have bent pins — may affect server count
- **OS**: Ubuntu Server on all 3 machines (recommended over Windows Server for OpenClaw)
- **Network**: Home lab, Tailscale VPN for secure remote access
- **Crypto threshold**: $250 auto-trade limit, manual confirmation above (raise gradually as system matures)
- **Linux experience**: Minimal — all setup must be scripted/automated
- **Sync**: Git for code, no iCloud on Linux

## Disk Layout

All servers: 240GB SSD for OS + 2TB NVMe for data.

| Server | OS Drive | Data Drive (/data) | Rationale |
|--------|----------|-------------------|-----------|
| ola-claw-main (Jarvis) | 240GB SSD | 2TB NVMe | Central brain — email archives, file indexes, message history, vector DB, context embeddings, job scan data |
| ola-claw-trade (Crypto) | 240GB SSD | 2TB NVMe | Trading needs fast I/O for real-time position data, price feeds, and trade execution |
| ola-claw-dev (Coding) | 240GB SSD | 2TB NVMe | LLM models are large (4-40GB each), code repos and build artifacts grow fast |

**Available spares:** 17x 240GB SSDs (from 20 total, 3 used for OS)
**Inventory:** 3x 2TB NVMe (one per server), 20x 240GB SSD (3 used, 17 spare), 3x PCIe x16 slots per board, 3x 1200W PSU

OpenClaw workspace path: `/data/openclaw/` (symlinked from `~/.openclaw/`)

## Backup Strategy

**Path:** Servers → Windows PC → iCloud (automatic)

Each server runs a weekly rsync cron job over Tailscale to a shared folder on the Windows PC. The Windows PC has iCloud Drive installed, so anything landing in the iCloud folder syncs to the cloud automatically.

```
Server /data/openclaw/ --rsync--> Windows PC iCloudDrive/Backups/ola-claw-main/ --iCloud--> Cloud
```

- **Frequency:** Weekly (Sunday 3 AM via cron)
- **Method:** `rsync -az --delete` over Tailscale SSH to Windows SMB share (or rsync daemon)
- **What's backed up:** OpenClaw workspace, trade logs, config, SOUL.md, scripts — NOT the OS (Ansible rebuilds that)
- **Retention:** iCloud handles versioning; rsync `--delete` keeps backup mirroring current state

## Hardware to Order (Phase 5)

Order these before Phase 5 starts. No rush — Phases 1-4 don't need GPUs or audio hardware.

### GPU (Local LLM Inference)

**Current hardware:** 2x GTX 1070 8GB per server (6 total, from mining rigs). 16GB VRAM per server. Open-air chassis, 1200W PSUs, 3x PCIe x16 slots per board (1 slot free per server for future upgrade).

**Phase 5 starts on 1070s** — 2x 1070 gives 16GB VRAM per server, enough for 13B models quantized. Proves the full pipeline before investing in 5090s.

| Stage | GPU Config | VRAM/Server | Models | Est. Cost |
|-------|-----------|-------------|--------|-----------|
| Phase 5 (now) | 2x GTX 1070 8GB (existing) | 16GB | Mistral 7B, Qwen 2.5 7B, Llama 13B Q4, Whisper Medium | $0 (already owned) |
| Upgrade (later) | 2x RTX 5090 32GB | 64GB | 70B models quantized, Whisper Large, DeepSeek-V3 | $4000/server |
| Upgrade alt | 2x Used A100 80GB | 160GB | 70B full precision, 405B quantized | $10000-14000/server |

**Why 2x 1070 is better than expected:** With tensor parallelism (llama.cpp, vLLM), the two cards pool their VRAM. 16GB combined handles Llama 13B Q4 (~8GB), Whisper Medium (~1.5GB), and Piper TTS simultaneously. That's a meaningful local AI setup at zero cost.

**1200W PSUs confirmed sufficient** for 2x 5090 upgrade (450W TDP each = 900W GPU + ~200W system = 1100W peak).

**3x PCIe x16 slots confirmed.** 2 slots used by 1070s, 1 free per board for NVMe adapter or third GPU later.

**Software stack (installed during Phase 5):**
- NVIDIA proprietary driver + CUDA toolkit
- Ollama (simple) or vLLM (high-throughput) for model serving
- OpenClaw configured to route to local `http://localhost:11434` (Ollama) or `http://localhost:8000` (vLLM)

### Voice Interface

| Item | Qty | Why | Recommended | Est. Cost |
|------|-----|-----|-------------|-----------|
| USB Conference Speakerphone | 1-3 | All-in-one mic + speaker per server, Linux-compatible, works with ALSA/PulseAudio out of the box | Jabra Speak 410 (~$100) or Jabra Speak 510 (~$150) | $100-450 |
| USB Sound Card (backup) | 1-2 | Only needed if server motherboards lack onboard audio AND you use separate mic/speakers instead of speakerphone | Plugable USB Audio Adapter (~$12) | $12-24 |

**Alternative to speakerphone:** Separate USB microphone (Fifine K669 ~$30) + powered USB speakers (~$20). Cheaper but two devices per server instead of one.

**Voice software stack (installed during Phase 5):**
- PipeWire or PulseAudio — audio routing on Ubuntu
- Whisper (OpenAI) or faster-whisper — on-device speech-to-text (GPU-accelerated with 5090, or CPU fallback)
- Piper TTS — on-device text-to-speech (fast, lightweight, no cloud dependency)
- openWakeWord — wake word detection ("Hey Ola" custom trained or pre-built)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bare-metal Ubuntu 24.04 (no Docker/VMs) | Full native performance on all 24 cores per box | -- Pending |
| 1 server per role (main/trade/dev) | Clear separation of concerns, isolated failure domains | -- Pending |
| Tailscale for networking | Private mesh VPN, access dashboards from Windows workstation | -- Pending |
| $250 auto-trade threshold | Balance autonomy with risk management; raise gradually | -- Pending |
| Node.js 22+ for OpenClaw | Required by OpenClaw runtime | -- Pending |
| SOUL.md per agent for personality | Each box gets specialized behavior via workspace config | -- Pending |

---
*Last updated: 2026-02-17 after incorporating deployment guide context*
