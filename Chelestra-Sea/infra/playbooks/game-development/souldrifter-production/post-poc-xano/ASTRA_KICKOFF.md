# Astra kickoff — Post-POC Xano, assets, maps, caches and recovery

**Revision:** 1.0 — 2026-09-10  
**Architecture:** [ARCHITECTURE_SPEC.md](ARCHITECTURE_SPEC.md), SS-POSTPOC-ARCH-001.  
**Current mode:** DESIGN_REVIEW_ONLY. Migration implementation is deferred until the owner accepts the agreed demo/POC and this written design.  
**Repository:** `The-Nexus-Decoded/The-Nexus`.

## Mission

Review and refine the complete design for moving the accepted game to a separate Xano workspace, reusing appropriate NewLuv backend definitions, externalizing approved heavy runtime files, introducing measured caching, and creating tested database/file/source backups and recovery. Preserve the existing game and its source files.

The user is not asking to restart Heartvale or delay its current demo while the new infrastructure is built. Specification and read-only discovery may proceed now. Cloud provisioning, runtime changes, uploads, migrations, subscriptions, scheduled backups and cutover may not.

This is a new isolated planning assignment. Do not impersonate or take over the active #512 environment agent, #510 NPC worker, #456/#458 asset workers, NewLuv owner, or an independent verifier.

## 1. Verify the requested lead and actual capabilities

The owner requests **Astra with the highest reasoning setting actually available in the executing host**. Verify and record what the host exposes; a prompt cannot select the model or prove its availability. Do not silently substitute a different agent/model and call it Astra.

Read the installed Superpowers skills using the host's supported mechanism. Do not install unofficial copies or claim a skill was invoked merely because its name appears here. Skill names:

- `using-superpowers`
- `brainstorming` — architectural path
- `verification-before-completion`

After written design approval, use `writing-plans` to create a current-file-specific implementation plan. Execution later uses `using-git-worktrees`, `test-driven-development`, `systematic-debugging` when needed, `requesting-code-review`, and `finishing-a-development-branch` at the appropriate gates. Independent/parallel agents may only be dispatched through tools the host actually has. If unavailable, record that limitation; do not manufacture agent transcripts or independent verdicts.

The current package is a authored design for review, not evidence that a remote Astra agent has run it or that Xano has been configured.

## 2. Load the actual shared project context

Resolve the current documentation commit from `infra/game-production-playbooks`, unless a newer explicit owner decision supersedes it. Record that commit separately from the implementation base and local head. Never switch/reset a working gameplay checkout or merge all infrastructure changes merely to read instructions.

Shared root:

`Chelestra-Sea/infra/playbooks/game-development/`

Read its README and the following project entry points in `souldrifter-production/`:

