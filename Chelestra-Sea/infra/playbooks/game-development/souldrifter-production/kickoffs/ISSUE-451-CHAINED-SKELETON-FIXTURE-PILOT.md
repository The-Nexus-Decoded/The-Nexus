# Issue #451 — Chained Skeleton Ambient Fixture Pipeline Pilot

## Owner-directed purpose

Add a small number of animated chained-skeleton wall fixtures to the existing BREACH-V2 dungeon as an end-to-end proof that the updated SoulDrifter production pipeline can:

1. create or approve concept/reference images with the active LLM image generator;
2. connect to Tripo through a verified API/SDK/official CLI lane;
3. use Tripo for the approved 3D generation/import step;
4. segment or preserve modular parts;
5. clean/retopo/LOD the geometry;
6. rig the skeleton;
7. author a restrained struggling animation;
8. keep chains/shackles separate from the animated body;
9. export and integrate the asset in Three.js;
10. add audio/VFX hooks;
11. place the fixture without breaking traversal or performance;
12. independently verify the entire artifact lineage and runtime result.

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
-> rig
-> deformation QA
-> custom struggle animation
-> GLB export
-> Three.js integration
```

## Animation contract

Tripo preset retargeting may be used only when a suitable preset exists and passes the chained-pose requirement. A generic locomotion or emotional preset is not sufficient proof.

Recommended production route:

- use Tripo to rig the skeleton;
- import the rig into Houdini KineFX or Blender;
- author a 3–5 second in-place loop with constrained wrists/ankles;
- keep wall-anchor points fixed;
- animate torso twist, shoulder pull, head/jaw motion, ribcage rocking, and leg tension within plausible limits;
- add a calmer rest/collapse loop only if the first loop passes.

Required clips/events:

- `ambient_chained_struggle_loop`
- optional `ambient_chained_rest_loop`
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

- one shared skeleton geometry/material/animation package where possible;
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
9. rig/deformation close-up;
10. normal-speed animation loop;
11. chain-body separation proof;
12. Three.js gameplay-camera capture;
13. wall placement from both sides/angles;
14. real-GPU renderer/console/performance capture;
15. full dungeon traversal regression showing fixtures do not block #451.

## Acceptance

The pilot passes only when:

- provider/toolchain preflight passes;
- concept images came from the active LLM/approved image lane without unnecessary Tripo image credits;
- no secret is exposed;
- exact paid Tripo 3D operations were owner-approved;
- body, chain, and wall-anchor components remain modular;
- the skeleton deforms acceptably while hands/feet remain constrained;
- chain endpoints remain visually connected during the loop;
- fixture does not block movement, combat, interaction, or camera;
- asset/provenance/rollback records are complete;
- real-GPU runtime proof passes;
- an independent verifier marks the pilot VERIFIED.

The producer may mark it only `IMPLEMENTED_UNVERIFIED`.