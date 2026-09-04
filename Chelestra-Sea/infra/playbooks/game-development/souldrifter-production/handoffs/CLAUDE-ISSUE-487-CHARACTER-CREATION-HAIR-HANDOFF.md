---
handoff: claude-issue-487-character-creation-hair
status: paused-failed-visual-gate
issue: 487
branch: codex/487-human-animation-pilot
checkpoint_commit: cdd45ae48a7a6836863277bfcedf63086d219c69
created: 2026-09-04T10:13:15.5976652-05:00
owner_qa: rejected
---

# Claude handoff: issue #487 Human character creation, facial system, hair design, and selection

## Read this first: the honest outcome

This work is **not complete**. It is paused because the owner rejected the visible quality and asked Claude to take over.

The current net production result is:

- approved playable hair meshes: **0**;
- approved facial-hair meshes: **0**;
- approved age morphs: **0**;
- approved identity/face-family morphs: **0**;
- approved jaw/blink/viseme facial source: **0**;
- accepted end-to-end character-creation experience: **0**;
- mechanically implemented contracts, fail-closed UI wiring, experimental builders, tests, and evidence: substantial but unfinished.

Do not interpret passing tests, source hashes, or generated receipts as visual acceptance. The procedural catalog was incorrectly described as review-ready, and the owner rejected every candidate. That mistake is documented here so it is not repeated.

## Assignment

Take over the Human character-creation and modular appearance scope of issue #487/#435:

1. Repair the Human character creator so body selection and face editing are clearly separate experiences.
2. Produce a production-quality Human head/facial system using the canonical Tripo Smart Mesh identity and body proportions.
3. Produce and fit the required Human hair and facial-hair options as real game-ready assets, not cap-like proxy geometry.
4. Make hair color, greying, skin tone, face-family, age, freckles, facial hair, blink, gaze, speech visemes, and expressions visibly work.
5. Reuse the same animated identity in creator, world actor, close NPC interaction, dialogue/quest portrait, and paper doll.
6. Put each visible milestone through owner review before expanding the batch.

Do not work on monster animation issue #458. The owner explicitly stopped that detour. Do not work on Elf/Dark Elf assets in this Human pilot.

## Repository and live state

| Item | Value |
|---|---|
| Repository | `The-Nexus-Decoded/The-Nexus` |
| Worktree | `H:\CodexData\.codex\worktrees\487\The-Nexus-human-animation-pilot` |
| Branch | `codex/487-human-animation-pilot` |
| Pre-handoff checkpoint | `cdd45ae48a7a6836863277bfcedf63086d219c69` |
| Prior head before checkpoint | `a3354ac1a` |
| Issue | `https://github.com/The-Nexus-Decoded/The-Nexus/issues/487` |
| Claude transition issue | `https://github.com/The-Nexus-Decoded/The-Nexus/issues/497` |
| Game root | `Arianus-Sky/projects/games/SoulDrifterWeb` |
| External evidence root | `H:\CodexData\souldrifter-toolchain\evidence\487` |

At the checkpoint, TypeScript passed and the full serialized Vitest suite passed 54 files / 374 tests. Python compilation passed for the committed builders. No ESLint script exists in `SoulDrifterWeb/package.json`.

The tests prove contracts and fail-closed behavior. They do **not** prove that the hair, skin, face, animation, or creator presentation looks acceptable.

## Governing owner requirements

### Character-creation presentation

- Body selection may show the complete body, but not a stiff AI-looking T-pose as the final selection presentation.
- The selected character should settle into a relaxed, natural idle with subtle breathing and shoulder/chest motion. Repetitive head nodding is rejected.
- Face editing is a separate step and must zoom close enough to inspect the face, hairline, ears, facial hair, skin detail, eyes, and morph changes.
- Automatic rotation must be optional and off while the user is inspecting a face; manual drag rotation must work.
- The user must be able to see every selected option change immediately.
- The creator must never claim an unavailable asset is ready. Fail closed and visibly explain what is unavailable.

