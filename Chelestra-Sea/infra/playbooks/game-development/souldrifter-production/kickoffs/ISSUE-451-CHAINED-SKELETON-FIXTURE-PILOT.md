# Issue #451 — Chained Skeleton Ambient Fixture Pipeline Pilot

## Owner-directed purpose

Add a small number of animated chained-skeleton wall fixtures to the existing BREACH-V2 dungeon as an end-to-end proof that the updated SoulDrifter production pipeline can:

1. create or approve concept/reference images with the active LLM image generator;
2. connect to Tripo through a verified API/SDK/official CLI lane;
3. use Tripo for the approved 3D generation/import step;
4. segment or preserve modular parts;
5. clean/retopo/LOD the geometry;
6. rig the skeleton;
7. create **both** a Houdini KineFX and Blender struggling-animation candidate;
8. compare the two candidates blind with an independent AI reviewer and the owner;
9. keep chains/shackles separate from the animated body;
10. export and integrate the winning asset/animation in Three.js;
11. add audio/VFX hooks;
12. place the fixture without breaking traversal or performance;
13. independently verify the entire artifact lineage and runtime result.

This is a **fixture/environment pilot**, not a playable character, combat monster, quest NPC, or replacement for #448.

## Provider-role boundary

### Concept/reference images

Use the active host LLM's built-in image generation first—ChatGPT, Codex, M3, Claude, or another approved active LLM image lane.

Do **not** spend Tripo credits on text-to-image, image-to-image, or image-to-multiview for this pilot when the host LLM can create the references.

Store the selected concept images, prompts, model/version when exposed, owner corrections, hashes, and selected/rejected status in controlled project staging.

### Tripo

Use Tripo only for the approved 3D stages:

- text-to-3D or image/multiview-to-3D;
- optional segmentation comparison;
- mesh processing/low-poly where approved;
- rig check;
- rigging;
- baseline retargeting/animation when useful;
- controlled downloads.

## Mandatory order

The pilot does not start until `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` returns PASS for every required lane.

No paid Tripo operation runs until the agent reads the current account balance/pricing, provides the exact expected and maximum credit cost for the **3D operations only**, and receives owner approval for that exact spend.

The custom struggle loop must follow:

