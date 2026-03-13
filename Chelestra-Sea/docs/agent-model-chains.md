# Agent Model Chains

Last updated: 2026-03-12

All agents use OpenClaw's `agents.defaults.model` config with a primary model and ordered fallback chain.
Provider configs live in `models.providers` within each agent's `openclaw.json`.

---

## ola-claw-dev

| Agent | Primary | Fallbacks |
|---|---|---|
| haplo | `codex-cli/gpt-5.4` | gemini-2.5-flash → minimax/MiniMax-M2.5 |
| iridal | `codex-cli/gpt-5.4` | gemini-2.5-flash → minimax/MiniMax-M2.5 |
| ciang | `google/gemini-2.5-flash` | minimax/MiniMax-M2.5 |
| lenthan | `google/gemini-2.5-flash` | minimax/MiniMax-M2.5 |
| roland | `google/gemini-2.5-flash` | minimax/MiniMax-M2.5 |
| trian | `google/gemini-2.5-flash` | minimax/MiniMax-M2.5 |
| marit | `minimax/MiniMax-M2.5` | gemini-2.5-flash → stepfun/step-3.5-flash:free → qwen/qwen3-4b:free → ollama/qwen3.5-9b-tools |
| orla | `minimax/MiniMax-M2.5` | gemini-2.5-flash → stepfun/step-3.5-flash:free → qwen/qwen3-4b:free → ollama/qwen3.5-9b-tools |
| paithan | `minimax/MiniMax-M2.5` | gemini-2.5-flash → stepfun/step-3.5-flash:free → qwen/qwen3-4b:free → ollama/qwen3.5-9b-tools |
| alfred | `minimax/MiniMax-M2.5` | step-3.5-flash:free → gemini-2.5-flash → glm-4.5-air:free → qwen3-vl-235b:free → trinity-large:free → qwen3-4b:free → deepseek-v3.2 → grok-4.1-fast → ollama/qwen2.5-coder:7b |
| balthazar | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| bane | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| edmund | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| grundle | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| jarre | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| jonathon | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| kleitus | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| limbeck | `minimax/MiniMax-M2.5` | *(same as alfred)* |
| vasu | `minimax/MiniMax-M2.5` | *(same as alfred)* |

### Alfred full fallback chain (shared by 10 agents above)
```
openrouter/stepfun/step-3.5-flash:free
google/gemini-2.5-flash
openrouter/z-ai/glm-4.5-air:free
openrouter/qwen/qwen3-vl-235b-a22b-thinking
openrouter/arcee-ai/trinity-large-preview:free
openrouter/qwen/qwen3-4b:free
openrouter/deepseek/deepseek-v3.2
openrouter/x-ai/grok-4.1-fast
ollama/qwen2.5-coder:7b
```

---

## ola-claw-main

| Agent | Primary | Fallbacks |
|---|---|---|
| zifnab | `codex-cli/gpt-5.4` | gemini-2.5-flash → minimax/MiniMax-M2.5 |
| alake | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| aleatha | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| drugar | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| ramu | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| rega | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| sangdrax | `minimax/MiniMax-M2.5` | *(alfred chain)* |

---

## ola-claw-trade

| Agent | Primary | Fallbacks |
|---|---|---|
| calandra | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| devon | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| samah | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| sinistrad | `minimax/MiniMax-M2.5` | *(alfred chain)* |
| hugh | `minimax/MiniMax-M2.5` | *(alfred chain)* |

---

## Notes

- **codex-cli agents** (haplo, iridal, zifnab): use `/usr/local/bin/codex-wrapper` — strips unsupported flags and recombines split prompt text before passing to `/usr/bin/codex`
- **ciang, lenthan, roland, trian**: shorter chain by design (art/image agents, gemini-primary)
- **marit, orla, paithan**: shorter chain, different fallback order (pre-Alfred standardization)
- OpenRouter API key shared across all agents
- MiniMax API key injected via `${MINIMAX_API_KEY}` env var on each server
- Ollama runs locally on each server at `http://localhost:11434`