### Human head and face

- Keep the Human pilot's canonical Tripo Smart Mesh identity and neck/body proportions.
- Hair is separate from the head.
- Required facial functionality: jaw, mouth cavity, lips, teeth, tongue, eyelids, proper eyes, blink, gaze, speech visemes, and core expressions.
- The same topology must support compatible face-family and age morphs without changing the neck seam.
- Face-family intent currently includes neutral/foundation, soft/round, angular/high-cheek, and broad/strong. The owner also expects visibly diverse Human facial features. Do not label morphology by ethnicity in implementation; expose understandable facial-feature controls or reviewed presets.
- Age intent: Young Adult, Middle-Aged, and Elder from the same head/topology. Children are a separate future NPC body/head pipeline and are not part of this adult creator.
- Human skin testing requested dark, light, Caucasian-range, Asian-range, and Indian/South-Asian-range appearances while retaining high-resolution skin detail. Dark Elf bluish-white skin is Elf-only and must not appear in the Human pilot.
- Skin cannot look wet, oily, waxy, or like a plastic figurine. Preserve pore/roughness detail and use physically plausible skin roughness/specular response.

### Hair and facial hair

- Hair must look grown and groomed from the exact scalp, not like a helmet, cap, bandana, painted shell, or primitive placed over the head.
- Hairline, crown, sideburn, ear, neck, shoulder, chest, armor, and back clearances must pass close-up inspection from front, both sides, rear, and crown.
- Long hair/braids/locs must have a planned secondary-motion solution and must not penetrate the ears, neck, shoulders, back, or body.
- Hair color is material-driven and must preserve strand/card texture. Greying is separate from geometry.
- Facial hair is modular and must conform to the face. Required families currently are stubble, moustache, goatee, short beard, and full beard, plus clean-shaven.
- The owner verbally requested roughly six visible hairstyle choices and named bald, a short/parted or bowl-like fantasy style, mohawk, long hair, braid, and dread/loc styles. The current code/provenance lists seven styles: shaved/buzzed, cropped, parted, curly/coiled, long, tied-back, and braided. **This mismatch is unresolved. Ask the owner to approve the exact final six/seven-style catalog before batching.**

## What is actually present and potentially reusable

### Canonical exact head

- Path: `Arianus-Sky/projects/games/SoulDrifterWeb/public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-head-base.glb`
- Recorded SHA-256: `5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8`
- Runtime skeleton contract: 65 bones, `mixamorig:Hips` root, `mixamorig:Head` head bone.
- Treat this as the visible-identity and seam reference. Verify the live hash before use.

### Fail-closed modular appearance artifact

- Path: `public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-appearance.glb`
- Current checkpoint size: **21,816 bytes**.
- Committed pre-experiment version size: **17,181,616 bytes**.
- Current parsed contents: one scene, 66 nodes, one skin, one accessor, no reported meshes, materials, textures, images, or animations.
- This small GLB is intentionally a fail-closed skeleton/contract container after all visible modules were quarantined. It is not a production appearance pack and must not be treated as proof that appearance work is complete.
- Provenance status: `LOCAL_MODULAR_APPEARANCE_QUARANTINED`, route `FAIL_CLOSED_REBUILD_IN_PROGRESS`, modules `{}`.

### Runtime/UI contracts

The checkpoint contains useful fail-closed wiring in:

- `src/characterCreation.ts`
- `src/creationPreview.ts`
- `src/game/humanAppearanceAssembly.ts`
- `src/game/presentation.ts`
- `src/game/humanFacialFitReceipt.ts`
- `scripts/qa-character-imprint-e2e.mjs`
- the related tests.

The code already models face type, skin tone, hair style, hair color, facial hair, age, hair greying, and facial-hair greying. It disables unavailable content and records missing provider assets. Preserve the useful contracts, but validate every visible path in the real creator before trusting them.

