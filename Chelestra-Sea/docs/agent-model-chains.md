# Agent Model Chains

Last updated: 2026-04-01

All agents use OpenClaw's `agents.defaults.model` config with a primary model and ordered fallback chain.
Provider configs live in `models.providers` within each agent's `openclaw.json` at `~/.openclaw-<name>/openclaw.json`.

---

## ola-claw-dev (12 agents)

| Agent | Primary | Fallbacks |
|---|---|---|
| haplo | `codex-cli/gpt-5.4` | gemini-2.5-flash → minimax/MiniMax-M2.5 |
| iridal | `codex-cli/gpt-5.4` | gemini-2.5-flash → minimax/MiniMax-M2.5 |
| alfred | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| balthazar | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| ciang | `google/gemini-2.5-flash` | minimax/MiniMax-M2.5 |
| edmund | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| jonathon | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| limbeck | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| marit | `minimax/MiniMax-M2.5` | gemini-2.5-flash → stepfun/step-3.5-flash:free → qwen/qwen3-4b:free |
| paithan | `minimax/MiniMax-M2.5` | gemini-2.5-flash → stepfun/step-3.5-flash:free → qwen/qwen3-4b:free |
| trian | `google/gemini-2.5-flash` | minimax/MiniMax-M2.5 |
| vasu | `minimax/MiniMax-M2.5` | *(alfred chain)* |

### Alfred full fallback chain (shared by alfred, balthazar, edmund, jonathon, limbeck, vasu)
```
openrouter/stepfun/step-3.5-flash:free
google/gemini-2.5-flash
openrouter/z-ai/glm-4.5-air:free
openrouter/qwen/qwen3-vl-235b-a22b-thinking
openrouter/arcee-ai/trinity-large-preview:free
openrouter/qwen/qwen3-4b:free
openrouter/deepseek/deepseek-v3.2
openrouter/x-ai/grok-4.1-fast
```

---

## ola-claw-main (4 agents)

| Agent | Primary | Fallbacks |
|---|---|---|
| zifnab | `codex-cli/gpt-5.4` | gemini-2.5-flash → minimax/MiniMax-M2.5 |
| drugar | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| ramu | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| rega | `minimax/MiniMax-M2.5` | *(alfred chain)* |

---

## ola-claw-trade (4 agents)

| Agent | Primary | Fallbacks |
|---|---|---|
| hugh | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| devon | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| samah | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| sinistrad | `minimax/MiniMax-M2.5` | *(alfred chain)* |

---

## Notes

- **codex-cli agents** (haplo, iridal, zifnab): use `/usr/local/bin/codex-wrapper` — strips unsupported flags before passing to `/usr/bin/codex`
- **ciang, trian**: shorter chain by design (art/image agents, gemini-primary)
- **marit, paithan**: shorter chain, different fallback order
- OpenRouter API key shared across all agents
- MiniMax API key injected via `${MINIMAX_API_KEY}` env var on each server
- Ollama removed from all fallback chains (local models don't work for tool use)
- **Config location**: `~/.openclaw-<name>/openclaw.json` — NEVER use the default root at `/data/openclaw/openclaw.json`
