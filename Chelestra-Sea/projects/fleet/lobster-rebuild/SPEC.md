# Lobster Rebuild

Ticket: `#114`
Branch: `feat/114-lobster-clean-slate`
Status: In progress

## Goal

Rebuild Lobster usage from a clean baseline so workflows are created case by case for real operational value, especially reducing repeated external API and model-call orchestration.

## Why

- Legacy Lobster reporting became untrustworthy.
- Checked-in workflows were legacy shell wrappers, not a safe baseline.
- At least one legacy workflow still referenced removed rate-guard health paths.
- New workflows should target deterministic, low-token operations with explicit source-of-truth validation.

## Decisions

- Legacy checked-in workflows are archived, not reused in place.
- New workflows start manual-first, with no timers by default.
- No new workflow may depend on deleted rate-guard paths or stale state files.
- API/model-call tracking is the first rebuild target because it can directly reduce repeated external orchestration.

## Current Repo State

- Active workflow directory is reset to a clean-slate policy:
  - `Chelestra-Sea/workflows/README.md`
- Legacy checked-in workflows are archived:
  - `Chelestra-Sea/workflows/archive/legacy/`
- First rebuilt workflow exists:
  - `Chelestra-Sea/workflows/api-cost-candidate-audit.lobster`
- Second rebuilt workflow exists:
  - `Chelestra-Sea/workflows/external-call-pattern-readiness.lobster`

## Deployment Reality Check

- The branch work is in the monorepo: `The-Nexus`
- Zifnab's live tracked realm checkout still exists separately at:
  - `/data/repos/Chelestra-Sea`
- The staged runtime mirror at `/data/repos/The-Nexus` is not a git checkout
- Therefore disciplined live validation must come from a synced repo path, not from manual file copies into runtime directories
- Source migration details live in `Chelestra-Sea/projects/fleet/lobster-rebuild/MIGRATION.md`

## First Live Validation

Validated on Zifnab against live config and gateway log.

Observed result:
- gateway health was live on `127.0.0.1:18789/health`
- configured providers detected:
  - local `vllm`
  - external `minimax`
- current external provider candidate for cost review:
  - `minimax`
- recent gateway log tail produced no matching external-provider keywords at validation time

## First Workflow

`api-cost-candidate-audit.lobster`

Purpose:
- read live OpenClaw config
- read recent gateway logs
- identify external provider usage context
- flag repeated operational paths that should be collapsed into Lobster workflows

Safety:
- manual use only
- no timers
- no approvals
- no side effects beyond local reads and reporting

## Second Workflow

`external-call-pattern-readiness.lobster`

Purpose:
- inspect whether the default model path is external
- read configured cost metadata for that external default
- inventory local zero-cost alternatives on the same host
- report whether runtime telemetry is strong enough to prove repeated external call patterns

Safety:
- manual use only
- no timers
- no approvals
- no side effects beyond local reads and reporting

## Validation Requirements

- Run against a real host with:
  - live `openclaw.json`
  - live `openclaw.log`
- Verify output identifies:
  - configured external providers
  - recent external-provider keyword hits
  - candidate flows worth converting into Lobster
- Adjust the workflow only from real output, not assumptions
- Manual execution details live in `Chelestra-Sea/projects/fleet/lobster-rebuild/RUNBOOK.md`

## Clarification

- An external provider is not automatically the problem.
- The real optimization target is repeated external call patterns that can be collapsed into deterministic Lobster workflows.
- Provider inventory is context, not proof of high spend by itself.

## Next Steps

1. Run `api-cost-candidate-audit.lobster` on one live host.
2. Run `external-call-pattern-readiness.lobster` on the same host.
3. Decide the disciplined sync path from monorepo branch to the live realm repo checkout.
4. Refine output shape from real data.
5. Pick one high-value repeated external call path.
6. Create a dedicated Lobster workflow for that path.
7. Keep each workflow narrowly scoped and manually validated before any scheduling.