### Facial runtime contract work

Committed history before the checkpoint includes facial runtime/fail-closed work for blink, gaze, timed speech/visemes, creator/runtime assembly, and animated dialogue portraits. This is infrastructure, not proof of a finished animated head.

Relevant commits immediately before the checkpoint include:

- `a3354ac1a` — lock direct exact-head facial workflow;
- `1a89b353e` — add fail-closed facial review bridge;
- `21fed6d68` — reusable facial fit receipts;
- `1fefcc622` — repeatable facial transfer gates;
- `d51f6d4ac` — fail closed without timed visemes;
- `34d44fe2e` — standardized facial runtime contract;
- `96082cc09` — direct facial viseme contract;
- `7b9811095` — reset facial builder to a fail-closed scaffold.

## Every major method attempted and the outcome

### 1. Tripo source-image and Smart Mesh pilot setup

What was tried:

- Multiple source-image attempts for the athletic/muscular Human pilot.
- Square framing was used after 3:4 crops cut off hands.
- Strict-T prompts tried to force palm visibility through forearm roll while keeping wrists neutral.
- The selected Human was converted to a Tripo Smart Mesh and later used for the body/head foundation.

Failures:

- Seven early Tripo source attempts failed the strict-T hand/wrist gate: either palms were unreadable/fused or wrists bent upward like stop signs.
- The first source gate correctly stopped before Smart Mesh and spent zero credits; later browser work eventually produced the Human model, but the early failure remains important for future bodies.
- Tripo Studio sometimes hit WebGL/500 errors. The owner-proven recovery is to close the failing Codex in-app browser tab/window and reopen only the required signed-in in-app browser. Do not spawn many Chrome profiles/windows.

### 2. Tripo segmentation of the Quad model

What was tried:

- Attempted to use Tripo segmentation to separate the head from the generated Quad body.

Failure:

- Tripo refused the job: Quad models cannot be segmented. The owner had already warned about this.
- No credit should be spent retrying the same unsupported path.

What replaced it:

- The head was extracted locally from the Quad body and versioned as a modular exact-head source. That preserves fit, but it inherited the Smart Mesh mouth/topology limitations described below.

### 3. Early procedural facial morph foundation

What was tried:

- Several generated facial morph foundations and targeted iterations under external evidence directories such as `facial-morph-foundation-v1` through `v7`, lighting checks, and targeted variants.
- Procedural face changes were used to explore identity and expression controls.

Failures:

- The results did not look like believable skin/people; the owner described one as a shiny plastic figurine.
- Identity quality and skin response were not good enough.
- These attempts were rejected and moved/quarantined as evidence. Do not revive them because they have morph names or passing structural checks.

### 4. Conforming/transfer facial heads using MakeHuman/CC0 sources

What was tried:

- Imported hash-locked CC0 MakeHuman system assets and ARKit-like target data.
- Tried registration and transfer into facial-head v1/v2/v3 candidates.
- Tried an exact-shell gate and an HM08 conformance gate.
- Tried preserving the Tripo surface while borrowing facial topology/deformation knowledge from the donor.

Failures:

- Transferred/conforming heads drifted from the exact Tripo identity or failed topology/seam/selector gates.
- Evidence directories include `facial-head-rejected-conforming-retopology-v1`, `rejected-facial-head-v2-quarantine`, and `facial-head-v3-transfer-proof`.
- The v3 builder's own header is accurate: it is a **fail-closed scaffold and intentionally contains no facial deformation authoring**.
- Transfer evidence includes a selector failure (`66-vs-80`) and transfer-failure receipts. Do not call v3 complete merely because it is large or has registration code.

### 5. Direct Rigify proof on the exact Tripo head

What was tried:

