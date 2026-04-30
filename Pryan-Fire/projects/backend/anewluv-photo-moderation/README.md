# Anewluv Photo Moderation Worker

Realm: Pryan-Fire  
Execution owner: Devon(Dev-Rapid)  
Coordinator: Zifnab  
Primary issues: #304–#323

## Purpose

Build a photo moderation worker and agent-facing tool path for Anewluv that can:

- read pending profile/gallery photos from Xano;
- run deterministic checks plus a verified vision model path;
- produce AI recommendations without making final moderation decisions;
- leave manual moderation as the final approve/reject path;
- report summaries and unresolved cases to Jarvis/Discord owner channels.

This is a worker/tool proof lane, not a production-ready declaration. Production writes are locked out under the approved contract.

## Active guardrails

- Xano is additive-only for this work: never delete Xano data, records, tables, fields, endpoints, functions, tasks, or branches.
- Anewluv Xano work is effectively on `v1`; assume any Xano endpoint/table/schema change is live-impacting unless Lord Xar explicitly says otherwise.
- If functionality does not exist, map existing `v1` objects first and propose the smallest additive change only after approval; do not replace or remove existing ones.
- Do not mutate Xano schema/API or execute provisional endpoints without approval.
- Do not create `Profiles.is_ai` or any profile-level AI marker.
- Do not move Xano schema.
- Do not allow worker writes.
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

Implementation is locked to recommendation-only behavior: AI may recommend, manual moderation remains final, and worker writes stay disabled.

Key reconciliation docs:

- `docs/existing-photo-moderation-schema-sweep-2026-04-30.md`
- `docs/existing-path-ai-behavior-gap-map-2026-04-30.md`
- `docs/xano-branch-only-verification-2026-04-30.md`

## First executable dry-run

This repo now contains a small Python package and CLI named `photo-sweeper`.

The implementation is deliberately recommendation-only:

- Existing admin approval tools remain final.
- AI output is evidence and recommendation only.
- Manual moderation remains final.
- It reads queue data only after the auth/env gate exists.
- It does not write `ai_recommendation` fields or any other Xano state.
- It does not call `/photos/decide`.
- It does not call `/admin/decision/*`.
- `Profiles.is_ai` is not used or created.
- No Xano schema movement is performed.
- The worker does not write, even when `--force` is passed.
- Provisional `162/163` paths remain inert.
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

Without installing, use:

```bash
PYTHONPATH=src python3 -m photo_sweeper --once --dry-run --limit 10
PYTHONPATH=src python3 -m photo_sweeper --once --photo-id 101 --dry-run
PYTHONPATH=src python3 -m photo_sweeper --once --photo-id 101 --force
```

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
