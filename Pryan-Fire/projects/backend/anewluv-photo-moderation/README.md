# Anewluv Photo Moderation Worker

Realm: Pryan-Fire  
Execution owner: Devon(Dev-Rapid)  
Coordinator: Zifnab  
Primary issues: #304–#323

> **Current canonical system doc:** see `docs/photo-moderation-system.md`.
>
> This README was originally written during the recommendation-only proof lane. Lord Xar later resolved #337 in favor of the AI-primary path: AI handles standard reviews and escalates serious/uncertain cases. The system doc is the current source for the full moderation flow, settings, provider chain, escalation routing, and phase-ticket map.


## Purpose

Build a photo moderation worker and agent-facing tool path for Anewluv that can:

- read pending profile/gallery photos from Xano;
- read live moderation settings, review items, and reason codes each run;
- run deterministic checks plus verified provider review;
- auto-decide standard photo cases when settings, confidence, vocabulary, and provider output allow it;
- escalate serious, uncertain, low-confidence, or provider-failed cases;
- leave audit evidence for decisions, fallbacks, and escalations.

This lane has moved from recommendation-only proof into the AI-primary worker stack. Serious and uncertain cases still fail closed into escalation.

## Active guardrails

- Xano is additive-only for this work: never delete Xano data, records, tables, fields, endpoints, functions, tasks, or branches.
- Anewluv Xano work is effectively on `v1`; assume any Xano endpoint/table/schema change is live-impacting unless Lord Xar explicitly says otherwise.
- If functionality does not exist, map existing `v1` objects first and propose the smallest additive change only after approval; do not replace or remove existing ones.
- Do not mutate Xano schema/API or execute provisional endpoints without approval.
- Do not create `Profiles.is_ai` or any profile-level AI marker.
- Do not move Xano schema.
- Do not allow worker writes outside the approved decision and escalation paths. The canonical write paths are `/photos/ai_decide` (standard AI decisions) and `/photos/escalations/open` (escalations only). See `docs/photo-moderation-system.md` for the full policy. This guardrail conflicts with the older "do not allow worker writes" language in older branch notes; this doc is the current source.
- Keep provisional `162/163` inert unless a proven gap is approved later.
- Do not print or commit secrets.
- Do not delete photos.
- Do not approve uncertain photos.
- Do not expose raw model output to users.
- Do not use admin impersonation to bypass the current `ai_agent` conflict.
- Dry-run paths must not write production state.
- OpenAI Moderations API is broad safety screening only, not the app-specific reviewer.
- App-specific decisions require a verified image/vision model path.

## Canonical implementation lane

- Branch: `feat/anewluv-photo-moderation-worker`
- Worktree: `/data/repos/worktrees/devon-anewluv-photo-moderation-worker`
- Base at branch creation: `origin/main` `50e74f359`

## Current gate state

Gate 1 discovery has been completed from Xano MCP and documented in:

- shared note: `/data/openclaw/shared/anewluv/photo-moderation-schema-discovery-2026-04-30.md`
- repo note: `docs/schema-discovery-2026-04-30.md`

Current implementation state is governed by `docs/photo-moderation-system.md`: #341 live settings enforcement is merged, #342 provider-chain fail-closed work is active, #343 removes stale duplicate vocabulary constants, and #346 adds Zifnab's autonomous review loop.

Key reconciliation docs:

- `docs/existing-photo-moderation-schema-sweep-2026-04-30.md`
- `docs/existing-path-ai-behavior-gap-map-2026-04-30.md`
- `docs/xano-branch-only-verification-2026-04-30.md`

## First executable dry-run

This repo now contains a small Python package and CLI named `photo-sweeper`.

The implementation now supports the AI-primary direction while preserving safety rails:

- AI decisions go through `/photos/ai_decide`; human decisions keep the existing human flow.
- Escalations go through `/photos/escalations/open`; escalation is not encoded as a fake decision value.
- Live settings can disable AI decisions, cap a run, enforce grace period, and route low-confidence output to escalation.
- DB `review_items` and `reason_codes` are the source of truth for prompt assembly and output validation.
- It does not call `/photos/decide` as the worker.
- It does not call `/admin/decision/*`.
- `Profiles.is_ai` is not used or created.
- No Xano schema movement is performed.
- Fixtures are safe synthetic files and mock JSON responses only.

Install for local CLI use:

```bash
python3 -m pip install -e . --no-build-isolation
```

Optional local test/image extras:

```bash
python3 -m pip install -e '.[test,image]' --no-build-isolation
```

Dry-run commands compatible with the locked docs:

```bash
photo-sweeper --once --dry-run --limit 10
photo-sweeper --once --photo-id <id> --dry-run
photo-sweeper --once --photo-id <id> --force
```

Live-write cron runs must use the overlap lock and capped limit. The default live lock is `/tmp/anewluv-photo-sweeper.lock`; do not pass `--no-lock` outside tests. Cron install and rollback notes for #319 are in `docs/cron-lock-idempotency-2026-05-01.md`.

Without installing, use:

```bash
PYTHONPATH=src python3 -m photo_sweeper --once --dry-run --limit 10
PYTHONPATH=src python3 -m photo_sweeper --once --photo-id 101 --dry-run
PYTHONPATH=src python3 -m photo_sweeper --once --photo-id 101 --force
```

Cron cadence for live capped execution is documented as `*/30 * * * *` after owner approval.

The default queue source is `src/photo_sweeper/fixtures/queue_redacted.json`. Queue items are normalized before output, and `user_email` is omitted from CLI output.

Mock model categories covered by fixture manifests:

- `clean_profile_style`
- `ai_generated_image`
- `sexual_content`
- `nudity`
- `pornographic_explicit`
- `inappropriate_photos`
- `contact_info_or_ad`
- `low_quality_or_unusable`
- `manual_review_needed`
- `api_failure_fallback`

Controlled adult-only manual validation, if approved later, must happen outside git. See `docs/adult-manual-validation-outside-git.md`.

## Test Results

Verified in this worktree on 2026-04-30:

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Result:

```text
Ran 6 tests

OK
```

`pytest` was not installed in the execution environment, so the smoke tests are written as `unittest.TestCase` tests that pytest can also collect when `.[test]` is installed.
