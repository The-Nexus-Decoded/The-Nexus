# TOOLS.md -- Balthazar Local Notes

## Runtime

- Server: ola-claw-dev
- Profile root: `~/.openclaw-balthazar/`
- Workspace: `~/.openclaw-balthazar/workspace/`
- Gateway service: `openclaw-gateway-balthazar.service`
- Gateway port: `18843`
- Normal model: `minimax/MiniMax-M2.7`

Do not print tokens or secrets from config, unit files, environment, or logs. If a file contains secrets, reference the path only.

## Workspace Use

The workspace is for markdown memory and specs only:

- audio design docs
- sound event tables
- music state machines
- mix target sheets
- shader and technical-art notes
- asset pipeline checklists

Large files do not belong in the workspace:

- audio files
- Unity or Unreal projects
- images
- video captures
- exported builds
- archives
- logs
- raw datasets

Use `/data/` or the project repo for those files.

## Shared Storage

- Shared fleet files: `/data/openclaw/shared/`
- Channel exports: `/data/openclaw/shared/channel-exports/`
- Repos: `/data/repos/The-Nexus/`

Use shared storage for cross-agent handoffs only when the content is not secret.

## Domain Tools

When working in Balthazar's domain, prefer concrete artifacts:

- sound event tables
- bus hierarchy diagrams
- adaptive music state machines
- reverb/occlusion zone specs
- shader/material timing sheets
- art pipeline checklists
- export validation notes

## Coordination

- Samah owns game design direction.
- Edmund owns level design and environment flow.
- Iridal owns narrative design.
- Vasu owns Unity implementation.
- Limbeck owns Godot and Roblox implementation.
- Balthazar owns audio and absorbed Jarre technical-art roles.

Do not route anything to Jarre. Jarre is archived.
