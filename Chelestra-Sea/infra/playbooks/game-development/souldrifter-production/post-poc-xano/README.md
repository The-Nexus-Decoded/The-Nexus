# Post-POC Xano, Asset Delivery and Recovery Design

**Revision:** 1.0 — 2026-09-10  
**Status:** written design for owner review; no implementation, migration or cloud setup performed.

## Owner direction

Finish the current demo/POC as it is being built. After acceptance, use a controlled process to export and preserve its complete data/assets, move appropriate runtime content to a separate Xano game backend and file delivery, introduce useful caching, and establish tested backup/restore operations. Reuse reviewed NewLuv backend definitions without merging the two applications' records or credentials.

## Package

| File | Purpose |
|---|---|
| [ARCHITECTURE_SPEC.md](ARCHITECTURE_SPEC.md) | Complete 23-section design: Xano reuse and isolation; catalog/schema/API contracts; maps and binary files; exports; release-pinned loading; HTTP/browser/GPU/Redis caching; privacy; backups and restore; M0–M8 migration; work packages; acceptance tests; costs; source register |
| [ASTRA_KICKOFF.md](ASTRA_KICKOFF.md) | Full-context Astra handoff with installed Superpowers workflow, documentation/source reading, live-state audit, source-backed receipts, design-review scope and post-POC execution gates |
| [CONTRACT_TEMPLATES.json](CONTRACT_TEMPLATES.json) | Unpopulated authoring companions for assets, releases, promotions, zones, export jobs, cache decisions, backup sets and restore drills; not an implemented runtime schema |
| [Universal operations module](../../universal-game-production/POST_POC_DATA_ASSET_OPERATIONS.md) | Reusable provider/genre-neutral patterns; does not require Xano or impose SoulDrifter lore on other games |

## Main decisions

**Database:** accounts, profiles, persistent game records, stable IDs, structured map/catalog metadata, ownership and transaction receipts.

**File/object storage:** large models, textures, audio/video, terrain exports and atlas images. Initially evaluate Xano's included storage; use external delivery only for a measured need.

**Private archive:** original DCC projects, raw downloads, source textures, source maps, approved runtime files and complete recovery sets. URLs or LFS pointers without the underlying bytes are not backups.

**Caching:** immutable HTTP/file caching first; Xano's native response/Redis caching for eligible small metadata. External Redis is optional. Browser disk caches and GPU resources are separate concerns. No authoritative inventory or large binary assets in Redis.

**Release safety:** pin a complete code/API/data/map/asset-compatible release. An asset rollback does not rewind player progress or trade history.

**Recovery:** consistent database snapshots plus actual media, source and definition files; private independent copies and isolated restore drills. Never roll back NewLuv's shared instance to repair only the game.

## Sequence

```text
NOW
Read, review and refine the architecture and current source requirements.
Keep active demo workers and existing source files unchanged.

AFTER OWNER-ACCEPTED POC + WRITTEN DESIGN APPROVAL
M0 accepted baseline and verified restoration
M1 Xano plan/workspace/reuse audit
M2 independent archive and restore proof
M3 representative catalog and asset-upload pilot
M4 controlled local-versus-cloud read parity
M5 API/state integration and authoritative transaction proof
M6 measured selective caching and failure tests
M7 independent review and explicitly authorized staged cutover
M8 observation, rollback readiness and reviewed de-bundling
```

The agreed POC scope is an explicit owner milestone. It does not mean every future creature, campaign or endgame ticket must be finished. The old #511 checkpoint is preserved but is not automatically the completed POC snapshot.

## Verification status

The documents were authored from the user's decisions, targeted repository reads and current official documentation. Source coverage and account-specific unknowns are recorded in the master spec. No Xano account inspection, full local asset census, executed exporter, live cache benchmark, backup schedule, restore test, independent runtime review or deployed game change has occurred as part of this package.

Proposed quota thresholds, recovery objectives, TTLs and retention schedules are design parameters pending measurement and approval, not current provider guarantees. The schema templates start in NOT_RUN/NOT_STARTED states deliberately.

The Astra kickoff is prepared for the executing host; this package does not launch an agent or change the host's selected model. Superpowers implementation planning and execution occur only at the documented gates.

## Ready-to-paste entry

```text
Review the post-POC Xano/data/asset/caching/recovery design for
The Sundered Spheres in The-Nexus-Decoded/The-Nexus.

Read from the current infra/game-production-playbooks branch:
Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
post-poc-xano/ASTRA_KICKOFF.md

Follow its full common lore/Sea/runbook/source catch-up and read the
complete architecture and contract companions. Use the installed
Superpowers architectural-review workflow. Verify actual Astra model
and reasoning settings rather than assuming this prompt selects them.

Mode is DESIGN_REVIEW_ONLY. Finish the current POC unchanged.
No provisioning, uploads, runtime modifications, scheduled jobs,
migration, spending, merge or deployment. Prepare the final reviewed
design; implementation planning waits for the documented approvals.
```
