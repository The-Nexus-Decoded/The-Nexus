# Lobster Source Migration

Ticket: `#114`
Branch: `feat/114-lobster-clean-slate`

## Problem

Lobster workflow sourcing is split across two server-side locations:

- legacy split repo: `/data/repos/Chelestra-Sea/workflows`
- monorepo path: `/data/repos/The-Nexus/Chelestra-Sea/workflows`

That split undermines the clean rebuild because new workflow work in the monorepo can diverge from the legacy split-repo workflow estate.

## Desired End State

Use the monorepo as the only source of truth for rebuilt Lobster workflows.

Server-side target:
- `/data/repos/The-Nexus/Chelestra-Sea/workflows`

Legacy source to retire:
- `/data/repos/Chelestra-Sea/workflows`

## Current Observations

- The split repo on Zifnab still contains the old workflow estate.
- The monorepo path already exists on Zifnab.
- At least one rebuilt workflow is already visible under the monorepo path.

## Rules

- Do not add new tracked workflows to the split repo.
- New workflows belong in the monorepo branch only.
- Live validation should target the monorepo path after normal sync/deploy.
- The split repo workflow directory should be treated as legacy until explicitly retired.

## Migration Steps

1. Inventory which runtime calls still reference `/data/repos/Chelestra-Sea/workflows`.
2. Update workflow invocations to use `/data/repos/The-Nexus/Chelestra-Sea/workflows`.
3. Validate rebuilt workflows from the monorepo path.
4. Archive or retire split-repo workflows after parity is established.
5. Remove ambiguity from docs, timers, scripts, and operator habits.

## Gating Condition

Do not claim the Lobster rebuild is complete until runtime workflow sourcing is monorepo-first and the split repo is no longer the active source of truth.