- `build-human-foundation-direct-facial-rig-proof.py` fits Blender 5.2.1 Rigify eye and jaw modules directly to a duplicate of the exact approved Tripo topology.
- It avoids donor-geometry transfer and tries to bake blink/jaw proof targets back to the same topology.

Failures:

- The raw Smart Mesh mouth contains disconnected oral sheets and topology that cannot produce a clean, collision-free roughly 2 mm jaw opening.
- Direct jaw/eye proof diagnostics generated many receipts but did not produce a promotable facial source.
- Evidence: `H:\CodexData\souldrifter-toolchain\evidence\487\direct-rig-facial-proof`.
- Key files there include `raw-smart-mesh-topology-blocker-receipt.json`, `direct-rigify-failure-receipt.json`, mouth-component diagnostics, and jaw-collision/clearance diagnostics.

### 6. Surgical mouth retopology

What was tried:

- `build-human-foundation-surgical-mouth-retopology.py` replaces only the smallest exterior mouth disk and detached oral sheets while requiring the rest of the visible head and neck seam to remain coordinate-identical.
- It adds/repairs a mouth cavity suitable for jaw/viseme work and keeps all output quarantined.

Failures:

- The resulting exact-head proof was not promoted.
- The serialized lower-face UV baseline became corrupted/rejected, so facial hair and visible mouth work could not safely build on it.
- This is why `build-human-foundation-facial-hair-candidates.py` now fails closed before Blender work and requires a new neutral textured head SHA plus zero-mask/base-texture equivalence.
- Do not bypass that gate or use the quarantined surgical proof as a shipping source.

### 7. Age morph transfer

What was tried:

- `build-human-foundation-age-morphs.py` transfers locked CC0 MakeHuman age deltas into `Age_Middle` and `Age_Elder` while protecting neck seam, oral geometry, existing facial morphs, and triangle orientation.

Outcome/failure:

- It intentionally cannot generate runtime content without an owner approval receipt for a promoted facial source.
- No source has passed that prerequisite.
- Age controls therefore exist in UI/runtime logic but are disabled/unavailable; the owner observed that the age slider did not visibly work.
- Evidence status: `age-morph-proof/BLOCKED-UNTIL-PROMOTED-SOURCE.json`.

### 8. Identity/face-family morph transfer

What was tried:

- `build-human-foundation-identity-morphs.py` defines same-topology candidates for `Face_SoftRound`, `Face_AngularHighCheek`, and `Face_BroadStrong` using locked CC0 targets.

Outcome/failure:

- Like age authoring, it intentionally has no runtime-promotion mode and requires an owner-approved promoted facial source.
- That source does not exist, so only the foundation face is actually usable.
- Evidence status: `identity-morph-proof/BLOCKED-UNTIL-PROMOTED-SOURCE.json`.

### 9. MakeHuman CC0 mesh hair import and fitting

What was tried:

- Downloaded and hash-locked the MakeHuman system asset pack (`CC0-1.0`).
- Imported/fit sources such as `short03/short04`, `ponytail01`, and `braid01` to the exact Human head.
- Added tintable materials and tried axis, scale, normals, deduplication, solidity, and root-fill corrections.

Failures:

- These assets repeatedly read as rigid caps/helmets rather than believable hair.
- Visible problems included exposed forehead bands, scalp seams, plastic/glossy response, hair through ears, hair through neck/shoulders/back, and poor roots/hairlines.
- The owner explicitly rejected the cap-like approach.
- A CC0 license does not make an asset visually acceptable or correctly fitted.

### 10. Reuse of earlier issue #448 project hair

What was tried:

- Refit earlier project-generated cropped, curly/coiled, and long hair assets from issue #448.
- Tried matte materials, root fade, skin underlays, concealed roots, orientation fixes, and new exact-head fit metadata.

Failures:

