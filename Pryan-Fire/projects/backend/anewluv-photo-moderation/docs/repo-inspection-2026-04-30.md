# Anewluv Photo Moderation — Repo Inspection Notes

Date: 2026-04-30  
Branch: `feat/anewluv-photo-moderation-worker`  
Commit at inspection start: `14b8d2929`  
Mode: docs/evidence only; no write-capable worker code.

## Canonical lane

- Repository: `The-Nexus-Decoded/The-Nexus`
- Local worktree: `/data/repos/worktrees/devon-anewluv-photo-moderation-worker`
- Branch: `feat/anewluv-photo-moderation-worker`
- Base at branch creation: `origin/main` `50e74f359`

## Local state observed

```text
## feat/anewluv-photo-moderation-worker...origin/feat/anewluv-photo-moderation-worker
14b8d2929 docs: add anewluv photo moderation discovery
```

## Project placement

Anewluv photo moderation is being placed under:

```text
Pryan-Fire/projects/backend/anewluv-photo-moderation/
```

Reason: the owning epic is Fire because this is monetizable product backend/business logic, worker automation, trust/safety flow, and revenue-protecting moderation. Future UI-only work can cross-label Sky; schema/audit/idempotency pieces can cross-label Stone.

Existing files at inspection time:

```text
Pryan-Fire/projects/backend/anewluv-photo-moderation/README.md
Pryan-Fire/projects/backend/anewluv-photo-moderation/docs/schema-discovery-2026-04-30.md
```

## Relevant repo structure observed

`Pryan-Fire/projects/backend/README.md` says backend projects hold API design documents, process supervisors, webhook handlers, agent tooling specs, and backend service architecture specs. That matches this docs-first gate.

No existing Anewluv implementation package or moderation worker code was found in the monorepo branch during this inspection. A repo-wide search for Anewluv references mostly found archival/reference material in agent baselines and the new docs.

Existing package/manifest candidates found nearby:

```text
Arianus-Sky/package.json
Arianus-Sky/src/spatial-hints-web/package.json
Pryan-Fire/games-xr/GestureBridge/requirements.txt
Pryan-Fire/haplos-workshop/signal-intel/requirements.txt
Pryan-Fire/hughs-forge/meteora-trader/package.json
Pryan-Fire/hughs-forge/requirements.txt
Pryan-Fire/services/image-gen-mcp/package.json
Pryan-Fire/src/xr-spatial-resolver/package.json
```

There is no existing `package.json`, `pyproject.toml`, or worker runtime manifest under `Pryan-Fire/projects/backend/anewluv-photo-moderation/` yet. Creating one would be implementation work and is intentionally held behind docs/evidence gates.

## External app repo blocker

The assignment referenced:

```text
H:\Projects\AnewluvDraftbitStuff\AnewluvExpo
```

On Devon host:

```text
/data/repos/anewluvExpo
```

exists but is not a git repository and must not be mutated. This was already confirmed by Zifnab. Any frontend/mobile source inspection must use a confirmed canonical repo/worktree later.

## Current safe outputs

Allowed before implementation:

- repo inspection notes;
- API/schema contract notes;
- dry-run design;
- blocker notes requiring Xano branch/approval.

Not allowed yet:

- write-capable worker code;
- production Xano schema/API changes;
- final approve/reject calls;
- admin impersonation to bypass actor-type conflicts.
