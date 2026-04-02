# [Chelestra-Sea] OpenClaw Fleet Normalization, Memory Standardization, and Matrix Review

## Summary

This ticket is the follow-up cleanup and standardization pass that was left after the fleet consolidation work.

The consolidation work reduced the active fleet and merged roles, but it did not fully normalize the live runtime configuration across the agents. During the post-consolidation audit, it became clear that the fleet was still running with inconsistent profile roots, inconsistent model chains, inconsistent workspace hygiene, and inconsistent memory settings. Some of those differences were harmless, but some of them directly affected token burn, memory DB size, retrieval behavior, and operational stability.

This ticket exists to finish that work in a controlled way.

It is not just a cosmetic config cleanup. It is a structured normalization task intended to:

1. reduce operational risk
2. reduce bad defaults and hidden drift
3. standardize memory behavior across the fleet
4. move the fleet toward a deliberate QMD-based memory strategy instead of accidental mixed builtin-memory behavior
5. create a readable decision surface so the owner can review every setting before rollout

## Why This Ticket Exists

After the agent consolidation work, the remaining review showed several unresolved problems:

- the primary agents were not fully normalized onto explicit profile-specific roots
- `zifnab` was still carrying an undesirable model chain and default-root baggage
- workspaces, especially `zifnab` and `haplo`, had accumulated non-workspace content
- stale agents still existed on disk
- baseline and backup locations were not in a clean long-term home
- memory behavior had drifted across the fleet with no clear standard
- some agents were using settings that could silently increase token spend or create large memory indexes
- there was no single review artifact showing all relevant memory and search settings together with explanations

The matrix files that were started were not random side work. They were the actual review surface for deciding what the fleet should be standardized to.

## How We Found The Problem

The normalization work came out of the fleet audit and postmortem review after consolidation.

What was found:

- the fleet had split into multiple config tiers rather than a deliberate single standard
- `thinkingDefault` was inconsistent and likely causing unnecessary reasoning-token use on most agents
- `sessionMemory` had been enabled on a subset of agents and was creating very large memory databases
- the memory search stack differed by tier and by agent
- `retry`, `threadBindings`, `textChunkLimit`, and exec-related settings were inconsistent
- the live memory setup was not being reviewed against the full OpenClaw memory docs, so there was risk that important knobs were unset, left on bad defaults, or simply ignored

This is why the work expanded from "clean up a few agents" into a real normalization task.

Just as important, some of the cleanup and matrix work had already started by the time the review was interrupted. That means this ticket must not assume every listed action is still undone. Some config moves, workspace cleanup, or matrix population may already have happened on the live systems or in uncommitted artifacts.

That is why the first phase of the work now has to be a live-state pre-check instead of guessing from notes.

## Why Memory Normalization Is Part Of This Ticket

Memory is one of the most important fleet-level settings because it affects:

- retrieval quality
- disk growth
- indexing behavior
- token burn
- embedding-provider usage
- compaction and flush behavior
- session transcript indexing
- whether the fleet is following intentional policy or just drifting on defaults

The OpenClaw docs make clear that memory behavior is governed by multiple separate systems:

- memory backend selection
- memory search provider/model/fallback
- hybrid search tuning
- session indexing
- additional memory paths
- cache behavior
- vector store behavior
- QMD-specific configuration
- compaction/memory flush interactions

If these are left inconsistent across agents, then the fleet does not actually have one memory strategy. It has several accidental ones.

That is why the remaining work was not just "fix profile roots." It also had to become:

- normalize memory settings across all agents
- compare the live settings against the full docs
- decide what the standard should be
- move all agents to the chosen memory approach

## Intended Memory Direction

The intended direction of this ticket is:

1. normalize memory settings across the fleet instead of leaving tier drift
2. use Haplo as the practical memory baseline for direction
3. compare Haplo and Iridal directly as review anchors
4. move all agents toward QMD memory, using Haplo's current QMD setup as the initial operating model

This does not mean blindly copying every Haplo value.

It means:

