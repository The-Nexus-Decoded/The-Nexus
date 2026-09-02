# Issue #458 complete Claude Fable handoff

Paused: 2026-09-02 America/Chicago
Ticket: [The-Nexus #458](https://github.com/The-Nexus-Decoded/The-Nexus/issues/458)
Original takeover comment: [issue comment 5473198216](https://github.com/The-Nexus-Decoded/The-Nexus/issues/458#issuecomment-5473198216)
Repository: `The-Nexus-Decoded/The-Nexus`
Game: SoulDrifter Web
Status: paused by owner; open; owner QA pending; not merged or deployed

This is the authoritative transition packet from the Codex animation session to
Claude Fable or another AI agent. It combines the existing #458 owner handoff,
the later Motion Forge work, the exact external-artifact state, and the pause
boundary reached on 2026-09-02. It does not declare the ticket complete.

The owner-request stream is preserved separately, without paraphrase, in the
[verbatim request ledger](issue-458-verbatim-request-ledger.md). Read that file
before changing scope. It excludes automatically supplied browser/environment
context and catalogs attachment paths separately, so product metadata is not
misread as an owner instruction.

## 1. Claude startup contract

1. Work only in
   `H:/CodexData/.codex/worktrees/458-pre-codex-fixes-validation/The-Nexus`.
2. Remain on `codex/458-pre-codex-fixes-validation`. The pause parent is
   `13c6f16b8d20ce27dc6a3e6b135f0a8474baf44f`. The commit containing this
   document is the handoff checkpoint; resolve it with `git rev-parse HEAD`.
3. Read the [SoulDrifter Agent Bible](../../AGENTS.md), root
   [`CLAUDE.md`](../../../../../../CLAUDE.md), this document, the
   [original animation-owner handoff](issue-458-animation-owner-handoff.md),
   and the [current Motion Forge checkpoint](issue-458-motion-studio-integration.md)
   before editing.
4. Do not use the unrelated shared/fleet checkout at
   `H:/Projects/AI_Tools_And_Information/The-Nexus-fleet-normalization`; it has
   unrelated changes. Do not switch branches with a dirty worktree.
5. Do not resume Blender, Tripo, generation, animation, or promotion merely by
   reading this handoff. The owner explicitly paused the work. Resume only when
   the owner tells Claude to continue.
6. Preserve all frozen candidates and receipts byte-for-byte. Create a new
   version for every experiment. Never overwrite a failed or approved artifact.
7. No push, merge, QA promotion, deployment, issue closure, or provider spend is
   implied by this handoff.

The repository already contains a Claude handoff convention under
[`/.claude`](../../../../../../.claude/README.md) and
[`/.claude/handoffs`](../../../../../../.claude/handoffs/). A bounded search did
not find a K3-named game handoff in this worktree. This packet therefore follows
the repository's current Claude convention plus the much more detailed #458
owner handoff rather than inventing an unavailable K3 template.

## 2. What the product is

SoulDrifter Web is a static browser-native isometric RPG prototype. The current
runtime is TypeScript + Three.js 0.185, built by Vite and tested with Vitest.
Characters, creatures, equipment, props, and animation interchange use glTF/GLB
and Blender. HTML/CSS supplies accessible and responsive review/game UI.

There is no conventional remote application backend behind Motion Forge. The
lab is a browser review surface that loads committed GLBs and manifests. The
dungeon preview and the review tool share runtime concepts, but they are
separate entry points. A future authoritative TypeScript server is planned for
positions, combat results, inventory, and quests; the current animation work is
client-side review/integration. See [architecture](../ARCHITECTURE.md).

The authoritative encounter invariant is one shared state for actor grid
positions, HP, Stability, class resource, cooldowns, targets, inventory,
difficulty, and rewards. Invalid or out-of-range rehearsal motion must not
spend resources or deal damage. The review tool measures and visualizes contact;
that is not automatically gameplay damage or physics.

## 3. Canonical documentation map

Read these in order. Their roles are intentionally distinct.

| Document | Authority / why it matters |
| --- | --- |
| [SoulDrifter Agent Bible](../../AGENTS.md) | Non-negotiable quality, worktree, provider, asset, verification, and no-deploy rules. |
| [Issue #458 owner handoff](issue-458-animation-owner-handoff.md) | Exact takeover contract, incoming human package, obsolete #458 human migration inventory, retained monster/boss inventory, safe integration order, and end-to-end acceptance matrix. |
| [Motion Forge integration checkpoint](issue-458-motion-studio-integration.md) | Current review-system features, commits, contextual controls, continuous locomotion correction, stop/deceleration follow-up, and remaining gates. |
| [Verbatim owner-request ledger](issue-458-verbatim-request-ledger.md) | Exact ordered requests and attachment paths from this animation/458 stream. |
| [3D AI Studio pipeline](README.md) | DRY asset policy, Tripo intake, retopology, rig compatibility, clothing coverage, weapon sockets, file naming, budgets, receipts, and promotion stop-gates. |
| [Human animation calibration runbook](HUMANOID_ANIMATION_CALIBRATION_RUNBOOK.md) | Humanoid fit, contact, socket, and motion-calibration rules used by the approved human foundation. |
| [Issue #435 QA handoff](issue-435-QA-HANDOFF.md) | Approved human/weapon-lab donor history and limitations. |
| [Issue #435 asset map](issue-435-lab-asset-map.json) | Hash-pinned human, weapon, bow, quiver, arrow, and animation asset inventory. |
| [Animation production pipeline](../ANIMATION_PRODUCTION_PIPELINE.md) | Semantic-intent-first animation process, retargeting, continuous motion proof, grounding, shared runtime wiring, and evidence requirements. |
| [Weapon motion reference index](../WEAPON_MOTION_REFERENCE_INDEX.md) | Weapon-family identity and reference requirements; do not substitute one family merely because another clip fits the skeleton. |
| [First Breach rebuild runbook](../FIRST_BREACH_REBUILD_RUNBOOK.md) | Dungeon canon, topology, asset locations, model/PBR fidelity, provider state, integration map, commands, and failure history. |
| [Dungeon build runbook](../DUNGEON_BUILD_RUNBOOK.md) | Flat-map-first layout, registry, seed discipline, placement/orientation rules, and room-by-room review gates. |
| [Level 01 contract](../LEVEL_01.md) | Gameplay/story behavior that must survive animation and actor integration. |
| [Game Bible](../GAME_BIBLE.md) | Broader world, path, story, character, and realm canon. |
| [#458 base Breachling repair](issue-458-base-breachling-motion-repair.md) | Base creature reference, accepted/rejected motion changes, and evidence. |
| [#458 body phase 2](issue-458-body-motion-phase-2.md) | Body/ground/contact findings and variant repair state. |
| [#458 rollback findings](issue-458/rollback-validation-findings.md) | Rollback and source-identity findings. |

Repository policies are layered: root `AGENTS.md` and `CLAUDE.md`, the nested
SoulDrifter `AGENTS.md`, the GitHub ticket, then the focused runbooks. If two
instructions conflict, stop and identify the conflict rather than silently
choosing one.

## 4. Repository and release state at pause

| Item | Frozen value |
| --- | --- |
| Worktree | `H:/CodexData/.codex/worktrees/458-pre-codex-fixes-validation/The-Nexus` |
| Branch | `codex/458-pre-codex-fixes-validation` |
| Pause parent | `13c6f16b8d20ce27dc6a3e6b135f0a8474baf44f` — `docs(review): freeze terminal animation blockers` |
| Ticket | #458, open, labels `area:sky`, `priority:P1`, `type:feature`, `created-by:codex`, `source:codex`, `owner-qa:pending` |
| Last full verified package | 68 test files / 614 tests; TypeScript checks, build, and release verification passed at the documented checkpoint |
| ESLint | No ESLint configuration or script in this game package |
| Known build warning | Existing large Three.js chunk warning; not introduced by the pause docs |
| Merge/deploy | None performed |
| Provider promotion | None performed for the paused external boss work |

The branch already contains the Motion Forge human/mob/boss review system,
Stalker/Ravager action packs, Oathbound accepted actions except TailWhip, combat
pairing, measured melee/projectile/fire-wand contacts and reactions, interaction
props, and shared destruction diagnostics. Important recent commits are:

| Commit | Meaning |
| --- | --- |
| `c1fdbc9a` | Register exact reviewed Stalker/Ravager packs. |
| `bab7ca4d` | Measured fire-wand spell review from the actual wand tip. |
| `3452e117` | Actor-bound combat-pair spacing/framing. |
| `46fb25c5` | Shared prop destruction diagnostics. |
| `2609d4a8` | Installed Wayfarer Warden motion candidate; see major release-integrity finding below. |
| `12596d11` | Motion Forge verification checkpoint. |
| `13c6f16b` | Terminal Oathbound TailWhip / Greater Warden blocker checkpoint before the later external manual repairs. |

Do not infer that an external candidate is installed because it exists under
`H:/CodexData/.codex/artifacts`. Only a reviewed, receipt-pinned copy registered
under the game runtime is installed.

## 5. Motion Forge architecture

The entry points are `weapon-lab.html` (Motion Forge) and `asset-review.html`
(isolated Tripo/asset inspection). The owner specifically wanted review in
these surfaces before dungeon promotion.

### Human and weapon review

- `src/review/weapon-lab/weapon-lab.js` owns human loadout/action/view/timeline
  choices and composes the UI.
- `weapon-locomotion.js` applies shared armed gait logic rather than duplicating
  walk/run clips per weapon when an overlay can preserve the source gait.
- `staff-grip.js` and `staff-moves.js` own staff-specific hand contacts, grip
  switching, guard and added motions. Existing moves must remain.
- `human-review-actor.js`, `human-review-catalog.js`, and
  `human-environment-review.js` provide human actor/catalog/environment actions.
- `tripo-asset-review.js` is isolated asset review; it is not dungeon combat.
- `src/game/humanWeaponCalibration.ts` and related presentation modules are the
  reusable calibration boundary. Search all call sites before changing names or
  contracts.

The approved human direction includes separate weapons, socket transfer on
draw/sheath events, hand curls around the actual grip, bow retrieval/nock/release,
body-fitting quiver/harness straps, and shared walk/run. The user accepted the
last bow/staff passes in the lab, but dungeon-wide armed acceptance remains open.

### Mob and boss review

- `mobs-stage.ts` builds the mob/boss review stage.
- `mobs-panel.ts` exposes actor/action selection and contextual controls.
- `mob-review-actor.ts` loads and plays the selected creature.
- `mob-pose-overlay.ts` applies creature-specific tuning. Do not expose human
  finger controls to a creature without matching bones/capabilities.
- `review-asset-loader.ts` decodes current embedded/same-origin GLB textures and
  fails closed on hash or required-resource mismatch.
- `reviewed-mob-receipt.ts` binds registered assets to exact provenance.

The UI requirement is data/capability-driven: bow controls only for bows;
staff grip modes only for staff; claws/jaw/tail/plates/core controls only when
the selected skeleton supports them. Disabled irrelevant controls are not enough;
they should be absent. `Motion Forge` is the accepted neutral product name;
issue numbers should not appear as the lab title.

### Combat Review

The `combat-review-*` modules are deliberately split by responsibility:

- `combat-review-controller.ts`: actor pairing and review-state orchestration.
- `combat-review-panel.ts`: actor-aware UI.
- `combat-review-studio.js` and `combat-review.css`: browser stage and layout.
- `combat-review-posing.ts`: facing/placement/calibration.
- `combat-review-timeline.ts`: shared attacker/defender clock and sequencing.
- `combat-review-contact-profiles.ts`: source-pinned strike points/windows.
- `combat-review-contact.ts` and `combat-review-contact-resolver.ts`: measured
  moving-surface contact; preserve miss/unavailable/manual/measured distinctions.
- `combat-review-impact-anchor.ts`: skin-bound impact anchoring.
- `combat-review-projectiles.ts`: visible arrows, spit, and fire-wand flights.
- `combat-review-locomotion.ts`: approach/recovery motion.
- `combat-review-probes.ts`: diagnostics.

Supported review pair classes already include human/human, human/mob, mob/human,
mob/mob, human/boss, boss/mob, and boss/boss. Combat Review is not allowed to
become a disconnected renderer with duplicate asset catalogs or animation clocks.

### Props and interactions

`review-prop-catalog.json`, `review-prop-factory.ts`,
`review-prop-interactions.ts`, `review-props-panel.ts`,
`review-swim-diagnostics.ts`, and shared asset-preparation scripts support the
current chest/door/tree/swim/destruction diagnostic lane. Up to six props can be
placed in review. Review geometry and diagnostics are not automatically shipping
collision, climbing, water, VFX, or fracture acceptance.

### Dungeon consumption

The First Breach runtime lives under `src/game/dungeons/`:

- `breach-v2-preview.ts` assembles the preview scene and hooks actors, cameras,
  navigation, diagnostics and UI.
- `breach-v2-breachlings.ts` and `breach-v2-wardens.ts` are actor/runtime loaders.
- `breach-v2-creature-review.ts`, `breach-v2-warden-review.ts`, and
  `breach-v2-animation-review.ts` are dungeon-side inspection adapters.
- `breach-v2-human-foundation-actor.ts` is the integrated human adapter.
- `breach-v2-gameplay.ts` and `breach-v2-gameplay-ui.ts` own gameplay behavior,
  not Motion Forge.
- layout/registry/generator/topology/fog/mobile/startup/diagnostic modules must
  survive animation integration.

Do not replace dungeon topology, encounters, fog, doors, navigation, camera,
path choice, seed behavior, or gameplay fixes while changing animations.

## 6. Data flow and DRY contract

The intended flow is:

```text
untouched provider/source GLB
  -> external versioned repair/authoring lane
  -> strict structural + deformation + PBR + visual receipts
  -> reviewed immutable candidate hash
  -> copied to a review-only runtime path
  -> registered once in shared asset/catalog data
  -> Motion Forge solo/combat/interaction review
  -> dungeon adapter consuming the same catalog/semantic events
  -> full First Breach gameplay acceptance
  -> owner approval before merge or deployment
```

The owner explicitly added a DRY rule: reuse models, scripts, tasks, code, and
processes wherever the contracts truly match. Concretely:

- one source asset identity and one receipt per immutable candidate;
- one loader/checksum policy;
- one semantic action catalog;
- one timeline and contact model shared by review and runtime adapters;
- one locomotion cycle with weapon-specific upper-body/grip overlays where safe;
- one reusable validation helper for common rigs, parameterized by rest basis,
  mesh ownership, contact envelope, floor and action timing;
- no copy/pasted per-skin animations when a rest-relative transfer is proven;
- no assumed transfer when bind axes, weights or mesh envelopes differ.

DRY never means forcing incompatible bodies through one pose or treating one
weapon animation as every weapon family. Share infrastructure; retain
actor-specific art, rest-space calibration, contacts and quality gates.

## 7. Installed and accepted scope before the pause

### Human foundation and weapons

The accepted donor history is in #435 documents and is already integrated into
the #458 branch. The canonical Human Foundation body and original 400 clips are
preserved. Five matching 65-bone Mixamo locomotion extras were packaged earlier:
Injured Run, Slow Run, Running Leaning Back Or Forth, Running Up Stairs, and
Walking Up The Stairs.

Ten human loadouts expose shared locomotion choices. Some shortsword/mace/dagger
motions still use explicitly labeled ProMeleeAxe proxies; a proxy is not final
weapon-technique proof. Sword-plus-shield still needs end-to-end dungeon proof.
The fire wand is an actual plain caster wand, not the old axe placeholder.

Continuous locomotion must loop without reaching the end, stopping, and
restarting. One-shot attacks complete once. A normal run stop must eventually
chain `run -> deceleration/run-stop -> idle or armed guard` (or settle to walk if
walking remains requested) with velocity matched to foot motion. The separate
run-stop/deceleration clip audit remains unfinished.

### Breachling family

The branch contains the base, Stalker, Oathbound and Ravager review/runtime work.
The user's accepted creature direction is a low, stretched quadrupedal stalking
stance using front limbs to support the torso, not an upright static pose.

Attack semantics:

- Lunge leaves the ground, drives at the adjacent target with both claws and
  moving front legs, then retreats/recoveries.
- Claw uses torso/weight transfer and reaches the next square.
- TailWhip rotates the whole body enough for the tail to enter the front adjacent
  square; the accepted base/stalker/ravager versions must not be regressed.
- Spit has visible head/neck anticipation and projection, then travels roughly
  three squares as a ranged attack.
- Bite snaps/extends the head and supportive front limbs; it is not a generic
  full-body jump.
- Death is an articulated collapse with readable body parts and a stable terminal
  state, not interpenetrating limbs.

Base, Stalker and Ravager revised attack work is already registered as documented.
Oathbound has accepted Bite, Claw, Lunge and Spit. Oathbound TailWhip remains
fail-closed after multiple self-collision repair classes; no failed candidate was
registered.

### Combat and interactions

Motion Forge already supports measured surface contact/reaction, arrow,
multishot, poison-spit and fire-wand review, actor-aware spacing, and current
props/interactions. Remaining work is polish plus real gameplay integration and
full end-to-end acceptance, not rebuilding those systems from scratch.

## 8. Boss identities and Tripo segmentation

There are two Cinderbound Warden boss variants tied to the player's path:

| Path / boss | Tripo segmentation task | Result at pause |
| --- | --- | --- |
| Oathbreaker / Greater Cinderbound Warden | `62f8d6ca-5429-40ad-9f6c-e240504e35b0` | Segmentation complete, four groups, 50,484 triangles. |
| Wayfarer / standard Cinderbound Warden | `b63499e5-c576-409d-867a-51511668cc3c` | Segmentation complete, four groups, 52,650 triangles. |

Both bosses share the intended attack families but are distinct meshes/rest
bases. Treat them as related skins only at the semantic level until a
rest-relative transfer passes target-specific deformation, floor, contact and
PBR review.

The approved Warden mechanics remain:

- Blade/Sweep attack with integrated crescent arm;
- Cinder-Sweep as a distinct heavy lateral action, not a renamed BladeSweep;
- Ash-Call;
- Soul-Tax through the left-palm mechanism;
- Furnace shutdown/terminal state;
- plate/ring/piston/core motion and boss-camera clipping proof.

Do not turn either boss into an armored human, knight, biological Breachling, or
a character holding a separate sword. The Warden is an articulated mechanical
family with integrated weapon and furnace anatomy.

The last observed Tripo balance was 12,255 credits and may be stale. The owner
previously allowed model repairs provided at least 10,000 credits remain, but the
work is now paused. The nested Agent Bible also requires exact operation/cost
approval before paid provider work. Claude must reconcile that stricter rule with
the owner before any new charge; never assume this handoff authorizes spending.

## 9. Approved external artifacts

All paths below are outside Git and must remain on H:. Their hashes are the
identity. Do not move them into `public/assets` or register them without a new
promotion phase and owner review.

Artifact root:

```text
H:/CodexData/.codex/artifacts/issue-458-base-repair-audit-20260831/approved-neutral-attacks/variants-v1/bosses/warden-v2-diagnostics/authoring-rigs-v5
```

### Greater Warden manual joint/bearing repair C20

Lane: `greater-manual-joint-insert-v2/`

| Artifact | Bytes | SHA-256 | State |
| --- | ---: | --- | --- |
| `greater-warden-manual-joint-insert-v2-c20.glb` | 18,540,024 | `88a63f30f4f7ca5ff7ae232fb0a09af931c486ae1c91455a0f16e8f0a1b0354e` | Best frozen repair candidate; external only. |
| `strict-bearing-c20-receipt.json` | 4,759 | `3a47dcd20087977e1f6fe179a47c4d5f901a77d3c16d55cf239d486adc17f09e` | Strict PASS. |
| `c20-visual-deformation-receipt.json` | 5,017 | `97b3c303839729e7ebe05463fe23cb9e25c5ab1a6c4b32caa7daff3ddfea0da9` | Numeric/render evidence pass; file still says pending independent review. |

C20 preserves the protected C16 prefix/rig/right bearing while using the C17
left-bearing topology through single-skin bind compensation and source-preserving
GLB surgery. Strict measurements include 98 welded vertices, 288 edges, 192
faces, Euler characteristic 2, one component, zero non-manifold edges, 0/750
halo-ray hits, maximum position residual `1.1920928955078125e-7 m`, and maximum
normal residual `0.0003795027732849121` over rest/+20/-20 stress states.

The independent critic reported a final PASS in the Codex agent mailbox across
all 18 triptychs and protected-byte checks. That final verdict was not persisted
to a new receipt before pause; the committed handoff must therefore not relabel
the on-disk pending receipt as final. Claude should repeat/sign the independent
visual gate or write a clearly linked follow-up receipt before promotion.

### Wayfarer BladeSweep V12

Lane: `wayfarer-manual-reconstruction-v1/`

| Artifact | Bytes | SHA-256 | State |
| --- | ---: | --- | --- |
| `cinderbound-wayfarer-bladesweep-phase1-v12-candidate.glb` | 16,280,440 | `7488d97f0d99ee6f1e3bbdef598d1015c47e5fabc8ef6aea2ba5d625f75b48c4` | Frozen structurally accepted candidate. |
| `wayfarer-bladesweep-phase1-v12-validation-receipt.json` | 505,351 | `12a7b76b7da827db2ada3a487ce5a3c55153a89b8472f2eda7aabdcf777f70fd` | Structural/source-vs-candidate evidence. |
| `wayfarer-bladesweep-phase1-v12-proof-v3-receipt.json` | 36,889 | `bb62e00709e9e76f16e8e943f0e20c9bce06be825a90b5d08b958cbd7df9bbad` | Proof V3; file says pending independent visual review. |
| `wayfarer-bladesweep-phase1-v12-realtime-loop-v3.mp4` | 285,800 | `ae69eb974f232e650288dde7716655f6ec3df7e75d9ccc3204a93649ed922271` | 68 frames, 30 fps, full loop proof. |
| `wayfarer-bladesweep-phase1-v12-recovery-diagnostic-loop-v3.mp4` | 444,029 | `f853fb8a2934f54de30df59c8ccb76cc48a3b6fa2906f18424ad68881c7bc9f1` | Slow recovery/contact proof. |

V12 has 54 channels across 18 bones, frames 1-68 at 30 fps, first blade contact
exactly at frame 27, no early contact, no floor penetration, sub-micron foot
locks, no backward root glide, and a settled endpoint. Proof V3 uses stable
all-visible-mesh cameras; worst projected margin is 24.1935%, exceeding the 5%
minimum. The independent critic reported PASS with no snap, float, clip, tear or
deformation, but the file status again remains pending. Preserve that distinction.

## 10. Exact work-in-progress boundary

At the owner's pause, no Blender process remained and both active subagent lanes
were interrupted. No CinderSweep candidate and no Greater BladeSweep GLB
candidate existed. The following is the exact restart boundary.

### A. Wayfarer CinderSweep — authored script present, no candidate

Lane:

```text
H:/CodexData/.codex/artifacts/issue-458-base-repair-audit-20260831/approved-neutral-attacks/variants-v1/bosses/warden-v2-diagnostics/authoring-rigs-v5/wayfarer-manual-reconstruction-v1
```

Frozen inputs/state:

- `wayfarer-cindersweep-baseline-v1-receipt.json`, 53,606 bytes,
  SHA-256 `9d43236d2dc63733f08aa000424198a090717606c45c671b38dfa3da4ff625fb`.
- `wayfarer-cindersweep-baseline-v1-eight-phase-sheet.png`.
- `audit_wayfarer_cindersweep_baseline_v1.py`.
- `author_wayfarer_cindersweep_phase1_v1.py`, last updated immediately before
  pause. It refuses to overwrite frozen outputs and supports `--trial` and
  `--trial-sheet`.

The source CinderSweep is frames 1-70 at 30 fps on the 18-bone rig. It moves only
`upper_arm_R`; root, feet, torso, lower arm, hand and off-hand are inert. Its
521-vertex crescent reaches maximum X `0.332188189 m` against target
`0.774169922 m`, a `0.441981733 m` shortfall. It does not contact, step, transfer
weight, or provide a distinct impact phase.

Proposed phases are frame 1 guard/load, 12 high-back anticipation, 23 driving
support-foot pivot/step, 31 first contact, 42 opposite follow-through, 52
deceleration, 62 balanced recovery, 70 settled advance. Hard gates: frames 1-30
below target; exact first contact at 31; all runtime vertices within 1 mm of the
immutable floor `Z=-0.499755889`; left foot planted through load; right foot has
a distinct step/landing lock; no backward root glide; settled endpoint.

Safe first command after the owner resumes, for a non-promoting trial only:

```powershell
& 'H:/CodexData/.codex/tooling/blender-5.2.0-windows-x64/blender.exe' --background --factory-startup --python 'H:/CodexData/.codex/artifacts/issue-458-base-repair-audit-20260831/approved-neutral-attacks/variants-v1/bosses/warden-v2-diagnostics/authoring-rigs-v5/wayfarer-manual-reconstruction-v1/author_wayfarer_cindersweep_phase1_v1.py' -- --trial
```

Use `--trial-sheet` only after numeric trial gates pass. Do not run the promoting
path until trial evidence and harsh independent visual review are accepted.

### B. Greater Warden BladeSweep — in-memory V4 solve passed, build not started

Lane:

```text
H:/CodexData/.codex/artifacts/issue-458-base-repair-audit-20260831/approved-neutral-attacks/variants-v1/bosses/warden-v2-diagnostics/authoring-rigs-v5/greater-bladesweep-authoring-v1
```

Frozen inputs/state:

- `greater-bladesweep-v1-phase-and-gate-contract.json`.
- `greater-bladesweep-v4-inmemory-solve.json`, 48,405 bytes,
  SHA-256 `789e65edbb3bb7c1bd528e9bf7f812b1d01a334187bf10d06ec4ac6c9be3b394`.
- status `GREATER_V1_INMEMORY_STRUCTURAL_SOLVE_PASS_BUILD_ALLOWED`.
- source is the C20 GLB with SHA-256 `88a63f30...354e`.

The phase contract is frames 1 guard, 8 anticipation, 16 windup, 27 first blade
contact, 34 root cross, 44 follow-through, 56 recenter, 68 settled. Immutable
floor is `-0.4997561574`, target X is `1.3952639997`, and the crescent envelope
has 1,213 vertices.

V4 measured frame 26 max X `1.3019938469`, frame 27 max X `1.3952839375`, frame
34 root X `1.4152640104`, zero floor penetration, zero support/landed foot-lock
drift, zero settled drift, and no backward recovery. Maximum basis rotations are
chest `9.99997°`, right upper arm `14.99998°`, right lower arm `4.99997°`;
maximum joint envelope is `278.503 mm`, bearing-to-owning-lower-arm head is
`52.7182 mm`, owning-bone-local bearing drift is `0.00265 mm`, and windup to
follow crescent orientation changes `53.4783°`.

Next work is not another blind pose iteration. Recreate only the V4 action in a
clean scratch scene, export a donor animation, then use source-preserving GLB
surgery to append only the new animation closure to byte-exact C20. Follow with
fresh-import structural audit, normal-speed proof, slow contact/recovery proof,
PBR review, and an independent critic. No GLB candidate existed at pause.

### C. Oathbound TailWhip remains frozen blocked

The most recent documented blocker localizes frame 98 self-collision to 23
distal-tail triangles / 35 vertices (`tail003`-`tail005`) against nine body
triangles. Multiple elevated detours, weight transfer and topology-preserving
offset repairs failed. No candidate/config/manifest was emitted. Do not reopen
this lane by repeating those same classes; any continuation needs a materially
new, explicit topology/rig strategy and its own rollback-safe gate.

## 11. Failed approaches and non-obvious traps

### Greater Warden joint/bearing repair

- C1-C15 failed and remain evidence, not starting points.
- C16 fixed visibility but contained severe triangle slivers (minimum angle
  about `1.1189°`, aspect about `57.76`).
- C17 fixed topology quality (minimum angle about `20.0379°`, max aspect about
  `2.99`, 0/750 rays) but a deterministic two-pixel protected raster drift on
  unrelated body face 12110 blocked it. The suspected rays never hit the bearing.
- C18 source-preserving GLB surgery still inherited C16 inverse-bind effects on
  left donor normals.
- C19 used a donor skin sharing joints; Blender merged skin/rest-state behavior
  and changed shared rig/protected meshes.
- C20 succeeded by compensating donor vertices into the single target skin while
  preserving protected bytes.

Never full-scene re-export a source when untouched accessor/raster identity is a
gate. Never assume two skins with the same joints retain distinct bind states in
Blender. Use source-preserving GLB surgery and target-skin bind compensation.

### Wayfarer BladeSweep

- V9 had quaternion-sign problems, recovery snaps, floor penetration and weak
  silhouettes.
- V10/V11 audit failures were misleading: the audit helper reset quaternion
  bones to XYZ Euler, making quaternion curves inert.
- Source sampling must preserve/restore bone `rotation_mode`, active action and
  action slot.
- A fresh-import proof must use deterministic generation nonces, not Blender
  `as_pointer()`, because allocator addresses can be reused.
- Proof V1/V2 cropped the weapon/contact path; V3 fit every visible mesh, feet,
  floor and contact boundary and was accepted.

### Cross-boss motion transfer

Direct and rest-relative Wayfarer V12 to Greater C20 transfer were both blocked:
about `0.294 m` floor penetration, foot drift, and intended frame-27 contact
delayed to frame 45. Shared semantics do not prove shared kinematics. Author
against the target rest basis and envelope.

### Runtime/release integrity

Read-only review found one major must-fix-before-merge issue: commit `2609d4a8`
places the Wayfarer candidate at a canonical dungeon path even though its
plan/verifier described review-only output. The owner explicitly said not to fix
review findings during that pass. It is still open. Before merge, move/reclassify
it through an explicit review-only receipt or obtain owner approval for canonical
promotion. Do not silently delete it or rewrite history.

## 12. Validation gates

Every animation candidate must prove more than clip presence:

- immutable source hash before/after;
- expected skeleton, hierarchy, mesh/material/texture inventory;
- finite transforms and no scale collapse/explosion;
- correct quaternion continuity and fresh-import replay;
- continuous locomotion or a genuinely non-looping attack as appropriate;
- grounded weighted support, not just whole-bounds minimum Z;
- first contact on an explicit frame and all earlier frames clear;
- adjacent attacks enter the next square; ranged attacks use measured travel;
- torso, root, footwork, head/aim, weapon chain and recovery are coordinated;
- no self-collision, body/gear bleed-through, detached parts or skin tearing;
- stable terminal state for death/shutdown;
- normal-speed and slow diagnostic media with stable full-subject framing;
- PBR identity and silhouette comparisons from multiple angles;
- independent harsh critic before owner review;
- exact receipt/hash registration before runtime use.

For the complete ticket, run the actor/action matrices in Motion Forge and then
perform uninterrupted entrance-to-boss-and-exit gameplay on both First Breach
paths with every supported loadout. Inspector playback, teleporting directly to
a boss, or screenshots alone do not satisfy gameplay acceptance.

## 13. Local commands and review URLs

From the dedicated worktree:

```powershell
Set-Location 'H:/CodexData/.codex/worktrees/458-pre-codex-fixes-validation/The-Nexus'
git branch --show-current
git status --short
Set-Location 'Arianus-Sky/projects/games/SoulDrifterWeb'
yarn typecheck
yarn test --maxWorkers=4
yarn build
yarn verify:release
yarn dev --port 5179
```

Review URLs after a deliberate local server start:

- `http://127.0.0.1:5179/weapon-lab.html` — Motion Forge.
- `http://127.0.0.1:5179/asset-review.html` — isolated asset review.
- Dungeon preview uses the query contract recorded in the owner handoff and
  First Breach runbook. Refresh the current build stamp and served GLB hashes;
  do not trust an old `rev=` query parameter as source proof.

No dev server was intentionally left running by this pause checkpoint. Close
browser/GPU/Blender processes after each bounded proof.

## 14. Resume order

When the owner tells Claude to continue:

1. Re-read this handoff and the latest #458 comments; verify branch, head, status,
   external artifact hashes, free disk and Tripo balance.
2. Confirm no newer agent has advanced this worktree or external lane.
3. Run the Wayfarer CinderSweep non-promoting `--trial`; inspect numeric output.
   Do not emit a candidate if any gate fails.
4. Finish CinderSweep through fresh-import and visual gates.
5. Build Greater BladeSweep from the frozen V4 solve using source-preserving GLB
   surgery, then run its complete proof stack.
6. Obtain/record final independent receipts for C20 and Wayfarer V12 if their
   on-disk pending statuses remain unchanged.
7. Revisit Oathbound TailWhip only with a materially new approved strategy.
8. Register approved outputs into Motion Forge review-only paths with exact
   receipt hashes. Re-run relevant focused and full suites.
9. Review all boss actions together in real time, then the complete mob roster.
10. Only after all mobs/bosses pass, repair the Wayfarer canonical-path integrity
    issue and begin dungeon integration.
11. Perform both-path, every-loadout First Breach acceptance, independent review,
    owner QA, then request explicit merge/deploy authorization.

## 15. What not to do

- Do not call the ticket done because the lab loads.
- Do not resume while the owner pause is active.
- Do not regenerate accepted Tripo assets to avoid manual work.
- Do not spend below the 10,000-credit reserve.
- Do not use primitives/capsules/cards as hidden replacements for final content.
- Do not re-ground airborne attacks every frame or mask bad source contact in the
  runtime.
- Do not hard-lock all feet during attacks; support and stepping feet have
  different phase contracts.
- Do not duplicate locomotion clips per weapon when a proven overlay is enough.
- Do not force one rest-space motion onto another boss without target proof.
- Do not expose irrelevant controls in the dynamic UI.
- Do not change Level 01, dungeon topology, navigation or camera as collateral
  animation work.
- Do not commit external scratch output, `.planning/debug`, provider secrets, or
  local caches.
- Do not push, merge, deploy or close #458 without owner approval.

## 16. Pause verification statement

At handoff creation:

- active Warden and Wayfarer animation workers were interrupted;
- no Blender process was running;
- no new boss attack candidate was installed or promoted;
- the dedicated worktree was clean except pre-existing untracked
  `.planning/debug` material and the intentional handoff files;
- the unrelated fleet-normalization checkout was not modified;
- this pause is a recoverable checkpoint, not a completion claim.

The receiving agent should begin by reading the verbatim ledger, not by relying
on a summary of the owner's corrections. It contains the successive bow/quiver,
staff, locomotion, dynamic-UI, monster, combat, contact, stance, Tripo,
segmentation, resume, and final pause/handoff instructions in original order.
