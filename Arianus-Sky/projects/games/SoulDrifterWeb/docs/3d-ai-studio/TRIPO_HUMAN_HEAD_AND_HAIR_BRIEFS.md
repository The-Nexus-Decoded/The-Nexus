# Human Foundation Head and Hair Production Briefs

Issue: SoulDrifter #487  
Body authority: `human-foundation-pilot-runtime-4k.glb`  
Accepted Tripo source task: `4a5ad734-7dcc-4184-a0c0-ccfc8a79f15f`

These briefs define the first complete Human facial vertical slice. They do not
authorize a paid provider action. Before each charged Tripo submission, refresh
the live model label, price, balance, expected cost, maximum retry cost, and
projected balance, then obtain action-time owner approval for that exact task.
One approval covers one task only; retries require a new approval.

## Canonical asset contract

- The accepted Human body is the proportion, scale, coordinate-frame, neck-seam,
  material, and 65-bone rig authority.
- Use one neutral adult master head taken from that exact body. Do not generate a
  merely similar replacement head and do not change the head or neck rest bones.
- The same canonical head and facial controls must render in the world, character
  creator, NPC close-up, dialogue, quest, portrait, and paper-doll views.
- Adult age is topology-preserving Blender work on the one master head:
  `YOUNG_ADULT`, `MIDDLE_AGED`, and `ELDER`. Do not create separate Tripo heads
  for those ages.
- Children are a separate NPC-only body, head, seam, rig, clothing, camera, and
  animation family. Never shrink or age-morph this adult asset into a child.
- Hair, eyebrows, eyelashes, and facial hair are modular geometry/material
  layers. None may be fused into the neutral master head.

## H01 - exact-body head segmentation

Source the untouched accepted pre-rig Tripo body task, not a later Mixamo export.
Create a single versioned neck seam that follows the base of the neck below the
larynx and behind the sternocleidomastoid transition. Preserve enough overlap for
a hidden seam under clothing without deleting shoulder or clavicle anatomy.

Required output:

1. untouched segmentation result;
2. isolated head/neck part;
3. complementary body part;
4. source task ID, provider task ID, timestamps, and SHA-256 for every file;
5. source and output bounds, scale, origin, axis, and seam version;
6. a visible front, left, right, rear, top, and underside inspection.

Segmentation proves only geometry separation. It does not prove facial topology,
vertex order, blend shapes, visemes, blink, gaze, jaw/eye controls, expressions,
seam compatibility, rig compatibility, or animation readiness.

Hard rejects:

- any body other than the accepted source task;
- changed scale, origin, axis, proportions, or neck/head rest transforms;
- lost shoulders, clavicles, throat, jaw, ears, eyelids, lips, or mouth corners;
- open non-manifold seam, floating fragments, duplicate surfaces, fused eyes,
  fused teeth, or segmentation damage;
- hair, beard, helmet, clothing, jewelry, or permanent accessory fused to head;
- a separate portrait-only or dialogue-only head.

## H02 - Blender facial-control build

The neutral head remains the basis. Retopology must establish clean deformation
loops around both eyes, brows, nose wings, philtrum, upper and lower lips, mouth
corners, chin, jaw hinge, cheeks, and nasolabial region while preserving the
versioned neck seam and final ordered vertices.

Minimum controls:

- independent `Blink_L` and `Blink_R` with complete lid closure;
- gaze left/right/up/down and independent eye aim;
- jaw open/close with a stable hinge and no throat collapse;
- lip seal and `Viseme_MBP`;
- `Viseme_AA`, `Viseme_EE`, and `Viseme_OH`;
- smile and frown with independent mouth-corner motion;
- brow raise and brow lower;
- neutral talk blending without cheek, tooth, tongue, or lip penetration;
- topology-preserving `Age_Middle` and `Age_Elder` targets.

Teeth, tongue, and eyeballs should remain separate controlled meshes when the
source supports them. If the accepted source lacks usable mouth-interior geometry,
add a clean mouth bag, upper/lower teeth, and tongue in Blender; never expose a
void through the open mouth.

Every control must be exercised alone and in combinations at 0%, 50%, and 100%.
Test blink plus smile, jaw plus every viseme, age plus every viseme, age plus
blink, and gaze plus dialogue playback. A structural pass without a rendered
facial-motion review is not acceptance.

## H03 - adult age system