- Haplo is the known working QMD example
- Iridal is the editable review target used to stage the standardization
- the docs must be checked so the matrix includes all relevant memory knobs, including ones we are not currently using
- the owner then decides which settings should become fleet-wide, tier-specific, or intentionally left unset
- the fleet should stop relying on accidental defaults and move toward a deliberate, reviewed QMD memory standard

## Why Haplo And Iridal Matter

### Haplo

Haplo is important because Haplo is already the live example of the desired QMD direction. Haplo is not just another agent in the list. Haplo represents the current "working memory target" that the rest of the fleet may move toward.

### Iridal

Iridal matters because the matrix and config review work had already started using Iridal as the editable reference artifact. The Iridal config editor is part of the review workflow, not just a one-off file. The remaining work includes deciding whether Iridal remains the canonical editable example or whether a broader fleet-level editor/export replaces it.

## Scope

This ticket covers five linked areas:

1. profile-root normalization
2. model-chain normalization
3. workspace hygiene
4. stale-agent cleanup
5. memory normalization and QMD migration planning/execution

It also covers relocation of:

- `agentbaselines/`
- `agentbaselines-backup-*`

into a better long-term home inside `The-Nexus`.

## Source Artifacts

This reconstruction is based on the files that were already created during the unfinished normalization work:

- `Chelestra-Sea/projects/fleet/openclaw-fleet-normalization/SPEC.md`
- `Chelestra-Sea/projects/fleet/fleet-config-matrix.md`
- `Chelestra-Sea/projects/fleet/fleet-config-matrix.html`
- `Chelestra-Sea/projects/fleet/fleet-memory-matrix.html`
- `Chelestra-Sea/projects/fleet/iridal-config.html`

It is also informed by the OpenClaw memory docs:

- Memory overview: `https://docs.openclaw.ai/concepts/memory`
- Memory configuration reference: `https://docs.openclaw.ai/reference/memory-config`
- QMD memory engine: `https://docs.openclaw.ai/concepts/memory-qmd`
- Memory search: `https://docs.openclaw.ai/concepts/memory-search`

## Authoritative Live Agent List

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

## Known State

### Profile-root state

- `alfred` is already correct and runs from a profile-specific root on dev
- `haplo` has a profile-specific unit and state root available
- `hugh` has a profile-specific unit and state root available
- `zifnab` still carries default-root wiring and old default-unit baggage even though a profile-specific root and unit exist

### Model-chain state

- `zifnab` still had the wrong model chain and needed to be aligned with Alfred's `codex-cli/gpt-5.4` chain before restart
- this mattered because bad model defaults were part of the broader post-consolidation cost problem

### Workspace hygiene state

- `zifnab` and `haplo` had mixed workspaces that looked more like project roots than narrow agent workspaces
- this introduced operational clutter and made it harder to reason about what belonged to the agent versus what belonged to a repo or shared data area

### Memory state

The memory audit found that the fleet was not standardized:

- some agents used builtin memory search behavior
- some agents had more aggressive memory-search features enabled
- some agents had session indexing enabled
- some settings were clearly being inherited by default rather than intentionally set
- QMD was not rolled out as an explicit fleet standard

That means memory behavior was drifting rather than being designed.

### Completion-state risk

Some of the underlying cleanup work may already be partially complete on live systems, in local edits, or in the matrix artifacts themselves. The notes preserve the intended work, but they are not a guarantee that every item remains outstanding in exactly the same form.

This ticket therefore requires a pre-check pass before implementation decisions are made.

## Required Pre-Check On Live State

Before anyone starts "finishing" this ticket, they need to verify the current live state and artifact state so they do not guess, duplicate work, or overwrite progress.

The pre-check should verify at minimum:

