# SoulDrifter Custom Animation Dual-Pipeline Bakeoff

## Owner-locked rule

For every required animation that cannot be accepted directly from the verified Tripo preset/custom-motion lane, SoulDrifter produces **two independent candidates**:

1. **Houdini KineFX candidate**
2. **Blender animation candidate**

The candidates are compared under the same brief, rig, timing, camera, export, and runtime conditions. An independent AI reviewer scores them blind, the owner reviews the side-by-side evidence, and the accepted winner becomes the canonical runtime clip.

The project records every result so the pipeline can eventually route work by evidence rather than opinion. A weaker pipeline may be retired globally or by animation category only after enough representative bakeoffs and explicit owner approval.

This policy applies to:

- Tier 3 bespoke custom motions;
- Tier 2 Tripo-preset-derived motions when substantial constraint, interaction, weapon, or silhouette work is required;
- class-specific attacks/casts not adequately covered by Tripo;
- constrained interactions such as chained bodies, doors, levers, climbing, carrying, pushing, pulling, mounting, swimming transitions, and special deaths;
- boss/monster signature motions;
- any motion the owner explicitly marks for A/B comparison.

It does **not** require duplicate production for a Tripo preset that already passes the complete acceptance gate unchanged.

---

# Common-input fairness contract

Both lanes must start from the same locked inputs:

- accepted source model and canonical rig version;
- same Tripo rig/skin result when Tripo performs rigging;
- same source Tripo preset, mocap, video reference, pose reference, or motion brief;
- same animation duration target and FPS;
- same root-motion policy;
- same hand/foot/weapon/chain/prop constraints;
- same required contact, VFX, SFX, and gameplay markers;
- same body profile, weapon, props, and environment fixtures;
- same Three.js export and compression contract;
- same test scene, lighting, cameras, and renderer;
- same delivery deadline and allowed automation/manual-touch budget.

A candidate may not receive easier requirements merely because its DCC pipeline is different.

Each lane must record every deviation from the common input.

---

# Independent production lanes

## Lane H — Houdini KineFX

Use the verified Houdini production license lane.

Typical tools:

- KineFX skeleton and motion clips;
- Rig Pose / Full Body IK / IK Chains;
- MotionClip and MotionClip Evaluate;
- CHOPs where useful;
- constraints and parent/point transforms;
- ragdoll/secondary-motion helpers where approved;
- Python/HOM for deterministic authoring and batch export;
- ROP/FBX/glTF/VAT export as required by the runtime contract.

Houdini candidate ID format:

`<animationId>__HFX__v###`

## Lane B — Blender

Use the verified Blender production environment.

Typical tools:

- armature constraints;
- IK/FK and Child Of constraints;
- Action Editor and NLA;
- pose libraries;
- graph-editor cleanup;
- Python automation;
- optional approved rig/control helpers;
- GLB/FBX export with the same runtime bone/action contract.

Blender candidate ID format:

`<animationId>__BLD__v###`

## Isolation rule

The two producer agents should not copy the other lane's first-pass keyframes or scoring notes before both first candidates are frozen. They may use the same locked brief and source motion. This reduces convergence and makes the comparison meaningful.

After the first blind review, the owner may authorize one corrective round for both candidates using the same feedback.

---

# Required candidate package

Each lane delivers:

1. editable source scene/file;
2. deterministic build/export script where practical;
3. baked animation on the canonical runtime skeleton;
4. uncompressed review GLB/FBX;
5. optimized runtime GLB;
6. action metadata and event markers;
7. normal-speed review video;
8. 4x slow-motion review video;
9. front, side, three-quarter, and gameplay-camera views;
10. contact/anticipation/follow-through contact sheet;
11. automated validation report;
12. Three.js runtime capture on the real GPU;
13. production time, retries, interventions, failures, file size, and performance metrics;
14. provenance and rollback record.

---

# Automated admissibility gate

Before blind visual scoring, each candidate must pass or explicitly report:

- canonical skeleton/bone-map validation;
- no missing, duplicated, or renamed required bones;
- finite transforms/no NaN or invalid curves;
- expected duration and frame rate;
- root-motion contract;
- foot-grounding/foot-slide measurements where relevant;
- hand/weapon/chain/prop attachment tolerance;
- joint-limit and hyperextension checks;
- self-intersection and equipment-clipping checks;
- start/end loop delta when looping;
- contact-marker timing;
- animation-state transition entry/exit pose;
- GLB load and action-name proof;
- Three.js playback;
- texture/material/runtime compatibility;
- real-GPU frame cost and memory impact;
- no browser console/shader/asset errors.

A failed hard gate does not automatically eliminate the candidate; it returns to that lane for one bounded repair pass. A candidate that still fails a critical gate cannot win the shipping selection.

---

# Blind visual comparison

## Labeling

A coordinator that did not produce either candidate randomizes the labels:

- Candidate A
- Candidate B

The reviewer does not see `HFX` or `BLD` until scoring is locked.

## AI reviewer

An independent AI verifier scores each category from 0–10 and gives evidence-based notes:

