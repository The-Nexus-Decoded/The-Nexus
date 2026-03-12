# Lobster Rebuild Runbook

Ticket: `#114`
Branch: `feat/114-lobster-clean-slate`

## First Manual Validation

Run the first rebuilt workflow on a live host where Lobster is installed and OpenClaw is active.

Important:
- validate from the synced repo copy on the host
- do not manually copy workflow files into runtime locations for tracked work
- use the monorepo workflow path after normal tracked sync/deploy

### Expected prerequisites

- `lobster` is on `PATH`
- live config exists at `/home/openclaw/.openclaw/openclaw.json`
- gateway log exists at `/data/openclaw/logs/openclaw.log`
- gateway health responds on `127.0.0.1:18789/health`

### Command

```bash
lobster run \
  --file /data/repos/The-Nexus/Chelestra-Sea/workflows/api-cost-candidate-audit.lobster \
  --arg config_path=/home/openclaw/.openclaw/openclaw.json \
  --arg log_path=/data/openclaw/logs/openclaw.log \
  --arg log_tail_lines=5000
```

## What To Check

1. Gateway health returns live status.
2. Provider inventory renders correctly from live config.
3. External/expensive provider candidates are listed.
4. Recent gateway log keyword counts produce useful signal.
5. No rate-guard paths or stale state files are referenced.
6. The workflow is executed from the synced monorepo path, not an ad hoc copy.

## If Output Is Wrong

- Fix the workflow from real output only.
- Do not add timers.
- Do not add automation side effects.
- Keep the workflow manual until the report is trustworthy.

## Success Criteria

- The workflow produces a readable audit report.
- The report identifies at least one real repeated expensive path worth converting into a dedicated Lobster workflow.
- The next workflow can be chosen from actual usage evidence instead of assumptions.

## Second Manual Validation

Run the readiness audit on the same live host.

### Command

```bash
lobster run \
  --file /data/repos/The-Nexus/Chelestra-Sea/workflows/external-call-pattern-readiness.lobster \
  --arg config_path=/home/openclaw/.openclaw/openclaw.json \
  --arg log_path=/data/openclaw/logs/openclaw.log \
  --arg log_tail_lines=5000
```

## What To Check

1. Default model exposure is correctly identified as local or external.
2. Configured cost metadata is rendered for the default model.
3. Local zero-cost alternatives are listed accurately.
4. The workflow explicitly says when runtime telemetry is insufficient.