- Rights/provenance for those old assets is not recorded strongly enough to infer a reusable external license.
- Old head-fit geometry was not trustworthy.
- Cropped/curly variants showed forehead bands and seam/underlay artifacts.
- Long variants showed rigid shells, bad normals, clipping, and poor silhouette.
- Owner review revoked earlier provisional acceptance. These assets are reference only and not promotable.

### 11. Procedural facial hair: cards, fibers, follicles, decals, and patches

What was tried:

- Moustache cards and later strand versions.
- Stubble as cards, microfibers, follicles, dots, decals, dithered decals, and jaw-fade variants.
- Goatees as surface patches, follicles, and curves.
- Short/full beards as face-fitted surfaces and strand/curve fields.
- Dark, grey, workbench, clay, and material views.

Failures:

- Moustache floated or failed to fit the upper lip.
- Stubble read as patchy bulk/dots rather than surface stubble.
- Goatee projected as a detached chin shelf.
- Short/full beards did not follow the jaw silhouette convincingly.
- The later facial-hair builder is correctly fail-closed because its surgical-head UV source is rejected.
- No facial-hair family is approved or creator-selectable.

### 12. Blender 5.2 Hair Curves and Geometry Nodes

What was tried:

- Exact-scalp extraction from the canonical head.
- Guide curves attached to that scalp.
- Blender's bundled procedural hair node library for interpolation, clumping, frizz, and noise.
- Conversion of evaluated curves to runtime-oriented tapered cards.
- Separate guide families for undercoat/coverage, hairline fibers, hero clumps, crown whorl, part bridge, behind-ear transitions, and rear length.
- Hairline/root underlayers, masks, alpha-to-coverage, varying card normals, width/taper, density, root jitter, and material tuning.
- Long-hair experiments reached thousands of guides/cards; one provenance record reports 7,010 cards and 116,834 triangles. High geometry count did not solve the art problem.

Failures:

- Repeated outputs still looked procedural, chunky, cap-like, shiny, sparse/banded, or artificial.
- Roots and hairlines did not consistently merge into the scalp.
- Some long/braided/tied styles penetrated ears and body.
- Converting dense curves into many cards produced technical complexity and poor visual hierarchy instead of a groomed hairstyle.
- Over one hundred external `modular-appearance-v*` iteration directories were created. This was excessive trial-and-error and should not be repeated.

### 13. Native short side-parted proof and six-style catalog

What was tried:

- `build-human-foundation-short-parted-hair-proof.py` built an exact-scalp native Blender short/side-parted groom.
- `build-human-foundation-hair-catalog-proof.py` reused it to produce mohawk, long-loose, braid, locs, and bald variants.
- Five review views were rendered for each style.
- `validate-human-foundation-hair-catalog.py` hash-locked sources and review images.

Mechanical result:

- Python compilation passed.
- Catalog validator passed 6/6.
- TypeScript/tests passed.

Actual owner result:

- **All six candidates were rejected.**
- Manifest: `H:\CodexData\souldrifter-toolchain\evidence\487\human-hair-catalog-canonical.json`.
- Manifest status and every entry: `rejected-by-owner`.
- Do not export or promote any candidate.

Rejected evidence directories:

- `modular-appearance-short-parted-native-groom-v033`
- `human-hair-mohawk-v006`
- `human-hair-long-loose-v005`
- `human-hair-braid-v006`
- `human-hair-locs-v011`
- `human-hair-bald-v001`

### 14. Solid-strand cropped LOD0 proof

What was tried:

- `build-human-foundation-cropped-strand-lod0-proof.py` captured evaluated post-node/pre-card curves and converted a deterministic exact-scalp distribution into closed tapered micro-wedges.
- It attempted to eliminate visible caps, shells, and alpha cards.

Outcome/failure:

- It is evidence-only, not promoted, and does not solve the approved production hairstyle requirement.
- Do not confuse a structurally interesting LOD0 experiment with a creator-ready haircut.

### 15. External workflow research and recommended replacement path

What was reviewed:

