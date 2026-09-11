# The Sundered Spheres — Post-POC backend, asset export, caching and recovery

**Document ID:** SS-POSTPOC-ARCH-001  
**Revision:** 1.0 — 2026-09-10  
**Status:** DESIGN_FOR_OWNER_REVIEW; implementation NOT_STARTED  
**Timing:** finish the currently agreed demo/POC first; execute this migration afterward.  
**Requested lead:** Astra, highest reasoning setting actually available in the executing host; record actual selection. This document does not launch or switch an agent.  
**Method:** Superpowers architectural design and self-review now; approved implementation planning, TDD, isolated workers and independent verification later.  
**Companion:** [ASTRA_KICKOFF.md](ASTRA_KICKOFF.md).

## 1. Decision and scope

Keep building the existing browser game. Do not introduce a database migration, new paid service, remote-only asset dependency, map rewrite or cache layer into the unfinished demo merely because this design exists.

After the owner accepts the agreed POC, preserve a runnable, restore-tested baseline. Then migrate the accepted game in controlled stages to:

1. a **separate game workspace in Xano**, reusing reviewed NewLuv backend definitions rather than its customers or live credentials;
2. a versioned catalog for game data and assets;
3. file/object storage for approved runtime binaries, plus a private source/archive copy;
4. release-pinned manifests and a provider-independent asset resolver;
5. browser/HTTP caching first, selective Xano/Redis data caching when measured useful, and optional CDN/external storage where required;
6. recoverable database, definition, asset and deployment backups;
7. a small authoritative persistence/economy boundary that can later support secure trading and a separately approved crypto pilot.

**Large GLB files, textures, videos, terrain exports and map images belong in file/object storage, not ordinary database rows or Redis.** Xano itself separates file bytes from database file metadata. Small structured records, relationships, versions, ownership and object locators belong in the database. [X1]

The client uses HTTPS APIs. It does not need to share an implementation language with the backend. XanoScript/CLI is a backend authoring option, not a TypeScript-client requirement. Existing game language, renderer and hosting are not selection criteria for replacing the user's working Xano foundation.

### Scope boundaries

Included: accounts/profile reuse assessment; persistent game records; complete asset/source inventory; map-data separation; export/import contracts; asset delivery; caches; backup/restore; release provenance; staged migration; operations and acceptance.

Excluded: new quests/lore, a new renderer, rebuilding all art, world redesign, new paid generation, a full MMO combat server, production token issuance, mainnet minting, real-money marketplace, plan upgrades, purchases, source deletion, repository visibility changes, production publication, or merging unrelated feature branches. No database connection or account entitlement was inspected during this design.

The environment/avatar/NPC/creature workers retain their current ownership. In-progress artifacts are archived separately and never silently promoted to accepted runtime assets.

## 2. Authority, evidence and unresolved facts

The common authority remains `Chelestra-Sea/infra/playbooks/game-development/`: universal methods plus the SoulDrifter overlay. Host-specific handoffs are adapters. The existing full context readset, lore sources, narrative-autonomy rules, setup instructions, build templates and verification gates remain applicable; this specification does not replace them.

### Inspected repository evidence

- Documentation source ref resolved to `3bdc53fd5222daae3429039e510ea0ed0576dbfb` before this package was added.
- Remote `qa` resolved to `037e5d9ec5a0863751b550fee5c3ab592218d6f7` at inspection. This is **not** the future migration target; execution resolves the newly approved POC commit.
- Current `scripts/prune-runtime-assets.mjs` checks allowed build directories, rejects unsafe paths/symlinks, protects required files and exact-hash collections, and enforces bundle budgets.
- The first 100 lines of `scripts/runtime-asset-manifest.json` were inspected: current maximum is 500,000,000 bytes, preferred 475,000,000 bytes, with protected models, weapon textures, review pages, atlas files and a hashed dungeon-kit collection. This is partial manifest coverage, not a full asset inventory.
- Shared `WORKFLOW.md` requires source/runtime fidelity, real-controller collision proof, correct map/asset relationships, independent verification and separate deployment approval.
- Shared `START_HERE.md` requires actual underlying context reads, not a filename checklist.

Repository source locations and exact coverage are listed in section 23. Local worktrees, all source-book files, NewLuv APIs, deployed Sites state, Xano billing, media counts and backup destinations were **not** audited here. The executing agent must complete that audit before claiming CONTEXT_READY or operational readiness.

### Blocking facts to resolve later

| ID | Fact needed | Safe default until resolved |
|---|---|---|
| D01 | Owner-accepted POC scope and exact code/artifact hashes | No migration; no assumed deadline or requirement to complete every backlog ticket |
| D02 | Actual Xano plan, available workspace/sandbox/data-source slots, Redis availability and capacity | No upgrade or extra service purchase |
| D03 | NewLuv definitions approved for reuse and their dependencies | Read-only inventory; no customer/record copy |
| D04 | Storage file-size, privacy, bandwidth, CORS, caching and Range behavior | Upload only to isolated test storage after authorization |
| D05 | Private independent backup destination, encryption/key custodian and restore target | No claim of complete backup protection |
| D06 | Largest files, total unique bytes, release dependency closure and target-device performance | No arbitrary texture downsizing or estimated total presented as measured |
| D07 | Supported consistent export/restore method and acceptable data-loss window | No shared economy cutover until proved |
| D08 | Account identity/session reuse and treatment of old local saves | Reauthenticate and isolate local/demo state; no client-created mintable inventory |
| D09 | Public-use rights and classification of models, media and lore | Private staging by default; no bulk public upload |

## 3. Architecture and alternatives

### Recommended starting architecture

```text
Existing game host: application shell, code, bootstrap and small fallback package
       | HTTPS commands and versioned metadata reads
       v
Separate Xano game workspace
  authentication/profile API
  content/catalog API
  state/economy commands + transaction receipts
  export/release/backup metadata
       |                         |
       v                         v
Durable database          Optional built-in Redis/data cache
(records and ownership)  (reconstructible small reads only)
       |
       | returns asset locators / authorized delivery URLs
       v
Xano runtime file storage ---- optional approved object store / CDN
       |
       v
Browser HTTP cache -> optional bounded offline asset cache -> decoded/GPU resources

Independent private archive:
source projects + raw downloads + runtime objects + database snapshots
+ API/schema definitions + manifests + restore instructions
```

The API ordinarily returns URLs; it does not proxy every texture/video byte through a custom database endpoint. Redis is never exposed directly to browsers.

### Options and selection tests

**A — Xano-first, recommended.** Separate game workspace, Xano records and included runtime file storage, verified native delivery headers, integrated response/data caching as available, and one private offsite backup destination. Fewest new operational components; strongest reuse of existing skills and definitions. Choose it if representative file, privacy, delivery and workload tests pass.

