# First Breach Visual Acceptance Specification

Status: **BLOCKING — baseline rejected; correction work has not started**  
Issue: The-Nexus #450  
Branch: `codex/450-houdini-apprentice-first-breach`  
Baseline commit: `e0ec68c4`  
Review seed: `4182` (`00001056` in the runtime HUD)  
Houdini: `22.0.368`, Apprentice  
Runtime review mode: `?environment=houdini`

This document is the visual contract for correcting and accepting the entire First Breach environment. It is not evidence that the current scene passes. The baseline captured on 2026-08-20 fails the composition, semantic placement, atmosphere, runtime readability, and asset-proof requirements below.

## 1. Blocking constraints

The following constraints apply before any correction or release work:

1. **No QA deployment, merge, or release** until corrected local Houdini and Three.js renders receive explicit owner approval.
2. **No placement based only on `tile.roomId`.** Passage tiles can inherit an adjacent room ID. Every placement must use an exact semantic zone and an approved socket.
3. **No false substitutions for gameplay landmarks.** A training effigy is not a guardian statue. A memory loom is not a ruined altar. Until purpose-built imported assets exist, the unique authored gameplay landmark remains in use.
4. **No asset receives credit merely for existing in the `.hipnc`, layout JSON, or runtime object list.** It must be visible, correctly placed, correctly scaled, correctly textured, and legible at the gameplay camera distance.
5. **No generated asset may lose its authored appearance during export or integration.** Every unique imported asset requires a one-to-one Studio/reference-versus-Houdini-versus-Three.js comparison.
6. **No additional 3D generation, credit use, purchase, or provider operation is authorized by this specification.**

## 2. Baseline evidence

The committed scene was rendered before any corrective edit. Evidence is stored outside the repository so the audit does not add large binary files to the branch.

### Houdini review ROPs