- Blender 5.1/5.2 Hair Curves documentation, including Attach Hair Curves to Surface and hair dynamics.
- User-supplied Blender hairstyle and dynamic hair/clothing videos.
- Dedicated game-ready hair-card tooling, especially Hair Tool 4.6 for Blender 5.2.

Conclusion:

- The scripted procedural approach should stop.
- A dedicated professionally layered hair-card workflow is the preferred next experiment.
- Hair Tool was not installed or downloaded on this workstation at the last check. It may require a paid license. No purchase is authorized by this handoff.
- If Hair Tool is unavailable, use a demonstrably professional, license-cleared authored card workflow—not another large scripted batch.

## Specific visual failures reported by the owner

Claude should treat this list as acceptance criteria derived from actual rejection:

- idle character repeatedly nodded instead of breathing/settling naturally;
- face edit camera was too far away;
- automatic face rotation interfered with inspection;
- only one face type visibly worked;
- age slider did not visibly work;
- hair-color changes were hard to verify because hair assets were bad or unavailable;
- freckles/face details were not legible;
- skin looked excessively shiny/plastic;
- moustache floated or did not match the lip;
- curly/coiled hair showed a bright forehead band/underlay seam;
- long and braided hair behaved like a shiny cap;
- hair crossed ears, neck, shoulders, and torso;
- hair surfaces lacked believable strand texture;
- style silhouettes were weak or did not resemble the requested hairstyle;
- review material was sometimes shown before it passed a basic self-review.

## Critical mistakes in the prior process

These are not excuses; they are the reasons the takeover is necessary.

1. **Mechanical validation was mistaken for art quality.** Hashes, object names, five camera views, or green tests did not make the hair good.
2. **Too many variants were produced before one style passed.** The process should have proved one short hairstyle in the real creator first.
3. **Obvious visual failures were handed to the owner.** The builder should have rejected cap seams, clipping, plastic materials, and bad silhouettes before review.
4. **Procedural scripts grew far beyond their value.** Thousands of lines and 100+ iteration folders produced no approved hair.
5. **Exact-head attachment was treated as sufficient.** A root mathematically touching the scalp does not mean the hairline looks grown or the silhouette is designed.
6. **Donor and legacy assets were stretched too long.** Old MakeHuman/#448 sources were repeatedly refit even after they consistently read as caps or conflicted with the current head.
7. **The facial foundation was built on an unsuitable mouth source for too long.** The raw Smart Mesh oral sheets cannot support the required jaw/viseme quality without a carefully proven local retopology.
8. **UI controls existed before production assets.** This made sliders/options appear broken even though the code was correctly failing closed.
9. **The catalog contract drifted.** Six user-requested styles and seven code/provenance styles are not reconciled.
10. **Scope drift occurred.** A monster Tail Whip animation detour started despite this task owning #487 hair/character creation. The owner stopped it. No game-file animation changes were made, but it wasted attention.

## Files in checkpoint `cdd45ae48`

### Main production/scaffold files

- `public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-appearance.glb`
- `public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-appearance.provenance.json`
- `scripts/build-human-foundation-facial-head-v3.py`
- `scripts/build-human-foundation-modular-appearance.py`
- `scripts/build-human-foundation-direct-facial-rig-proof.py`
- `scripts/build-human-foundation-surgical-mouth-retopology.py`
- `scripts/build-human-foundation-age-morphs.py`
- `scripts/build-human-foundation-identity-morphs.py`
- `scripts/build-human-foundation-facial-hair-candidates.py`
- `scripts/build-human-foundation-short-parted-hair-proof.py`
- `scripts/build-human-foundation-hair-catalog-proof.py`
- `scripts/build-human-foundation-cropped-strand-lod0-proof.py`
- `scripts/validate-human-foundation-hair-catalog.py`
- `src/characterCreation.ts`
- `src/creationPreview.ts`
- `src/game/humanAppearanceAssembly.ts`
- `src/game/humanFacialFitReceipt.ts`
- `src/game/presentation.ts`
- `src/styles.css`
- related tests and facial/dual-pose playbook edits.