- `START_HERE.md`
- `PROJECT_CONTEXT_READSET.md`
- `SESSION_FAST_START.md`
- `PROJECT_CANON_INDEX.md`
- `CURRENT_DIRECTION.md`
- `NARRATIVE_AUTONOMY_AND_DGC_CONTINUITY_POLICY.md`
- `WORKFLOW.md`
- `AUTO_DISCOVER_WORKSPACE.md`
- `ONBOARDING.md`
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`

**Complete the underlying common source reading required by PROJECT_CONTEXT_READSET, not just these filenames.** It includes both universal and project-specific Sea playbooks/corrections, game bible, character/story and class/magic constraints, First Breach, architecture, current realm/region lore, actual map companions and relevant historical source blocks. Follow mandatory references and complete truncated sections. A cached installation receipt does not prove project understanding.

Read the governing repository/path `AGENTS.md` files. Claude-hosted work also reads applicable `CLAUDE.md` and the shared Claude bridge/transition adapter, without treating it as a separate authority.

Load the relevant full zone, staging, collision, source/runtime presentation, asset intake, release, persistence and quest/economy policies and their configs/templates. Read the shared universal `IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md` before designing any binary export or optimization.

Then read this entire `post-poc-xano/` package:

- `README.md`
- `ARCHITECTURE_SPEC.md` — all 23 sections and the acceptance matrix
- `CONTRACT_TEMPLATES.json` — authoring companions, not an implemented schema
- this kickoff

Do not make new lore, rewrite quests, reduce source references or change gameplay just to simplify storage. Preserve current Human-only Heartvale, test-avatar versus story identity, world/map meaning, source rights, approved visuals, normal saves, and the existing source/continuation classification.

## 3. Reconstruct live work before assigning files

Read the current relevant issues, comments, PRs, reviews and ownership claims:

- #501: program coordination and accepted scope;
- #509/#512: current Heartvale environment and avatar/loader work;
- #510: NPC/model and media-production state;
- #456/#458: asset/animation status and exact approved versus rejected versions;
- #499/#505/#507: inventory, persistence, awards and transaction contracts;
- #437: current release surfaces and their actual source mapping;
- PR #511: historical restore-tested checkpoint and QA integration receipts, without assuming it is the final current POC;
- active rename work where it changes code paths or display names.

Discover an existing assigned planning worktree in the user's existing Nexus clone and preserve all dirty/untracked work. Use the established H: worktree policy and its WSL equivalent when applicable; do not ask the user to select the workspace when automatic discovery can resolve it. Do not create a second full clone.

If no planning worktree exists, create one only under the repository's approved isolation procedure for documentation. Its gameplay reference is the accepted current source; it is not permission to edit the active demo. Local-only reports or assets must be read from their actual producing location or marked missing, never assumed present on QA.

The prior spec's inspected QA SHA is historical context. At execution, resolve the **owner-accepted completed POC SHA and full asset manifest**, not that old snapshot or a guessed latest main branch.

## 4. First response: source-backed context and mode

Return a bounded receipt with:

```text
actual model / host / reasoning setting
Superpowers skill invocation evidence
role: ARCHITECTURE_REVIEW or later separately approved implementation role
documentation ref and commit
repository / branch / worktree / local and remote head
underlying lore/design/Sea source coverage and exact refs or hashes
accepted POC scope and checkpoint status
Xano account access: available/not inspected/blocked
NewLuv reuse source coverage: definitions only unless separately authorized
existing asset pipeline, catalog, loader and release protection findings
current neighboring file ownership
missing or conflicting inputs
current mode: DESIGN_REVIEW_ONLY / PLANNING_APPROVED / IMPLEMENTATION_AUTHORIZED
```

Provide a concise explanation of the world/region and why the migration must preserve source visuals, topology, identity and narrative records. Explain the distinction between binary storage, database records, transient caches and durable ownership. Do not report CONTEXT_READY from a source index or another agent's summary.

If account/private/local evidence is unavailable, continue source-complete documentation work and explicitly label the missing capability. Do not invent Xano plan terms or claim account tests from vendor documentation.

## 5. Required architecture review

Re-derive the owner's requirements and trace them to the master spec. Evaluate the alternatives rather than blindly adding services:

1. **Recommended:** separate Xano game workspace, included file delivery, native Redis/response caches only where useful, independent private backup.
2. **Conditional supplement:** Xano APIs/database plus approved object storage/CDN for files whose size/privacy/delivery needs justify it.
3. **Conditional cache:** external Redis only after native capability and measurements demonstrate a need.

Do not recommend a backend migration solely to match the frontend language. The game consumes HTTPS APIs. The user's reusable Xano work and operating experience are part of the cost analysis.

Review these contracts in detail:

- reusable NewLuv authentication/profile definitions versus excluded customer data, secrets, app jobs and callbacks;
- separate workspace isolation versus shared instance capacity and instance-wide restore blast radius;
- item definition, visual asset version and owned item instance as separate identities;
- maps as structured metadata, large immutable files, procedural/versioned inputs and sparse dynamic state;
- complete model/texture/material/rig/clip dependency closure and private source preservation;
- exact-hash export, streaming uploads, retries, capability-based resume and destination readback;
- versioned releases, compatibility, controlled source switching and required collision-before-entry;
- caches, keys, TTLs, authorization, stale-fill races, quota/eviction and cache-off correctness;
- backup components, coherent snapshot cutoffs, offsite copies, media, key recovery and timed restore;
- distinction between visual release rollback and mutable player/economy recovery;
- source/public/private permissions and no PII, secrets or source corpus in public manifests;
- measured storage/egress/compute and restore costs rather than unsupported fixed-price estimates;
- export automation hosted independently of the desktop, with schedules proposed rather than claimed created;
- preservation of later server economy/crypto boundaries without implementing a token or chain service here.

Read current official Xano/browser/cache/storage documentation referenced by the spec. Account-specific capabilities remain live preflight questions. Do not turn a documentation mismatch into a guessed feature entitlement.

## 6. Required review deliverables

Update the existing package rather than create a rival runbook. Return:

- a requirements-to-section/test traceability table;
- a current source coverage and version ledger;
- an architecture decision record for every material change;
- a data/file/cache/authority classification and schema/API contract review;
- a migration and backup/restore failure-mode review;
- exact candidate policies for caching, retention, recovery objectives and performance measurement;
- account/capability decisions D01–D09 with owner/assignee, evidence needed and safe default;
- work-package file ownership and dependencies, preserving current worker boundaries;
- independent-review instructions and the remaining acceptance evidence.

Do not manufacture a final list of current asset paths, file counts, actual cost, profile schemas or restored records without reading them. Missing details are explicit capability decisions, not placeholder success claims.

The author may improve wording, contracts and safety of this draft under the current specification request. Material departures from Xano-first, post-POC timing, source preservation, NewLuv isolation or account/security policy require an owner decision. Design review is not runtime verification.

## 7. Activation gate — do not implement early

Implementation requires all of:

1. Owner confirms the scope of the accepted demo/POC is complete.
2. A full code/data/asset baseline and independent recoverable copy are identified and restoration tested.
3. The owner approves the written post-POC architecture and the selected storage/cache/account choices.
4. An implementation plan has been prepared with `writing-plans`, using actual current files and accepted contracts, and reviewed.
5. Required account access, budgets and isolated test/restore targets are available.
6. The owner authorizes the relevant implementation or migration stage.

Do not reinterpret this as needing every future game ticket complete. The gate concerns the agreed demo scope, not an indefinitely expanding backlog.

In the future implementation plan, break work into the master spec's P00–P07 concerns and M0–M8 stages. Start with small reproducible tests. Red/green TDD applies to exporters, loaders, transaction adapters, cache rules and recovery automation. Real cloud/file/device tests and independent review are additional evidence; mocked tests alone cannot certify provider behavior.

## 8. Non-negotiable implementation boundaries

- No large binary/Base64 files in ordinary Xano records or Redis.
- No public upload of private masters, customer data, protected source documents, rejected evidence or secrets.
- No source deletion, mass overwrite, arbitrary quality reduction or Git history rewriting.
- No wholesale NewLuv clone activation; no copying live sessions/secrets to make shared authentication appear to work.
- No native instance restore that rolls NewLuv back to repair the game.
- No cache-only inventory authority, trade lock, idempotency ledger or recovery source.
- No blind service-worker caching of private API responses.
- No stripping private URL signatures into publicly shared CDN cache paths.
- No silent map/topology regeneration or shader/geometry change during export.
- No weakening current protected-file/hash checks just to shrink the build.
- No passing offline/debug rewards into authoritative tradable or mintable inventory.
- No interpreting successful upload/build/GitHub merge as successful deployment or restore.
- No purchasing, provisioning, scheduling, publishing, merging or mainnet work from this kickoff alone.

## 9. Future completion receipt

For each implemented stage, report exact code/API/schema/asset/manifest versions, current endpoint/environment identity, test commands and results, object/record verification, device traces, cache-on/cache-off comparison, backup-set IDs and observed restore time. Distinguish IMPLEMENTED_UNVERIFIED from independent VERIFIED and owner acceptance.

At cutover, verify the existing intended site—not a similarly named page or local preview—serves the exact release. Keep main, QA, public/private delivery and cinematic-review projects distinct. Save the previous deployment and content versions for rollback. No ownership/progress rewind for an asset-only rollback.

## 10. Copy/paste handoff

```text
Take the Astra architecture-review assignment for The Sundered Spheres.