**B — Xano APIs/database plus external object storage/CDN.** Retain Xano and move only the files that need larger uploads, controllable cache headers, private delivery or different bandwidth economics. R2 with an appropriate delivery route or S3 plus CloudFront are candidates, not preselected purchases. Same logical asset IDs and hashes; provider locators change. Use per-class routing rather than a forced all-or-nothing migration.

**C — Xano plus external managed Redis.** Consider only if measured metadata load, capacity, observability, networking or required cache operations exceed Xano's actual available cache. Adds credentials, latency, bills and failure modes; not the default merely because Redis was requested.

Do not change the database vendor to solve a binary-file-delivery problem. Do not add a CDN before verifying whether native file delivery already meets the need. Do not assume arbitrary third-party Xano URLs can be placed behind a controlled CDN without a supported origin arrangement.

Xano's docs expose Redis-backed data and response caching; availability and capacity must be confirmed on the purchased plan. The data-cache article documents a 100 MB limit, not unlimited storage. [X3, X4] External storage pricing is a separate cost input; R2 documents storage/operation pricing and no direct internet-egress fee, but this is not a zero-total-cost guarantee. [C3]

## 4. Separate NewLuv from the game

Reuse may include reviewed account/profile definitions, validation, authorization conventions, reusable functions and error handling. A clone is a starting point to inspect, not a production-ready game backend. Xano documents cloning without database records or drafts. [X5]

Before enabling the game workspace:

- Record source and destination workspace IDs privately; fail a mutating operation if they resolve to NewLuv or another non-target environment.
- Export approved definitions separately from user records, environment variables and private files.
- Remove or disable inherited matching/chat jobs, billing callbacks, messaging quotas, notification destinations, app-specific triggers and unrelated integrations.
- Issue new game credentials, signing configuration, redirect allowlists and storage access. Never assume NewLuv sessions should authenticate against the game.
- Check password hashing, identity-provider subject mapping, refresh/logout/revocation and account linking by actual inspection. Do not copy signing secrets to manufacture shared login.
- Reuse code without synchronizing production customers. A later shared-identity product decision is separate.
- Use a real sandbox or isolated test datasource whose behavior has been proved. A Git or API branch alone is not proof of independent database contents.
- Measure shared-instance CPU, memory, file bandwidth and job contention. Namespaced data is not dedicated infrastructure.

Keep live Xano definitions and their source-controlled representation reconciled. The CLI documentation requires pulling changes before editing and supports sandbox review; one-way UI Git Sync is a different feature, not automatic Git-to-live deployment. [X5, X6]

## 5. Data classification and system of record

| Class | System of record | Delivery/cache | Backup rule |
|---|---|---|---|
| Code, export configuration and schemas | Reviewed Git commit plus build artifact | Existing host; hashed code assets | Mirror/archive commit, locks and reproducible build inputs |
| Auth/profile records | Game Xano workspace | Private API; no shared response caching initially | Encrypted consistent snapshot; no public repository copy |
| Characters, inventory, awards, trades and world-state changes | Authoritative database and durable receipts | Uncached writes; permission-checked reads | Consistent snapshot + supported recovery journal; transaction-aware restore |
| Immutable item/quest/recipe definitions | Reviewed source dataset identified by version/hash | Compiled release records or static JSON; safe read caches | Pin definition version to release and save compatibility |
| Canonical maps/topology/placements | Reviewed source map and compiled version | Small queryable metadata + immutable file chunks where justified | Preserve original and exact compiled derivatives |
| GLB, textures, audio, atlas images, video | Versioned object bytes + content hash | File delivery/HTTP cache; optional CDN | Independent object copy before promotion |
| Source DCC projects/raw downloads/review evidence | Private source archive | Not in public game manifests | Retain sources and complete dependencies |
| Secrets and encryption keys | Approved secret manager/provider secrets | Never manifest/Redis/browser | Separate encrypted recovery process and access control |
| Redis, browser disk cache, decoded/GPU objects | No authority | Disposable acceleration | Rebuild; not a restore source |

Do not store full binary files as Base64 strings in JSON records. Do not export the whole repository to a public bucket. Classification is per artifact; filenames such as 'runtime' or 'public' do not establish clearance.

Three identities remain separate: **asset definition**, **asset version/file representation**, and **player-owned item instance**. Thousands of swords may reference one mesh. Consuming an item never deletes that shared mesh. Changing a texture does not transfer ownership.

## 6. Proposed catalog and relational contracts

Names below are proposed logical tables, not claims that these Xano tables exist. Reuse equivalent existing contracts discovered at implementation; migrate additively rather than duplicating them.

| Entity | Key and core fields | Constraints |
|---|---|---|
| `asset_definition` | stable asset_id, category, display/localization key, intended role, source classification | asset_id unique; no player identity embedded |
| `asset_version` | version_id, asset_id, content_hash, source_bundle_id, units/axes/bounds, review statuses | immutable after approval; separate geometry/material/rig/motion/gameplay status |
| `asset_file` | file_id, version_id, semantic role, provider, locator, hash, bytes, MIME, visibility, encoding/tier | unique logical hash/role/tier; public serializers exclude internal paths |
| `asset_dependency` | parent version, child version/file, required/optional role | dependency closure complete; illegal cycles rejected |
| `source_bundle` | archive ID, source hashes, source/ref/receipt pointers, license, exporter/tool versions | private; originals never overwritten by derivatives |
| `world` / `zone_version` | world/zone IDs, coordinate frame, source map hash, topology version, generator version where applicable | no visual-only duplicate world geometry authority |
| `zone_chunk` | zone_version, chunk_id, bounds, neighbor IDs, render/collision/nav references | same frame/version; conservative overlap and loading contract |
| `placement` | stable placement/socket ID, asset version, transform, collider/nav role, classification | preserve IDs, facing, scale and source-fit evidence |
| `content_release` | release_id, code SHA, API contract version, data schema range, map versions, manifest hash | approved immutable content; no secrets or signed URL persistence |
| `release_channel` | channel ID, active_release_id, generation, previous_release_id | compare-and-set/locked promotion; audit every change |
| `export_job` / `export_object` | job ID, input snapshot, exact files/hashes, state, retry/verification receipts | idempotent resume; source and target size/hash verification |
| `backup_set` / `restore_drill` | backup ID, scope, cutoff/watermark, component hashes, encryption ref, result | READY only when coherent components exist; RESTORE_VERIFIED separately |
| `account`, `character`, `item_instance`, `transaction_receipt`, `outbox` | existing game-domain contracts | actual persistent state never replaced by an asset-release rollback |