1. current live profile-root state for `zifnab`, `haplo`, and `hugh`
2. current live model chain for `zifnab`
3. whether workspace cleanup has already happened for `zifnab` and `haplo`
4. whether stale-agent backups or deletions have already started
5. whether `agentbaselines/` and `agentbaselines-backup-*` have already been relocated
6. current live memory backend and memory-search settings for Haplo and Iridal
7. whether any other agents have already moved to QMD
8. current `thinkingDefault`, `sessionMemory`, `retry`, `threadBindings`, `textChunkLimit`, and exec-related values across the live fleet
9. what the current matrix files already contain, including which doc settings have already been researched and filled in

The rule is:

- verify on live first
- compare against the matrix artifacts second
- only then decide what remains to be changed

No one should assume that an item from this ticket is still pending until it has been checked.

## Why The Matrix Artifacts Matter

The remaining work was not just "change config files." It depended on readable matrix artifacts so the owner could review the settings and decide what to standardize.

Those matrix artifacts must:

- compare Haplo and Iridal directly
- include all relevant memory settings from the OpenClaw docs, not just the subset already found in current configs
- expose missing or unset values so bad defaults can be spotted
- include an explanation column for what each setting does
- indicate whether a setting is critical, important, or optional
- use clear color coding for selected/current values
- allow Iridal's values to be edited as the staging surface for standardization
- be large-text and easy to read, not dense or tiny

Without that, the review process becomes guesswork and settings drift continues.

The matrix is not only a comparison table. It is the review and decision artifact that prevents the owner from having to infer meaning from raw JSON or undocumented defaults.

## Matrix Requirements

### Required files

- `Chelestra-Sea/projects/fleet/fleet-config-matrix.md`
- `Chelestra-Sea/projects/fleet/fleet-config-matrix.html`
- `Chelestra-Sea/projects/fleet/fleet-memory-matrix.html`
- `Chelestra-Sea/projects/fleet/iridal-config.html`

### Required content

The matrix work must include:

1. Haplo values
2. Iridal values
3. all relevant OpenClaw memory settings from the docs, including settings currently unset in the fleet
4. current live values
5. target normalized values
6. explanation column describing what each setting does
7. importance/severity column indicating whether the setting is critical, important, or informational
8. color treatment for filled/current/target cells
9. editable Iridal values to act as the review baseline
10. large, readable text and layout suitable for human review

### Required research pass

The matrix cannot be built only from whatever values happen to appear in current configs.

It must also include a research pass against the OpenClaw memory documentation so that:

1. every documented memory setting is at least considered
2. settings not currently present in live configs still appear in the matrix when relevant
3. each setting has a short plain-language explanation
4. each setting is marked as critical, important, or optional/informational
5. the reviewer can tell the difference between intentionally unset and accidentally omitted

This is necessary because the existing problem was partly caused by relying on inherited defaults without a full documented review.

### Required memory topics from docs

The matrix should account for memory topics including, at minimum:

- backend selection
- builtin vs QMD behavior
- provider
- model
- fallback
- `enabled`
- remote endpoint config
- Gemini-specific embedding options
- local embedding options
- hybrid search settings
- MMR settings
- temporal decay settings
- `extraPaths`
- multimodal memory settings
- embedding cache settings
- batch indexing settings
- experimental session memory settings
- vector store settings
- index storage settings
- QMD backend settings
- QMD update schedule
- QMD limits
- QMD scope and citations
- compaction / memory flush interaction where it affects memory behavior

Some of these may remain intentionally unset. That is fine. The matrix still needs them present so they can be consciously skipped instead of accidentally omitted.

### Required presentation and UX

The review artifacts should be designed for readability, not density.

Required presentation behavior:

- large text that is easy to read without zooming
- clear row/column separation
- color treatment for current values, target values, and missing values
- obvious visual emphasis for critical settings
- editable Iridal fields so standardization candidates can be tested in the review artifact
- enough space for explanation text to be readable instead of truncated into useless fragments
- no tiny low-contrast table styling

## Workspace Rule

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

### Intended destinations

- agent-specific working data: `/data/<agentname>`
- shared multi-agent content: shared `/data` location
- project code and assets: proper repo worktree or branch used for the task

## Stale Agents To Remove After Cleanup

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

Do not delete these until backup, profile-root migration, model-chain work, and validation are complete.

