# TOOLS.md -- Ciang's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you) | 100.94.203.10 | openclaw | Development / Environment Art Lead |
| ola-claw-trade | 100.104.166.53 | openclaw | Trading |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| `~/.openclaw-ciang/` | Your profile root |
| `~/.openclaw-ciang/workspace/` | Your workspace (SOUL.md, MEMORY.md, role files, playbooks) |
| `~/.openclaw-ciang/workspace/memory/` | Daily memory files |
| `~/.openclaw-ciang/openclaw.json` | Your config (NEVER full-rewrite, use targeted jq patches) |
| `~/.openclaw-ciang/media/tool-image-generation/` | Image generation output (profile root, NOT workspace) |
| `~/.openclaw-ciang/qmd/` | QMD memory backend (do not touch directly) |
| `~/.openclaw-ciang/delivery-queue/` | Queue of pending deliveries |
| `~/.openclaw-ciang/workspace/packages/` | Home-viz production deliverables (canonical production data location) |
| `~/.openclaw-ciang/workspace/refs/` | Reference image library (legacy location, preserved) |
| `~/.openclaw-ciang/ciang-work/.git/` | Local production git repo (legacy location, preserved) |
| `/data/repos/` | Git repositories (canonical) |
| `/data/repos/The-Nexus/` | The-Nexus monorepo |
| `/data/openclaw/shared/art-pipeline/` | Fleet-wide art pipeline shared dir |
| `/data/openclaw/shared/art-pipeline/environment-3d/` | Final environment 3D assets |
| `/data/openclaw/shared/art-pipeline/concepts/` | Final concept art |
| `/data/openclaw/shared/channel-exports/` | Discord channel history exports |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #games-vr | 1480483545431412877 | requireMention: true |
| #home-visualization | 1491053646639534080 | requireMention: true |

Guild ID: 1475082873777426494

Primary operating channel: **#home-visualization** for home-viz concept/stills/kit work. **#games-vr** for game environment work (kits, dungeons, props for the Nexus game team). **#the-nexus** for cross-fleet coordination.

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18840/health

# View logs
journalctl --user -u openclaw-gateway-ciang --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-ciang.service
```

Service unit file: `~/.config/systemd/user/openclaw-gateway-ciang.service`
Port: **18840** (verified in both unit ExecStart and openclaw.json gateway.port)
Primary model: `minimax/MiniMax-M2.7`
Thinking level: `xhigh`

## Image Generation MCP

Endpoint: `http://localhost:8090/mcp`

Full curl for a single image generation call:
```bash
curl -s -N -X POST http://localhost:8090/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate_image","arguments":{"prompt":"YOUR PROMPT","style":"concept-art","output_dir":"/home/openclaw/.openclaw-ciang/media/tool-image-generation/","filename":"output.png"}},"id":1}'
```

Output always lands in `~/.openclaw-ciang/media/tool-image-generation/` (profile root, not workspace). From there, you symlink into package dirs under `packages/<project>/concepts/by-agent/<owner>/<batch>-full-set/`.

## 3D Asset Generation

- **Meshy** -- AI-driven 3D model generation. Used for rapid kit draft and prop blockout. Never ship raw Meshy output -- always retopologize and polish to spec.
- **Tripo3D** -- Alternative 3D generator. Same rule: draft quality, not ship quality.
- **Blender** -- Canonical 3D tool for retopology, UV, collision, LOD, export. Launched on demand; not pinned to a persistent process.
- **Unity** / **Unreal** -- Engine integration handled by Vasu. You build kits that integrate with his scene architecture.

## SSH Access

You have **local-only** access on ola-claw-dev. No cross-server SSH.

If you need something on another server (cross-server asset sync, Hugh's trading data review for market-aware concepts, etc.), route through Haplo (dev-local), Alfred (cross-server), or Zifnab (coordinator). Do NOT attempt to grant yourself cross-server SSH access by modifying authorized_keys.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context -- what projects exist, what is in flight, what concept packages Balthazar or Paithan have been waiting on, what home-viz batches Lord Xar has commissioned. Save ONLY information relevant to YOUR role (visual design decisions, kit specs, batch delivery commitments, cross-agent dependencies) to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.

## Art Pipeline Notes

- **Packages layout**: `packages/<project-name>/concepts/by-agent/<target-agent>/<batch-id>-full-set/<NN>-<shot-name>.jpg`
- **Naming convention**: numeric prefix (00-, 01-, 02b-, etc) for stills ordering, kebab-case shot names, .jpg extension
- **Symlinks**: package dir contains symlinks into the profile-root media/tool-image-generation/ output. Do not commit the actual JPGs to git -- commit the symlinks and the README.md manifest.
- **README.md per package**: each batch dir has a README.md with the batch brief, shot list, and delivery status. Update when the batch ships.
- **Manifest update**: at package level, update the manifest when a batch completes. Manifest is the source of truth for what is delivered.

## What NOT to write here

- Python, JS, shell scripts -- code goes in `/data/repos/The-Nexus/`
- Binary assets -- never in workspace, never in git, shared pipeline only
- Raw image gen output -- that lives in profile root media/, not workspace
- Log files or raw tool output -- use `/data/logs/` or project dir

If you find yourself saving a file to the workspace and it is not a `.md`, a config, or a symlink into a package dir, stop. Put it in the right place.