All mutation tables need created/updated timestamps, schema version and correlation/audit fields where meaningful. Unique constraints must exist at the database boundary, not just in UI validation. Index published lookups by release, zone, asset ID/tier; index mutable state by account/character and transaction key. Paginate large lists. Do not expand large binary or source records in normal API joins.

Schema changes must preserve legacy stable IDs, authentication boundaries and save formats. NewLuv schemas are reused only after a mapping review. The database's selected storage representation and physical SQL names must be discovered; do not assume a generic PostgreSQL dump automatically reconstructs Xano APIs, functions or authentication behavior.

## 7. Maps, terrain and large world files

Export **both meaning and rendering**, not just the painted atlas.

1. **Original authored sources:** atlas source images/vectors, keyed lore/map companions, Houdini terrain projects, approved native exports, road/water/placement data and version history. Keep original source coordinates and known hashes.
2. **Runtime visual files:** terrain meshes/height fields, material layers, baked maps, atlas images, vegetation representations and animation/VFX assets. Store large arrays and geometry as versioned files.
3. **Queryable structured metadata:** worlds, zones, landmarks, route relationships, services, sockets and bounds. Store rows/compact JSON appropriate to actual queries.
4. **Dynamic state:** opened containers, destroyed objects, discoveries, quest changes and respawn state. Store sparse, authoritative per-player or world changes, not a fresh complete map copy per character.

A placement, its collider and its navigation data must reference the same map/asset versions. Never activate a chunk with render geometry loaded but required collision or hazards absent. At a streaming boundary, retain a safe barrier/loading state or the preceding safe position until the complete required package is available.

Do not make one database row per terrain vertex, texel or blade of grass. Uploading large files to 'the backend' does not mean placing millions of those records into the database.

For procedural First Breach content, preserve the generator version, seed, route choice, compiled topology hash and required serialized overrides/snapshots. A seed alone is insufficient when generator versions change. Do not regenerate accepted maps or recook the landscape merely to move their storage.

Keep the current whole-section vista/loading behavior initially. Spatial chunking is an optional measured optimization, not permission to remake the region or hide distant scenery. Chunk descriptors can be designed now and introduced only after equivalent topology, camera, traversal and visual tests pass. No promises of universal seamless streaming before those measurements.

## 8. Asset technicalization and integrity

First move accepted bytes unchanged wherever practical. Treat optimization as a separately versioned derivative with the existing imported-asset presentation gate, not a free opportunity to alter the art.

- Use self-contained GLB for distinct actor packages when practical. Explicitly manifest external textures, buffers, clips and shared material libraries where used.
- Keep source and runtime texture identities, UVs, channel packing, alpha and sampler/wrap settings. Color maps and normal/roughness data must not be indiscriminately converted through an image-photo workflow.
- Use generic file upload for binary/data formats unless an image pipeline's transformation is deliberately approved. Read the stored object back to detect unwanted recompression or transformation.
- Evaluate supported KTX2/Basis texture exports, mesh compression and LOD by appearance, bandwidth, decode time and GPU memory. Include exact decoder/transcoder versions as release dependencies. Three.js KTX2 support requires capability detection and a supported transcoder path. [T1]
- No arbitrary global resolution ceiling, no silent geometry loss, no flattening materials, and no source overwrite just to fit a plan's upload limit.
- Larger private masters may use approved archive storage; oversized public runtime files may use an alternate file provider. Record the routing decision before changing quality.
- Animated and mesh-only readiness remain separate. A transport migration does not approve a rig, animation or collision profile.

Record download bytes, decoded image memory, texture/GPU estimates, parse/upload time, triangles/draw calls and device traces separately. CDN and Redis caching do not repair excessive draw calls, badly weighted models or too many GPU-resident textures.

## 9. Export pipeline — resumable and non-destructive

The future exporter may be implemented using the existing repository tooling or a suitable language chosen by its owner. The contract, not language, is binding. No executable exporter is delivered by this specification.

### Inventory and selection

Create a snapshot manifest of the accepted release and every required dependency. Discover tracked Git files, LFS objects, ignored/local-only exports, provider outputs, generated files and references in HTML/CSS/JS/JSON/glTF. Static scanning alone is insufficient for dynamically constructed URLs; combine runtime network traces, registries and producer manifests.

Resolve symlinks and reject paths escaping approved source roots, path traversal, drive/UNC escapes, nulls and unsafe archives. Preserve private receipts separately. Classify each object as runtime-approved, source-only, review-only, quarantined, secret/PII, derived rebuildable or unclassified. Unclassified required dependencies block promotion; they are not silently dropped.

### Job states

`DISCOVERED -> CLASSIFIED -> SNAPSHOTTED -> PACKAGED -> UPLOADING -> UPLOADED -> VERIFIED -> CANDIDATE_READY -> PROMOTED`

Any stage may enter `BLOCKED`, `FAILED_RETRYABLE`, `FAILED_FINAL` or `CANCELLED`. Promotion is a separate authorized operation. Resume from durable per-object receipts, not a progress bar.

### Execution contract

1. Freeze exact input code/map/asset versions and manifest; read changing source files only through a consistent snapshot or fail on drift.
2. Create a private source backup and record file inventory plus hashes.
3. Build packages without modifying the source. Hash the exact upload bytes after any approved derivative operation.
4. Compute a dry-run report: unique files/bytes, new versus already-verified objects, privacy, largest object, dependencies, estimated transfer and expected charges.
5. Obtain scoped upload/storage approval. A prior 3D-generation budget is not a storage purchase authorization.
6. Upload only new/missing content, with bounded concurrency, streaming I/O and provider-supported resume/multipart behavior. Do not assume Xano supports S3 multipart or arbitrary custom path names.
7. Use a logical content key separate from the provider's returned locator. A timeout enters uncertain/reconcile state; inspect the destination before retrying to avoid duplicate charges/objects.
8. Verify byte counts, MIME and **actual content hashes** by readback or a proven equivalent. An ETag is not assumed to be SHA-256.
9. Import catalog/zone/placement records in a consistent dependency order, using idempotent keys and a resumable mapping of old IDs to existing stable IDs.
10. Run dependency, privacy, visual, runtime and restore checks on a candidate release. No live pointer changes during upload.
11. Promote atomically only after approval; retain the old manifest and files.

Use the existing `prune-runtime-assets.mjs` protections as inputs. Where a currently protected bundled path becomes external, a reviewed exact mapping must replace that bundled obligation with remote inventory/hash/availability tests. Do not remove protected paths or weaken the 500 MB build ceiling merely to make a build green. The new solution reports bootstrap-bundle bytes AND remote critical-path/total-release bytes; externalizing files does not make download cost disappear.