| View | Camera / ROP | Baseline file | Result |
|---|---|---|---|
| Entire route | `FULL_ROUTE_REVIEW_RENDER` | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\houdini\full_route_review_render.png` | **Fail.** Route is readable only as a thin, very dark plan. Dressing and focal identity disappear at review distance. |
| Training | `TRAINING_REVIEW_RENDER` | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\houdini\training_review_render.png` | **Fail.** Pool and some imported props render, but the room is sparse and the guardian/altar substitutions are wrong. |
| Training reverse/archive | `TRAINING_ARCHIVE_REVIEW_RENDER` | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\houdini\training_archive_review_render.png` | **Fail.** Archive assets are present but do not create a convincing occupied archive wall or layered room history. |
| Skirmish route | `SKIRMISH_REVIEW_RENDER` | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\houdini\skirmish_review_render.png` | **Fail.** Long spaces remain visually empty; props read as isolated edge markers instead of an organic occupied-then-overrun dungeon. |
| Boss | `BOSS_REVIEW_RENDER` | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\houdini\boss_review_render.png` | **Fail.** Oversized empty floor dominates. Focal altar/guardian/dais composition and monster takeover story are not established. |

Houdini's OpenGL Vulkan ROP crashed during a multi-camera headless process. Each camera was therefore rendered from the unchanged `.hipnc` in an isolated Houdini process. All five output files completed; the `.hipnc` was never saved or rebuilt during capture.

### Local Three.js runtime

| View | Baseline file | Result |
|---|---|---|
| Training initial | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\threejs\training-initial.png` | **Partial.** Water, fire, floor, walls, and several imported props are readable. Composition and landmark substitutions still fail. |
| Training archive | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\threejs\training-archive.png` | **Partial.** Imported furniture is visible, but the wall lacks the required authored archive/mural composition. |
| Training gates | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\threejs\training-gates.png` | **Fail.** Both paths exist, but the gate assets and their framing do not read clearly enough as distinct route choices at the gameplay camera. |
| Skirmish gallery | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\threejs\skirmish-gallery.png` | **Critical fail.** Floor, props, enemies, and most dressing collapse into black. A named focused bench is not visually reviewable. |
| Boss guardian | `H:\CodexData\.codex\tmp\souldrifter-450-baseline\threejs\boss-guardian.png` | **Critical fail.** The focused guardian and boss-room story are nearly invisible. |

The successful runtime capture reported:

- environment variant `houdini`, seed `4182`;
- no console errors and no failed network requests;
- 91 layout props, of which 89 have imported asset IDs;
- 38 unique environment asset IDs;
- imported instances labelled by inherited room ID: training 26, skirmish 42, boss 21;
- renderer snapshot at the boss proof: 2,211 calls, 3,781,837 triangles, 780 geometries, 166 textures, and 882 materials at 1414 × 744.

The zero-error runtime proves that the baseline loads; it does **not** prove visual acceptance. The renderer counts also require a later web-performance pass, but performance optimization must not be used to replace approved assets with generic primitives.

## 3. Target visual direction

The First Breach must read as a beautiful, grounded, Diablo-style isometric dungeon: ancient masonry, centuries of occupation and abandonment, then a recent monster takeover. It should feel art-directed and organic rather than evenly tiled, procedurally scattered, or AI-generated.

Required qualities:

- aged masonry walls and worn floor flags must be visibly different materials;
- surfaces need dirt, dampness, soot, moss, fractures, edge wear, and localized story variation without uniform noise;
- warm firelight, cool soul light, readable ambient fill, contact shadows, and selective fog must create depth;
- props must form believable clusters with relationships: chair to table, crockery to shelf/table, debris beneath a collapse, chains at restraint or hoist points;
- negative space is intentional and supports navigation, combat, and focal landmarks;
- the scene must never look newly built, evenly polished, symmetrically scattered, or populated by random center-floor statues.

## 4. Global pass/fail gates

A corrected baseline passes only when all of these statements are true in both Houdini review renders and the local Three.js runtime:

### Readability and composition

- The floor boundary, walls, doors, primary landmarks, and navigation route are readable without the player carrying a light source.
- Darkness remains atmospheric, but no gameplay room or corridor becomes a black void.
- Every room has one clear primary focal area, secondary story clusters, and an unobstructed circulation/combat zone.
- No large prop occupies a doorway, gate swing/raise volume, narrow corridor centerline, spawn tile, interaction tile, enemy approach, or required path.
- Repetition is disguised through approved variants, rotation, scale tolerances, clustering, and spacing—not through arbitrary scatter.

### Materials and model fidelity

- Floor and wall materials are distinct in albedo pattern, scale, roughness, and normal response.
- Imported base color, normal, metallic/roughness, emissive, opacity, and alpha behavior match the approved source appearance.
- Metal objects read as metal; wood, stone, bone, cloth, chitin, glass, and ceramic retain their intended material identity.
- No Studio-authored asset is replaced by a Houdini preview material, guessed color, generic brown, untextured gray, or procedural proxy in the accepted runtime.
- No texture is missing, stretched, mirrored incorrectly, excessively glossy, washed out, or crushed to black.

### Lighting and effects

- A low cool-neutral ambient floor reveals architecture and navigation everywhere.
- Fire sources create warm local pools, visible animated flames, nearby shadow response, and limited falloff rather than uniform orange wash.
- The soul well creates cool cyan/teal bounce distinct from firelight.
- Boss lighting establishes threat and focus before combat without hiding the arena.
- Bloom supports emissive water and flame but never erases texture detail.
- Fog adds depth separation without turning distant geometry into black cutouts.

### Gameplay and interaction

- Both training exits are immediately recognizable as separate choices: Wayfarer/easy and Oathbreaker/hard.
- Interactive floor and hanging braziers can be turned on and off; their flame, light, emissive response, and interaction state stay synchronized.
- Destructible clutter uses approved gameplay categories and replacement/debris states. Structural walls, route gates, focal statues, the soul well, memory loom, and required quest landmarks are not casually destructible.
- Collision and visual footprint agree; a player cannot walk through a solid-looking object or be blocked by empty space.

## 5. Room-by-room acceptance contract

### 5.1 Realm-Lock Vestibule / training room

Purpose: safe awakening, character/combat tutorial, first lore impression, and route choice.

Must include:

- a circular stone soul well that reads as a shallow pool, with visible shimmering/glowing water, ripples, depth cue, cyan emission, and a believable emergence point;
- the true memory loom and true training effigy—never altar/statue substitutions;
- the iron-bound starter coffer in a plausible accessible location;
- both route gates correctly fitted into separate wall openings and visibly differentiated;
- an archive wall cluster using the approved bookshelf, cupboard, weapon rack, storage, table/chair/bench, books/crockery, and small clutter where semantically appropriate;
- wall atmosphere such as paintings, reliefs, faded heraldry, hooks, soot, damp streaking, or historical marks;
- multiple motivated light sources plus ambient fill, with clear warm/cool contrast;
- a clear center route between well, Ilyra, training object, loom, coffer, and both gates.

The well may be central. A training landmark may anchor a deliberate teaching bay. A decorative guardian statue may be used only in an architectural niche or boss/ceremonial composition—not as the effigy and not as arbitrary center clutter.

### 5.2 Wayfarer and Oathbreaker passages

Purpose: communicate diverging risk while preserving fast, readable traversal.

Allowed socket families:

- wall: torch, chain/shackle, reliquary/false-wall treatment, support brace, breach plug;
- edge/floor: small rubble, bone/chitin traces, grate, low supply remnant;
- ceiling: hanging brazier or cage only where height and camera visibility are verified;
- threshold: archway, barricade fragment, fitted gate/door.

Disallowed:

- altars, statues, tables, chests, large nests, handcarts, or floor braziers on the corridor centerline;
- any placement inferred only from a passage tile's inherited `roomId`;
- repeated fixtures at mechanical equal intervals without story variation.

The easy route should feel maintained but uneasy. The hard route should show stronger damage, corruption, remains, and hotter threat lighting without becoming unreadable.

### 5.3 Skirmish rooms and connecting galleries

Purpose: readable combat arenas inside a formerly occupied service/archive complex now overtaken by monsters.

Must include:

- clear combat centers with dressing concentrated in wall, corner, ceiling, and protected edge sockets;
- at least one coherent former-occupation cluster per major chamber: weapon storage, maintenance supplies, collapsed work area, archive/reliquary, or transport debris;
- at least one coherent takeover cluster per major chamber: cocoon/web mass, eggs, corruption, chitin, bones, or burrow breach;
- believable structural damage at actual wall/support/collapse relationships;
- enough ambient and motivated fixture light to see enemies, floor hazards, exits, and all proof assets;
- varied but deterministic dressing chosen from approved socket sets.

The current Three.js skirmish baseline is an automatic failure because the focused bench, floor, and most surrounding assets are not visually identifiable.

### 5.4 Ashen Lock / boss room

Purpose: deliver the First Breach visual climax and a readable miniboss arena.

Must include:

- a deliberate focal composition using the true boss guardian, ruined altar, broken dais, reliquary treatment, and First Memory relationship;
- monster-story clusters using chitin, chains, remains, corruption, eggs, breach evidence, and controlled rubble;
- a readable combat floor with the center and principal approach clear;
- a strong warm threat key, readable ambient fill, edge fire pools, and controlled cool contrast;
- visible wall/ceiling atmosphere at the gameplay camera, not only tiny edge props;
- a clear entrance silhouette and a visually legible reward/exit state after victory.

The guardian, altar, and dais must compose a focal zone; none may be dropped onto an arbitrary available tile. The current large empty floor and nearly black Three.js proof are automatic failures.

## 6. Semantic socket contract

Every candidate socket must carry exact metadata. A minimum socket record is:

```text
zoneId
roomId
socketType: wall | corner | floor-edge | floor-feature | ceiling | threshold | debris-bed
surfaceNormal / facing
clearanceRadius
maxFootprint
heightAllowance
blocksMovementAllowed
allowedAssetTags
forbiddenAssetTags
requiredDistanceFrom: doors, centerline, spawns, interactions, combatCenter
```

Placement rules:

1. Resolve an exact `zoneId` from authored room/passage polygons; do not accept inherited `roomId` as exact membership.
2. Match asset tags, footprint, facing, elevation, and clearance to the socket.
3. Reserve gameplay landmarks and navigation clearances before decorative placement.
4. Select deterministic variants from the remaining valid sockets.
5. Run collision, route, interaction, camera-visibility, and density validation.
6. Reject the seed if mandatory anchors cannot be placed legally; never force an invalid fallback.

Known baseline violations that must be removed:

- `memory-loom` mapped to `ruined-altar`;
- `training-effigy` mapped to `guardian-statue`;
- `houdini-complete-ruined-altar` placed in `passage-two` while labelled `skirmish` by inherited room ID;
- a hanging brazier placed in `passage-two` under the same inherited-room failure mode.

## 7. Randomization contract

Randomization is required, but it is constrained art direction rather than arbitrary scatter.

- Layout seed controls room topology and exact semantic zones.
- Dressing seed selects among socket-compatible authored sets.
- Mandatory landmarks, route gates, interaction objects, and story anchors remain semantically fixed.
- Each room archetype defines minimum/target/maximum density for focal, furniture, storage, damage, monster, wall, ceiling, and light layers.
- Cluster templates preserve relationships between props while allowing variant membership, orientation, offset, and wear.
- Repeated seeds reproduce the same result exactly.
- Different approved seeds must preserve navigation, room identity, lighting coverage, and proof requirements.
- At least three representative seeds—sparse, median, and dense—must pass before release. Seed 4182 remains the owner-review comparison seed.

## 8. Lighting acceptance

The environment must remain darkish and atmospheric without requiring players to carry and deploy a personal light everywhere.

### Ambient floor

- Walkable floor, wall boundaries, door openings, and large obstacles are distinguishable throughout every revealed room.
- Unlit corners may be dark, but the room cannot collapse to undifferentiated black.
- The skirmish and boss baseline screenshots define the rejected lower bound.

### Motivated sources

- Wall torches: wall socket, correct height/facing, warm flame, short-to-medium pool.
- Floor braziers: protected edge/focal sockets, wider pool, no route blockage.
- Hanging braziers: ceiling socket, visible chain/suspension, light origin aligned to flame.
- Soul sources: cyan/teal, lower heat impression, distinct from fire.
- Boss sources: layered key/rim/ambient arrangement with arena-wide readability.

### Shadow and effect quality

- Primary nearby props and characters cast contact/soft shadows.
- Flames animate and produce restrained emissive flicker; a static red diamond or placeholder flame is a failure.
- Water has animated shimmer/ripples and light response in Three.js.
- Lighting must be reviewed with exposure, tone mapping, fog, bloom, and material maps active—the unlit Houdini viewport alone is not acceptance evidence.

## 9. Imported asset parity ledger

All 38 unique imported environment assets are required to preserve their approved appearance. “Zones” below are allowable uses, not permission to fill every valid socket.

| Asset ID | Intended identity | Allowed zone / socket | Acceptance proof |
|---|---|---|---|
| `archive-bookshelf` | Ancient archive bookshelf | Training/archive or occupied gallery wall | Books, wood, shelves, normal/roughness readable; flush to wall |
| `archive-cupboard` | Sealed archive cupboard | Training/archive wall | Door/panel detail and material variation readable |
| `bone-pile` | Ancient bone pile | Skirmish/boss debris-bed | Bone material readable; not a geometric pyramid proxy |
| `bottles-jugs-crockery-cluster` | Abandoned vessels | Table/shelf/edge clutter | Ceramic/glass/metal differences survive import |
| `broken-handcart` | Broken handcart | Service-gallery floor-edge | Wood/metal parts readable; route remains clear |
| `broken-stone-stair-dais` | Broken dais | Boss focal feature | Steps, damage, stone material, and focal relationship readable |
| `burrowed-wall-breach-plug` | Monster wall breach | Skirmish wall | Fitted to wall plane; reads as breach, not floor rubble |
| `candelabra-cluster` | Ancient candelabra | Training/ceremonial edge | Metallic body, candles/flame anchors, scale correct |
| `cave-in-rubble` | Cave-in rubble | Collapse debris-bed | Connected to damaged structure; varied stone readable |
| `chain-shackle` | Chain and shackle | Wall/ceiling restraint socket | Chain silhouette, metallic response, attachment point visible |
| `cocooned-remains-web-mass` | Cocoon/web remains | Skirmish wall/corner | Web/remains silhouette and material breakup readable |
| `collapsed-timber-masonry-pile` | Mixed collapse | Skirmish collapse debris-bed | Timber and masonry remain distinct materials |
| `corruption-growth` | Monster corruption | Skirmish/boss wall or floor-edge | Organic material and boundary integration readable |
| `empty-weapon-rack` | Weapon rack | Training/archive or gallery wall | Metallic/wood identity matches source; aligned to wall |
| `false-wall-panel` | False wall | Exact wall socket | Seam and material match wall while remaining discoverable |
| `floor-brazier` | Floor brazier | Protected floor-edge/light socket | Source PBR preserved; flame/light aligned and interactive |
| `guardian-statue` | Weathered guardian | Boss/ceremonial niche or focal zone | Stone weathering and silhouette readable; never effigy substitute |
| `hanging-brazier` | Hanging brazier | Ceiling/light socket | Must use a true hanging presentation; chain, elevation, flame aligned |
| `hanging-iron-cage` | Hanging cage | High ceiling/corner | Suspension and iron material visible; no floor intersection |
| `heavy-bench` | Heavy bench | Furniture cluster/floor-edge | Wood/metal detail readable; associated with nearby use |
| `heavy-door` | Oathbreaker route door | Training hard-route threshold | Fitted to opening, scale/orientation correct, visibly distinct |
| `high-backed-chair` | Ruin chair | Training/archive furniture cluster | Upholstery/wood/metal identity preserved as authored |
| `iron-floor-grate` | Corroded grate | Exact floor socket | Flush to floor; corrosion and metallic response visible |
| `masonry-barricade` | Broken barricade | Wide threshold or floor-edge | Never blocks the only route; stone breakup readable |
| `monster-egg-nest` | Egg nest | Skirmish/boss takeover edge | Organic nest/egg material and silhouette readable |
| `reinforced-crate` | Supply crate | Storage cluster | Reinforcement reads as metal; wood remains distinct |
| `reliquary-wall-alcove` | Carved reliquary | Exact wall/focal socket | Embedded in wall, carving and recess depth visible |
| `ruined-altar` | Ritual altar | Boss/ritual focal socket | Surface detail/material readable; never memory-loom substitute |
| `ruined-stone-archway` | Ruined arch | Wide threshold | Fitted and aligned; clearance and broken silhouette readable |
| `rusted-portcullis` | Wayfarer route gate | Training easy-route threshold | Imported bars/rust visible, fitted to opening, animated clearance correct |
| `shed-chitin-pile` | Shed chitin | Skirmish/boss debris-bed | Chitin material and irregular forms readable |
| `storage-barrel` | Weathered barrel | Storage cluster/floor-edge | Wood/hoops and weathering match source |
| `storage-chest` | Iron-bound chest | Training accessible floor-feature | Source PBR preserved; lid/interaction/collision aligned |
| `supply-pile` | Abandoned supplies | Storage/service floor-edge | Component variety readable; not generic rubble |
| `trestle-table` | Trestle table | Training/archive furniture cluster | Wood surface and structure readable; paired with related props |
| `wall-torch-sconce` | Wall torch | Exact wall/light socket | Fitted to wall, metallic source preserved, flame/light aligned |
| `weapon-armor-heap` | Arms/armor heap | Training/skirmish floor-edge | Metal reads metallic; individual forms remain recognizable |
| `wooden-support-brace` | Timber brace | Exact wall/ceiling support socket | Structurally connected, wood material/scale credible |

Special correction requirements:

- `hanging-brazier` currently reuses the floor-brazier GLB. Acceptance requires a visually credible hanging assembly; reuse is allowed only if authored suspension/chain geometry creates an approved one-to-one hanging presentation.
- The memory loom and training effigy are not in this 38-asset environment kit. Their unique authored versions remain mandatory until separate approved models are provided.

## 10. One-to-one import verification

Every unique asset must have a parity row in the implementation evidence package:

| Check | Required evidence |
|---|---|
| Approved source | Studio/approved reference screenshot at a neutral review angle |
| Houdini | Textured material-camera screenshot with the imported model isolated or clearly framed |
| Three.js | Runtime screenshot at expected gameplay distance plus a close proof if needed |
| Maps | Base color, normal, metallic/roughness, emissive, opacity status recorded |
| Transform | World scale, footprint, ground/elevation, orientation, and socket alignment recorded |
| Verdict | PASS or exact mismatch and correction owner |

An asset fails parity if its color, roughness, metallic response, normal detail, alpha, proportions, or recognizable silhouette materially differs from the approved source. Lighting may change the mood but must not erase or recolor the authored material identity.

## 11. Corrected evidence package

Before owner review, correction work must produce:

1. the same five Houdini review ROPs from the corrected `.hipnc`;
2. the same five local Three.js seed-4182 runtime views;
3. side-by-side baseline-versus-corrected contact sheets for full route, training, skirmish, and boss;
4. a 38-row asset parity ledger with direct evidence links;
5. socket-validation output showing zero exact-zone, clearance, route, gate, spawn, and interaction violations;
6. three-seed randomized dressing proof;
7. runtime console/network results and renderer statistics;
8. explicit owner approval before any QA deployment.

## 12. Current acceptance verdict

| Dimension | Verdict | Blocking reason |
|---|---|---|
| Full-route composition | FAIL | Sparse, under-dressed, and too dark at review distance |
| Training identity | FAIL | False effigy/loom substitutions; insufficient wall/history composition |
| Soul well | PARTIAL | Three.js water is visibly improved; Houdini/runtime parity and final effect still require approval |
| Gates and route choice | FAIL | Both exist, but imported gate identity, fit, and visual distinction are not proven clearly |
| Skirmish atmosphere | FAIL | Houdini reads sparse; Three.js proof is effectively black |
| Boss atmosphere | FAIL | Empty arena dominates; focal composition is weak and Three.js proof is effectively black |
| Semantic placement | FAIL | Exact-zone bug places room assets/fixtures in passages |
| Asset texture parity | UNPROVEN | Loading succeeds, but no 38-asset one-to-one comparison exists |
| Lighting/effects | FAIL | Training is readable; skirmish and boss violate the ambient-readability floor |
| Randomization | UNPROVEN | Seeded output exists, but socket-safe multi-seed validation does not |
| Web performance | AT RISK | Baseline boss proof reports 2,211 calls and 3.78M triangles |
| QA release | BLOCKED | Corrected visual evidence and owner approval do not exist |

No scene correction or deployment is authorized by this baseline verdict alone. The next implementation phase begins only after this specification is accepted as the correction contract.
