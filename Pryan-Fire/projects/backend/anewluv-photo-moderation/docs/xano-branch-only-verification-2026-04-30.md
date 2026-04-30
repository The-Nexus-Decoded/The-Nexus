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

## Guardrails held

- No delete/truncate/drop tools were used.
- No destructive replacement was used.
- Existing `POST /photos/decide` was not edited.
- Production branch was not set live or changed by `setBranchLive`.
- New work was documented with object IDs and acceptance criteria.

## Risk / blocker

The created API endpoints appear visible in the canonical moderation API metadata, not clearly isolated to `photo-ai-moderation-worker`. Before any worker uses them for writes or before any go-live claim, this needs review by Zifnab/Lord Xar and/or Xano UI verification.

## Required next decisions

- Confirm whether Xano MCP `createAPI(branch=...)` is expected to show `branch:null` in metadata while still being branch-scoped, or whether these endpoints were created on the live API group.
- If they are live-visible, decide whether to leave them inert behind auth/service-key gates until review, or move/recreate contracts through a proven branch-safe path.
- No worker write gate should be enabled until this is resolved.

## Acceptance criteria update

- [x] Created object IDs/contracts documented.
- [x] Branch existence verified.
- [x] Live branch remains `v1`.
- [x] Metadata visibility checked.
- [ ] Branch-only isolation proven. **Failed / unresolved.**
- [ ] Xano UI or authoritative metadata confirms endpoint branch scope.
- [ ] Worker write path remains disabled until verification passes.
