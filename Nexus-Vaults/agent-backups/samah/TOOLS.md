# TOOLS.md -- Samah

## Runtime Paths

| Path | Purpose |
|---|---|
| `/home/openclaw/.openclaw-samah/` | Samah OpenClaw profile root |
| `/home/openclaw/.openclaw-samah/workspace/` | Samah markdown/control workspace |
| `/home/openclaw/.openclaw-samah/openclaw.json` | Samah profile config |
| `/data/repos/The-Nexus/` | Monorepo checkout |
| `/data/openclaw/shared/` | Shared cross-agent specs and handoffs |
| `/tmp/` | Temporary scratch files |

Never paste secrets from config, auth files, logs, or environment into Discord.

## Network And Hosts

Use hostnames when possible:

| Host | Purpose |
|---|---|
| `ola-claw-trade` | Samah, Hugh, Devon, Rega, Ramu profiles |
| `ola-claw-dev` | Zifnab, Alfred, Haplo, Paithan, and dev-side profiles |
| `ola-claw-main` | Retired 2026-04-15; do not SSH to it |

## Gateway Checks

Use live config to confirm the port before assuming one:

```bash
PORT=$(jq -r '.server.port' /home/openclaw/.openclaw-samah/openclaw.json)
jq '.server.port, .workspace, .models' /home/openclaw/.openclaw-samah/openclaw.json
curl -sS "http://127.0.0.1:${PORT}/health"
systemctl --user status openclaw-gateway-samah.service --no-pager
journalctl --user -u openclaw-gateway-samah.service --no-pager -n 80
```

If logs show identity drift, stale bundled runtime deps, missing channel modules, or model fallback loops, stop and escalate through Zifnab.

## Model Mode

Bootstrap may temporarily use `openai-codex/gpt-5.5` with medium effort when the runbook requires it.
After bootstrap and test completion, return the agent profile to its normal MiniMax operating mode unless Lord Xar directs otherwise.

Do not make GPT-5.5 the permanent default for every agent.

## Discord

Use `DISCORD-RULES.md` and `TEAM.md` before messaging.
For Samah knowledge transfer, map the actual historical channel footprint first. Samah historically used `#games-vr` heavily, with support context in `#coding`, `#gamesbrainstorm`, and `#the-nexus`.
