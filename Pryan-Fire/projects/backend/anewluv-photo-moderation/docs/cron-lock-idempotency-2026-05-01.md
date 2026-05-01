# Cron Lock + Idempotency (#319)

## Scope

This pass seals the worker against overlapping cron runs and duplicate photo processing before escalation or autonomous review gets more authority.

## Cron schedule

Run every 30 minutes:

```cron
*/30 * * * * cd /data/repos/The-Nexus/Pryan-Fire/projects/backend/anewluv-photo-moderation && /usr/bin/env PYTHONPATH=src photo-sweeper --once --live-write --limit 25 --provider codex-openai-image >> /data/logs/anewluv-photo-sweeper.log 2>&1
```

If the package is not installed as `photo-sweeper`, use the module form:

```cron
*/30 * * * * cd /data/repos/The-Nexus/Pryan-Fire/projects/backend/anewluv-photo-moderation && /usr/bin/env PYTHONPATH=src python3 -m photo_sweeper --once --live-write --limit 25 --provider codex-openai-image >> /data/logs/anewluv-photo-sweeper.log 2>&1
```

## Overlap lock

Live-write runs take a nonblocking file lock before running:

```text
/tmp/anewluv-photo-sweeper.lock
```

If another run is active, the worker exits with code `75` and does not process photos. Keep `--no-lock` out of cron; it exists for tests only.

## Idempotency behavior

The worker now:

- skips non-uploaded photos before model review;
- skips deleted photos before model review;
- skips already AI-processed photos unless `--force` is explicitly passed;
- dedupes photo IDs inside one run before model review;
- uses one `run_id` per run;
- sends stable per-run idempotency keys:
  - decisions: `{run_id}:{photo_id}`
  - escalations: `{run_id}:{photo_id}:escalation`

The server remains the final race guard through `expected_current_status = 1` and existing 409 handling.

## Rollback

1. Remove or comment the cron entry:

```bash
crontab -l | grep -v 'photo-sweeper --once --live-write' | crontab -
```

2. Confirm no worker process is active:

```bash
pgrep -af 'photo-sweeper|photo_sweeper' || true
```

3. If no process is active, removing a stale lock file is safe:

```bash
rm -f /tmp/anewluv-photo-sweeper.lock
```

4. Leave Xano state untouched. Rollback is operational only; do not delete photos, audit rows, or moderation records.

## Validation

Required checks:

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Acceptance mapping:

- `*/30 * * * *` documented above.
- File lock prevents overlapping live-write runs.
- Approved/rejected/non-uploaded photos are skipped before selection.
- Already AI-processed photos are skipped unless `--force`.
- Duplicate photo IDs are processed once per run.
- Install/rollback instructions are documented here.