| Category | Weight |
| --- | ---: |
| Required silhouette / intent match | 18% |
| Gameplay-camera readability | 14% |
| Natural body mechanics | 12% |
| Constraint/contact integrity | 14% |
| Deformation/anatomy quality | 10% |
| Timing, anticipation, contact, recovery | 10% |
| Loop/transition quality | 6% |
| SoulDrifter style/personality fit | 6% |
| Runtime performance/file efficiency | 5% |
| Automation reliability/reproducibility | 5% |

The AI reviewer returns:

- weighted score;
- blocker defects;
- comparative strengths;
- recommended winner, tie, or rework;
- confidence level.

The AI score is advisory. It cannot override a failed critical technical gate or the owner's final creative decision.

## Owner review

The owner receives:

- side-by-side normal-speed videos;
- synchronized slow-motion videos;
- gameplay-camera capture;
- optional close-up/deformation view;
- blinded A/B labels;
- concise AI scorecard;
- production/performance summary.

Owner verdict values:

- `A_WINS`
- `B_WINS`
- `TIE_KEEP_BOTH`
- `CATEGORY_SPLIT`
- `REWORK_BOTH`
- `REJECT_REQUIRE_NEW_ROUTE`

After the verdict is stored, the labels are unblinded and the winning pipeline is recorded.

---

# Winner integration

The accepted winner becomes:

- the canonical runtime clip for that animation ID;
- the source of authoritative contact/VFX/SFX/gameplay markers;
- the clip used for real-time and turn-based combat where applicable;
- the retained editable source and deterministic rebuild path.

The losing candidate is not deleted. Preserve:

- source scene;
- export;
- review evidence;
- defects;
- reusable scripts/rig controls;
- reason it lost.

A losing technique may still be useful for another animation category.

---

# Data collection

Every bakeoff writes one machine-readable record containing:

- animation ID and category;
- complexity/constraint tags;
- canonical rig/model version;
- Tripo preset/custom source used, if any;
- common brief hash;
- Houdini version/license/build;
- Blender version/add-ons;
- candidate source/export hashes;
- automated gate results;
- AI blind scores;
- owner blind verdict;
- revealed winner;
- production duration;
- number of agent iterations;
- manual interventions;
- crashes/export failures;
- file size and runtime cost;
- repair/rework count;
- final acceptance status;
- reusable lessons.

Use:

`templates/animation-bakeoff-record.template.json`

Aggregate results live in:

`.agent-state/animation-bakeoffs/registry.json`

or the current project-approved equivalent.

---

# Review checkpoints and retirement policy

The orchestrator generates aggregate reports after:

- 10 completed custom-animation bakeoffs;
- 25 completed bakeoffs;
- 50 completed bakeoffs;
- every additional 50 thereafter;
- any owner-requested checkpoint.

At 10 samples, the system may recommend provisional category routing but should normally retain both lanes.

A global retirement proposal should normally require at least:

- 25 representative completed bakeoffs;
- coverage across at least 4 motion categories;
- at least 5 constrained/interaction animations;
- one pipeline winning at least 75% of owner-decided bakeoffs;
- no critical category in which the proposed retired lane remains materially superior;
- at least 20% better median production time **or** materially lower failure/rework rate for the winning lane;
- no unacceptable loss in runtime quality/performance;
- explicit owner approval.

The data may instead justify category-specific routing, for example:

- Houdini KineFX preferred for constrained interactions, procedural variation, and physics-assisted motion;
- Blender preferred for expressive hand-keyed combat or facial/body acting;
- both retained for boss/signature motions.

No pipeline retires itself automatically. The orchestrator submits a retirement proposal with the full evidence, and the owner approves or rejects it.

---

# Cost/time discipline

Running both lanes doubles some authoring effort, so the system must capture the value of the experiment rather than hide it.

Rules:

- use the same accepted Tripo rig and base motion for both lanes where possible;
- do not pay twice for identical provider generation/rigging when both DCC lanes can consume the same download;
- run DCC authoring locally unless a separate paid operation is approved;
- stop a lane early only for a proven unrecoverable technical incompatibility and record the failure as data;
- do not spend provider credits on concept images when the active LLM image generator is available;
- preserve scripts and control rigs so subsequent bakeoffs become cheaper.

---

# Chained-skeleton pilot application

The chained-skeleton struggle loop is the first required dual-pipeline bakeoff:

```text
One accepted Tripo skeleton model + rig
One locked motion brief and wall/chain socket layout
        |
        +--> Houdini KineFX constrained struggle candidate
        |
        +--> Blender constrained struggle candidate
        |
        v
Blind AI comparison -> owner A/B review -> winner integrated
```

Both candidates must:

- constrain wrists to wall-chain sockets;
- preserve chain/body separation;
- maintain believable shoulder/elbow limits;
- include torso/head/jaw struggle motion;
- loop cleanly for ambient playback;
- expose identical chain-rattle and loop markers;
- play in the same Three.js fixture scene;
- pass the same real-GPU and placement tests.

---

# Completion

A custom animation is not complete until:

- both required candidates exist or one lane has a documented unrecoverable blocker;
- both pass the admissibility gate or their failures are recorded;
- blind AI review is complete;
- owner verdict is recorded;
- winner is integrated and independently verified;
- experiment registry is updated;
- loser/source evidence is preserved;
- producer stops at `IMPLEMENTED_UNVERIFIED` until the independent verifier passes the winner.