### Retention and deletion

No source deletion or Git history rewrite is part of migration. Initial cleanup is a report only. Later garbage collection is mark-and-sweep over every active release, rollback release, backup set and retained source bundle. Apply an owner-approved grace period and review list. Quarantined art and provider receipts retain their required historical records. A CDN cache or expiring provider link never counts as the sole preserved copy.

## 10. Release manifest and client loading contract

A release manifest is an immutable dependency-closed snapshot. It includes release ID, code SHA, API/data compatibility, map hashes, required/optional asset versions, file hashes/sizes, quality variants, public delivery locators, loading priorities and fallback rules. Private archive locations, customer data, credentials and signed URLs do not appear in the public projection.

Keep a small trusted bootstrap with the game shell. It identifies the allowed API/delivery origins, required schema/contract versions and how to obtain the selected release. Do not create a circular dependency where the cache or API can only be configured by an asset that needs that configuration to load.

Client sequence:

1. Resolve the environment and one release ID through the bootstrap or revalidated channel response.
2. Validate manifest schema/compatibility and known origin rules; reject a manifest incompatible with the loaded client.
3. Pin that release for the session. Download required First Breach or Heartvale entry dependencies before allowing movement.
4. Fetch binaries directly from supported file endpoints. Prefetch nearby or likely-next data only within device/network budgets.
5. Reuse content by hash; instantiate independent actor state safely without destroying shared geometry or textures.
6. Missing critical geometry/collision stops affected entry with retry/safe-return, never a pill/invisible collider-free world. Optional portrait/audio fallback follows its existing policy.
7. A newly promoted release is offered at a safe boundary or reload. No mixed old terrain/new colliders or mid-combat silent content swap.

Proposed initial transfer concurrency: 2 mobile, 4 desktop, subject to evidence. These are tunable starting values, not universal limits. Do not preload the entire universe, a 1080p cinematic master or unused texture tiers at login. Range requests and streaming media must work on actual target browsers.

## 11. HTTP API surface and consistency

Routes below are logical contracts to implement or map to existing endpoints, not verified deployed URLs.

| Operation | Contract | Security/cache |
|---|---|---|
| Resolve channel | `GET /v1/content/channels/{channel}` -> release ID, generation, compatibility | public or authenticated as configured; revalidate, not stale mutable authority |
| Read release | `GET /v1/content/releases/{id}` -> filtered immutable manifest | public immutable projection may cache |
| Read zone package | `GET /v1/zones/{id}/versions/{version}` -> metadata/dependencies | release-scoped cache; no private discoveries included |
| Read public catalog | `GET /v1/catalog/{version}` with bounded page/tier/locale | version-keyed cache |
| Request private delivery | `POST /v1/assets/{fileId}/access` | authenticate/authorize each request; no-store; returns short-lived URL |
| Read own state | `GET /v1/me/state` -> authoritative versioned snapshot | identity-bound; no shared caching initially |
| Mutate game/economy state | existing command endpoints with operation ID and expected version | validate/lock/commit; never response-cache mutation |
| Job administration | export/create/status, promotion and restore requests | operator role, private audit, explicit approvals |

All mutations use a stable idempotency key scoped to principal, environment and operation. Store a request hash; reuse of the same key for different input is rejected. A repeated identical request returns the durable committed result. Validate ownership, recipe/reward eligibility and versions on the server; do not trust a client inventory or a browser 'boss defeated' assertion.

Xano supports database transactions and record locking, but its documented rollback behavior specifically concerns database-operation failures. Explicitly test validation failures and partial paths. [X7, X8] File uploads, emails, cache invalidations and chain transactions are not made globally atomic by a database transaction; use a durable outbox, compensation/reconciliation and distinct states.

Keep existing #507 award, #499 inventory and #505 persistence ownership. Asset export is not a second inventory system. Immutable economy definitions may be cached; actual balances, mint eligibility, sales and consumption must be validated against durable state.

## 12. Caching policy — four distinct problems

**Cache only after classification and measurement. Do not add Redis simply to store everything twice.**

| Layer | Data | Initial policy | Invalidated by |
|---|---|---|---|
| Browser HTTP / CDN | Approved public immutable models, textures, atlas, audio, code | version-specific URLs; long-lived immutable cache where supported | a new URL/hash, not overwriting the old object |
| App disk cache | Optional downloaded zone/content files | bounded, opt-in/cache-policy-aware, release/hash namespaced | quota eviction, user clear, release retention, corruption |
| Runtime memory / GPU | Parsed meshes, decoded textures and live scene resources | shared resource ownership + reference counts + measured budgets | scene lifecycle / device budget / context loss |
| Xano response/function/data cache | Small immutable catalog/zone/recipe metadata and safe projections | versioned keys, bounded TTL, tested failures | revision/generation changes or targeted eviction |

### Proposed per-class defaults

- Content-addressed **public** binary objects and immutable release JSON: `Cache-Control: public, max-age=31536000, immutable` where the delivery host supports and proves it.
- Mutable channel/boot selection: `Cache-Control: no-cache` with ETag validation, or `no-store` if the implementation cannot safely revalidate. Do not serve a stale current-release pointer for a new session.
- Authentication, profile secrets, signed URL responses, inventory/transaction/ownership commands and private recovery endpoints: `Cache-Control: private, no-store`, plus explicit service-worker exclusion.
- Public descriptive catalogs: content-version keyed. Suggested native cache TTL 300 seconds to 1 hour; immutable versioned function results may use longer bounded TTL.
- Public market display/leaderboard summaries, only if introduced: 5–15-second stale display allowed and visibly timestamped; final purchase/award uses fresh state.
- Errors from authorization or missing critical release dependencies: do not cache as success. Negative caching, if used for public nonexistent immutable objects, is short and cannot hide a newly uploaded candidate during validation.

`no-cache` permits storage but requires validation; `no-store` prohibits storing by compliant HTTP caches. Managed/service-worker caching needs separate rules. [W1, W2] Header examples here are desired configuration, not evidence that Xano's file service exposes all corresponding header controls.

### Redis/Xano implementation

Start with Xano's built-in response/function cache for demonstrably shareable immutable responses. Use explicit data-cache keys when release/version identity or targeted invalidation is required. Native response caches must include every output-affecting input; authenticated personalized caches additionally require user identity and authorization context. Xano documents caching signatures and TTL configuration; test any pre-cache middleware/auth behavior rather than assuming it. [X3, X4]

Suggested key shape:

`game:{workspaceId}:{environment}:{schemaVersion}:{releaseId}:{class}:{locale}:{tier}:{id}`

