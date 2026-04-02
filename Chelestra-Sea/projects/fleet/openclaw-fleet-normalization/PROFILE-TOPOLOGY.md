# OpenClaw Fleet Profile Topology

Last updated: 2026-04-01

## Architecture

Every agent runs as an isolated OpenClaw profile with its own:
- State directory: `~/.openclaw-<name>/`
- Config: `~/.openclaw-<name>/openclaw.json`
- Sessions: `~/.openclaw-<name>/agents/main/sessions/`
- Memory: `~/.openclaw-<name>/memory/`
- Gateway port: unique per server

Each profile is started by a dedicated systemd user service: `openclaw-gateway-<name>.service`

The service unit sets three environment variables that direct the gateway to the right profile:
- `OPENCLAW_STATE_DIR=/home/openclaw/.openclaw-<name>`
- `OPENCLAW_CONFIG_PATH=/home/openclaw/.openclaw-<name>/openclaw.json`
- `OPENCLAW_PROFILE=<name>`

There is only one agent slot per profile (`agents/main/`). Multi-agent is achieved by running multiple profiles on the same server, not multiple agents within one profile.

## CLI Profile Rule (MANDATORY)

Every `openclaw` CLI command MUST use `--profile <name>` or set `OPENCLAW_PROFILE=<name>`. Without it, the CLI falls back to `~/.openclaw/` which is NOT any agent.

## Default Root

`~/.openclaw` is a symlink to `/data/openclaw/` on all 3 servers. No running gateway uses it. It exists as a legacy artifact from before profile migration.

**Status**: Scheduled for removal. Contents to be archived, symlink to be deleted.

The `/data/openclaw/` directory also contains server-level infrastructure (scripts, shared data) that is accessed by absolute path, not through the symlink.

## ola-claw-main (Zifnab) — 4 agents

| Agent | Profile Dir | Port | Service | Status |
|---|---|---|---|---|
| zifnab | ~/.openclaw-zifnab | 18789 | openclaw-gateway-zifnab.service | running |
| drugar | ~/.openclaw-drugar | 18840 | openclaw-gateway-drugar.service | running |
| ramu | ~/.openclaw-ramu | 18820 | openclaw-gateway-ramu.service | running |
| rega | ~/.openclaw-rega | 18811 | openclaw-gateway-rega.service | running |

Also running on this server:
- vLLM serving Qwen3.5-9B-AWQ on port 8000 (2x GPU tensor parallel)
- SSH tunnel to Windows for CDP browser (127.0.0.1:9222)
- Backup timers (local + Windows H: drive)

Stale leftovers:
- `openclaw-gateway.service.bak` (old default unit)
- `openclaw-gateway-sinistrad.service.d/override.conf` (no service file, just orphaned override dir)

## ola-claw-dev (Haplo) — 12 agents

| Agent | Profile Dir | Port | Service | Status |
|---|---|---|---|---|
| haplo | ~/.openclaw-haplo | 18789 | openclaw-gateway-haplo.service | running |
| alfred | ~/.openclaw-alfred | 18810 | openclaw-gateway-alfred.service | running |
| marit | ~/.openclaw-marit | 18811 | openclaw-gateway-marit.service | running |
| paithan | ~/.openclaw-paithan | 18830 | openclaw-gateway-paithan.service | running |
| edmund | ~/.openclaw-edmund | 18840 | openclaw-gateway-edmund.service | running |
| iridal | ~/.openclaw-iridal | 18841 | openclaw-gateway-iridal.service | running |
| balthazar | ~/.openclaw-balthazar | 18843 | openclaw-gateway-balthazar.service | running |
| vasu | ~/.openclaw-vasu | 18844 | openclaw-gateway-vasu.service | running |
| limbeck | ~/.openclaw-limbeck | 18846 | openclaw-gateway-limbeck.service | running |
| jonathon | ~/.openclaw-jonathon | 18849 | openclaw-gateway-jonathon.service | running |
| ciang | ~/.openclaw-ciang | 18850 | openclaw-gateway-ciang.service | running |
| trian | ~/.openclaw-trian | 18853 | openclaw-gateway-trian.service | running |

Stale override dirs (no service files, just orphaned .service.d/ dirs):
- bane, grundle, jarre, kleitus, lenthan, orla, roland

## ola-claw-trade (Hugh) — 4 agents

| Agent | Profile Dir | Port | Service | Status |
|---|---|---|---|---|
| hugh | ~/.openclaw-hugh | 18789 | openclaw-gateway-hugh.service | running |
| devon | ~/.openclaw-devon | ? | openclaw-gateway-devon.service | running |
| samah | ~/.openclaw-samah | ? | openclaw-gateway-samah.service | running |
| sinistrad | ~/.openclaw-sinistrad | ? | openclaw-gateway-sinistrad.service | running |

Stale override dir:
- calandra (minimax.conf + override.conf, no service file)

## Shared Infrastructure (per server)

All profiles on a server share:
- The OpenClaw binary at `/usr/lib/node_modules/openclaw/`
- Vendor patches applied to that binary
- The `openclaw` system user
- systemd user session (`loginctl enable-linger`)

## Service Drop-ins

Some agents have `.service.d/` override directories with additional env vars:
- `override.conf` — common overrides
- `gemini.conf` — Gemini API key injection
- `minimax.conf` — MiniMax API key injection

## Agent-Specific Overrides

| Agent | Override | Reason |
|---|---|---|
| vasu | `danger-full-access` sandbox | MCP network access for Unity |
| limbeck | `danger-full-access` sandbox | MCP network access for Roblox |
| sinistrad | CDP browser profile 127.0.0.1:9222 | Browser automation |
| haplo | `thinkingDefault: off` | Token waste prevention |
