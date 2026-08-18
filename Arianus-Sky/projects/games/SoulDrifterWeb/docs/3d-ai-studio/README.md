# 3D AI Studio Character and Equipment Pipeline

Status: production contract proposed under [The-Nexus #435](https://github.com/The-Nexus-Decoded/The-Nexus/issues/435)  
Scope: ChatGPT reference-image design, paid 3D AI Studio single-image intake, base ancestry bodies, starter calling kits, separate weapons, NPCs, creatures, Blender cleanup, rig compatibility, animation reuse, browser export, provenance, and visual QA

This document defines how SoulDrifter uses 3D AI Studio without generating a fused character for every ancestry/calling combination. It complements [`ANIMATION_PRODUCTION_PIPELINE.md`](../ANIMATION_PRODUCTION_PIPELINE.md), [`WEAPON_MOTION_REFERENCE_INDEX.md`](../WEAPON_MOTION_REFERENCE_INDEX.md), [`CHARACTER_AND_STORY_SYSTEM.md`](../CHARACTER_AND_STORY_SYSTEM.md), and [`ASSET_AND_LICENSE_POLICY.md`](../ASSET_AND_LICENSE_POLICY.md).

The active production execution is [`FIRST_BREACH_MODEL_PROGRAM.md`](FIRST_BREACH_MODEL_PROGRAM.md), tracked by [The-Nexus #448](https://github.com/The-Nexus-Decoded/The-Nexus/issues/448). Its machine-readable scope gate is [`first-breach-model-register.json`](first-breach-model-register.json). The reproducible untouched-GLB inventory is [`first-breach-source-audit.json`](first-breach-source-audit.json); regenerate it from the owner-controlled external intake with `yarn audit:3d-source --source-root <issue-448-intake> --output docs/3d-ai-studio/first-breach-source-audit.json`. It adds the permanent playable-humanoid foundation, matching animated conversation faces for Ilyra/Orren/Brannoc, and purpose-built First Breach creature models. Open-world environments, later-realm monsters, and higher-tier equipment are explicitly outside that first production batch.

## Locked production decision

SoulDrifter does **not** purchase or maintain an independent model for every ancestry/calling/appearance combination. The production set is assembled from reusable layers:

- four current playable ancestry body archetypes: Human, Elf, Dwarf, and Halfling;
- one shared C-tier starter clothing family, conformed to each body archetype;
- nine modest calling-identity kits that layer over the starter clothing;
- a separate reusable weapon and off-hand library;
- one canonical humanoid animation contract plus documented race/body retarget profiles;
- separate hair, facial-detail, sheath, harness, rune/sigil, and effect layers.

Every production geometry family in the First Breach execution set starts from an owner-reviewed ChatGPT source containing one complete isolated subject. Simple assets use one approved image; bespoke asymmetric hero actors use four separately approved identity-matched views. The source is then routed through the 3D AI Studio model that best preserves that asset's required anatomy, topology budget, and materials. Blender cleanup, retopology, conforming, facial shape authoring, material variation, rigging, LOD creation, and animation integration remain mandatory; a raw generated result is never a shipping model. Existing generic or legacy actors remain rollback placeholders only.

Every calling receives an assembled review character, but its body, clothing, armor, and weapon remain independent production assets. Calling eligibility follows the canonical ancestry contract; equipment families remain broadly usable through training rather than hard model locks.

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
5. Perform paid generation only inside the current written owner authorization; otherwise obtain approval for the exact expected credit charge.
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

The current runtime does not yet expose the full appearance selector. The long-term production contract includes adult masculine and adult feminine body families for every playable ancestry. Under the 2026-08-17 phase authorization, the remaining seven base anchors may be generated before the shared rig proof; Slim and Heavy conform profiles, gear expansion, and runtime promotion still wait for topology, skeleton, head-seam, clothing, and animation gates.

### Modular head, skin, hair, and facial-detail contract

Appearance variety is assembled from reusable parts and materials. It must not multiply paid body generation by every possible face, skin tone, hairstyle, or adornment combination.

| Layer | Minimum production target | Boundary |
| --- | --- | --- |
| Adult body families | masculine and feminine for Human, Elf, Dwarf, and Halfling | same gameplay stats; anatomy and clothing-conform profiles remain separate assets |
| Facial-feature families | four respectful adult families per compatible head topology | African diaspora/Black, East Asian, South Asian/Indian, and European; each is available across Human, Elf, Dwarf, and Halfling with equivalent detail and facial-animation coverage |
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

## ChatGPT image-first source gate

Every SoulDrifter body, head, NPC, creature, garment, armor piece, weapon, prop, and environment module starts from high-quality grounded-realistic ChatGPT reference art. Direct text-to-3D is retired for new production sources after its Breachling and Warden results proved less controllable and more cartoon-prone. Provider selection is asset-specific: Prism 3.1 remains the preferred hero-character and hero-creature path; Meshy 7 Multi-image is retained for the accepted Breachling reconstruction; corrected Prism 3.1 Multi-Image is required for the Cinderbound Warden; and simple modular hair, starter gear, and wearable sources use Meshy 7 Smart Topology low-poly conversion with 2K PBR textures. The owner has authorized the remaining bounded issue #448 source conversions without a standing credit floor. Record exact settings and charge for every task, and stop if the provider reports an unexpected amount.

This decision follows the approved 2026-08-17 Human athletic comparison:

- Prism 3.1 text-to-3D task `ef7a7258`, with Ultra texture quality, cost 40 credits and produced one coherent humanoid candidate. It drifted from the requested relaxed A-pose to a T-pose and interpreted knee-length pants as full-length pants, so it remains a non-shipping source pending export, topology, rig, and animation review.
- Prism 3.1 multi-view image-to-3D task `304b62b1`, with Ultra texture quality, cost 45 credits and produced three unwanted figures because adjacent views remained visible in the cropped source frames. That candidate is rejected.
- The bounded comparison cost 85 credits total, moving the account balance from 3,557 to 3,472. Neither candidate was remeshed, rigged, or promoted.

The comparison history remains provenance, not current guidance. Single-image Image-to-3D is now the production default. Each source contains one isolated subject, plain background, unobstructed silhouette, and no duplicate views, labels, inset frames, scenery, or fused unrelated pieces. Riggable actors use a neutral front A- or T-pose with clear limbs and flat feet; objects use one neutral production orientation. Multi-view is allowed only by a separate owner decision with four clean identity-matched files.

Before a paid single-image conversion, lock:

- one asset category and internal asset ID;
- one complete ChatGPT design prompt, edit history, and explicit exclusion list;
- the exact owner-reviewed image filename, dimensions, bytes, and SHA-256;
- the intended bind-pose family, silhouette, material boundary, and modularity boundary;
- the exact provider model/version, expected cost, maximum cost, and stop conditions;
- any lore, ancestry, calling, body-profile, or level constraints already approved by the owner.

### Base-body ChatGPT image template

```text
Original SoulDrifter [ANCESTRY] adult [PRESENTATION] [BODY PROFILE] modular game-character
base. Grounded realistic-fantasy style for a polished isometric action RPG. Neutral relaxed
A-pose, [APPROVED PROPORTIONS], [APPROVED SKIN TONE], [APPROVED HAIR BOUNDARY], and a
strong symmetrical adult face. Fitted opaque seam-simple neutral underlayer; bare or
seam-simple feet for the rig proof. Separate readable fingers, arms clear of the torso, and
a clean continuous silhouette. No armor, weapon, shield, cape, robe, large hair, jewelry,
particles, glow, pedestal, environment, exaggerated anatomy, facial hair, logos, text,
duplicate figures, or turntable views. Single complete full-body character.
```

Append only ancestry-specific requirements that have already been approved. Do not place calling identity, morality, high-level magic, or advanced rune traditions into a base ancestry body.

### Weapon ChatGPT image template

```text
Create one original low-level SoulDrifter [WEAPON] as an isolated game asset.
It is a worn C-tier mortal implement made from [MATERIALS], with believable construction,
grip dimensions, thickness, and weight. No hand, character, sheath, floating particles,
runes, relic glow, text, environment, or display stand. Center the entire object on a clean
plain background in a neutral production orientation. Preserve a clear unobstructed primary
grip and a silhouette readable from an elevated isometric camera. Single complete object;
no duplicate views, alternate versions, or fused accessories.
```

### Clothing or armor ChatGPT image template

```text
Create one original modular C-tier [GARMENT OR ARMOR PIECE] for the approved SoulDrifter
[BODY ARCHETYPE] as one isolated game-equipment source. The piece is worn, practical,
low-level, and constructionally believable. No visible character body, weapon, advanced
rune language, relic glow, cape, unrelated accessories, body redesign, action pose, or
environment. Keep seams, openings, thickness, attachment points, and body coverage clearly
readable. Single complete garment or armor piece; no duplicate views or equipment set. This
is a conforming source for a separate game-equipment mesh, never fused character geometry.
```

### Monster ChatGPT image template

```text
Create one original SoulDrifter [MONSTER FAMILY AND TIER] as a complete isolated full-body
game-model reference. Grounded realistic dark-fantasy rendering with the approved SoulDrifter
material language, not cartoon art. Neutral symmetrical A-pose for rigging, limbs and joints
clear, feet planted, plain background. Define its scale, silhouette, locomotor anatomy, attack
anatomy, joint logic, surface/material hierarchy, palette, threat language, encounter role,
and any family-preserving horns, spikes, plates, bindings, or ridges. The face must have
anatomically credible predatory or mechanical function: [JAW / SENSOR / MASK CONTRACT].
Preserve all required animation controls and VFX/SFX sockets. No human facial drift, generic
humanoid costume, weapon-like debris, pedestal, scenery, duplicate, collage, turntable, gore,
or cropped anatomy. One coherent subject only.
```

For a Breachling tier, preserve the shared hunched anatomy and rig. The pale ash/grey base,
slate Stalker, ochre-bound Oathbound, and cinder-red horned/spiked Ravager each receive their
own render but do not become unrelated species. The approved base benchmark uses a huge
broad hinged non-human maw with deep cavity, layered teeth, visible tongue, and separate
`jaw-open`, `jaw-close`, and `snarl` controls.

The Cinderbound Warden is a separate mechanical/golem boss: articulated charred-basalt and
oxidized-bronze plates around an ember core, faceless mask/sensor slit, left-palm soul-tax
mechanism, and integrated right-forearm sweep blade. It is not biological, a Breachling,
an armored human, a Paladin, or a wielder of separate swords.

## Generation and intake sequence

### Phase 0: verify authorization before spending credits

1. Lock the ticket, asset ID, ancestry/calling/encounter purpose, ChatGPT image brief, model/version, seed policy, target face count, material plan, and expected credit cost.
2. Decide whether the request is a base body, soft garment, rigid armor, weapon, or non-shipping concept. Never mix categories in one production request.
3. Generate and show exactly one ChatGPT source image in chat, then save every prompt/edit hash and the exact approved image hash in the intake ledger. Riggable actors use one front-facing full-body A- or T-pose on a plain background; contact sheets and automatic multi-view crops are invalid.
4. Confirm that the task fits the bounded issue #448 image-to-3D authorization and asset-specific provider route, then record the exact image/settings/live charge. Direct text-to-3D, remesh, rigging, and paid animation remain outside this authorization; an unexpected provider charge stops the batch.

### Phase 1: generate one source candidate

1. Submit the exact approved single image through MCP or the authenticated 3D AI Studio dashboard.
2. Record the returned task ID immediately.
3. Poll status without submitting duplicates.
4. Inspect the textured and clay views before exporting.
5. Reject duplicate subjects, extra limbs, fused fingers, closed armpits, unusable pose drift, missing back detail, melted facial features, intersecting geometry, fused equipment, and weapon-like fragments.
6. Do not request variants until the defect is classified as a prompt problem, model limitation, or downstream cleanup problem.
7. If conversion fails, classify whether the source image, model limitation, or downstream cleanup caused it. Correct the ChatGPT image first; do not switch to direct text-to-3D as an automatic fallback.

### Phase 2: export to non-shipping intake

1. Export the untouched source result to a local intake area outside `public/assets`.
2. Prefer GLB for material/mesh inspection and FBX for rigging or animation interchange.
3. Preserve the original download unchanged.
4. Record byte size and SHA-256 for the source files.
5. Record model version, seed, prompt, source images, task ID, generation date, account ownership, commercial-use status, and download format.
6. Add the provider-generated asset and its ownership/license record to `third-party-assets.json` before promotion, following the existing asset policy.

### Phase 3: Blender cleanup and retopology

1. Import the untouched candidate into a clean Blender scene.
2. Confirm meter scale, ground contact, orientation, transform application, normals, manifold state, material slots, UVs, and texture color spaces.
3. Remove accidental internal surfaces and disconnected generation debris without erasing source provenance.
4. Create deformation-friendly quad topology for bodies and soft garments. A generated dense or irregular mesh is not accepted merely because it looks correct while static.
5. Preserve facial, shoulder, elbow, hand, pelvis, knee, and ankle loops needed for animation.
6. Bake the approved PBR appearance from the source mesh onto the production topology.
7. Keep rigid armor and weapons mechanically clean. Do not add unnecessary bones to a non-articulated weapon.
8. Use the existing validated Elf Shadowknight as the scale/orientation comparison until a versioned asset manifest replaces that baseline.

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

No additional body source is promoted or sent to paid rigging until this gate passes or the owner explicitly approves the retarget cost.

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
head-elf-face-east-asian-v001
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
- prompt, negative constraints, seed, and prompt hash;
- ChatGPT prompt/edit hashes and the exact approved source-image hash for every production artifact;
- generation date, credit cost, owner account, and commercial-use status;
- untouched source filename, format, byte size, and SHA-256;
- Blender version and cleanup/retopo/bake notes;
- rig source, skeleton comparison result, and retarget profile;
- mesh, triangle, bone, material, texture, and animation counts;
- meter scale, orientation, pivot, bounds, sockets, and coverage masks;
- desktop/mobile diagnostics and review evidence;
- reviewer, status, rejection reason, and approved shipping hash.

## Pilot stop-gates

The current paid sequence is deliberately gated:

1. Preserve the twelve accepted single-image Halfling and Heavy body anchors in [`body-anchor-intake.json`](./body-anchor-intake.json); reject multi-view task `304b62b1` and do not derive production assets from it.
2. Treat the 1.41M-1.49M-triangle untouched GLBs as visual source sculpts only; none may enter `public/assets` or a runtime manifest.
3. Select one Human topology pilot, clean, retopologize, bake, and compare a resulting rig to the current skeleton contract.
4. Prove existing idle/walk/run/unarmed animation compatibility.
5. Preserve the registered ChatGPT-image-first starter weapon/off-hand and wearable source conversions, including the rejected split-blade ritual knife and its accepted worn-dagger fallback; do not promote them before part separation, conforming, sockets, coverage masks, and camera/clipping QA.
6. Assemble a Human Warrior review character without fusing the layers.
7. Prove draw, sheath, empty-hand interaction, and one-handed guard behavior.
8. Lock the neck seam, four cross-ancestry facial-feature families, six-tone material palette, hair-cap boundary, and adornment sockets on the approved Human pilot.
9. Prove the counterpart Human body family and shared appearance layers before expanding derived body profiles.
10. Test the starter clothing contract on the existing Elf body or an approved Elf pilot before promoting any preserved Dwarf or Halfling source.
11. Only after those gates pass, continue remaining body profiles, calling layers, and shared weapon packages in controlled batches.

Stop and request owner review when:

- the ChatGPT source cannot express one coherent isolated subject within the approved design envelope;
- single-image conversion loses required anatomy, mechanical logic, identity, or silhouette;
- a generation consumes an unexpected credit amount;
- the generated topology cannot be retopologized economically;
- the Prism rig is not compatible with the current animation plan;
- clothing must be fused to the body to look correct;
- a weapon cannot maintain a valid grip/socket profile;
- the asset exceeds browser budgets or loses important detail at gameplay distance;
- licensing, ownership, task provenance, or source files are incomplete.

## Approval checklist

- [ ] Paid plan and MCP connection verified without exposing credentials.
- [ ] Asset ticket, prompt or source-image hash, operation, model/version, expected credits, and applicable phase authorization recorded.
- [ ] Untouched source and task provenance preserved outside the shipping tree.
- [ ] Base body contains no weapon, shield, class armor, cape, or large rig-obscuring hair.
- [ ] Masculine/feminine body-family coverage and clothing-conform profile are recorded without changing gameplay stats.
- [ ] African diaspora/Black, East Asian, South Asian/Indian, and European facial-feature families are available across Human, Elf, Dwarf, and Halfling and share approved expression/deformation landmarks and the versioned neck seam.
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

- [3D AI Studio recommended workflow](https://docs.3daistudio.com/3d-generation/recommended-workflow)
- [3D AI Studio text-to-3D guidance (historical comparison only)](https://docs.3daistudio.com/3d-generation/text-to-3d)
- [3D AI Studio image-to-3D and multi-view guidance (production path)](https://docs.3daistudio.com/3d-generation/image-to-3d)
- [3D AI Studio remesh guidance](https://docs.3daistudio.com/processing/remesh)
- [3D AI Studio rigging and Mixamo-compatible export](https://docs.3daistudio.com/processing/rigging)
- [3D AI Studio export formats](https://docs.3daistudio.com/export-formats)
- [3D AI Studio Blender integration](https://docs.3daistudio.com/integrations/blender)
- [3D AI Studio API overview](https://www.3daistudio.com/Platform/API/Documentation/overview)
- [Adobe Mixamo custom-character requirements](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