### Unrelated committed files to isolate

`docs/HUMAN_AUTHORED_GET_UP_REFERENCE_PACKET.md` and `scripts/build-human-authored-grounded-get-up.py` concern Human utility animation work. They were present in the dirty #487 worktree and were included in the requested checkpoint, but they are not part of this hair/character-creation takeover. Do not modify them unless explicitly assigned.

## External evidence and source locations

- Main evidence: `H:\CodexData\souldrifter-toolchain\evidence\487`
- Rejected catalog manifest: `H:\CodexData\souldrifter-toolchain\evidence\487\human-hair-catalog-canonical.json`
- MakeHuman CC0 archive: `H:\CodexData\souldrifter-toolchain\sources\makehuman-system-assets\makehuman_system_assets_cc0.zip`
- Recorded archive SHA-256: `B542127A8E25547C7C29C19F2D1D2ADB9A664C80396ECD694095DBC8028A0107`
- Previous issue #448 technicalized hair root: `H:\Projects\AI_Tools_And_Information\The-Nexus-asset-intake\SoulDrifter\issue-448\technicalized-pilots\hair-library-v001`
- Blender recorded by provenance: `H:\CodexData\souldrifter-toolchain\blender\blender-5.2.1-windows-x64\blender.exe`

The evidence root contains many debug/version folders. Treat them as forensic records, not a menu of viable assets. Start from the specific manifests/receipts named above.

## Infrastructure and memory state at handoff creation

- No local SoulDrifter listener was found on ports 4178, 4180, 5173, or 5176.
- The host had 39 Chrome processes using approximately 9.1 GB combined working set and 36 Node processes using approximately 4.9 GB combined working set.
- Those processes belong to multiple user tasks/chats. Do not mass-kill them. Reuse one browser session, close only sessions created by your task, and run Blender/tests serially.
- Do not open ordinary automation Chrome profiles for Tripo. Use the existing signed-in Codex in-app browser when provider UI work is explicitly authorized.

## Hard stops

- No paid Tripo generation, remesh, rig, texture, retry, or subscription/purchase change without showing the exact operation, model/version, live balance, expected credits, and maximum credits and receiving explicit owner approval at action time.
- Do not regenerate all hairstyles before one proof passes.
- Do not promote any entry marked rejected/quarantined.
- Do not merge, deploy, or modify unrelated PRs.
- Do not add Elf/Dwarf/Dark Elf/Halfling/Drakkin content to the Human pilot.
- Do not claim character creation works end-to-end until it is visually tested in the real creator on desktop and mobile.
- A producer must not be the final independent verifier.

## Recommended recovery plan

### Gate 0: live receipt and branch audit

1. Read root `CLAUDE.md`, governing `AGENTS.md`, issue #487 and every current comment, issue #497, the #487 kickoff, `START_HERE.md`, `SESSION_FAST_START.md`, `HUMANOID_BASE_BODY_POSE_POLICY.md`, and the facial-fit/dual-pose playbooks.
2. Verify `cdd45ae48`, branch/worktree cleanliness, remote reachability, and all hashes before editing.
3. Return Claude Session and Context Receipts. State that the last visible hair and facial outputs were rejected.

### Gate 1: stabilize the visible baseline

1. Open the actual character creator locally with the canonical bald Human and no rejected appearance modules.
2. Fix only presentation defects needed for evaluation: relaxed breathing idle, no repetitive nod, face-step close framing, manual rotation, auto-rotate off by default, realistic skin roughness.
3. Capture front, side, rear, crown, and creator screenshots. Do not add hair yet.

### Gate 2: prove one hairstyle only