## Ordered Execution Plan

1. Perform the full live-state pre-check before assuming any item is still undone.
2. Finish a clean backup set limited to the authoritative live-agent list.
3. Compare default-root and profile-root config and approval files for `zifnab`, `haplo`, and `hugh` to preserve the most current live data.
4. Migrate `zifnab` to its profile-specific root and unit without losing live config.
5. Keep `haplo` and `hugh` on their profile-specific roots.
6. Patch `zifnab` to Alfred's `codex-cli/gpt-5.4` chain before any restart.
7. Patch sandbox and exec autonomy settings only after profile-root and model-chain edits are staged.
8. Pull Haplo and Iridal's full live configs and build the side-by-side matrix covering ALL settings (not just memory).
9. Research every setting against the OpenClaw docs and populate the explanation and importance columns.
10. Use Iridal as the editable template — owner reviews and decides the fleet standard.
11. Complete QMD deployment prerequisites on all 3 servers (symlinks, model warmup, PATH verification — requires sudo/owner for symlink step).
12. Apply the finalized Iridal template to all 20 agents via targeted JSON patches, preserving agent-specific overrides.
13. Investigate why non-markdown project content accumulated in `zifnab` and `haplo` workspaces.
14. Move or delete misplaced workspace content according to the workspace rule.
15. Restart gateways in a controlled order only after the above is complete.
16. Delete stale agents and stale workspace roots only after the above is verified.
17. Relocate `agentbaselines` and `agentbaselines-backup-*` into their correct long-term home inside `The-Nexus`.

## Execution Method

This ticket should be worked in strict sequence, one step at a time.

For each numbered step:

1. perform that step only
2. show the findings from live state, configs, and artifacts
3. state clearly what is already done, what is partially done, and what remains open
4. get alignment on the findings
5. then move to the next numbered step

Do not skip ahead because later steps depend on earlier verification.

This is especially important for this ticket because:

- some earlier cleanup may already be partially complete
- the notes preserve intent, not guaranteed current state
- the memory and matrix work is expected to be the least complete part and should be reached only after the earlier state has been verified

## Step-By-Step Checklist

Use this checklist for every numbered step in the execution plan.

- [ ] Start only the current numbered step
- [ ] Check live state before assuming the ticket note is still current
- [ ] Check the related local artifacts, matrix files, and config files
- [ ] Record the findings in plain language
- [ ] Mark what is already done
- [ ] Mark what is partially done
- [ ] Mark what is still open
- [ ] Identify any evidence gaps or conflicts between notes and live state
- [ ] Show the findings for review
- [ ] Only move to the next numbered step after the current step has been reviewed

The intended cadence is:

1. inspect
2. report
3. classify done vs open
4. proceed

## QMD Deployment Checklist

Before QMD can be adopted fleet-wide, the runtime prerequisites must be in place on all three servers.

1. Create QMD symlink on all 3 servers: `sudo ln -sf ~/.bun/bin/qmd /usr/local/bin/qmd` (requires sudo — owner must execute or approve).
2. Warm up the QMD embedding model on `zifnab` and `hugh` (currently not cached — only Haplo has the 340MB model cached).
3. Verify bun is on PATH on all 3 servers (installed but may not be on PATH for the openclaw user).
4. Run a test query on each server after symlink and warmup: `qmd query 'test'`.
5. Confirm QMD binary version is consistent across all 3 servers (currently v2.0.1 on all per matrix).

## Fleet Config Normalization

The approach to config normalization is not category-by-category checklists. It is a single unified comparison:

1. Pull Haplo's entire live `openclaw.json` as the reference config.
2. Pull Iridal's entire live `openclaw.json` as the editable staging target.
3. Put them side by side covering ALL settings — memory, ACP, subagents, compaction, tools, Discord, bootstrap, everything.
4. Use Iridal as the editable template for the entire fleet.
5. Research every setting against the OpenClaw docs. Each setting in the matrix must have a plain-language explanation of what it does.
6. The owner reviews the side-by-side, makes decisions on Iridal's values, and that becomes the fleet standard.
7. Agent-specific overrides are preserved separately: `vasu` and `limbeck` keep `danger-full-access` sandbox for MCP; `sinistrad` keeps CDP browser profile; `haplo` keeps `thinkingDefault: off`.
8. Apply the finalized Iridal template to all 20 agents via targeted JSON patches.
9. Update the matrix artifacts so the final standard is explicit and reviewable.