- `ANIMATION_PROVIDER_ROUTING.md`
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/animation-bakeoff-policy.json`
- `templates/animation-bakeoff-record.template.json`

## Modular asset contract

Do not ship one fused skeleton-chain-wall mesh.

Required components:

### A. Animated skeleton body

- adult fantasy skeleton;
- complete anatomy suitable for a biped rig;
- no chains, shackles, wall, pedestal, weapon, clothing, gore, or background geometry fused into the body;
- neutral source pose suitable for rigging;
- separate jaw if practical, or a jaw bone/morph after rigging;
- optimized game/web topology and PBR materials;
- one accepted source body may produce multiple material/pose variants later.

### B. Chain/shackle assembly

Preferred first option:

- reuse and validate the existing `chain-shackle` dungeon-kit asset when it meets the visual/attachment requirement.

Optional comparison path:

- generate or import a new wall-shackle/chain assembly as a separate 3D prop;
- never require segmentation merely because a bad prompt fused the chains into the skeleton.

Chains remain separate runtime objects. They may use:

- fixed wall-anchor sockets;
- wrist/ankle bone sockets;
- a lightweight procedural chain curve/tube;
- a short baked chain-bone or vertex-animation loop;
- a restrained spring/sway approximation.

Do not skin the chain mesh to the skeleton body as one permanent character mesh.

### C. Wall anchors / mounting plate

- separate from skeleton;
- may reuse existing masonry/chain assets;
- correct pivot, scale, wall normal, and collision classification;
- nonblocking fixture footprint.

## Concept/reference lane

Run one controlled A/B 3D-production pilot while using the same LLM-generated concept direction.

### Pilot A — recommended modular-first path

1. Use the active LLM image generator to create/approve a clean isolated skeleton concept or multiview reference with no chains or wall.
2. Submit the selected image(s) to Tripo image/multiview-to-3D, or use approved Tripo text-to-3D when that produces a better isolated body.
3. Reuse the existing chain/shackle prop or generate it separately as a 3D asset.
4. Assemble the body, chains, and wall anchors in Houdini/Blender/Three.js through sockets.

### Pilot B — segmentation capability proof

1. Use the active LLM image generator to create one combined chained-skeleton fixture reference only if the segmentation comparison is useful.
2. Submit that reference to Tripo image-to-3D only after the exact 3D cost is approved.
3. Run Tripo mesh segmentation before rigging.
4. Evaluate whether body, chains, shackles, and wall plate separate cleanly.
5. Do not ship Pilot B merely to justify the segmentation spend; compare it against Pilot A on quality, modularity, cost, cleanup time, and animation compatibility.

The shipping result should use the better modular route.

## Geometry and rig order

Tripo mesh segmentation, mesh completion, low-poly/decimation, and other geometry-changing operations occur **before** rigging because those operations strip skeleton/skin/animation data.

Required sequence:

```text
LLM-generated concept/reference
-> Tripo text/image/multiview-to-3D
-> segmentation if needed
-> mesh completion if needed
-> low-poly/retopo/UV/material cleanup
-> scale/origin/pivot normalization
-> rig check
-> one accepted Tripo rig/skin result
-> deformation QA
-> dual Houdini/Blender custom-animation bakeoff
-> winning GLB export
-> Three.js integration
```

## Animation contract — mandatory dual pipeline

The skeleton's custom struggle loop is the first mandatory SoulDrifter Houdini-versus-Blender animation bakeoff.

### Locked common inputs

Both candidates must use:

- the same accepted Tripo-generated skeleton body;
- the same accepted Tripo rig and skin weights;
- the same chain/wall-anchor socket layout;
- the same locked 3–5 second motion brief;
- the same duration target and FPS;
- the same in-place root-motion policy;
- the same wrist/ankle constraint targets;
- the same chain-rattle, jaw accent, and loop markers;
- the same Three.js review scene, cameras, lighting, and export settings.

The first-pass Houdini and Blender producers may not copy each other's keyframes or scoring notes.

### Candidate H — Houdini KineFX

Create:

`ambient_chained_struggle_loop__HFX__v001`

Use the verified Houdini license lane with KineFX, IK/constraints, MotionClips, CHOPs/secondary motion where useful, and Python/HOM for reproducibility.

Required behavior:

- wrists remain fixed to wall-chain sockets;
- optional ankles remain constrained where the design calls for it;
- torso twists and pulls against the restraints;
- shoulders/elbows remain anatomically plausible;
- head and jaw add restrained struggle acting;
- ribcage/legs add supporting tension rather than locomotion;
- loop starts/ends cleanly;
- separate chain objects remain attached.

### Candidate B — Blender

Create:

`ambient_chained_struggle_loop__BLD__v001`

Use the verified Blender environment with armature constraints, IK/FK, Action/NLA, graph cleanup, and Python automation where practical.

It must satisfy the **same** motion, timing, constraint, marker, export, and runtime requirements as Candidate H.

### Tripo animation input

Before the two DCC candidates begin:

1. query the live Tripo preset/custom-motion capabilities;
2. test or inspect the closest useful hurt, frightened, complain, sob, defeat, or ambient preset;
3. select one shared source/base motion when useful;
4. give that same source to both Houdini and Blender lanes;
5. if no preset is useful, both lanes start from the same locked pose/reference brief;
6. if the authenticated Tripo account exposes verified custom motion, it may be used as the shared base or a third comparison, but it does not remove the owner-required Houdini-versus-Blender bakeoff.

### Blind comparison

After both first candidates pass the automated admissibility gate:

1. a coordinator randomizes them as Candidate A and Candidate B;
2. an independent AI verifier scores them without seeing the pipeline labels;
3. the owner receives synchronized normal-speed, slow-motion, close-up, and gameplay-camera comparisons;
4. the owner chooses A, B, tie/keep both, category split, rework both, or a new route;
5. labels are revealed only after the verdict is stored;
6. the winner becomes the canonical runtime clip;
7. both results and production metrics enter the animation bakeoff registry.

The losing candidate is preserved with source files, scripts, evidence, defects, and lessons.

Required clips/events:

- `ambient_chained_struggle_loop`
- optional `ambient_chained_rest_loop` only after the first bakeoff passes
- event markers for chain rattle, jaw/open-mouth accent, and loop transition

This ambient fixture must not trigger combat targeting, XP, loot, NPC dialogue, or quest state.

## Audio/VFX contract

Audio remains separate from the GLB.

Minimum:

- chain rattle/metal tension loop or timed one-shots;
- restrained bone creak;
- optional distant nonverbal wail/gasp approved for the dungeon ambience;
- distance attenuation and concurrency limit;
- no constant loud screaming across multiple rooms.

Optional visual accents:

- subtle dust from the wall anchor;
- small soul-cyan or ember motes only where lore-appropriate;
- no heavy particle simulation required for the pilot.

## Placement contract

Place only 2–3 fixtures for the pilot, selected from legal wall-fixture sockets in rooms where they improve atmosphere without obstructing gameplay.

Suggested candidates:

- one Fractured Galleries chamber;
- one darker Oathbreaker-biased chamber;
- optional Ashen Threshold or pre-boss approach fixture.

Do not place in:

- Soul Well awakening focal area;
- tutorial interaction clearance;
- door/corridor apertures;
- combat center/telegraph lanes;
- boss cover lanes;
- exit connector.

Every placement must prove:

- correct wall-facing orientation;
- no floating/intersection;
- chains reach anchors and body sockets;
- no capsule/nav obstruction;
- no camera clipping at gameplay/walk cameras;
- deterministic socket selection when procedural;
- no duplicate fixture stacking.

## Runtime and performance contract

- one shared skeleton geometry/material package where possible;
- only the owner-selected animation is used as the default shipping clip;
- the alternate candidate remains accessible in a developer comparison mode until the bakeoff is closed;
- clone/instance safely for 2–3 placements;
- separate chain objects share geometry/materials;
- LOD/culling and animation update distance defined;
- audio concurrency capped;
- material texture-unit budget compatible with the GTX 1080 Ti/ANGLE D3D11 hard gate;
- no shader compile errors, failed asset requests, or large unexpected bundle growth.

## Evidence

Required evidence from the exact commit:

1. toolchain receipt;
2. host-LLM image-generation access proof with zero Tripo 2D credits;
3. concept/reference images, prompts, corrections, and hashes;
4. sanitized Tripo authenticated read/balance proof;
5. exact Tripo 3D-operation quote and owner approval record;
6. provider task IDs and actual 3D costs;
7. untouched provider downloads and hashes;
8. segmentation comparison if Pilot B is run;
9. accepted Tripo rig/deformation close-up;
10. Houdini KineFX source/export/build script and metrics;
11. Blender source/export/build script and metrics;
12. synchronized blind A/B normal-speed videos;
13. synchronized blind A/B slow-motion videos;
14. gameplay-camera and close deformation comparison;
15. independent AI scorecard;
16. owner blind verdict and label reveal;
17. completed animation bakeoff record;
18. chain-body separation proof;
19. winning Three.js gameplay-camera capture;
20. wall placement from both sides/angles;
21. real-GPU renderer/console/performance capture;
22. full dungeon traversal regression showing fixtures do not block #451.

## Acceptance

The pilot passes only when:

- provider/toolchain preflight passes;
- concept images came from the active LLM/approved image lane without unnecessary Tripo image credits;
- no secret is exposed;
- exact paid Tripo 3D operations were owner-approved;
- body, chain, and wall-anchor components remain modular;
- both DCC candidates exist or one lane has a documented unrecoverable technical blocker;
- both candidates receive the same fair-input contract;
- automated gates and blind AI comparison are complete;
- owner verdict is recorded;
- winning skeleton deforms acceptably while hands/feet remain constrained;
- chain endpoints remain visually connected during the winning loop;
- fixture does not block movement, combat, interaction, or camera;
- asset/provenance/rollback and bakeoff records are complete;
- real-GPU runtime proof passes;
- an independent verifier marks the winner and fixture pilot VERIFIED.

The producer may mark it only `IMPLEMENTED_UNVERIFIED`.