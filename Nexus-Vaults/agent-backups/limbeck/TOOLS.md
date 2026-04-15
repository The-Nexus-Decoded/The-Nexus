# TOOLS.md -- Limbeck's Environment (ola-claw-dev)

## Tailscale Network

| Host | Tailscale IP | User | Role |
|------|-------------|------|------|
| ola-claw-dev (you) | 100.94.203.10 | openclaw | Development |
| ola-claw-trade | 100.104.166.53 | openclaw | Trading |
| ola-claw-main | 100.103.189.117 | openclaw | Coordinator (DOWN) |
| Windows workstation | 100.90.155.49 | olawal | Claude CLI, GSD, backups |

All connections via Tailscale IPs. Never use LAN IPs -- they change.

## Key Paths (this server)

| Path | Purpose |
|------|---------|
| ~/.openclaw-limbeck/ | Your profile root |
| ~/.openclaw-limbeck/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-limbeck/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo |
| /data/repos/The-Nexus/Arianus-Sky/projects/games/ | Where your Godot and Roblox game projects live |
| /data/repos/The-Nexus/Arianus-Sky/shared/godot-addons/ | Shared Godot addons you publish |
| /data/repos/The-Nexus/Arianus-Sky/shared/roblox-modules/ | Shared Roblox module scripts you publish |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #gamesbrainstorm | 1481242053974425720 | requireMention: true |
| #games-3d | 1481317572858351709 | requireMention: true |

Guild ID: 1475082873777426494

Your primary operating channel is #games-3d (Godot and Roblox dev work). Use #gamesbrainstorm for cross-engine project ideation and #the-nexus for fleet-wide announcements.

**Routing rule:** if a message in #games-3d or any channel mentions another agent by bot ID, stay silent. Vasu(Dev-Unity) is 1481183822900105239 and he holds the Unity and Unreal layer; do not respond to messages addressed to him.

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18846/health

# View logs
journalctl --user -u openclaw-gateway-limbeck.service --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-limbeck.service

# Status check
systemctl --user status openclaw-gateway-limbeck.service --no-pager
```

## SSH Access

You have **local-only** access on ola-claw-dev. No cross-server SSH.
If you need something on another server, route through Haplo, Alfred, or Zifnab.

## Shared Channel Exports

Discord channel history exports are at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read them to understand fleet context. Save ONLY information relevant to YOUR role (Godot, Roblox, indie game shipping, community tooling) to your MEMORY.md. Do not copy raw chat logs into your workspace.

## Engine Toolchain Notes

**Godot 4:**
- GDScript profiler: Debugger panel → Profiler tab (capture, read frame-by-frame)
- Monitor: Debugger → Monitor (FPS, memory, draw calls, physics objects)
- Scene: Scene → Reload, or F6 to run current scene in isolation
- Export templates: Project → Export, manage target platform templates
- Asset Library: AssetLib tab in the editor, or online at godotengine.org/asset-library
- Debug remote: Debug → Small Deploy With Network FS for on-device debugging

**Roblox:**
- Script Performance: Studio → View → Script Performance
- MicroProfiler: Ctrl+F6 (production profiler, use on-device for honest numbers)
- Developer Console: F9 in-game, shows client and server errors
- Test server: Studio → Test → Start Server with N players
- OpenCloud API: for external integrations, always via DataStoreService or MessagingService, never bypass the platform

**Both:**
- Profile on a real cheap device, not the editor. The simulator lies.
- Ship a prototype first, measure, then grow
- Every engine limitation gets documented and the workaround linked

## Builds and CI

- Godot export builds run on Haplo's GitHub Actions runner, do not build on your server
- Roblox place publishing goes through Studio, not CI, unless a documented OpenCloud path exists
- Never commit `.import/`, `.godot/`, Godot `export/`, or Roblox place binaries to git
- Keep `.gitignore` strict for Godot and Roblox projects (see REPO-MAP.md for required entries)
