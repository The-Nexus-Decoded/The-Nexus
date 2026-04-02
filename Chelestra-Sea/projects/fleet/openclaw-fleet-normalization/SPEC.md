# OpenClaw Fleet Normalization

## Summary

The OpenClaw fleet needs a controlled cleanup across five linked areas:

1. profile-root normalization
2. model-chain normalization
3. workspace hygiene
4. stale-agent cleanup
5. relocation of `agentbaselines` and `agentbaselines-backup-*` into a better long-term home inside `The-Nexus`

This document is the control spec for the cleanup. No gateway restarts should happen until profile-root cleanup and model-chain edits are complete.

## Authoritative Live Agent List

Use this list as the source of truth for active fleet members on each box.

### dev

- `haplo`
- `alfred`
- `marit`
- `paithan`
- `edmund`
- `iridal`
- `balthazar`
- `vasu`
- `limbeck`
- `jonathon`
- `ciang`
- `trian`

### main

- `zifnab`
- `rega`
- `ramu`
- `drugar`

### trade

- `hugh`
- `samah`
- `devon`
- `sinistrad`

## Current Findings

### Profile-root state

- `alfred` is already correct and runs from a profile-specific root on `ola-claw-dev`.
- `haplo` has a profile-specific unit and state root available, but is currently down.
- `hugh` has a profile-specific unit and state root available, but is currently down.
- `zifnab` is still wired to the default root via `/home/openclaw/.openclaw -> /data/openclaw`, even though a `zifnab` profile directory and unit exist.
- `zifnab` also has stale orphan `openclaw-gateway` processes from the old default-unit path.

### Model-chain state

- `zifnab` is still on `anthropic/claude-opus-4-6` with a different fallback chain.
- `alfred` is already on `codex-cli/gpt-5.4` with the target fallback chain.
- `zifnab` must be moved to Alfred's chain before restart to stop burning Claude tokens.

### Workspace hygiene

- `zifnab` and `haplo` main workspaces are acting like mixed project roots rather than narrow agent workspaces.
- Both contain large amounts of code, assets, PDFs, images, scripts, runtime artifacts, repo trees, and backup clutter.
- Many smaller agents are clean or nearly clean and mostly contain markdown plus a small `.openclaw/workspace-state.json`.

## Expected Workspace Rule

### Allowed in agent workspace

- markdown docs
- agent-local control/config/state files such as `.json`, `.toml`, `.yml`, `.yaml`, `.conf`
- small agent-local helper scripts when they are truly specific to the agent

### Not allowed in agent workspace

- project repo trees
- shared project assets/content files
- general code worktrees that belong in a repo branch or worktree
- large binary or generated artifacts
- random PDFs, screenshots, dumps, vendor trees, or backup clutter

### Intended destination

- agent-specific working data: `/data/<agentname>`
- shared multi-agent content: shared `/data` location
- project code and assets: actual repo worktree or branch used for the task

## Backup Status

Pre-change backups were started before cleanup:

- timestamped repo backup folder created:
  - `agentbaselines-backup-20260331-202928`
- live source map recorded there:
  - `_live-source-map.txt`
- live markdown snapshot pulled for a broad set of agents:
  - `_sync-report.tsv`
- full `.tgz` archives created for many smaller agents:
  - `_workspace-archives/full/`

Important:

- the first sweep overscoped and included stale agents because it followed discovered directories and services instead of the authoritative live-agent list
- keep that oversweep as forensic state for now
- future sync and cleanup work must follow the authoritative list above

## Stale Agents to Remove After Cleanup

These are present on disk or in old service and unit state but are not in the authoritative live-agent list.

### dev stale

- `bane`
- `grundle`
- `jarre`
- `kleitus`
- `lenthan`
- `orla`
- `roland`

### main stale

- `alake`
- `aleatha`
- `sangdrax`

### trade stale

- `calandra`

Do not delete these until backup, profile-root migration, and model-chain work are complete.

## Baseline and Backup Relocation

Current root-level folders:

- `agentbaselines/`
- `agentbaselines-backup-*`

These appear to be historical root-level placement rather than the best long-term home.

This ticket should also define and execute the long-term relocation plan for:

- live baseline material
- timestamped backup material
- any scripts or docs that still reference the root-level locations

Do not relocate them yet while the current backup and cleanup are still in progress. Finish the active repair work first, then move them in a controlled follow-up step under this same ticket.

## Ordered Execution Plan

1. Finish a clean backup set limited to the authoritative live-agent list.
2. Compare default-root and profile-root config and approval files for `zifnab`, `haplo`, and `hugh` to preserve the most current live data.
3. Migrate `zifnab` to its profile-specific root and unit without losing live config.
4. Keep `haplo` and `hugh` on their profile-specific roots.
5. Patch `zifnab` to Alfred's `codex-cli/gpt-5.4` chain before any restart.
6. Patch sandbox and exec autonomy settings only after profile-root and model-chain edits are staged.
7. Restart gateways in a controlled order after the above is complete.
8. Investigate why non-markdown project content accumulated in `zifnab` and `haplo` workspaces.
9. Move or delete misplaced workspace content according to the workspace rule.
10. Delete stale agents and stale workspace roots only after the above is verified.
11. Relocate `agentbaselines` and `agentbaselines-backup-*` into their correct long-term home inside `The-Nexus`.

## Constraints

- Do not restart `zifnab`, `haplo`, or `hugh` until profile-root cleanup and model-chain changes are complete.
- Do not full-rewrite `openclaw.json`; use targeted edits and backups.
- Do not delete stale agents before final cleanup stage.
- Do not assume files in agent workspaces are safe to move without classification.

## Success Criteria

- `zifnab`, `haplo`, and `hugh` all run from explicit profile-specific roots.
- `zifnab` uses Alfred's `codex-cli/gpt-5.4` model chain before restart.
- backup set exists for the authoritative live agents.
- stale agents are identified, backed up, and removed after validation.
- agent workspaces are narrowed to docs and control files, with project content relocated to `/data/<agentname>`, shared `/data`, or proper repo worktrees.
- `agentbaselines` and `agentbaselines-backup-*` are relocated and all references updated.