`YOUNG_ADULT` is the neutral basis. `MIDDLE_AGED` and `ELDER` are continuous
topology-compatible targets driven by one runtime age parameter. Geometry changes
may affect brow, eyelids, cheeks, nasolabial folds, lips, jawline, and neck, but
must preserve likeness, seam, eye placement, dental fit, visemes, and expressions.

Age-specific detail belongs primarily in material layers: wrinkle normal,
micro-normal, spot/freckle mask, roughness variation, subtle subsurface change,
and hair/facial-hair greying. Do not bake a fixed skin tone or fixed hair color
into an age preset.

## H04 - modular hairstyle set

Create seven separate production assets fitted to this exact head:

| ID | Runtime mesh name | Silhouette contract |
| --- | --- | --- |
| shaved-buzzed | `SK_Hair_Buzzed` or no visible volume | clean close crown, visible scalp, never a helmet shell |
| cropped | `SK_Hair_Cropped` | short layered cut clear of ears, collar, and brow |
| parted | `SK_Hair_Parted` | controlled side part with readable strand flow |
| curly-coiled | `SK_Hair_CurlyCoiled` | compact natural coils with full scalp coverage |
| long | `SK_Hair_Long` | shoulder-length silhouette with face and weapon clearance |
| tied-back | `SK_Hair_TiedBack` | secured tail/bun clear of neck seam and back sockets |
| braided | `SK_Hair_Braided` | readable braids with restrained game-ready strand count |

The seven production choices are `shaved-buzzed`, `cropped`, `parted`,
`curly-coiled`, `long`, `tied-back`, and `braided`. The first choice may use no
visible volume for the shaved setting and a close mesh or stubble material for
the buzzed setting without becoming an eighth silhouette family.

Each visible style must have a neutral grayscale/tintable hair material, defined
scalp coverage, head-bone attachment or validated hair rig, collision envelope,
LOD chain, and transparent-card policy if cards are used. Test full head rotation,
jaw motion, blink, all age targets, idle, run, jump, death, and every back/shoulder
weapon socket. Reject scalp holes, face obstruction, neck penetration, rigid
helmet reading, floating roots, uncontrolled alpha noise, or silhouette collapse.

## H05 - modular facial-hair set

Create separate `stubble`, `moustache`, `goatee`, `short-beard`, and `full-beard`
assets, plus the empty clean-shaven state. Runtime mesh names are:

- `SK_FacialHair_Stubble`
- `SK_FacialHair_Moustache`
- `SK_FacialHair_Goatee`
- `SK_FacialHair_ShortBeard`
- `SK_FacialHair_FullBeard`

All facial hair follows jaw, lips, cheeks, smile/frown, visemes, and age targets
without hiding lip readability. Hair color and greying are runtime material
parameters shared with hairstyles but independently adjustable when a design
requires it. Reject lip penetration, floating moustaches, beard/neck intersections,
mouth obstruction, or a beard rigidly weighted only to the head when jaw motion
requires deformation.

## H06 - materials and performance

- Keep source 8K textures as authoring masters only. Runtime selects platform and
  distance appropriate 1K/2K/4K derivatives; 8K is not the default gameplay map.
- Skin tone is a material parameter over preserved albedo detail, not a flat color
  replacement. Validate light, fair, golden, olive, copper, brown, and deep tones.
- Dark-elf bluish-white tone is Elf-only and must not appear in the Human creator.
- Hair color, brow color, facial-hair color, and greying are material parameters,
  not duplicated geometry.
- Record triangles, vertices, materials, textures, draw calls, bounds, LODs, and
  source/output hashes for every module.

## Acceptance evidence

No asset enters runtime merely because it imports. Produce:

1. multi-angle neutral head proof;
2. facial-control contact sheet and normal-speed dialogue video;
3. Young Adult, Middle-Aged, and Elder proof on the same vertex order;
4. one-by-one hairstyle and facial-hair turntables;
5. light-to-deep Human skin-tone proof and hair-color/greying proof;
6. creator, world, NPC, dialogue, quest, portrait, and paper-doll screenshots;
7. animation stress proof with no penetrations or detached modules;
8. provenance, hashes, topology, seam, scale, rig, material, and performance report;
9. real Breach V2 runtime validation with no failed asset requests or console errors.

Paid retries, substitutions, and additional generations remain fail-closed until
their exact visible provider cost and owner approval are recorded.
