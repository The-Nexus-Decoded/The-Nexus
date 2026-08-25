y.

Do not maintain two unrelated enemy-brain implementations.

---

# Pet AI

## Real-time
Autocast/command logic runs continuously.

## Turn-based
Autocast/command logic is evaluated on pet action opportunities.

Manual pet commands can be queued/selected by the player.

---

# Cooldowns

All skills use:
- `cooldownMs`
- windup
- active/contact marker
- recovery
- resource cost
- status prerequisites

Both modes use the same values.

No permanent "turn cooldown" duplicate table.

---

# Mode switching

Recommended production rule:
- player chooses preferred mode in settings / before combat;
- do not allow free mid-animation switching;
- if mid-encounter switching is supported later, only permit at a safe simulation boundary.

Default:
`real-time`.

---

# Multiplayer boundary

For online play, one encounter should use one authoritative scheduling mode.

Do not let two players in the same shared combat instance experience contradictory time flow.

Possible long-term approaches:
- real-time only for shared multiplayer encounters;
- turn-based for solo/private instances;
- party vote/private tactical instances.

This is a later product decision.

For the current First Breach/Heartvale implementation:
**real-time remains authoritative default**.

---

# Verification

Every skill/combat feature must pass both modes unless explicitly marked mode-specific.

Required tests:
- same damage;
- same resource cost;
- same cooldown;
- same status rules;
- same chain logic;
- same hit/contact marker;
- same pet ability contract;
- same death outcome;
- same loot result.

Only scheduler/pacing differs.
```

---

## `source/examples/ISSUE_448_PIPELINE.md`

SHA-256: `4cf10b57e9a7943ee8ec397781df54313f1a48dcfe3fa7269b7123b3a2398bf6`

```markdown
# Issue #448 — How the new harness handles the character pipeline

## Expected base-body matrix

The harness computes the expected rows independently:

`4 ancestries × 2 presentations × 3 body profiles = 24 base bodies`

The base body is not a class body.

Then separately:
- 9 modular Level-1 calling clothing/equipment presentations;
- separate weapon/off-hand packages;
- modular hair/head/accessories;
- named NPC assemblies;
- creature families.

## Current failure this prevents

If the manifest contains 12 body rows, a test that only validates those 12 can still pass.
The matrix auditor instead compares `actual IDs` against the independent 24-row expectation and prints every missing row.

## Base-body QA

Every body row must prove:
- correct ancestry/presentation/profile;
- consistent neutral pose;
- no pedestal/stand;
- no fused class armor/clothing;
- no fused weapon/shield/sheath;
- only approved neutral coverage;
- correct topology/scale/origin;
- rig eligibility;
- final rig/deformation proof;
- runtime proof.

## Rigging modes

### First Breach humanoids
Mixamo lane.

### Current creatures
Local creature rig.

### Future
Tripo can replace provider stage after approval without changing downstream contract.
```

---

## `source/examples/ISSUE_451_PIPELINE.md`

SHA-256: `1fbb3c81a5c169b9dbfcc28d9d0cafd89e6d2af03bda081b34cf5877c246a9de`

```markdown
# Issue #451 — How the new harness prevents the orphan-door failure

A requirement like "two route doors" is never represented as two mesh objects.

Each portal is a connectivity edge.

Required chain:

`Room A shell`
→ `aperture`
→ `frame/socket`
→ `door/gate`
→ `threshold collision state`
→ `corridor geometry`
→ `corridor nav`
→ `Room B socket`
→ `Room B aperture`
→ `real player traversal`
→ `fresh visual proof`
→ `independent verifier`

If any step fails, the edge is BLOCKED.

The verifier explicitly searches for:
- gate in front of intact wall;
- corridor that visually ends early;
- nav data that says connected while geometry blocks it;
- adjacent prop blocking player capsule;
- camera warp that did not move avatar;
- one-way traversal;
- closed/open collision mismatch.
```

---

## `source/examples/issue-448-expected-body-matrix.json`

SHA-256: `bea63b9bfb003b937915dce3953237597e5403199160c9efebe671316f725c3d`

```json
{
  "schemaVersion": 1,
  "issue": 448,
  "expectedCount": 24,
  "rows": [
    {
      "id": "body-human-masculine-slim",
      "ancestry": "human",
      "presentation": "masculine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-human-masculine-athletic",
      "ancestry": "human",
      "presentation": "masculine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-human-masculine-heavy",
      "ancestry": "human",
      "presentation": "masculine",
      "profile": "heavy",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-human-feminine-slim",
      "ancestry": "human",
      "presentation": "feminine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-human-feminine-athletic",
      "ancestry": "human",
      "presentation": "feminine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-human-feminine-heavy",
      "ancestry": "human",
      "presentation": "feminine",
      "profile": "heavy",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-elf-masculine-slim",
      "ancestry": "elf",
      "presentation": "masculine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-elf-masculine-athletic",
      "ancestry": "elf",
      "presentation": "masculine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-elf-masculine-heavy",
      "ancestry": "elf",
      "presentation": "masculine",
      "profile": "heavy",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-elf-feminine-slim",
      "ancestry": "elf",
      "presentation": "feminine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-elf-feminine-athletic",
      "ancestry": "elf",
      "presentation": "feminine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-elf-feminine-heavy",
      "ancestry": "elf",
      "presentation": "feminine",
      "profile": "heavy",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-dwarf-masculine-slim",
      "ancestry": "dwarf",
      "presentation": "masculine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-dwarf-masculine-athletic",
      "ancestry": "dwarf",
      "presentation": "masculine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-dwarf-masculine-heavy",
      "ancestry": "dwarf",
      "presentation": "masculine",
      "profile": "heavy",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-dwarf-feminine-slim",
      "ancestry": "dwarf",
      "presentation": "feminine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-dwarf-feminine-athletic",
      "ancestry": "dwarf",
      "presentation": "feminine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-dwarf-feminine-heavy",
      "ancestry": "dwarf",
      "presentation": "feminine",
      "profile": "heavy",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-halfling-masculine-slim",
      "ancestry": "halfling",
      "presentation": "masculine",
      "profile": "slim",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-halfling-masculine-athletic",
      "ancestry": "halfling",
      "presentation": "masculine",
      "profile": "athletic",
      "sourceImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-halfling-masculine-heavy",
      "ancestry": "halfling",
      "presentation": "masculine",
      "profile": "heavy",
      "sourc