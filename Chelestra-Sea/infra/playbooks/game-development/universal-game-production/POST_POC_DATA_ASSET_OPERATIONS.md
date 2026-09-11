# Optional module — Post-POC Data, Asset and Recovery Operations

Revision: 1.0 — 2026-09-10
Status: reusable design module; implementation is governed by each project's approved scope.

## Purpose and activation

Use this module when an accepted game prototype moves from bundled/local content to hosted data and asset services. It applies to any genre or engine and does not require Xano, Redis, blockchain, a particular programming language, or an immediate backend migration.

A project may prepare the design while its demo is in progress. It must not silently turn that planning task into changes to the unfinished demo. Record the owner-accepted POC scope, exact baseline, preserved source files and written migration approval before execution. Acceptance concerns the agreed slice, not every future backlog feature.

The project overlay supplies actual vendors, budgets, security classifications, identity rules, source paths and worker ownership. Complete `PROJECT_CONTEXT_LOADING_POLICY.md` and the project's full context readset before changing storage or interpreting world data.

## Separation of responsibilities

- Durable database: structured accounts, identities, ownership, transactions, relationships, queryable catalog data and sparse dynamic world state.
- File/object storage: large images, textures, models, audio/video, terrain exports and compiled map packages.
- Source archive: editable projects, original provider exports, source material and complete dependencies, with appropriate private access.
- Repository: reviewed code, schemas, tooling, configuration references, versioned manifests and instructions; not plaintext credentials or customer data.
- Cache: disposable acceleration for data or files whose freshness/security contract allows it. A cache is not the only authority or backup.

The game consumes API contracts independently of backend implementation language. Asset definitions, artifact versions and owned item instances are distinct. Transferring or consuming one player item never deletes a shared visual resource.

## Required design decisions

1. Record systems of authority and the public/private/internal classification for every source/data/file class.
2. Choose a baseline delivery design using existing sufficient capabilities before adding services.
3. Define versioned immutable content, stable IDs, hashes, dependency closure, environment boundaries and schema compatibility.
4. Define map/source/runtime/dynamic-state separation, including procedural generator versions and seeds where applicable.
5. Define a resumable exporter/importer with dry run, source snapshot, safety checks, exact destination verification and no automatic source deletion.
6. Define release selection and the minimum complete package required before entering an area or enabling an interaction.
7. Define cache layers, key dimensions, TTL/revalidation, invalidation, privacy and failure behavior.
8. Define consistent database snapshots, binary/source copies, API/code definitions, operational recovery and separate key management.
9. Define data-loss/recovery-time objectives as proposed targets, then prove actual capabilities through isolated restore drills.
10. Define staged migration, verification, cutover, rollback, observation and later reviewed cleanup.

Do not flatten all map data into database rows. Large geometry/height fields belong in files; semantic metadata and sparse changes may belong in records. A storage migration must not alter the approved topology, placements, material identity or collision behavior by accident.

## Caching contract

Consider independently:

- HTTP/browser/CDN caches for approved public immutable files and release manifests;
- bounded persistent browser caches for optional repeat/offline loading;
- in-memory and GPU resources with explicit ownership and disposal;
- server-side response/function/data caches for permitted metadata reads.

Choose native capabilities first where adequate. External Redis or a CDN requires an evidence-backed reason, cost and operations owner. TTLs and capacity are project parameters, not universal defaults.

Version immutable keys/URLs. Revalidate mutable release selection. Keep private responses out of shared caches and explicitly exclude them from service-worker caching. Authentication must be enforced before a protected cache hit. A signed URL is a bearer capability and must not be normalized into a public cache route accidentally.

Cache invalidation follows committed authoritative changes; versioned generations and durable events address stale-fill races. Cache outage, eviction or an empty cache must not change ownership, create items or authorize a purchase. Use durable transactional constraints for mutations; not cache-only locks or receipts.

Network caching does not fix GPU overload or bad assets. Measure cold/warm download, parse/decode/upload, draw calls, frame time and memory separately. Browser quotas/eviction make local asset caches unsuitable as sole backups.

## Export and source integrity

Inventory actual runtime references, local-only/ignored outputs, LFS bytes and dynamically generated URLs. Combine source scans with runtime traces and asset manifests. Reject unsafe source paths, symlink escapes, traversal, unsafe archive contents and unclassified public artifacts.

Preserve source bytes; optimize only as an explicitly reviewed derivative. Verify hash, byte size, MIME, dependency relationships, material/texture fidelity and target-device loading after upload. An upload receipt or ETag alone does not establish content integrity.

A job persists per-object status so cancellation, network loss and restart can reconcile the destination before retrying. Promotion is separate from upload. Keep the old complete release during staging and preserve required integrity checks when moving formerly bundled paths to remote storage.

## Backups and restoration

A restore set includes compatible definitions/code, consistent mutable data, referenced object bytes, source projects and operational recovery information. Record the snapshot cutoff and external side effects. A database export without media or API definitions is not a complete system backup.

Store an independent protected copy in an appropriate failure domain. Encrypt sensitive backups, keep keys separately, define least-privilege access and test recovery of credentials. Retention balances restoration needs, privacy and cost.

Restore in an isolated environment with payments, notifications, generation jobs and external settlement disabled until verified. Check relationships, object hashes, account login, progress, retries and the actual rendered game. Record elapsed recovery time and data-loss exposure; do not equate 'backup completed' with 'restore verified'.

A project-only incident must not restore other applications sharing a provider instance. Verify native restore scope in advance. When a provider can only restore the entire instance, design a safe project-scoped export/recovery path or an explicitly approved incident procedure.

## Rollback distinctions

- Asset/content rollback changes compatible release references, not player inventory history.
- Code/API rollback must remain compatible with the live database or use a reviewed migration/fix-forward procedure.
- Database recovery must reconcile post-snapshot effects and must not duplicate external payments or chain settlement.
- Storage relocation may change object locators while preserving stable IDs and hashes.
- Revoking publication cannot revoke copies already downloaded from a public endpoint.

No destructive garbage collection until active/rollback releases, backup references, source-retention obligations and the grace period have been evaluated. Do not rewrite Git history as incidental migration cleanup.

## Acceptance and workflow

Test source completeness, private/public isolation, interrupted exports, corruption, missing assets, cross-account cache leakage, stale keys, cache failure, safe scene loading, concurrent mutations, durable retry receipts, browser quota loss, independent restore and no regression to existing applications.

Use the project's normal Superpowers design/approval process, then `writing-plans` against current files, isolated worktrees, TDD, independent technical/visual review and fresh verification before completion. Do not claim a remote model, automatic backup schedule or provider capability that was not actually invoked or tested.

Project-specific example: [The Sundered Spheres post-POC Xano design](../souldrifter-production/post-poc-xano/README.md). It is an overlay, not a provider requirement for other games.