## Default Root Cleanup

The default root symlink (`~/.openclaw -> /data/openclaw`) exists on all 3 servers. No running gateway uses it — all agents run from profile-specific roots (`~/.openclaw-{name}/`). The symlink is dangerous because new CLI sessions that forget `--profile` will silently read/write the wrong config.

Required actions:

1. Archive the contents of `/data/openclaw/` that are not server infrastructure (old configs, old workspaces, old agent data, backup clutter) into a timestamped archive.
2. Delete the `~/.openclaw -> /data/openclaw` symlink on all 3 servers.
3. Any server-level infrastructure that legitimately lives at `/data/openclaw/` (scripts, shared data) should be moved to a proper named location outside the OpenClaw state path.

## CLI Profile Rule (MANDATORY)

Every `openclaw` CLI command MUST specify `--profile <name>` or set `OPENCLAW_PROFILE=<name>`. Running CLI commands without a profile hits the default root, which is not any agent. With 20 agents across 3 servers, an unscoped CLI command is meaningless and dangerous.

This applies to:
- all manual CLI usage
- all agent-initiated CLI commands
- all scripts and cron jobs that call `openclaw`

## Constraints

- **ALWAYS use `--profile <name>` when running any `openclaw` CLI command.** Never run against the default root.
- Do not assume this ticket's remaining steps are still all undone; pre-check on live first.
- Do not jump across multiple numbered steps without reporting findings for each one.
- Do not restart `zifnab`, `haplo`, or `hugh` until profile-root cleanup and model-chain changes are complete.
- Do not full-rewrite `openclaw.json`; use targeted edits and backups.
- Do not delete stale agents before final cleanup stage.
- Do not assume files in agent workspaces are safe to move without classification.
- Do not treat current defaults as safe just because they are current.
- Do not omit doc-listed settings from the matrix just because the current fleet does not set them.

## Success Criteria

- the current live state has been pre-checked before any "remaining work" is executed.
- `zifnab`, `haplo`, and `hugh` all run from explicit profile-specific roots.
- `zifnab` uses Alfred's `codex-cli/gpt-5.4` model chain before restart.
- a backup set exists for the authoritative live agents only.
- agent workspaces are narrowed to docs and control files, with project content relocated to `/data/<agentname>`, shared `/data`, or proper repo worktrees.
- stale agents are identified, backed up, and removed after validation.
- `agentbaselines` and `agentbaselines-backup-*` are relocated and all references updated.
- the matrix artifacts are updated and usable as the review surface for final decisions.
- the matrix compares Haplo and Iridal directly.
- the matrix compares Haplo and Iridal's full configs side by side covering ALL settings, not just memory.
- every setting in the matrix has a plain-language explanation of what it does.
- the matrix includes importance/severity marking (critical, important, informational).
- Iridal values are editable as the fleet-wide standardization template.
- the finalized Iridal template has been applied to all 20 agents via targeted JSON patches.
- agent-specific overrides (vasu, limbeck, sinistrad, haplo) are preserved.
- the final chosen direction moves the fleet toward QMD-based memory using Haplo as the working reference.
- QMD runtime prerequisites (symlink, model cache, PATH) are verified on all 3 servers.

## Review Notes

- This draft is intended to preserve the actual remaining work, not just the shortest execution checklist.
- The matrix update and memory-normalization work were part of the real unfinished task and must not be dropped.
- The live-state pre-check is mandatory because some steps may already be partially complete and should not be guessed at from notes alone.
- The intended working style is sequential review: complete one step, report findings, classify done vs open, then proceed.
