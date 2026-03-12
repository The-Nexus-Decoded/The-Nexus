# Lobster Workflows

This directory is now the clean-slate location for active Lobster workflows.

## Policy

- Legacy workflows are archived under `archive/legacy/`.
- Do not revive archived workflows in place.
- New workflows must be created case by case from current OpenClaw Lobster docs and current fleet reality.
- Do not depend on deleted rate-guard paths, stale state files, or broken reporting assumptions.
- Prefer small workflows with a single operational purpose and explicit verification.

## Current Rebuild Direction

The next generation of workflows should focus on deterministic, low-token automation around:

- API/model-call tracking and cost visibility
- verification and health checks
- tightly scoped operational tasks with clear inputs and outputs

## First Rebuilt Workflow

- `api-cost-candidate-audit.lobster`
  - manual audit workflow
  - reads live OpenClaw config plus recent gateway logs
  - identifies external-provider usage and repeated-call simplification candidates
  - does not depend on rate-guard artifacts or stale state files
  - should be manually validated before any scheduled use

## Second Rebuilt Workflow

- `external-call-pattern-readiness.lobster`
  - manual readiness audit
  - determines whether a host is structurally exposed to repeated external-call spend
  - inventories local zero-cost alternatives
  - reports when live telemetry is insufficient instead of pretending repeated-call proof exists

## Validation Requirements For New Workflows

- Use current Lobster argument syntax, not legacy `{args.foo}` placeholders.
- Use current live health sources, not `localhost:8787`.
- Document the exact upstream source of truth for any status or cost report.
- Include a manual validation command before any timer or automation is enabled.
