# Issue #487 Human Grounded Get-Up Reference Packet

This packet governs the single generic Human recovery that may satisfy both
`reaction.spell.get-up` and the missing get-up half of
`locomotion.knockdown.get-up`. The accepted Spell Impact terminal pose is the
start boundary authority. Its natural standing first pose is the recovery-end
authority, translated to the actor's landed position.

## Real-person references

| ID | Source | Reviewed range | Mechanics retained |
|---|---|---|---|
| `roger-gracie-technical-stand-up` | Roger Gracie Academy, [Technical stand-up solo drill](https://www.youtube.com/watch?v=Ggnz7_9uQkY) | `00:00-end`, complete demonstration | Establish a side post and base foot, raise the hips, thread the free leg under the body, keep the torso oriented toward the threat, and settle into a balanced stance. |
| `infighting-technical-stand-up` | InFighting head instructor Ritchie Yip, [BJJ Basics: How to Do a Technical Stand Up](https://www.infighting.ca/bjj-basics-how-to-do-a-technical-stand-up/) and its embedded real-person video | `00:00-end`, complete embedded demonstration | Post the hand, use the opposite planted foot, lift the hip, bring the free leg underneath, then stand without leading with the face. |
| `open-bjj-technical-stand-up` | [Open BJJ Technical Stand-Up](https://www.open-bjj.com/transitions/technical-stand-up) | Written full-sequence reference, no timestamp | Create space, keep eyes and chest oriented toward the threat, post opposite the base foot, elevate hips, swing the free leg through, and finish balanced with hands ready. |
| `floor-to-stand-biomechanics` | [The Biomechanics of Healthy Older Adults Rising from the Floor Independently](https://pmc.ncbi.nlm.nih.gov/articles/PMC9958992/) | Conventional-strategy description and motion-analysis discussion | A believable floor recovery progresses through side support, hand support, knees or half-kneeling, forward center-of-mass transfer, and controlled upright extension. |

## Authored mechanics contract

1. Begin on the exact accepted nonterminal Spell Impact terminal pose; do not
   add a T-pose, idle, death hold, or teleport before the recovery begins.
2. Show a brief responsive settle, side roll, elbow/hand post, opposite foot
   plant, hip lift, leg thread, low stagger or half-kneel, then controlled rise.
3. The posting hand and planted foot carry visible load. The head stays clear
   of the floor and the free hand protects the face/upper chest while rising.
4. Transfer the pelvis and center of mass over the support polygon before the
   knees and hips extend. Do not pop vertically from the back or float.
5. Keep contact limbs planted during their declared support intervals; reject
   sliding feet, penetrating hands, broken wrists, crossed legs, or limb snaps.
6. End at the accepted natural standing boundary at the landed world position.
   The clip contains no spell gesture, VFX cue, death reversal, or automatic
   follow-on animation.

## Production and review gates

- The zero-action 65-bone accepted Human rest rig remains skeleton authority.
- Interior frames are newly authored dense per-frame Blender motion. Only the
  accepted knockdown terminal and standing boundary poses may be matched.
- Source action reversal, time reversal, splicing, overlay, relabeling, and
  copied interior motion are forbidden.
- Fresh GLB re-import must prove one action, 65 bones, root
  `mixamorig:Hips`, no meshes/cameras/lights, and unchanged dense trajectories.
- Ground placement and floor validation must use only the evaluated vertices of
  the visible Human mesh that carry canonical-skeleton deformation weights.
  Static or unweighted importer helpers such as `Icosphere` are never body-bound
  authority and must be listed as excluded evidence.
- Normal-speed gameplay, front, side, and rear evidence must show the complete
  action with the full body, a distinct floor plane, and contact shadows visible.
  The preview renderer must place that floor from the same weighted visible-body
  lower bound used by the framewise validator; an invisible floor or helper-based
  lower bound is an automatic rejection.
- Candidate approval is not runtime acceptance. BREACH-V2 must prove exact
  start/mid/end floor contact on the real Human pilot before installation.
