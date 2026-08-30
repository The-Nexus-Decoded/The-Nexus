# 3D AI Studio Character and Equipment Pipeline

Status: production contract proposed under [The-Nexus #435](https://github.com/The-Nexus-Decoded/The-Nexus/issues/435)  
Scope: paid 3D AI Studio intake, base ancestry bodies, starter calling kits, separate weapons, Blender cleanup, rig compatibility, animation reuse, browser export, provenance, and visual QA

This document defines how SoulDrifter uses 3D AI Studio without generating a fused character for every ancestry/calling combination. It complements [`ANIMATION_PRODUCTION_PIPELINE.md`](../ANIMATION_PRODUCTION_PIPELINE.md), [`WEAPON_MOTION_REFERENCE_INDEX.md`](../WEAPON_MOTION_REFERENCE_INDEX.md), [`CHARACTER_AND_STORY_SYSTEM.md`](../CHARACTER_AND_STORY_SYSTEM.md), and [`ASSET_AND_LICENSE_POLICY.md`](../ASSET_AND_LICENSE_POLICY.md).

## Locked production decision

SoulDrifter does **not** purchase or maintain 36 independent ancestry/calling character models. The production set is assembled from reusable layers:

- four current playable ancestry body archetypes: Human, Elf, Dwarf, and Halfling;
- one shared C-tier starter clothing family, conformed to each body archetype;
- nine modest calling-identity kits that layer over the starter clothing;
- a separate reusable weapon and off-hand library;
- one canonical humanoid animation contract plus documented race/body retarget profiles;
- separate hair, facial-detail, sheath, harness, rune/sigil, and effect layers.

Every calling receives an assembled review character, but its body, clothing, armor, and weapon remain independent production assets. Ancestry never locks a calling or equipment family.

Drakkin is approved world canon but is not in the current playable runtime registry. Do not spend generation credits on a playable Drakkin body until its character-creation and body-contract ticket is approved.

## Non-negotiable asset boundaries

1. Generate and rig the base body without a weapon, shield, cape, large hair, or class armor.
2. The body wears a fitted, opaque, neutral underlayer. It is never shipped or reviewed as a nude model.
3. Weapons, shields, sheaths, quivers, and harnesses are separate assets. They are never fused into or skin-deformed with the body.
4. Soft clothing is a separate skinned mesh using the exact character skeleton and bind pose.
5. Rigid armor is a separate bone-attached or lightly skinned mesh.
6. Animation clips contain body motion, not permanently attached equipment geometry.
7. A representative weapon may be used as a Blender animation reference, but the body animation and weapon export remain separate.
8. A fully dressed 3D AI Studio generation may be retained as concept or high-detail source material. It is not automatically a modular shipping character.
9. No generated artifact enters `public/assets` until its source, ownership, task ID, settings, hashes, diagnostics, and review status are recorded.
10. Paid batch generation stops immediately when a body, topology, rig, scale, or material gate fails.

## Paid plan and MCP preflight

The owner performs the account-only steps:

1. Subscribe to a 3D AI Studio plan that includes the MCP Connector and enough credits for the approved pilot.
2. Open **Settings -> AI Assistants (MCP)** in 3D AI Studio.
3. Start the standard MCP connection flow and authorize the assistant account.
4. If 3D AI Studio displays a remote MCP URL, copy only the non-secret URL into the Codex configuration flow.
5. If it displays a secret, token, or one-time credential, place it in the MCP client's protected secret field or an environment variable. Do not paste it into chat, a prompt, a GitHub issue, a shell transcript, or the repository.
6. Keep 3D AI Studio two-factor authentication enabled. Do not share recovery codes.

Codex then performs the technical verification:

1. Confirm that the 3D AI Studio MCP server appears in the available tools.
2. Run a read-only capability/listing call before any paid generation.
3. Confirm which models and operations the connector actually exposes: image creation, image-to-3D, text-to-3D, remesh, texture, rig, export, and task status.
4. Confirm whether the connector returns task IDs, credit estimates, seeds, model versions, and downloadable artifacts.
5. Perform one deliberately small, disposable test only after the owner approves the expected credit charge.
6. Record the connector and model versions. Never assume the MCP exposes every operation available in the web dashboard or public REST API.

If MCP is unavailable, the same pipeline may use the documented REST API or an owner-reviewed dashboard handoff. API credentials use bearer authentication and remain outside Git. The public API and MCP connector are separate integration paths and may expose different features.

## Credit-safe first production matrix

### Base ancestry bodies

| Order | Body | Required visual identity | Initial status |
| --- | --- | --- | --- |
| 1 | Human | adult, grounded proportions, adaptable neutral silhouette | first paid pilot |
| 2 | Elf | adult, lean precision, real face, clearly pointed ears | generate only after Human rig gate passes |
| 3 | Dwarf | compact adult body, broad grounded frame, non-cartoon proportions | generate after shared clothing proof |
| 4 | Halfling | small adult body, readable hands/feet/face, never childlike or chibi | generate after small-body retarget proof |

The current runtime has no body-type or sex selector. The first pass therefore proves one approved adult body archetype per ancestry. A second body-type family requires an explicit appearance/runtime contract before batch generation.

### Starter calling kits and shared weapons

The calling kit is an assembled presentation recipe, not a fused character file. "Light armor" means modest C-tier protection or class accessories over the shared worn starter outfit; it does not mean heroic plate, elaborate robes, relic glow, or advanced rune equipment.

| Calling | C-tier visual layer | Separate starter implement | Reuse boundary |
| --- | --- | --- | --- |
| Warrior | worn leather bracer and restrained shoulder guard | plain iron longsword | shares one-handed longsword geometry family with Shadowknight |
| Mage | faded cloth mantle, sash, and small component pouch | ashwood practice staff | staff geometry can be reused; Mage casting posture remains distinct |
| Priest | plain devotional stole and modest forearm guard | plain wooden mace | mace requires its own motion family, not sword motion |
| Sharpshooter | worn leather bracer, belt pouch, and separate quiver | rough shortbow | bow, string, arrow, and quiver remain separately addressable |
| Paladin | battered light shoulder/chest protection | plain iron shortsword and battered wooden shield | sword-and-shield is not the free-offhand sword animation family |
| Summoner | binding sash, token loops, and small ritual pouch | unadorned binding rod | rod can share a focus socket but not Mage body language |
| Asura | dark practical wraps and restrained ritual holder | plain ritual knife | ritual knife is separate from Slayer paired-dagger motion |
| Slayer | light leather bracers and paired sheaths | pair of worn daggers | one dagger mesh may be instanced; left/right grip profiles differ |
| Shadowknight | current worn common kit; no advanced armor or runes in the First Breach | battered iron longsword | shares base sword geometry family but has its own finish and class motion |

This creates eight initial weapon packages rather than nine unrelated weapons:

1. one-handed longsword base with Warrior and Shadowknight material variants;
2. practice staff;
3. wooden mace;
4. shortbow package with arrow and quiver;
5. shortsword and shield package;
6. binding rod;
7. ritual knife;
8. paired dagger package.

The owner approves one assembled calling view for each of the nine callings. Those review assemblies may use representative ancestries for variety, but they do not create ancestry/calling restrictions.

## Mandatory visual style gate: art, not pictures

SoulDrifter uses authored semi-realistic fantasy RPG art. The target is not
automatically exaggerated, heavily stylized, cartoon, or low-detail. Anatomy,
movement, construction, grounding, and environmental logic remain believable,
but normal game assets must never look like photographs, live-action captures,
wildlife photography, photogrammetry, or cinematic product shots. This gate
applies to characters, creatures, animals, elementals, weapons, armor, clothing,
props, buildings, and environment pieces.

Every generation prompt must include this positive style block:

```text
Render as an original SoulDrifter semi-realistic fantasy RPG game asset.
Preserve believable anatomy, natural proportions, construction, mature physical scale,
and an appropriate level of detail, but make it unmistakably authored game art rather
than a photograph. Use artist-directed form definition, a strong readable silhouette,
clear material separation, controlled painted color variation, and source-quality game
PBR with restrained microdetail. Fur, feathers, hair, fibers, grain, corrosion, and wear
must read as coherent artist-authored material treatment at gameplay distance, not
photographic surface noise or individually simulated strands.
The asset must remain legible at the normal gameplay camera and cohesive with the
existing SoulDrifter protagonists, creatures, equipment, and Heartvale environment.
```

Every generation prompt must also include this negative style block:

```text
Not a photograph, wildlife photograph, live-action capture, documentary image,
photogrammetry scan, hyperreal render, cinematic product shot, physically simulated
fur study, or reflection-heavy HDRI showcase. No individual fur-strand grooming,
skin pores, photographic microtexture, depth of field, bokeh, lens artifacts, or
camera-real surface noise. Also no chibi proportions, mascot design, oversized head
or eyes, children's-cartoon styling, cel-shaded anime, voxel treatment, toy, or plush.
```

Style approval happens on the free reference image before any paid mesh, texture,
rig, animation, segmentation, or upscale operation. A candidate fails if a reviewer
could reasonably mistake it for a photograph or live-action render, even when its
anatomy and topology source silhouette are otherwise good. Do not try to repair a
photoreal candidate with later texturing; reject it and correct the reference prompt.

For quadrupeds, keep species-appropriate neutral four-foot anatomy and rig clearance;
never force a humanoid T-pose or A-pose. For elementals, use solid graphic volumes and
designed shape language rather than physically simulated particles, loose soil,
detached droplets, glass-water realism, or photographic moss. For weapons and armor,
retain believable thickness, grip, attachment, and wear while simplifying shapes and
painting material breakup for gameplay readability.

## Source-image and prompt gate

Image-to-3D is the preferred character path. Text-to-3D may be used for rough props, but it is not the approval path for a hero body.

Before a paid 3D request, prepare a consistent multi-view sheet:

- front, left, back, and right orthographic-like views;
- identical proportions, face, clothing boundary, and color across every view;
- neutral A-pose or T-pose with fingers readable and limbs separated from the torso;
- clean, high-contrast, plain background;
- full body visible, centered, and not cropped;
- no dramatic camera perspective, action pose, weapon, shield, cape, particles, floor props, or cast shadow hiding the silhouette;
- no long loose hair during the rigging proof;
- no labels or decorative borders touching the subject.

### Base-body prompt template

```text
Create a production reference sheet for an original SoulDrifter [ANCESTRY] adult humanoid.
Show the exact same character from front, left, back, and right views in a neutral A-pose.
Use believable mature proportions and an adult face expressed through clear artist-directed
form definition and hand-authored material separation. The character wears a fitted, opaque,
seam-simple neutral underlayer. No weapon, shield, armor, cape, robe, large hair, jewelry,
particles, glow, text, pedestal, or environment. Keep both hands, all fingers, both feet,
ears, and the complete silhouette clearly visible. Use a clean plain background and
consistent neutral lighting. The views must agree exactly in anatomy, face, proportions,
materials, and garment boundaries. Append the mandatory positive and negative style blocks.
This is a modular game-character base, not a photograph or a free-form concept painting.
```

Append only ancestry-specific requirements that have already been approved. Do not place calling identity, morality, high-level magic, or advanced rune traditions into a base ancestry body.

### Weapon prompt template

```text
Create one original low-level SoulDrifter [WEAPON] as an isolated game asset.
It is a worn C-tier mortal implement made from [MATERIALS], with believable construction,
grip dimensions, thickness, and weight. No hand, character, sheath, floating particles,
runes, relic glow, text, environment, or display stand. Center the entire object on a clean
plain background and provide consistent front, side, and rear reference views. Preserve a
clear unobstructed primary grip and a silhouette readable from the normal gameplay camera.
Use believable geometry, strong authored edge shapes, clear painted material separation,
and restrained wear. Append the mandatory positive and negative style
blocks. It must look like a SoulDrifter RPG weapon asset, never a product photograph.
```

### Clothing or armor prompt template

```text
Create one original modular C-tier [GARMENT OR ARMOR PIECE] for the approved SoulDrifter
[BODY ARCHETYPE]. Show it fitted over the approved neutral body reference in front, left,
back, and right views. The piece is worn, practical, low-level, and constructionally
believable. No weapon, advanced rune language, relic glow, cape, unrelated accessories,
body redesign, action pose, or environment. Keep seams, openings, thickness, attachment
points, and body coverage clearly visible. This output is a conforming source for a separate
game-equipment mesh, not a permanently fused character. Use believable artist-directed
forms, clear painted material separation, and restrained authored wear. Append the mandatory
positive and negative style blocks; the result must never resemble fashion photography,
museum photography, photogrammetry, or a cinematic product render.
```

## Generation and intake sequence

### Phase 0: approve before spending credits

1. Lock the ticket, asset ID, ancestry/calling purpose, concept sheet, prompt, model/version, seed policy, target face count, material plan, and expected credit cost.
2. Decide whether the request is a base body, soft garment, rigid armor, weapon, or non-shipping concept. Never mix categories in one production request.
3. Save the prompt and source-image hashes in the intake ledger.
4. Obtain owner approval of the reference sheet and expected charge.

### Phase 1: generate one source candidate

1. Submit one image-to-3D task through MCP.
2. Record the returned task ID immediately.
3. Poll status without submitting duplicates.
4. Inspect the textured and clay views before exporting.
5. Reject extra limbs, fused fingers, closed armpits, asymmetric neutral poses, missing back detail, melted facial features, intersecting geometry, and weapon-like fragments.
6. Do not request variants until the defect is classified as a prompt/reference problem or a generation problem.

### Phase 2: export to non-shipping intake

1. Export the untouched source result to a local intake area outside `public/assets`.
2. Prefer GLB for material/mesh inspection and FBX for rigging or animation interchange.
3. Preserve the original download unchanged.
4. Record byte size and SHA-256 for the source files.
5. Record model version, seed, prompt, source images, task ID, generation date, account ownership, commercial-use status, and download format.
6. Add the provider-generated asset and its ownership/license record to `third-party-assets.json` before promotion, following the existing asset policy.

### Phase 3: Blender cleanup and retopology

Version preflight is mandatory. Use the owner-designated current production
release, presently the newest verified Blender 5.2 patch (**Blender 5.2.1 LTS**
on the production workstation). Do not use an older 5.2 patch when the verified
current patch is available. Run the exact executable with `--version` and
record the result before opening a scene or invoking the DCC Bridge. Do not use
Blender 4.5 or another older installation as an automatic fallback, even when it
already contains the Tripo add-on or recent project files. If the verified current
5.2 patch or its required Bridge integration is unavailable, stop at the preflight
and report the blocker.
Do not install or substitute another Blender version without owner direction.

1. Import the untouched candidate into a clean Blender scene.
2. Confirm meter scale, ground contact, orientation, transform application, normals, manifold state, material slots, UVs, and texture color spaces.
3. Treat every platform, pedestal, floor slab, ground patch, root mat, shadow catcher, light, camera, and piece of scenery as a hard failure. This rule applies even when the geometry is fused into the creature or prop mesh.
4. Run a connected-component audit and a large floor-aligned-face audit before rigging. Preserve the untouched provider source, create a separately hashed cleaned derivative, and remove every detected presentation component from the derivative.
5. Render the cleaned derivative in a scene with no floor or shadow catcher. A visible base, ground patch, or unexplained geometry under the asset fails the proof even when the automated detector reports zero candidates.
6. Remove accidental internal surfaces and disconnected generation debris without erasing source provenance.
7. Create deformation-friendly quad topology for bodies and soft garments. A generated dense or irregular mesh is not accepted merely because it looks correct while static.
8. Preserve facial, shoulder, elbow, hand, pelvis, knee, and ankle loops needed for animation.
9. Bake the approved PBR appearance from the source mesh onto the production topology.
10. Keep rigid armor and weapons mechanically clean. Do not add unnecessary bones to a non-articulated weapon.
11. Before every export, purge unlinked/orphan object and mesh data-blocks, rebuild the export selection from an explicit allowlist, and verify that the selection contains only the intended production meshes and armature. Temporary primitives created by remesh, weighting, modifiers, add-ons, or helper scripts are hard failures even when they are absent from the visible scene collection.
12. Round-trip re-import every exported GLB/FBX into a factory-empty scene with the approved Blender version. Audit the raw package node/mesh/skin inventory before import; require every package mesh to bind to the one expected armature (or be an explicitly declared rigid attachment), reject unskinned or unexplained package meshes, and rerun the no-platform/camera/light audit. If the importer itself creates a helper that is absent from the raw package, record and purge it from the inspection scene before any save or later export. A clean source `.blend` does not waive this exported-package gate.
13. Use the existing validated Elf Shadowknight as the scale/orientation comparison until a versioned asset manifest replaces that baseline.

### Phase 4: canonical rig compatibility proof

3D AI Studio describes its Prism rig as Mixamo-compatible. That does not prove identity with SoulDrifter's current 65-bone deformation rig.

For the Human pilot:

1. Export one unrigged cleaned mesh and one Prism-rigged FBX/GLB candidate.
2. Compare bone names, hierarchy, count, bind pose, bone axes, rest transforms, root layout, skin weights, and animation track targets with the current SoulDrifter actor.
3. Test the existing idle, walk, run, unarmed punch, and unarmed kick packs without editing them.
4. If the skeleton is genuinely identical, use the direct animation-pack path.
5. If it is compatible but not identical, retain the current canonical skeleton and create a documented Blender retarget/conform profile.
6. Do not replace the canonical skeleton or migrate the animation library as a side effect of asset generation. That requires a separate approved migration decision.
7. Reject a rig that twists shoulders, collapses elbows, lifts feet, breaks fingers, changes height, or loses material/mesh bindings on round trip.

No other ancestry body is generated until this gate passes or the owner explicitly approves the retarget cost.

### Phase 5: modular clothing and armor

Soft garments such as tunics, pants, sleeves, gloves, and soft boots:

- use the exact body armature and bind pose;
- receive transferred weights followed by manual correction;
- preserve room around shoulders, elbows, hips, knees, and ankles;
- define which underlying body or underlayer regions they cover;
- pass every required locomotion and combat extreme without poke-through.

Rigid pieces such as helmets, buckles, shoulder plates, forearm plates, and shields:

- attach to a stable bone when the piece should remain rigid;
- use limited weights only when the piece must bridge joints;
- define attachment transform, allowed body archetypes, and collision/clipping exclusions;
- remain separate from hair and body geometry.

Every equipment piece receives a coverage mask. The assembled character hides covered body/underlayer zones to prevent z-fighting and poke-through. Helmets hide hair or select an approved tucked-hair variant. Large capes, long skirts, and physics-driven hair are deferred until the modular body and ordinary equipment proof passes.

### Phase 6: weapon preparation

Every weapon package records:

- exact weapon family and progression tier;
- meter scale, bounds, primary grip, optional secondary grip, strike axis, and forward orientation;
- right-hand, left-hand, hip, back, sheath, quiver, or off-hand socket profile;
- whether the item is one-handed, paired, two-handed, or weapon-and-shield;
- grip offset and rotation relative to the canonical hand socket;
- separate material variants without duplicating geometry when practical;
- representative gameplay-camera silhouette;
- close and normal-camera grip proof.

The weapon remains a separate GLB. The animation may use a linked reference copy in Blender, but the animation-only export contains no weapon mesh. Draw and sheath actions transfer the runtime weapon between sockets at authored event markers.

### Phase 7: animation and assembled calling proof

1. Validate neutral locomotion on the clean body before adding equipment.
2. Add the shared starter clothing and repeat the test.
3. Add the calling layer and repeat the test.
4. Attach the separate weapon and validate its approved static guard.
5. Apply the correct weapon-family motion packet from [`WEAPON_MOTION_REFERENCE_INDEX.md`](../WEAPON_MOTION_REFERENCE_INDEX.md).
6. Test interaction clips with empty hands and the weapon moved to its sheath or harness.
7. Capture idle, walk, run, turn, hit, death, draw, sheath, class signature, defense, and one weapon action where applicable.
8. Review normal-speed gameplay-camera video before close-up or slow-motion polish.
9. Reuse the same animation pack for compatible assembled characters; do not download motion again because clothing, armor, race, or weapon finish changed.

For quadrupeds and nonhumanoid creatures, recorded package structure is not animation
quality evidence. Before authoring, select real-video references for the exact species or
the closest defensible body family. Every quadruped set must study ordinary rest and
breathing, alert head and ear tracking, weight shifts, walking, a faster gait, and the
species-appropriate feeding, sniffing, grooming, digging, or grazing behavior. Predators
and combat creatures also require real-reference anticipation, whole-body drive, contact,
and recovery for each attack. Do not animate a limb against a frozen torso: scapular slide,
shoulder mass, chest, spine, pelvis, hip mass, center-of-mass travel, foot plants, head,
neck, and tail counterbalance must read as one animal. Record the exact video title,
channel, URL, observed time range, and motion notes in the ticket reference matrix before
the action is eligible for review.

For production quadrupeds, a licensed, species-matched authored motion source is the
default starting point. Import and render that donor rig and clip before fitting the target
mesh. Preserve the donor hierarchy, rest matrices, bone rolls, control/pole relationships,
contact sequence, and curve timing through retarget and bake. Bounding-box joint placement,
sine-wave hoof paths, or independently solved per-frame poses are not an acceptable primary
gait source. Procedural tools may clean foot plants after retargeting; they must not invent
the gait or overwrite the donor's joint sequence. A clip named `Run` is not a trot until its
diagonal two-beat contacts and suspension are visually verified.

Rigging must not silently redesign accepted art. Keep the approved target topology, UVs,
material slots, texture/image hashes, and silhouette unchanged unless the owner separately
approves a visual revision. Do not voxel-remesh, coordinate-paint, or replace image textures
with viewport colors as an animation-preparation shortcut. Automatic weights may seed a
skin, but they are never the final quadruped weight pass: manually protect the head and
neck, same-side shoulder and hip masses, rigid distal segments, hooves or paws, and zero
contralateral or torso-to-distal bleed before applying the final influence limit.

Before a species batch, prove one ordinary Walk. The internal gate compares the unmodified
donor and retarget at the same normalized frames, in side and three-quarter views, with
foot-contact markers and texture/material round-trip evidence. Only owner acceptance of
that single pilot authorizes additional gaits or reuse across related creatures.

## File and naming contract

Untouched downloads and Blender working files remain in a backed-up non-shipping intake root. Only approved runtime assets, concise diagnostics, previews, manifests, and required provenance enter the game tree.

Proposed stable IDs:

```text
body-human-a-v001
body-elf-a-v001
gear-starter-tunic-human-v001
gear-warrior-bracer-human-v001
weapon-sword-longsword-starter-v001
weapon-staff-practice-ashwood-v001
weapon-bow-shortbow-starter-v001
anim-sword-1h-guard-v001
anim-bow-shortbow-shot-v001
```

Proposed shipping layout after runtime support is approved:

```text
public/assets/3d/characters/bodies/<ancestry>/
public/assets/3d/equipment/starter/<body-archetype>/
public/assets/3d/equipment/callings/<calling>/<body-archetype>/
public/assets/3d/weapons/<family>/
public/assets/3d/animations/<motion-family>/
public/assets/3d/manifests/
```

Do not move existing assets merely to match this proposal. The runtime registry and migration must be implemented and reviewed first.

## Initial browser budgets

These are intake ceilings for the pilot, not permission to consume the entire scene budget:

| Asset | Desktop target | Mobile LOD target |
| --- | --- | --- |
| base body and head | 12k-18k triangles | 7k-10k triangles |
| hair and facial pieces | 3k-6k triangles | 1.5k-3k triangles |
| assembled starter clothing/calling layer | 6k-10k triangles | 3k-5k triangles |
| primary weapon or off-hand package | 1k-4k triangles | 0.5k-2k triangles |
| complete visible player | target <= 30k triangles | target <= 18k triangles |

- Prefer one 2K PBR atlas per major character set for desktop and a 1K derived atlas for mobile.
- Minimize material slots and draw calls; texture resolution does not compensate for poor UV density or muddy generation.
- LODs preserve face, hands, weapon silhouette, and ancestry markers.
- Measure actual Three.js calls, triangles, geometries, textures, memory, and load time in the live scene.
- A budget pass never overrides visual, deformation, license, or provenance failure.

## Required intake record

Every 3D AI Studio artifact records:

- internal asset ID and version;
- GitHub ticket and calling/race purpose;
- task ID and dashboard project;
- generation model/version and operation;
- prompt, negative constraints, seed, and source-image hashes;
- generation date, credit cost, owner account, and commercial-use status;
- untouched source filename, format, byte size, and SHA-256;
- Blender version and cleanup/retopo/bake notes;
- exact Blender executable path and captured `--version` output, proving the
  owner-designated current production release was used;
- rig source, skeleton comparison result, and retarget profile;
- mesh, triangle, bone, material, texture, and animation counts;
- meter scale, orientation, pivot, bounds, sockets, and coverage masks;
- desktop/mobile diagnostics and review evidence;
- reviewer, status, rejection reason, and approved shipping hash.

## Pilot stop-gates

The first paid sequence is deliberately narrow:

1. Generate and approve the Human multi-view source sheet.
2. Generate one Human body candidate.
3. Clean, retopologize, bake, and compare the Prism rig to the current skeleton contract.
4. Prove existing idle/walk/run/unarmed animation compatibility.
5. Produce one shared starter tunic, one modest rigid Warrior guard, and one separate starter longsword.
6. Assemble a Human Warrior review character without fusing the layers.
7. Prove draw, sheath, empty-hand interaction, and one-handed guard behavior.
8. Test the starter clothing contract on the existing Elf body or an approved Elf pilot before generating Dwarf and Halfling.
9. Only after the pilot passes, generate remaining ancestry bodies, calling layers, and shared weapon packages.

Stop and request owner review when:

- the source sheet does not preserve identity across views;
- a generation consumes an unexpected credit amount;
- the generated topology cannot be retopologized economically;
- the Prism rig is not compatible with the current animation plan;
- clothing must be fused to the body to look correct;
- a weapon cannot maintain a valid grip/socket profile;
- the asset exceeds browser budgets or loses important detail at gameplay distance;
- licensing, ownership, task provenance, or source files are incomplete.

## Approval checklist

- [ ] Paid plan and MCP connection verified without exposing credentials.
- [ ] Asset ticket, prompt, source sheet, model/version, and expected credits approved.
- [ ] Untouched source and task provenance preserved outside the shipping tree.
- [ ] Automated geometry audit and a no-floor proof render confirm there is no platform, pedestal, floor slab, ground patch, root mat, shadow catcher, light, camera, or scenery in the package.
- [ ] Export selection was rebuilt from an explicit allowlist after orphan/helper purge, and a factory-empty round trip confirms that every imported mesh is expected and correctly skinned or declared rigid.
- [ ] Base body contains no weapon, shield, class armor, cape, or large rig-obscuring hair.
- [ ] Topology, UV, PBR bake, scale, ground, orientation, and bounds pass.
- [ ] Skeleton identity or retarget profile is proven rather than assumed.
- [ ] The licensed quadruped motion donor was imported and rendered before retargeting; its hierarchy, rest matrices, pole/control relationships, contact order, and timing are recorded.
- [ ] Accepted target topology, UVs, material slots, embedded image/texture hashes, and silhouette survived rigging and export unchanged, or an owner-approved visual revision is recorded.
- [ ] Quadruped weights passed manual same-side shoulder/hip, head/neck, rigid distal-segment, hoof/paw, torso-distal, and contralateral-bleed checks before the final influence limit.
- [ ] Existing baseline animation pack passes on the clean body.
- [ ] Every quadruped action has recorded real-video species/body-family reference and moves the torso, shoulder/hip masses, spine, pelvis, center of mass, head/neck, and planted feet as a connected animal.
- [ ] Source and retarget contact sheets match at normalized frames; no filename-based gait relabeling, per-frame pose discontinuity, hyperextension, inversion, or stance-foot slide is accepted.
- [ ] Clothing/armor is modular, weighted correctly, and has coverage metadata.
- [ ] Weapon is separate and has grip/socket metadata.
- [ ] Empty-hand interaction and draw/sheath transitions pass.
- [ ] Calling silhouette remains readable at the gameplay camera without high-tier effects.
- [ ] Normal-speed and slow-motion videos, contact sheets, and browser diagnostics pass.
- [ ] Desktop/mobile performance stays inside the approved slice budget.
- [ ] Final shipping hash matches the reviewed candidate.

No batch generation begins while any pilot-critical item remains unchecked.

## Vendor references

- [3D AI Studio recommended workflow](https://docs.3daistudio.com/3d-generation/recommended-workflow)
- [3D AI Studio image-to-3D and multi-view guidance](https://docs.3daistudio.com/3d-generation/image-to-3d)
- [3D AI Studio remesh guidance](https://docs.3daistudio.com/processing/remesh)
- [3D AI Studio rigging and Mixamo-compatible export](https://docs.3daistudio.com/processing/rigging)
- [3D AI Studio export formats](https://docs.3daistudio.com/export-formats)
- [3D AI Studio Blender integration](https://docs.3daistudio.com/integrations/blender)
- [3D AI Studio API overview](https://www.3daistudio.com/Platform/API/Documentation/overview)
- [Adobe Mixamo custom-character requirements](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