Do not include bearer tokens in keys/logs. Namespace all game cache state so targeted invalidation cannot affect NewLuv. Never use whole-instance `FLUSHALL` for a game release or incident.

Cache-aside sequence: resolve immutable identity, read cache, on miss fetch durable data, validate, cache with TTL/jitter and return. Coalesce in-flight reads where supported; cap cache-miss traffic and use bounded retry/backoff. Cache outage falls back to bounded durable reads or an explicit temporary-unavailable response; it never authorizes a transaction from stale balances. [R1]

The documented Xano data-cache capacity is 100 MB; record the actual plan/instance allocation and potential shared use before choosing limits. [X3] Proposed per-value ceiling is 256 KiB with larger payloads split/versioned or served as static files. Reject binary/Base64 asset bodies. Estimate keys * measured serialized size plus overhead and retain headroom. Do not promise visibility or commands the native Xano cache does not expose.

Content hashes make immutable-cache invalidation straightforward. Mutable writes commit first, then enqueue a targeted revision/invalidation event. A delete-only invalidation is insufficient for races: versioned generations prevent an older read from repopulating a new key. Outbox retries are durable; losing Redis never loses the underlying event or item.

No inventory source of truth, exclusive purchase lock, idempotency history, private key, sole queue or sole backup lives only in Redis. Use database constraints/transactions for economic correctness. Disabling the cache must change performance, not results.

### Browser persistent cache and memory

Start with normal HTTP caching. Introduce Service Worker/Cache Storage or IndexedDB asset caching only when offline/repeat-load measurements justify it. Browser storage quotas vary and may evict data; this is a disposable copy. [W3]

If used, cache only allowlisted, verified public release assets; never blanket-cache all GET responses. Cache API entries do not automatically inherit an application TTL/eviction strategy, so implement size accounting, LRU/grace retention, schema cleanup, quota failure and corruption recovery explicitly. [W2] Do not store private signed responses or tokens in the asset cache.

Maintain release compatibility during worker updates and open tabs. No automatic worker activation that changes a live scene underneath the player. User logout clears private application state; public shared asset copies may remain. Offline mode is visibly local/read-only or explicitly isolated gameplay; its new inventory never merges into an authoritative economy by trust.

HTTP cache hits still incur parse/decode/upload costs. GPU resource reuse needs explicit disposal/refcount rules, and changing graphics quality must not dispose resources another actor uses. Cache and draw/memory metrics are reported separately.

## 13. File delivery, privacy and origin security

Public runtime files may be delivered without per-download authentication once cleared. Private original models, source lore, customer uploads, review packages and backups are not public runtime assets.

Xano documents ordinary file URLs as accessible without authentication and Pro private files via time-sensitive URLs. [X1, X2] Access to the metadata API is not protection of a public file URL. A signed URL is a bearer capability; do not log it, put it in immutable manifests or treat it as DRM.

If using external storage, verify the exact access route: for example, R2 presigned S3 URLs do not work on custom-domain URLs, and a public cached route is not automatically a private authenticated one. [C1, C2] Authorization must precede any protected cache hit; never strip signing parameters into a publicly shared cache without a tested authenticated edge design.

Verify actual CORS from each approved game origin; required MIME, Content-Length, ETag, Range/206/HEAD and compression behavior; wasm/transcoder routing; and TLS. CORS is a browser read control, not permission to own an item. Avoid forwarding authentication to unrelated file hosts. Uploads/imports use allowlisted origins/locators, size/type limits, traversal protections and malicious SVG/archive handling.

Runtime clients cannot prevent extraction of files they legitimately download. Enforce item use/transfer server-side; do not equate possession of a GLB URL with inventory ownership.

## 14. Backup design — separate components, one coherent restore set

A successful backup job is not proof of a usable restore. Protect these components:

**B1 Definitions:** Xano schemas/APIs/functions/tasks/triggers, selected branch and configuration references, client/server code, dependency locks, exporters and infrastructure configuration. Exclude plaintext secrets and production records from ordinary Git exports.

**B2 Mutable data:** accounts, characters, inventory, transaction/idempotency receipts, reservations, outbox, quest/world state and asset/release catalog. Capture a consistent snapshot and a proven cutoff/watermark. Hash rows/files in a deterministic export format where supported; preserve relationships and counts.

**B3 Runtime objects:** exact bytes for all active and rollback releases, with hashes and dependency manifests. Object URLs alone are not backup files.

**B4 Sources:** raw provider downloads, source textures, Blender/Houdini projects and external dependencies, approval records and required provenance. Editable sources stay private.

**B5 Operational recovery:** deployment version IDs, DNS/origin/CORS/cache settings, Xano workspace/instance mapping, encrypted credential-recovery references and restoration instructions. Store keys separately from encrypted backups.

### Mechanisms

Use verified Xano native backups for supported instance recovery, plus portable game-scoped exports and independent object copies. The native documentation offers media inclusion for manual backups; media must be deliberately accounted for. [X9]

Xano Workspace Export, Export Data and CLI definitions/records exports are different things. Export Data can include media; the documented download expires after 12 hours, so retrieve, verify and archive it promptly. A notification or expiring link is not the offsite backup. [X5]

CLI `--records` and `--env` are opt-ins; do not run an all-inclusive export into a repository and accidentally commit credentials/PII. Definition-only export does not prove records or media recovery. Sandbox/branch promotion is not backup. [X6]

A direct database connector is an optional backup/analytics route documented for some plans. Test its access, schema mappings, snapshot consistency and supported restore path; it bypasses application validation and does not recreate Xano logic by itself. Do not assume point-in-time recovery/WAL retention merely because PostgreSQL is underneath. [X10]

Use a maintenance window/consistent-snapshot mechanism for small initial imports if snapshot isolation across all API exports cannot be established. File objects are immutable; record which snapshot references which exact objects. Never join independently timed table exports and call them a consistent trade ledger.

### Proposed recovery objectives and retention

These are **targets for owner approval and restore testing, not current provider guarantees**.

| Stage/class | Target | Proposed schedule / retention |
|---|---|---|
| Accepted release/source objects | No missing referenced files in a promoted release | Independent verified copy before promotion; retain accepted milestones until reviewed retention policy |
| Private POC account/progress data | RPO <=24h; RTO <=8h | Daily coherent game-scoped backup; 7 daily + 4 weekly sets initially |
| Shared test economy before real value | RPO <=1h; RTO <=4h | Supported consistent exports/journal at target cadence, daily full sets; prove cost and impact before enabling |
| Definition/release changes | Exact approved prior version recoverable | Snapshot before each promotion and after accepted milestones |
| Actual external-value operation, future | Separate risk/recovery objective required | No real-value launch on the POC targets; reconcile authoritative ledger with external settlement before reopening |