Repository: The-Nexus-Decoded/The-Nexus
Documentation branch: infra/game-production-playbooks

Read this complete kickoff:
Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
post-poc-xano/ASTRA_KICKOFF.md

Read ARCHITECTURE_SPEC.md and the companion files in that directory.
Load the full shared Sea START_HERE / PROJECT_CONTEXT_READSET and
actually read the underlying lore, design, tooling, setup and build
sources plus the current issue/PR/worktree state. A filename list or
cached tool installation is not project comprehension.

Verify the actual selected Astra model and highest supported reasoning
setting. Use the installed Superpowers architectural-review workflow.
Do not claim this prompt selected a model or launched another agent.

CURRENT MODE: DESIGN_REVIEW_ONLY.
Finish the present demo/POC as-is. Do not change its runtime, move files,
provision Xano, purchase services, schedule backups or begin migration.

Refine the complete post-POC design: separate Xano game workspace with
reviewed NewLuv definitions; asset/map catalog and file storage; safe
exports; HTTP/browser/native Redis caching; independent backups and
coherent restore; staged migration, rollback and operating costs.
Keep large binaries out of database rows/Redis. Keep NewLuv untouched.

Return source-backed context, design decisions, unresolved account facts,
requirements/test traceability and the final design for owner review.
Only after written approval and accepted-POC gates use writing-plans
for the actual implementation plan. Preserve all active work and
checkpoint/source assets. No migration, spending, merge or deployment.
```
