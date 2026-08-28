# 3D AI Studio Character and Equipment Pipeline

Status: production contract proposed under [The-Nexus #435](https://github.com/The-Nexus-Decoded/The-Nexus/issues/435)  
Scope: paid 3D AI Studio intake, base ancestry bodies, starter calling kits, separate weapons, Blender cleanup, rig compatibility, animation reuse, browser export, provenance, and visual QA

This document defines how SoulDrifter uses 3D AI Studio without generating a fused character for every ancestry/calling combination. It complements [`ANIMATION_PRODUCTION_PIPELINE.md`](../ANIMATION_PRODUCTION_PIPELINE.md), [`WEAPON_MOTION_REFERENCE_INDEX.md`](../WEAPON_MOTION_REFERENCE_INDEX.md), [`CHARACTER_AND_STORY_SYSTEM.md`](../CHARACTER_AND_STORY_SYSTEM.md), and [`ASSET_AND_LICENSE_POLICY.md`](../ASSET_AND_LICENSE_POLICY.md).

## Locked production decision

SoulDrifter does **not** purchase or maintain an independent model for every ancestry/calling/appearance combination. The production set is assembled from reusable layers:

- three initial production ancestry body archetypes: Human, Elf, and Dwarf;
- one future playable Halfling body archetype, kept outside the current creation and generation batch while existing Halfling saves continue to load unchanged;
- one shared C-tier starter clothing family, conformed to each body archetype;
- nine modest calling-identity kits that layer over the starter clothing;
- a separate reusable weapon and off-hand library;
- one canonical humanoid animation contract plus documented race/body retarget profiles;
- separate hair, facial-detail, sheath, harness, rune/sigil, and effect layers.

Every calling receives an assembled review character, but its body, clothing, armor, and weapon remain independent production assets. Calling eligibility follows the canonical ancestry contract; equipment families remain broadly usable through training rather than hard model locks.

Drakkin is retired from the active playable-character and body-production plan. Do not place Drakkin in creation, Tripo, body, or animation-retarget matrices. Any lore-only reference remains non-production and does not authorize generation.

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
11. Every Tripo humanoid uses Smart Mesh P1.0 at generation and Quad Face production topology; the settings and face target are visibly recorded before submission.
12. Human sources use realistic adult anatomy and facial/material quality. High-detail Shadowknight images are style references only and never authorize fused armor, clothing, weapons, effects, or copied class identity.

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
| 4 | Halfling | small adult body, readable hands/feet/face, never childlike or chibi | future playable batch; current saves load, but no body generation in this program |

The locked Human baseline is adult masculine and adult feminine across Slim, Medium/Natural, Athletic/Muscular, and Thick/Large-Framed: eight canonical meshes and sixteen required pose artifacts. The first paid gate covers the two Athletic/Muscular pilots only; both must pass before the remaining six Humans. Elf and Dwarf remain blocked until all eight Human bodies pass. Halfling's later playable batch is separate.

### Modular head, skin, hair, and facial-detail contract

Appearance variety is assembled from reusable parts and materials. It must not multiply paid body generation by every possible face, skin tone, hairstyle, or adornment combination.

| Layer | Minimum production target | Boundary |
| --- | --- | --- |
| Adult body families | masculine and feminine for Human, Elf, Dwarf, and Halfling | same gameplay stats; anatomy and clothing-conform profiles remain separate assets |
| Facial structures | three readable adult face families per compatible head topology | soft/round, angular/high-cheek, and broad/strong are shape guides, never personality, morality, or ethnicity labels |
| Skin tones | at least six equally canonical tones | deep, dark, medium-deep, medium, tan/olive, and light/pale coverage; implemented as approved texture/material variants, not duplicate body geometry |
| Hair | at least six masculine-presenting and six feminine-presenting fitted styles | separate meshes; every style may be offered across presentation categories when head fit and clipping QA pass |
| Facial details | modular brows, facial hair, sideburns, scars, tattoos/paint, nose rings/studs, and earrings | texture masks/decals when flat; separate socketed meshes when dimensional; never baked permanently into the base head |
| Headshots | standardized local portrait renders of accepted assembled heads | render from the shipping head/material/hair/adornment assembly; do not buy a separate 3D generation for each portrait |

Initial hair coverage should include shaved/buzzed, short coils or waves, cropped/side-parted, short locs, shoulder-length locs, and a tied-back option for the masculine-presenting set; and cropped coils, braids, bob/shoulder cut, long locs, braided crown, and tied-back/ponytail options for the feminine-presenting set. These are production coverage groups, not gender locks.

The canonical head is proved with the body first. After the body rig passes, Blender establishes a versioned neck seam, head origin, material slots, face topology, hair-cap boundary, ear placement, and sockets for left/right ear, nose, and facial-hair pieces. Floating paid head variants are prohibited until that seam contract passes. Face families should share deformation landmarks and expression compatibility; if a generated face cannot conform without breaking identity or animation, it remains a non-shipping concept.

Skin tone, facial structure, hair, tattoos, scars, piercings, facial hair, and sideburns never change ancestry stats, class eligibility, morality, rarity, or power. Ancestry-specific ears and approved physiology remain readable without turning one appearance into the canonical or superior version.

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

## Source-image and prompt gate

Image-to-3D is the preferred character path. Text-to-3D may be used for rough props, but it is not the approval path for a hero body.

Before a paid 3D request, prepare a consistent multi-view sheet:

- front, left, back, and right orthographic-like views;
- identical proportions, face, clothing boundary, and color across every view;
- strict symmetrical T-pose with arms horizontal at shoulder height, fingers readable, and limbs separated from the torso;
- clean, high-contrast, plain background;
- full body visible, centered, and not cropped;
- no dramatic camera perspective, action pose, weapon, shield, cape, particles, floor props, or cast shadow hiding the silhouette;
- no long loose hair during the rigging proof;
- no labels or decorative borders touching the subject.

### Base-body prompt template

```text
Create a production reference sheet for an original SoulDrifter [ANCESTRY] adult humanoid.
Show the exact same character from front, left, back, and right views in a strict symmetrical
T-pose with both arms horizontal at shoulder height. Use grounded realistic-fantasy proportions
and a realistic adult face without cartoon, chibi, toy-like, or exaggerated stylization. The character wears a fitted,
opaque, seam-simple neutral underlayer. No weapon, shield, armor, cape, robe, large hair,
jewelry, particles, glow, text, pedestal, or environment. Keep both hands, all fingers, both
feet, ears, and the complete silhouette clearly visible. Use a clean plain background and
consistent neutral lighting. The views must agree exactly in anatomy, face, proportions,
materials, and garment boundaries. This is a modular game-character base, not concept art.
```

Append only ancestry-specific requirements that have already been approved. Do not place calling identity, morality, high-level magic, or advanced rune traditions into a base ancestry body.

### Weapon prompt template

```text
Create one original low-level SoulDrifter [WEAPON] as an isolated game asset.
It is a worn C-tier mortal implement made from [MATERIALS], with believable construction,
grip dimensions, thickness, and weight. No hand, character, sheath, floating particles,
runes, relic glow, text, environment, or display stand. Center the entire object on a clean
plain background and provide consistent front, side, and rear reference views. Preserve a
clear unobstructed primary grip and a silhouette readable from an elevated isometric camera.
```

### Clothing or armor prompt template

```text
Create one original modular C-tier [GARMENT OR ARMOR PIECE] for the approved SoulDrifter
[BODY ARCHETYPE]. Show it fitted over the approved neutral body reference in front, left,
back, and right views. The piece is worn, practical, low-level, and constructionally
believable. No weapon, advanced rune language, relic glow, cape, unrelated accessories,
body redesign, action pose, or environment. Keep seams, openings, thickness, attachment
points, and body coverage clearly visible. This output is a conforming source for a separate
game-equipment mesh, not a permanently fused character.
```

## Generation and intake sequence

### Phase 0: approve before spending credits

1. Lock the ticket, asset ID, ancestry/calling purpose, concept sheet, prompt, model/version, seed policy, target face count, material plan, and expected credit cost.
2. For a Tripo humanoid, lock Smart Mesh P1.0 `ON`, `Quad Face`, and the target quad-face count. Capture these visible settings before the charged submission.
3. Decide whether the request is a base body, soft garment, rigid armor, weapon, or non-shipping concept. Never mix categories in one production request.
4. Save the prompt and source-image hashes in the intake ledger.
5. Obtain owner approval of the reference sheet and expected charge.

### Phase 1: generate one source candidate

1. Submit one image-to-3D task with Smart Mesh P1.0 enabled. If the selected lane cannot prove Smart Mesh, stop rather than silently using a dense HD/triangle source.
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

### Phase 3: Smart Mesh retopology and Blender cleanup

1. Import the untouched candidate into a clean Blender scene.
2. Confirm meter scale, ground contact, orientation, transform application, normals, manifold state, material slots, UVs, and texture color spaces.
3. Remove accidental internal surfaces and disconnected generation debris without erasing source provenance.
4. Run or verify Tripo Quad Face retopology before texturing or rigging. For the Human pilot, target 8,000 quads inside the 6,000-9,000-quad intake range, approximately the existing 12,000-18,000-triangle desktop body/head budget.
5. Inspect and manually repair hero-character loops where Smart Mesh does not preserve animation-quality flow. A Smart Mesh label is not a deformation verdict.
6. Preserve facial, neck, clavicle, shoulder, armpit, elbow, wrist, finger, pelvis, hip, knee, ankle, and toe loops needed for animation.
7. Bake the approved PBR appearance from the source mesh onto the accepted production topology.
8. Keep rigid armor and weapons mechanically clean. Do not add unnecessary bones to a non-articulated weapon.
9. Use the existing validated Elf Shadowknight only as a scale, realism, and material-quality reference until a versioned asset manifest replaces that baseline; do not copy its gear into the body.

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

## File and naming contract

Untouched downloads and Blender working files remain in a backed-up non-shipping intake root. Only approved runtime assets, concise diagnostics, previews, manifests, and required provenance enter the game tree.

Proposed stable IDs:

```text
body-human-masculine-a-v001
body-human-feminine-a-v001
body-elf-masculine-a-v001
body-elf-feminine-a-v001
head-human-face-angular-v001
material-skin-human-deep-v001
hair-coils-short-fit-human-v001
adornment-earring-hoop-small-left-v001
gear-starter-tunic-human-v001
gear-warrior-bracer-human-v001
weapon-sword-longsword-starter-v001
weapon-staff-practice-ashwood-v001
weapon-bow-shortbow-starter-v001
anim-sword-1h-guard-v001
anim-bow-shortbow-shot-v001
```

New Human foundation bodies use build-specific IDs such as `human-masculine-athletic-muscular`; each ID owns one canonical mesh plus separately hashed `t-pose` and same-rig `a-pose` artifacts. The older `*-a-v001` examples above are historical naming examples, not permission to generate an A-pose-only body.

Proposed shipping layout after runtime support is approved:

```text
public/assets/3d/characters/bodies/<ancestry>/
public/assets/3d/characters/heads/<ancestry>/
public/assets/3d/characters/hair/<fit-profile>/
public/assets/3d/characters/adornments/<socket-or-mask-family>/
public/assets/3d/characters/materials/skin/<ancestry>/
public/assets/generated/characters/portraits/<ancestry>/
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

- For Smart Mesh Human pilots, use 8,000 quads by default and reject results outside 6,000-9,000 quads unless a recorded runtime-budget reason approves the change.
- The canonical deformation mesh and derived mobile LOD are separate artifacts; never rig only the mobile decimation and call it the canonical body.
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
- Smart Mesh enabled state, visible settings evidence, topology type, target quad faces, and pre/post face and triangle counts;
- prompt, negative constraints, seed, and source-image hashes;
- generation date, credit cost, owner account, and commercial-use status;
- untouched source filename, format, byte size, and SHA-256;
- Blender version and cleanup/retopo/bake notes;
- rig source, skeleton comparison result, and retarget profile;
- mesh, triangle, bone, material, texture, and animation counts;
- meter scale, orientation, pivot, bounds, sockets, and coverage masks;
- desktop/mobile diagnostics and review evidence;
- reviewer, status, rejection reason, and approved shipping hash.

## Pilot stop-gates

The first paid sequence is deliberately narrow:

1. Prepare and approve the masculine and feminine Human Athletic/Muscular strict-T source sheets without submitting either generation.
2. With exact-cost approval, generate one Smart Mesh candidate per approved pilot, never duplicate T/A bodies.
3. Clean, retopologize, bake, and compare the Prism rig to the current skeleton contract.
4. Prove existing idle/walk/run/unarmed animation compatibility.
5. Produce one shared starter tunic, one modest rigid Warrior guard, and one separate starter longsword.
6. Assemble a Human Warrior review character without fusing the layers.
7. Prove draw, sheath, empty-hand interaction, and one-handed guard behavior.
8. Lock the neck seam, three-face-family topology target, six-tone material palette, hair-cap boundary, and adornment sockets on the approved Human pilot.
9. After both Athletic/Muscular pilots pass, produce the remaining six Human build/presentation bodies under the same individually receipted gate.
10. Do not generate Elf or Dwarf until the complete eight-body Human baseline passes; Halfling remains a separate future playable batch.
11. Only after those gates pass, generate later ancestry bodies, calling layers, and shared weapon packages in separately approved batches.

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
- [ ] Base body contains no weapon, shield, class armor, cape, or large rig-obscuring hair.
- [ ] Smart Mesh P1.0, Quad Face, and the target face count are visible in submission evidence.
- [ ] Canonical topology stays inside the approved 6,000-9,000-quad pilot range or has a recorded runtime-budget exception.
- [ ] Masculine/feminine body-family coverage and clothing-conform profile are recorded without changing gameplay stats.
- [ ] Three facial structures share approved expression/deformation landmarks and the versioned neck seam.
- [ ] At least six skin tones render consistently and carry no stat, morality, rarity, or class meaning.
- [ ] At least six masculine-presenting and six feminine-presenting hair fits pass skull, ear, shoulder, and helmet clipping checks.
- [ ] Tattoos/paint use masks or decals; piercings and dimensional facial details use declared sockets; facial hair and sideburns remain modular.
- [ ] Headshots are locally rendered from the reviewed shipping assembly rather than purchased as duplicate 3D generations.
- [ ] Topology, UV, PBR bake, scale, ground, orientation, and bounds pass.
- [ ] Skeleton identity or retarget profile is proven rather than assumed.
- [ ] Existing baseline animation pack passes on the clean body.
- [ ] Clothing/armor is modular, weighted correctly, and has coverage metadata.
- [ ] Weapon is separate and has grip/socket metadata.
- [ ] Empty-hand interaction and draw/sheath transitions pass.
- [ ] Calling silhouette remains readable at the gameplay camera without high-tier effects.
- [ ] Normal-speed and slow-motion videos, contact sheets, and browser diagnostics pass.
- [ ] Desktop/mobile performance stays inside the approved slice budget.
- [ ] Final shipping hash matches the reviewed candidate.

No batch generation begins while any pilot-critical item remains unchecked.

## Vendor references

- [Tripo Smart Mesh native quad topology](https://www.tripo3d.ai/features/smart-mesh)
- [Tripo real-time retopology order and hero-character manual-pass guidance](https://www.tripo3d.ai/blog/ai-workflow-to-reduce-manual-retopology)
- [3D AI Studio recommended workflow](https://docs.3daistudio.com/3d-generation/recommended-workflow)
- [3D AI Studio image-to-3D and multi-view guidance](https://docs.3daistudio.com/3d-generation/image-to-3d)
- [3D AI Studio remesh guidance](https://docs.3daistudio.com/processing/remesh)
- [3D AI Studio rigging and Mixamo-compatible export](https://docs.3daistudio.com/processing/rigging)
- [3D AI Studio export formats](https://docs.3daistudio.com/export-formats)
- [3D AI Studio Blender integration](https://docs.3daistudio.com/integrations/blender)
- [3D AI Studio API overview](https://www.3daistudio.com/Platform/API/Documentation/overview)
- [Adobe Mixamo custom-character requirements](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