RPO is the maximum accepted data-loss window; RTO is the targeted time to restore service. The recovery clock includes fetching/decrypting files, importing, checking references and applying safe release settings, not only database import time.

Retain an independent failure domain and deletion-resistant copy where feasible. A second folder under the same credentials is not strong protection against account loss or accidental purge. Encrypt backups, use least-privilege backup credentials, bound retention/cost and document credential recovery. Privacy/erasure requirements apply to backup retention; do not promise perpetual retention of customer data.

### Shared-instance restriction

Never restore the entire Xano instance to repair the game while NewLuv is live without explicit cross-application incident approval. Prefer a game-scoped recovery into a proven isolated workspace/sandbox/instance. Verify restore-target capacity and billing beforehand. If the supported native restore cannot be isolated, it is not the default game rollback method.

The public pricing and backup article disagree on standard retention (seven-day Essential advertising versus an older three-day instance description). Treat actual account backup coverage as an explicit preflight check. [X9, X11]

## 15. Restore drills and rollback levels

### Restore drill procedure

1. Select a completed backup set and verify encryption key access without publishing secrets.
2. Create/use an approved isolated target; disable outbound mail, payment, provider-generation, scheduled publishing and chain submission.
3. Restore definitions and compatible schema; restore mutable data at the recorded cutoff and IDs/mappings.
4. Restore missing object bytes, rebuild provider locators if necessary and verify every manifest hash/reference. Old signed URLs are regenerated, not restored as durable URLs.
5. Restore code/API/content versions from the matched release; invalidate only the game cache namespace and start cold.
6. Check account login, existing character, map/placement identity, protected objects, quests, inventory, a retry-safe craft and a two-account test trade.
7. Verify the rejected/private artifacts remain inaccessible and NewLuv remains untouched.
8. Record actual recovery time, row/object counts, corrupt/missing cases, ledger invariants and independent verdict.
9. Destroy or retain the test target under its approved retention policy; no production cutover is implicit.

Conduct a drill before cutover, after material export/schema/provider changes, and on a proposed monthly cadence during active development. The scheduler and storage permissions must be implemented and tested; this document does not create a scheduled task.

### Distinct rollback operations

- **Asset/content rollback:** point the channel to a previously verified compatible release; do not rewind accounts/inventory.
- **Code/API rollback:** only to a version compatible with current data. Maintain an additive compatibility window; otherwise use maintenance and an explicit fix-forward/migration plan.
- **Database disaster recovery:** restore coherent records and reconcile post-cutoff effects; explicitly approve expected loss/replay and prevent duplicated notifications/rewards.
- **Provider-storage relocation:** retain logical IDs/hashes while replacing validated locators; no ownership changes.
- **Security revocation:** block access and purge controllable caches; cannot revoke already downloaded public bytes. A privacy incident is not solved by ordinary long-lived-cache expiry.

If future blockchain settlement exists, freeze affected operations, recover and replay verified chain receipts against idempotent local records before resuming. Never reissue consumed/minted items solely because a restored local snapshot predates the external action.

## 16. Post-POC migration sequence

### M0 — owner acceptance and frozen baseline

Record the exact agreed demo scope, accepted code/map/asset manifests and restored runnable copy. The existing #511 checkpoint is useful history, not automatic acceptance of the later completed POC. Preserve local-only producer files separately. No requirement to finish every future species or all campaign content unless part of the agreed demo.

### M1 — account and reuse audit

Read-only Xano plan/workspace/capability audit; identify reusable NewLuv definitions; cost and privacy decision; select isolated game development/restore targets. No active jobs or clients point at the new environment yet.

### M2 — archive and restore proof

Inventory accepted content plus source dependencies, create private independent copies and perform a baseline restore. No bulk export is called safe until its restore succeeds. Approve retention and ownership of recovery credentials.

### M3 — catalog and asset upload pilot

Use one Human, one creature, one building/material family, atlas/map/terrain data, an icon/portrait, audio and a video sample where present. Import metadata and exact file packages into staging, verify browser delivery and back up the new catalog/object set. Do not generate new media merely to supply a test case.

### M4 — dual-source read comparison

Implement an additive resolver/manifest adapter on an isolated branch. Compare local accepted assets against cloud copies using matching cameras, controller traces and map hashes. 'Dual-source' means controlled reads for parity, **not dual authoritative inventory writes**. Keep a single pinned source mode for each run.

### M5 — API and state boundary

Adapt the client through existing command/gateway interfaces to the separate game API. Import approved authored definitions, not arbitrary client inventory. Decide treatment of existing local POC saves: retain offline, map reviewed profile fields, or use explicitly isolated nonfinancial demo imports. Do not auto-promote editable local rewards into online tradable/mintable items.

Prove one authoritative crafting transaction and two-account trade before describing the backend as economy-ready. Preserve existing quest/reward contracts; no full combat-server rewrite is implied.

### M6 — selective caches and release verification

Enable immutable HTTP caching as part of file delivery. Measure uncached versus warm behavior; add eligible native response/Redis caches next. Browser disk cache and external CDN/Redis are separate measured decisions. Inject stale entries, cache outage, eviction and account switching.

### M7 — staged cutover

Publish to an isolated review deployment, verify complete critical-path dependencies, then move a small authorized test cohort. Freeze or synchronize authoritative writes only with a proven method. After independent and owner review, change one channel/bootstrap pointer; record exact code/API/data/manifest versions and rollback target. Existing main, QA, First Breach site and cinematic site remain separate targets—never choose one by a stale display label.

### M8 — observation and de-bundling

Observe predeclared error/latency/cache/bandwidth/visual metrics. Keep local source archives and known-good binaries. Remove duplicated deployment payloads only through reviewed manifest/protection updates after the remote release is independently recoverable. Do not delete sources or rewrite Git history as cleanup.

Durations are not promised. Each stage exits on evidence. There is no current cloud migration or job execution under this document.

## 17. Work-package ownership and parallelism

These are proposed work-package IDs, not existing GitHub issue numbers.

| Package | Owner concern | Inputs / boundary |
|---|---|---|
| P00 | Architecture/contract coordinator and source inventory | No current POC code changes; resolve source coverage and implementation plan after review |
| P01 | Xano reuse, schema and authorization foundation | Own backend definitions; NewLuv read-only; separate game destination |
| P02 | Source archive, exports and restore automation | Own backup/export tooling and evidence; never reset instance globally |
| P03 | Catalog and asset packaging/upload pipeline | Consume accepted assets; no art changes without derivative review |
| P04 | Asset resolver, release manifest and map-data adapter | Coordinate shared loader/preview files; no topology redesign |
| P05 | HTTP/native Redis cache policy and diagnostics | No independent mutable state or public-cache access bypass |
| P06 | Authoritative persistence/economy integration | Reuse #499/#505/#507 contracts; no mainnet |
| P07 | Release/cutover, independent visual/device/recovery verification | Verifier is separate from producer; release requires owner approval |

