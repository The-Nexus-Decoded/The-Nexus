# OpenClaw Server Config Details

## Provider Config Structure
```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://100.94.203.10:11434",
        "apiKey": "ollama-local",
        "api": "ollama",
        "models": [{ "id": "model-name", "name": "display-name" }]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "sk-or-v1-...",
        "models": [{ "id": "google/gemini-3-flash-preview", "name": "..." }]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-3-flash-preview",
        "fallbacks": ["google/gemini-2.5-flash", "openrouter/google/gemini-3-flash-preview"]
      },
      "models": {
        "openrouter/google/gemini-3-flash-preview": {},
        "openrouter/google/gemini-3.1-pro-preview": {}
      }
    }
  }
}
```

## Google API Key Location
- Stored in: `/home/openclaw/.openclaw/agents/main/agent/auth-profiles.json`
- Key prefix: `[REDACTED]`
- This is a PAID Tier 1 Google account

## Ollama (on ola-claw-dev)
- URL: http://100.94.203.10:11434
- Models: qwen3:30b-a3b, qwen2.5-coder:32b, qwen2.5-coder:7b, llama3.1:8b
- ONLY for background tasks (file parsing), NOT agent chat

## Gateway Management
- Start/restart: `systemctl --user restart openclaw-gateway`
- Status: `systemctl --user status openclaw-gateway`
- Logs: `journalctl --user -u openclaw-gateway --no-pager -n 30`
- Health check: `curl -s http://127.0.0.1:18789/health`
- AFTER EVERY restart: check logs for Discord "logged in", curl health, and test a Discord message

## Gateway Remote Access (LAN/Tailscale UI) — CRITICAL
These 3 config keys are ALL required for non-localhost browser access:
```json
{
  "gateway": {
    "bind": "lan",
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
```
- `bind: "lan"` — listen on 0.0.0.0 instead of 127.0.0.1
- `dangerouslyAllowHostHeaderOriginFallback` — required for non-loopback bind or gateway crashes on origin validation
- `dangerouslyDisableDeviceAuth` — required or WebSocket closes with "control ui requires device identity (use HTTPS or localhost secure context)"
- URL format: `http://<tailscale-ip>:18789/?token=<gateway_token>`
- Tokens (from OPENCLAW_GATEWAY_TOKEN env or gateway.remote.token config):
  - Zifnab: `<REDACTED>`
  - Haplo: `<REDACTED>`
  - Hugh: `<REDACTED>`

## INVALID Config Keys (DO NOT USE — will crash gateway)
- `agents.defaults.models["model"].contextWindow` — NOT a valid key, crashes with "Unrecognized key"
- `--host 0.0.0.0` CLI flag — NOT a valid gateway option, crashes with "unknown option"
- `compaction.model` — NOT valid, compaction uses primary model
- `"api": "openai"` on openrouter provider — NOT valid
- `compaction.mode: "auto"` — NOT valid, only "safeguard" or omit

## Config Validation Rules
- JSON must be valid (agent auto-patches can corrupt it)
- compaction: only `{}` or `{"mode": "safeguard"}` — no "model", no "auto", no empty
- OpenRouter provider: no "api" field, must have "models" array
- OpenRouter models must be in agents.defaults.models allowlist
