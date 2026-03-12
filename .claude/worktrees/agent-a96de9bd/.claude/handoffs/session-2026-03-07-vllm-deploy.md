# Handoff — 2026-03-07 vLLM Fleet Deployment

## Resume With
"Continue from handoff session-2026-03-07-vllm-deploy"

---

## What Was Done This Session

### Full Fleet LLM Deployment — Issue #24 (documented)

**Zifnab** (RTX 2070 Super + RTX 2080, 16GB, CC 7.5, tensor-parallel-size 2):
- vLLM v0.16.1 serving Qwen3.5-4B-AWQ at port 8000
- Model name: `qwen3.5-4b`, ~22 tok/s
- Service: `vllm.service` (systemd, enabled, auto-restart)
- Config: `--gpu-memory-utilization 0.80`, `--max-model-len 2048`, `--enforce-eager`, `--served-model-name qwen3.5-4b`
- Open WebUI on port 8080 (Docker, no auth, ENABLE_OLLAMA_API=false)

**Haplo** (GTX 1070 + 1070 Ti, CC 6.1):
- Ollama 0.17.6 serving Qwen3.5-9B-GGUF (Q4_K_M) at port 11434
- Imported from local file: `/data/repos/Qwen3.5-9B-GGUF/Qwen3.5-9B-Q4_K_M.gguf`
- ~24 tok/s (largest model in fleet, most capable)
- Service: `ollama.service` (systemd, enabled, auto-restart)
- Open WebUI on port 8080 (Docker, no auth, Ollama backend)

**Hugh** (GTX 1070 + GTX 1070 Ti, 16GB, CC 6.1):
- Ollama 0.17.7 serving qwen3.5:4b at port 11434
- Pulled from registry after upgrading Ollama from 0.17.0
- ~30 tok/s (fastest in fleet)
- Service: `ollama.service` (systemd, enabled, auto-restart)
- Open WebUI on port 8080 (Docker, no auth, Ollama backend)

**OpenClaw routing**: All 3 servers have vllm + ollama providers in openclaw.json

### Previous Session Work (PRs merged)
- PR #170 — killfeed live feed (no dedup)
- PR #169 — SOUL.md deprecated repos (merged then reverted)
- PR #167 — deploy path fix
- PR #165 — embed cleanup

---

## Endpoints

| Service | Server | URL | Status |
|---------|--------|-----|--------|
| vLLM API | Zifnab | http://100.103.189.117:8000/v1 | ACTIVE |
| vLLM Docs | Zifnab | http://100.103.189.117:8000/docs | ACTIVE |
| Ollama API | Haplo | http://100.94.203.10:11434 | ACTIVE |
| Ollama API | Hugh | http://100.104.166.53:11434 | ACTIVE |
| Open WebUI | Zifnab | http://100.103.189.117:8080 | ACTIVE |
| Open WebUI | Haplo | http://100.94.203.10:8080 | ACTIVE |
| Open WebUI | Hugh | http://100.104.166.53:8080 | ACTIVE |

---

## Benchmark Results

| Test | Zifnab (4B AWQ/vLLM) | Haplo (9B GGUF/Ollama) | Hugh (4B GGUF/Ollama) |
|------|:---:|:---:|:---:|
| Short (50 tok) | 10.4 tok/s | 9.1 tok/s | 12.1 tok/s |
| Medium (200 tok) | 22.4 tok/s | 24.6 tok/s | 32.7 tok/s |
| Coding | 22.4 tok/s | 24.4 tok/s | 32.6 tok/s |
| Reasoning | 16.9 tok/s | 24.5 tok/s | 31.7 tok/s |
| Long input | 22.0 tok/s | 21.8 tok/s | 27.8 tok/s |
| Sequential 5x | 22.0 tok/s | 23.3 tok/s | 29.3 tok/s |

---

## Open Tickets
- #24 — vLLM/LLM deployment (Phase 1 DONE fleet-wide. Phase 2 = GPU upgrades)
- #166 — auto-delete killfeed Discord messages >24h
- #163 — PnL calculation incorrect
- #157 — per-position separate embeds (may be done)
- #154 — voice message transcription
- #146 — Phase 2 SL/TP Automation
- #145 — Phase 1 Position Monitor
- #137 — Hugh CLI reinstall
- #131 — Shyft API key

## Key Files
- `/etc/systemd/system/vllm.service` (Zifnab): vLLM config
- `/etc/systemd/system/ollama.service` (Haplo, Hugh): Ollama config
- Open WebUI: Docker containers named `open-webui` on all 3 servers
- OpenClaw configs: `~/.openclaw/openclaw.json` on all 3 servers