P01/P02/P03 design and isolated tooling work may proceed in parallel **after** the post-POC gate and shared interface ownership are approved. P04 requires versioned package contracts; P05 requires real uncached endpoints; final P06/P07 acceptance needs the integrated stack. Shared registry, save schema and release pointer each have one serialization owner.

The related existing issue families are #501 integration; #509/#512 environment/testing; #510 NPCs; #456/#458 assets; #499 inventory; #505 persistence; #507 awards; #437 release surfaces. Read their current comments at execution. References do not imply those tickets are completed or authorize edits to their worktrees.

## 18. Security and correctness acceptance matrix

Every test yields PASS / FAIL / BLOCKED / NOT_RUN with exact candidate versions and evidence. A plan or example manifest cannot yield PASS.

| ID | Required proof |
|---|---|
| A01 | Every accepted runtime dependency is inventoried; dynamic load paths exercised |
| A02 | Local-only files and LFS bytes are preserved, not just pointers |
| A03 | Traversal/symlink/archive escape rejected without out-of-root writes |
| A04 | Private source, PII, receipts and secrets excluded from public manifests/bundles |
| A05 | Upload retry/resume neither loses objects nor promotes partial packages |
| A06 | Full dependency readback verifies hash and byte size; bad MIME/HTML-as-model rejected |
| A07 | GLB/external-texture/animation packages preserve reviewed appearance and identity |
| A08 | No file silently recompressed, recolored, downscaled or stretched |
| A09 | Existing protected-path/hash tests have reviewed remote equivalents before de-bundling |
| M01 | Atlas, terrain, roads, water, placements, collision and nav share exact frame/version |
| M02 | Same route/seed/choice retains accepted topology and source visual result |
| M03 | Critical collision missing during load blocks entry instead of allowing fall-through |
| M04 | No unintended map regeneration, moved socket or changed First Breach seam |
| C01 | Cold/warm HTTP loads return the identical approved bytes |
| C02 | Old client/new manifest and old manifest/new API incompatibility rejected safely |
| C03 | Active session keeps one release during promotion; rollback is not mixed-version |
| C04 | User A/B, role change, logout/login and signed-file requests cannot share private cache data |
| C05 | Redis unavailable/empty/evicted yields correct bounded fallback, not wrong rewards |
| C06 | Concurrent cache fill + mutation cannot resurrect an obsolete current revision |
| C07 | Game namespace purge cannot affect NewLuv; no global flush command |
| C08 | Service worker excludes auth/state/mutations/private URLs; quota/eviction recovers |
| C09 | Multi-tab/service-worker update preserves sessions and release compatibility |
| C10 | GPU resources release correctly after repeated travel/avatar swaps; no shared-resource destruction |
| E01 | NewLuv records, credentials and background behavior not copied/activated accidentally |
| E02 | Cross-account state reads/writes denied; spoofed actor/account ID rejected |
| E03 | Concurrent purchase/consume/craft cannot spend or transfer the same item twice |
| E04 | Duplicate key/same payload returns receipt; duplicate key/different payload rejects |
| E05 | DB, outbox and upload failures are exercised; no fake global atomicity |
| E06 | Client/debug inventory cannot become authoritative trade/mint inventory |
| E07 | No-cache versus cache-enabled runs produce identical economic results |
| B01 | Backup includes definitions, records, file bytes, manifests and usable key references |
| B02 | Snapshot/cutoff consistency verified across items, trades, claims and outbox |
| B03 | Restore into isolated target works with NewLuv unchanged |
| B04 | Missing/corrupt object, expired export link and unavailable key correctly fail readiness |
| B05 | Exact backup revision can boot with original machine disconnected |
| B06 | Observed RPO/RTO and post-cutoff exposure measured; schedule result is not assumed |
| B07 | Asset/code rollback leaves current player ownership/progress intact |
| B08 | Native instance restore is never silently used as game-only rollback |
| P01 | Desktop and actual supported phone browsers pass CORS, texture upload and audio/video seek |
| P02 | Accessibility/loading/retry/skip/fallback remain available on slow network |
| P03 | First Breach + accepted Heartvale route show no unexplained visual/physics regression |
| P04 | Performance and bandwidth measured for cold/warm, low memory, network loss and cache failure |
| P05 | Unpublished data, review/admin tools and drafts remain outside public release |
| P06 | Producer report, independent technical/visual verdict and owner release decision are distinct |

A forced demo fixture or synthetic storage test cannot substitute for actual Xano/browser integration. Separate document/schema validation from runtime/capability validation.

## 19. Observability, costs and operating limits

Report per release and environment: current code/API/manifest IDs; cold/warm entry time; bytes requested/transferred; cache hits/misses; catalog query latency; file 4xx/5xx/CORS/Range failures; parse/transcode/GPU upload time; memory; transaction retry/conflict rate; backup age/completeness; restore-drill result; object storage and egress trend. Use correlation IDs, not raw tokens or sensitive URLs.

Proposed alert policy: warn at 70% and 85% of a verified quota; block new bulk exports at 95% unless explicitly approved. Recalculate with NewLuv's shared usage, retention and provider rounding. Rate-limit exporters and scheduled work so they do not starve gameplay or NewLuv. A published 'no API rate limit' is not unlimited compute.

Cost model:

`incremental Xano plan/workspace cost + extra binary storage + request operations + uncached delivery + backup retention + restore transfer/compute + optional cache/CDN service + operational effort`.

Track decimal GB versus GiB consistently. Example arithmetic only: a 100 MB fresh download across 1,000 clients is 100 GB before repeat loads and caching. Use real exported-byte inventories and traffic assumptions before an upgrade or vendor choice.

Current public Xano pricing advertises Essential storage/file/workspace limits; grandfathered pricing, shared instance allowances, actual Redis allocation and excess bandwidth terms are account checks. [X11] Avoid paying for external Redis when native caching is sufficient; avoid paying for a higher backend plan solely to host one oversized public video if a small object-storage supplement meets the need. Neither alternative is automatic approval.

## 20. Failure policy and operational authority

Safe defaults: stop only the affected import/upload/cutover; preserve input files and old release; keep the last complete package; disable financial mutations when durable authority is unavailable; display a meaningful loading/retry state.

