# TOOLS.md -- Vasu's Environment (ola-claw-dev)

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
| ~/.openclaw-vasu/ | Your profile root |
| ~/.openclaw-vasu/workspace/ | Your workspace (SOUL.md, MEMORY.md, etc.) |
| ~/.openclaw-vasu/openclaw.json | Your config (NEVER full-rewrite, use targeted patches) |
| /data/repos/ | Git repositories |
| /data/repos/The-Nexus/ | The-Nexus monorepo |
| /data/repos/The-Nexus/Arianus-Sky/projects/games/ | Where your Unity/Unreal game projects live |
| /data/repos/The-Nexus/Arianus-Sky/shared/unity-tooling/ | Shared Unity tooling and packages |

## Discord

| Channel | ID | Your Access |
|---------|-----|-------------|
| #the-nexus | 1475082874234343621 | requireMention: true |
| #gamesbrainstorm | 1481242053974425720 | requireMention: true |
| #games-3d | 1481317572858351709 | requireMention: true |
| #games-vr | 1480483545431412877 | requireMention: true |

Guild ID: 1475082873777426494

Your primary operating channel is #games-3d (engine and systems work). Use #games-vr for XR-specific discussion, #gamesbrainstorm for cross-engine project ideation, and #the-nexus for fleet-wide announcements.

## Gateway

```bash
# Health check
curl -s http://127.0.0.1:18844/health

# View logs
journalctl --user -u openclaw-gateway-vasu.service --no-pager -n 50

# Restart (only if needed)
systemctl --user restart openclaw-gateway-vasu.service

# Status check
systemctl --user status openclaw-gateway-vasu.service --no-pager
```

## SSH Access

You have **local-only** access on ola-claw-dev. No cross-server SSH.
If you need something on another server, route through Haplo, Alfred, or Zifnab.

## Shared Channel Exports

Discord channel history exports are available at `/data/openclaw/shared/channel-exports/`. These contain the full conversation history across all fleet channels.

Read these files to understand the fleet's context — what projects exist, what's been discussed, what decisions were made. Save ONLY information relevant to YOUR role to your MEMORY.md. Use good judgment. Do not copy raw chat logs into your workspace.

## Engine Toolchain Notes

**Unity:**
- Profiler: Window → Analysis → Profiler (capture and read frame-by-frame)
- Frame Debugger: Window → Analysis → Frame Debugger (draw call breakdown)
- Memory Profiler: install from Package Manager, use for heap analysis
- Addressables: Window → Asset Management → Addressables → Groups
- Shader Graph and VFX Graph: Package Manager → Unity Registry

**Unreal:**
- Unreal Insights: Window → Developer Tools → Unreal Insights (frame-level profiling, timing insights, memory insights)
- Stat commands: `stat unit`, `stat gpu`, `stat fps`, `stat rhi`, `stat scenerendering`
- Memory Insights: opened from Unreal Insights, required for memory investigation
- Niagara, Material Editor, World Partition, Chaos: all built into UE5 Editor

**Both:**
- Profile on the target device, not the editor
- Measure before you change, measure after, record both
- A profiler capture is a craftsman's evidence — a hunch is not

## Builds and CI

- Builds run on Haplo's GitHub Actions runner — do not build on your server
- Never commit `Library/`, `Build/`, `Intermediate/`, `Saved/`, or any auto-generated engine folder
- Keep `.gitignore` strict for Unity and Unreal projects (see REPO-MAP.md for the required entries)
