# Anewluv Photo Moderation Worker

Realm: Pryan-Fire  
Execution owner: Devon(Dev-Rapid)  
Coordinator: Zifnab  
Primary issues: #304–#323

## Purpose

Build a photo moderation worker and agent-facing tool path for Anewluv that can:

- read pending profile/gallery photos from Xano;
- run deterministic checks plus a verified vision model path;
- write AI recommendation fields;
- finalize safe approve/reject decisions only when policy allows;
- leave uncertain cases pending as review/escalation;
- write audit evidence for every AI action;
- report summaries and unresolved escalations to Jarvis/Discord owner channels.

This is a worker/tool proof lane, not a production-ready declaration. Production writes stay behind explicit gates.

## Active guardrails

- Do not mutate production Xano schema/API without approval.
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

Implementation is blocked from write-capable behavior until the endpoint contract mismatches and missing write paths are resolved.