Do not hide missing textures behind fallback art without recording it. Do not serve cached authorization after revocation. Do not reset profiles to fix a rendering error. Do not react to a storage quota by deleting referenced old releases or reducing assets without approval.

Actions requiring explicit later approval: subscription/workspace purchase; provider storage charges beyond approved batch; public classification; destructive cleanup; migration of actual users; promotion/cutover; native instance restore; DNS changes; mainnet/financial integration. The current authorization covers specification and handoff only.

If automated export/backup jobs are desired, implement the scheduler in an approved always-on cloud environment with secret handling, monitoring, locks and idempotent jobs. Do not depend on the owner's desktop or assume an agent will remain online. No scheduler was installed by preparing this document.

## 21. Future crypto compatibility without expanding this migration

Preserve stable item IDs, durable award/consume/transfer receipts, source provenance, versioned rules and an external-settlement reference. Cached assets convey no ownership rights; an on-chain item does not require storing GLB bytes on-chain.

A later testnet-only adapter can use authoritative eligibility and a lock/export/return lifecycle. It must not mint from imported local POC saves. Chain confirmations, reorgs, duplicate callbacks, consumed exports and disaster recovery need a separate reviewed design. Restoration of the DB cannot undo an external transfer or justify a replacement mint automatically.

This migration does not launch a reward token, create an airdrop incentive or change the game-first economic principles. It establishes data integrity and operations that those systems would need.

## 22. Superpowers and Astra execution contract

The requested lead must be selected in the host as Astra at its highest supported reasoning level. Record the actual model/effort reported by the host; never claim a prompt changed it. No separate Astra runtime was launched by producing this package.

Every agent first loads the full shared Sea startup/readset and actual underlying sources, then this spec and current issue/PR/worktree state. Reuse valid tool installations; verify source comprehension separately. All hosts follow the same authority.

After owner review of this written design and after the accepted-POC gate, use Superpowers `writing-plans` to derive exact implementation tasks against current files. Use `using-git-worktrees`, `test-driven-development`, `systematic-debugging` when needed, `requesting-code-review`, `verification-before-completion` and `finishing-a-development-branch` at the applicable stages. Dispatch independent work only if the host actually supports it; otherwise keep explicit sequential roles. Do not fabricate subagents or independent review.

Design now; build later. Each implementation task has a red test, minimal change, green test, regression check and evidence receipt. A new capability discovered during planning must not quietly retarget the architecture. The independent verifier reads actual requirements and exact candidate artifacts, not just the producer summary.

The writer has performed a design-level consistency review: scope/timing, object-vs-record separation, cache authority, private/public boundary, shared-instance restore blast radius, migration/rollback distinction and source coverage. This is **not** independent runtime verification. Unknown account capabilities remain D01–D09, with a safe default and owner/agent resolution gate rather than fabricated answers.

## 23. Source register

Official documentation checked 2026-09-10. These sources support capability claims; thresholds, schema layout, phases and acceptance tests above are proposed project design, not statements supplied by a vendor. Recheck account-specific features at execution.

### Provider and web-platform references

- **X1:** Xano file storage — https://docs.xano.com/file-storage/file-storage-in-xano
- **X2:** Xano private files — https://docs.xano.com/file-storage/private-file-storage
- **X3:** Xano Redis data cache — https://docs.xano.com/the-function-stack/functions/data-caching-redis
- **X4:** Xano response cache — https://docs.xano.com/the-function-stack/additional-features/response-caching
- **X5:** Workspace clone/export/data/settings — https://docs.xano.com/xano-features/workspace-settings
- **X6:** CLI pull/push and sandbox workflow — https://docs.xano.com/xano-cli/push-pull
- **X7:** Database transaction behavior — https://docs.xano.com/the-function-stack/functions/database-requests/database-transaction
- **X8:** Record locking — https://docs.xano.com/the-function-stack/functions/database-requests/get-record
- **X9:** Native backup/media/restore — https://docs.xano.com/xano-features/instance-settings/backup-and-restore
- **X10:** Direct database connector — https://docs.xano.com/xano-features/instance-settings/direct-database-connector
- **X11:** Pricing/plan matrix — https://www.xano.com/pricing/
- **W1:** HTTP cache semantics — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- **W2:** Cache API responsibilities — https://developer.mozilla.org/en-US/docs/Web/API/Cache
- **W3:** Browser storage quotas/eviction — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- **R1:** Redis cache-aside and stale-read considerations — https://redis.io/docs/latest/develop/use-cases/cache-aside/
- **C1:** R2 public bucket/custom-domain delivery — https://developers.cloudflare.com/r2/buckets/public-buckets/
- **C2:** R2 signed-URL routing/limitations — https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- **C3:** R2 storage/operation pricing — https://developers.cloudflare.com/r2/pricing/
- **T1:** Three.js KTX2 loader/capability detection — https://threejs.org/docs/pages/KTX2Loader.html

### Project sources and coverage

Repository: `The-Nexus-Decoded/The-Nexus`.

- `AGENTS.md`, docs ref: full; bridge-specific scope distinguished from this design task.
- `Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/WORKFLOW.md`, docs ref: full, blob `ce29883465913b18046af6deb6ad281324871907`.
- Same root `START_HERE.md`, docs ref: lines 1–125 refreshed; later sections available in retained discussion, not claimed as fresh full-file read.
- Same root `PROJECT_CONTEXT_READSET.md`, `CURRENT_DIRECTION.md` and `NARRATIVE_AUTONOMY_AND_DGC_CONTINUITY_POLICY.md`: underlying requirements retained from earlier full connector reads; executing agent refreshes live sources and completes every applicable read.
- `Arianus-Sky/projects/games/SoulDrifterWeb/scripts/prune-runtime-assets.mjs`, inspected QA SHA: full, blob `e3343ba8f6fcadd5640388945dae59755259b6af`.
- Same game root `scripts/runtime-asset-manifest.json`, inspected QA SHA: lines 1–100, blob `ada07dad2afae00714ee98464b14e930e8504db2`; no full inventory claim.
- Same game root `package.json`, `scripts/prepare-sites-build.mjs`, `worker/static-sites-worker.js`, `docs/DUAL_DEPLOYMENT.md`, `docs/ARCHITECTURE.md`: prior connector-read implementation context, revalidate at accepted POC freeze.
- Shared universal imported-asset presentation gate and related #499/#505/#507 issue contracts: prior retrieved policy context, not completed runtime proof.
- User's current instruction: specification now, current demo unchanged, migration/export/cache/backup process after POC; preferred separate Xano workspace reusing existing NewLuv backend expertise.

No source-file location, bill, source-book fact or passing test is inferred from a filename alone. NewLuv account records and the completed future POC manifest remain unavailable facts until the authorized execution audit.