1. Reconfirm the exact first style with the owner; recommended proof is short/parted because it exposes hairline, crown, temple, and ear-fit quality.
2. Use a dedicated professional hair-card workflow such as Hair Tool if legally acquired and installed, or a comparably proven authored card workflow.
3. Fit to the exact head. Build intentional layered silhouettes: underlayer/coverage, hairline/temple breakup, primary clumps, secondary clumps, flyaways, and crown flow.
4. Use a proper strand atlas/alpha and anisotropic-looking material response compatible with glTF/WebGL; do not use a shiny opaque shell.
5. Validate scalp, ears, neck, shoulders, idle, turn, walk/run, close camera, desktop, and mobile.
6. Self-reject obvious defects. Then show only that one proof to the owner.

### Gate 3: repair the facial source

1. Use the exact Tripo head as visible identity.
2. Design and independently critique a minimal mouth/eyelid/eye retopology that preserves the neck seam and texture identity.
3. Require zero-mask texture equivalence before facial hair or morph transfer.
4. Prove jaw open/close, both blinks, gaze, one viseme sequence, and one expression in a normal-speed video.
5. Do not build all morphs until the source head is approved.

### Gate 4: one feature family at a time

1. Add face-family morphs and age morphs only from the approved source.
2. Add one facial-hair proof and validate it through jaw/viseme motion.
3. After owner approval, expand the reconciled hairstyle and facial-hair catalogs.

### Gate 5: end-to-end creator proof

Validate the same saved identity across:

- body selection;
- face close-up editor;
- world actor;
- NPC/dialogue/quest close-up;
- paper doll/equipment screen;
- save/reload;
- desktop and mobile;
- normal-speed motion and close-up clipping checks.

## Required pre-execution critique

Before writing another hair/facial generator, Claude must produce a short critique answering:

1. Does this method create art-directed clumps and a believable hairline, or merely distribute geometry mathematically?
2. How will it avoid the exact cap/band/seam/ear/body failures already observed?
3. Can one style be proven in the actual creator before batching?
4. What is the source/license/provenance chain?
5. What is the runtime triangle/material/texture/draw-call cost?
6. What independent visual reviewer will reject it before owner review?

If those answers are vague, do not execute the method.

## Copy/paste Claude start prompt

```text
Take over SoulDrifter issue #487 Human character creation, facial system,
hair design, and appearance selection from checkpoint cdd45ae48 on branch
codex/487-human-animation-pilot in worktree:
H:\CodexData\.codex\worktrees\487\The-Nexus-human-animation-pilot

Read completely:
Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
handoffs/CLAUDE-ISSUE-487-CHARACTER-CREATION-HAIR-HANDOFF.md

Then read the governing CLAUDE.md/AGENTS.md, issue #487 and all current
comments, issue #497, START_HERE.md, SESSION_FAST_START.md, the #487 kickoff,
HUMANOID_BASE_BODY_POSE_POLICY.md, HUMANOID_FACIAL_FIT_PIPELINE.md, and
HUMANOID_DUAL_POSE_PIPELINE.md. Return the required Claude Session and
Context Receipts before editing.

The honest status is zero approved hair, facial-hair, age, identity-morph,
or facial-animation production assets. The current 21,816-byte modular
appearance GLB is a fail-closed skeleton/contract container with no meshes.
All six procedural hair candidates were rejected. Do not revive them.

First stabilize the bald creator presentation, then prove exactly one
professionally authored short/parted hair-card style on the exact canonical
head in the real desktop/mobile creator. Do not batch. Do not spend, merge,
deploy, or touch issue #458. Require an independent visual rejection gate
before showing the owner anything.
```

## Final truth statement

The prior work produced useful contracts, diagnostics, provenance, and fail-closed infrastructure, but it failed the owner's visible quality bar. The correct recovery is not to polish the existing six rejected hairstyles. It is to prove one professionally authored hairstyle and one facial source end-to-end, in the actual creator, before expanding.
