# Issue 456 Quadruped Motion Reference Matrix

Status: reference selection and observation in progress; all animation v1 outputs are owner-rejected and ineligible for integration.

This matrix is the binding motion-reference gate for the Heartvale wildlife and outdoor-creature pack. Search results alone do not approve an action. Before an action is authored, its selected reference must be watched, the observed time range and body mechanics must be recorded here, and the animation must pass a side-profile whole-body review.

## Acceptance rules

- Every export is creature geometry only. No platform, pedestal, floor slab, ground patch, root mat, shadow catcher, light, camera, or scenery.
- Rest and idle are physical actions: breathing, weight shifts, head and ear tracking, jaw or muzzle motion, and tail response must affect the connected body.
- Walk, trot, run, gallop, bound, and leap use the species-appropriate footfall pattern and move the center of mass, scapulae, shoulder mass, chest, spine, pelvis, and hip mass.
- Feeding is not a rotating head bone. The neck lowers from its base, the shoulder/chest posture changes, the muzzle searches or sweeps, the jaw works, and the animal rebalances or steps.
- Attacks require anticipation, whole-body drive, contact, and recovery. A foreleg swipe or bite against a frozen torso fails.
- Feet must remain planted during stance. Sliding, popping, limb separation, collapsing joints, and floating fail.
- A structural export or round-trip test never substitutes for motion-quality review.

## Reference families

### Equine

Assets: `horse`

Selected locomotion references:

