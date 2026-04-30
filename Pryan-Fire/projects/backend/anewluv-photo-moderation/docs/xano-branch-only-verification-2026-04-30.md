# Anewluv Photo Moderation — Xano Branch-Only Verification

Date: 2026-04-30  
Verifier: Devon  
Scope: created Xano objects from additive moderation work

## Result

**Branch-only verification did not pass.**

The target branch exists and production live branch remains `v1`, but the new API endpoints are visible in the moderation API listing/OpenAPI metadata without a branch label. The Xano metadata returned `branch: null` for the created endpoints.

This means Devon cannot truthfully claim the endpoints are branch-only from the observed metadata.

## Confirmed branch state

Live branch remains:

```json
[{"label":"v1","live":true}]
```

Target branch exists:

```text
photo-ai-moderation-worker
```

## Created object visibility

The following new endpoints were found in `listAPIs` and `getApiGroupSwagger`:

- `POST /photos/escalations/open` — id `2827`
- `GET /photos/escalations` — id `2828`
- `POST /photos/escalations/ack` — id `2829`
- `POST /photos/ai_recommendation` — id `2830`
- `POST /photos/ai_decide` — id `2831`

Observed endpoint metadata:

```json
{
  "api_2827": {"name":"photos/escalations/open","verb":"POST","branch":null},
  "api_2828": {"name":"photos/escalations","verb":"GET","branch":null},
  "api_2829": {"name":"photos/escalations/ack","verb":"POST","branch":null},
  "api_2830": {"name":"photos/ai_recommendation","verb":"POST","branch":null},
  "api_2831": {"name":"photos/ai_decide","verb":"POST","branch":null}
}
```

OpenAPI server shown by metadata:

```text
http://backend/api:S8LKJE3D
```

OpenAPI paths found:

- `/photos/ai_recommendation`
- `/photos/ai_decide`
- `/photos/escalations/open`
- `/photos/escalations`
- `/photos/escalations/ack`

## Created table visibility

The following tables exist as global database additions:

- `photo_ai_moderation_audit` — id `162`
- `photo_moderation_escalations` — id `163`

This matches Xano's branch model expectation that branches are business-logic copies while database tables are workspace/global data schema.

## Architecture correction: unified moderation history

Lord Xar corrected the audit architecture after these global table additions: moderation history must be **unified**, not AI-only.

Target contract:

- Every moderated photo action is recorded in the same moderation history format, regardless of actor type.
- Human admin, normal moderator/user if applicable, AI agent, and system actions use the same audit/ledger contract.
- `actor_type` distinguishes source: `user | admin | ai_agent | system`.
- Actor identity fields carry the human/user/system/AI identity where available.
- Shared fields carry decision/action/reason/note/outcome.
- AI metadata such as model, confidence, summary, dry-run, fallback, and error data is nullable when the actor is not AI.
- Do not build separate AI-vs-human moderation trails.

Because `photo_ai_moderation_audit` already exists globally, remediation must remain additive/non-destructive.

Allowed remediation paths:

1. **Rename if branch-safe and explicitly approved.** Rename `photo_ai_moderation_audit` to a generic name such as `photo_moderation_audit` only if Xano confirms the rename is branch-safe or Lord Xar/Zifnab approve the global rename.
2. **Deprecate by docs if rename is not safe.** Leave table id `162` in place, mark its AI-specific name as historical/provisional, and document that usage must follow the generic moderation-history contract.
3. **Replace usage with a generic contract without deleting.** Prefer existing/generic moderation table or endpoint contract for new usage, while leaving the already-created table inert/unused if it is not the accepted target.

Forbidden remediation paths:

- No delete/drop/truncate of the already-created table.
- No destructive replacement.
- No second audit table unless explicitly approved after reconciliation.

## Guardrails held

- No delete/truncate/drop tools were used.
- No destructive replacement was used.
- Existing `POST /photos/decide` was not edited.
- Production branch was not set live or changed by `setBranchLive`.
- New work was documented with object IDs and acceptance criteria.

## Risk / blocker

The created API endpoints appear visible in the canonical moderation API metadata, not clearly isolated to `photo-ai-moderation-worker`. Before any worker uses them for writes or before any go-live claim, this needs review by Zifnab/Lord Xar and/or Xano UI verification.

The created audit table name is AI-specific while the corrected requirement is generic moderation history. That mismatch must be reconciled before worker writes or mobile/admin surfaces depend on it.

## Required next decisions

- Confirm whether Xano MCP `createAPI(branch=...)` is expected to show `branch:null` in metadata while still being branch-scoped, or whether these endpoints were created on the live API group.
- If they are live-visible, decide whether to leave them inert behind auth/service-key gates until review, or move/recreate contracts through a proven branch-safe path.
- Decide the non-destructive remediation for `photo_ai_moderation_audit` id `162`: branch-safe rename, documented generic usage despite historical name, or leave inert and use a reconciled generic moderation audit contract elsewhere.
- No worker write gate should be enabled until this is resolved.

## Acceptance criteria update

- [x] Created object IDs/contracts documented.
- [x] Branch existence verified.
- [x] Live branch remains `v1`.
- [x] Metadata visibility checked.
- [ ] Branch-only isolation proven. **Failed / unresolved.**
- [ ] Xano UI or authoritative metadata confirms endpoint branch scope.
- [ ] Unified moderation history contract reconciled: same format for all actor types, nullable AI metadata, no AI-only audit silo.
- [ ] Non-destructive remediation selected for `photo_ai_moderation_audit` id `162`.
- [ ] Worker write path remains disabled until verification passes.