- [HORSE GAITS PART 01 - WALK CYCLE ANALYSIS](https://www.youtube.com/watch?v=ZwKdHJdCMgg), Horses and Us.
- [HORSE GAITS PART 02 - TROT CYCLE ANALYSIS](https://www.youtube.com/watch?v=IxxamiRscyY), Horses and Us.
- [Galloping Horse in Super Slow Motion](https://www.youtube.com/watch?v=OcD1_jvhc_g), Discover Magazine.

Selected feeding reference:

- [A horse eats grass](https://www.youtube.com/watch?v=qybSU1vdGXc), Jubilee the Horse.

Observed so far:

- Discover Magazine gallop, sampled at `00:09.4` of the 24.5-second clip: hindquarters drive forward under the pelvis; the chest and withers travel with the forelimb catch; the neck and head counterbalance the body; the fetlocks visibly compress under load. The entire trunk translates and changes pitch through the stride.

Required action behavior:

- `idle`: asymmetric hind-leg rest, ribcage breathing, ear flick, small head check, tail response.
- `walk`: four-beat footfalls, pelvic roll, scapular slide, modest head-neck nod, planted stance feet.
- `run/gallop`: full spinal flexion/extension, hind-leg gather and drive, forelimb reach and catch, suspension, center-of-mass arc.
- `graze/eat`: neck lowers from withers through cervical chain, muzzle sweeps and advances, jaw chews, one forefoot steps or weight shifts as reach changes.
- `rear_kick`: forehand braces, pelvis lifts and tucks, both hind limbs drive from the hip, spine and tail counterbalance, recovery returns weight to all four feet.

### Bovine

Assets: `cow`

Selected references:

- [Cow walking slow motion](https://www.youtube.com/watch?v=F28HrxgTSvU), Peter Falkingham.
- [Slow Motion Video on How a Cow eats Grass with tongue and the Sound of cows grazing](https://www.youtube.com/watch?v=ZwdyMufH--4), Ang Gru.
- [cows chewing the cud](https://www.youtube.com/watch?v=Uupn_8OOSfs), The Funky Farmer.

Observation focus:

- Heavy barrel and shoulder mass continue moving through each step; the pelvis shifts laterally and vertically rather than remaining fixed.
- Grazing combines neck-base lowering, tongue/muzzle pull, slow lateral search, jaw rotation, foreleg rebalancing, and occasional step-forward reach.
- Cud chewing uses restrained head motion with continuous asymmetric jaw work and small ear/eye tracking.

### Cervid

Assets: `deer`, `stag`

Selected references:

- [Slow motion shot of young male deer walking along edge of a field](https://www.youtube.com/watch?v=UVWyjPPQNtQ), Christopher Michael Dortch.
- [5 Whitetail Deer Running and Leaping - Slow Motion](https://www.youtube.com/watch?v=hedZ9WIueck), Rural Fringe Fauna.
- [Scottish Highlands Red Deer running - Slow motion 4K](https://www.youtube.com/watch?v=AOdS3U42iKE), iKarSTOCK.

Observation focus:

- Quiet walk uses long light distal-limb arcs, small torso rise/fall, pelvic transfer, and alert head/ear stabilization.
- Run and bound use hindquarter compression, simultaneous or near-simultaneous hind drive, suspended trunk, forelimb reach, and elastic landing through shoulder and spine.
- Grazing lowers the head through the long neck while the forequarters widen or step; alert recovery raises head, neck, ears, chest, and weight together.
- Stag gore must originate in a planted hindquarter drive and neck/chest mass, never antlers or head alone.

### Canid

Assets: `dog`, `wolf`, `fox`

Selected references:

- [Analysis of 3 Dogs' Gaits - Walk, Trot, Transverse Gallop](https://www.youtube.com/watch?v=Dj9y8K_l6SI), Courtney's K9 Crew.
- [Video Reference Dog Gaits: Mechanics and Transitioning from Gallop to Trot](https://www.youtube.com/watch?v=tKlq1rlwmh4), SquashnStretch.net.
- [Arctic Wolves Walking 2 - Slow Motion Animation Reference](https://www.youtube.com/watch?v=TQXzgs_8K_c), SloMo Ref.
- [FREE FOOTAGE - Wolf Running Slow Motion](https://www.youtube.com/watch?v=B_9VFVTjVNs), TheFreeStockDude.

Observation focus:

- Walk is four-beat with visible scapular travel; trot is diagonal two-beat; transverse gallop adds spinal flexion/extension and suspension.
- Idle/sniff moves nose, skull, cervical chain, shoulder line, and stance weight together. Ears and tail react on different timing.
- Wolf threat lowers and stiffens the whole front half while weight stays ready over the hindquarters.
- Fox pounce compresses low, lifts through both hind legs and spine, reaches with the forequarters, then lands with chest/shoulder absorption.
- Bite begins with hind-leg and torso drive; the jaw is the final link, not the whole attack.

### Feline and big-cat predator

Assets: `cat`, `lion`, `lioness`, `leopard`, `duskcoat`, `forkstripe-orange`, `forkstripe-violet`, `forkstripe-bristled`

Selected references:

- [Leopard Slow motion walk](https://www.youtube.com/watch?v=OYAyGEhiIqo), Wild Life.
- [Silky Stalking](https://www.youtube.com/watch?v=9tfZ_ffw3AE), CedarCoveTigerPark.
- [Amazing Slow Motion Leaping Cat](https://www.youtube.com/watch?v=Sc9CBXYeCAo), whiskasnetwork.
- [Cheetah - Super Slow Motion HD](https://www.youtube.com/watch?v=B4nd9GF1dRg), geniemist.

Observation focus:

- Walk and stalk show pronounced scapular slide, rolling shoulder mass, a flexible spine, quiet head stabilization, soft paw placement, and tail counterbalance.
- Pounce compresses pelvis and hind legs before launch; the spine extends through takeoff; forelegs reach before landing and chest/shoulders absorb contact.
- Claw and swipe actions start with planted hindquarters and torso rotation, continue through chest and scapula, and recover the center of mass before looping.
- Lion and lioness keep heavier chest/pelvis timing than leopard or village cat; Duskcoat and Forkstripes inherit big-cat mechanics rather than supernatural floating motion.

### Caprine and camelid-like upland grazer

Assets: `upland-alpaca-goat`

Selected references:

- [Alpaca walking over Pressure mat slow motion](https://www.youtube.com/watch?v=ZYHpIKRbeT8), Peter Falkingham.
- [Mountain goat greets me up at the summit of Mt. Ellinor](https://www.youtube.com/watch?v=mUHd0PqWQ9Y), Kevindication.
- [Goatscaping before and after - Goat land clearing](https://www.youtube.com/watch?v=SeZuONgA3Js), Barns and Brews.

Observation focus:

- Compact steps preserve an upright neck while the pelvis and shoulder line still transfer weight.
- Graze/browse uses neck-base lowering or reaching, muzzle selection, jaw work, and small repositioning steps.
- Hop gathers all four limbs under the body and lifts the torso; headbutt plants the hind legs, lowers chest/neck, drives forward, contacts, and recoils.

### Boar

Assets: `thornback-boar`

Selected references:

- [Boar Walk Side View](https://www.youtube.com/watch?v=HSTAI8buqEo), Osik.
- [Wild boar charge while fishing](https://www.youtube.com/watch?v=HN2meVVckrA), Justin Klee.
- [One Tough Warthog - Deadly Instincts](https://www.youtube.com/watch?v=Oyhk6kRAJW0), Nat Geo Animals.

Observation focus:

- Low heavy torso moves as a mass over short legs; shoulders lead, pelvis follows with restrained spine motion.
- Rooting/feeding pushes from neck and shoulders while forefeet brace and reposition.
- Charge lowers the head and chest, drives from hindquarters, keeps rapid short footfalls under the mass, then recovers instead of snapping back to idle.

### Low burrower

Assets: `root-gnawer`, `loamling`

Selected references:

- [Badger running in slow motion on a green grass land](https://www.youtube.com/watch?v=JXIcW1gliW8), Debra Angel Photography, Media and Tutorials.
- [Dirty badger having a quick dig](https://www.youtube.com/watch?v=DZvDsbnUsRM), UK Wildlife Cam.
- [A Week in the life of a Honey Badger - Underdogs](https://www.youtube.com/watch?v=wTIsc4bqh-A), National Geographic UK.

Observation focus:

- Low body rolls and translates over short limbs; shoulders and hips must visibly carry the torso.
- Dig braces the hindquarters and alternates forelimbs through shoulders and chest while the head follows the excavation and the torso rocks with each stroke.
- Loamling uses the same low-body mechanics with heavier timing; material identity does not justify a rigid or floating torso.

### Otter-like low elemental

Assets: `rillwisp`

Selected references:

- [Slo-Motion Fun With Giant River Otters](https://www.youtube.com/watch?v=k1ydAoSxXEk), LA Zoo.
- [Otter jogging playfully in slow motion](https://www.youtube.com/watch?v=f26-TjFnGnU), seemore.

Observation focus:

- Land motion is low, flexible, and bounding, with spine wave, close-set limb timing, head stabilization, and a long tail balancing turns and acceleration.
- Idle combines breathing, low head tracking, forepaw adjustments, and tail settling.
- Rillwave lunge must remain a solid quadruped action: compress, hind drive, spine extension, forelimb reach, landing, and recovery, without detached or floating body parts.

## Review sequence

For every asset, review in this order:

1. Platform-free static side and front proof.
2. Rest/idle and head/ear/tail tracking.
3. Ordinary walk at real-time speed, then slow motion with foot-plant markers.
4. Species behavior: graze/eat/chew, sniff, groom, root, dig, or browse.
5. Faster gait: trot, run, gallop, bound, hop, or leap.
6. Combat actions only for creatures expected to fight.
7. Hit and grounded death only after locomotion and weight transfer pass.

No asset is marked complete until all required actions pass whole-body, planted-foot, silhouette, and no-platform review.
