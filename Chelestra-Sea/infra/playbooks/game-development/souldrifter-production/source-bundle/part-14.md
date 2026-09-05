ipline/SKILL.md`

SHA-256: `3178f98af241e2f9ebacbabff3d93e336d98d48437aead050ad1822790f5e918`

```markdown
---
name: branch-worktree-discipline
description: Enforce SoulDrifter one-ticket-one-branch-one-H-drive-worktree rules.
---
# Branch / Worktree Skill

- H: drive only.
- One branch + one worktree per ticket.
- Never fresh-clone the giant repo for a ticket.
- Never commit to another ticket's branch.
- Commit early/often.
- Never deploy without owner authorization.
```

---

## `source/skills/completion-ledger/SKILL.md`

SHA-256: `3b3dd32ac2549de79cce6051bc3efd53ec70dc163f4edb727e440aeca1c4e77f`

```markdown
---
name: completion-ledger
description: Maintain machine-readable per-requirement state, evidence, dependencies, producer and verifier identities for SoulDrifter tickets.
---
# Completion Ledger Skill

Every requirement row contains:
- id;
- description;
- priority;
- dependencies;
- producer;
- status;
- automated_checks;
- runtime_checks;
- visual_evidence;
- verifier;
- verification;
- blockers.

Producer may set `IMPLEMENTED_UNVERIFIED`.
Only independent verifier may set `VERIFIED`.
```

---

## `source/skills/concurrent-work-claims/SKILL.md`

SHA-256: `8ce028e249b72fab86ace2c3840b37cf96e12467d28737c5bfb551f3d210d5dd`

```markdown
---
name: concurrent-work-claims
description: Prevent multiple LLM chats from racing on conflicting SoulDrifter branches/files.
---

One worker = one issue + one worktree + one branch.

Record high-conflict path/subsystem claims. If claims overlap, serialize or designate an integration owner.
```

---

## `source/skills/current-phase-scope/SKILL.md`

SHA-256: `2d93515cf7eb03538d059e2504c3f8845f160c1a0868a981d0ffb9f5561ea4a1`

```markdown
---
name: current-phase-scope
description: Enforce the current low-level First Breach/Heartvale design boundary and prevent late-game Sartan, Patryn, Labyrinth, rune, or possibility systems from leaking into starter content.
---

# Current Phase Scope

Current target:
**First Breach + Heartvale + Levels 1–9 foundation**

Allowed:
- mortal weapon technique
- simple class magic
- restrained low-tier VFX
- ordinary traversal/interactions
- grounded creature behavior
- basic wards/healing/binding/shaping
- class-appropriate limited necromancy

Deferred:
- Sartan high magic
- Patryn high magic
- rune systems
- possibility/probability manipulation
- Labyrinth combat systems
- Nexus/endgame combat
- ancient-power boss magic
- reality/realm-breaking effects

When researching source inspiration, ignore deferred systems for current skill design.
Do not “scale them down” unless the owner explicitly approves that adaptation.
```

---

## `source/skills/dual-combat-mode/SKILL.md`

SHA-256: `b38bc325df360818f6a5edf6d6bd2842a3ab9d884547c2c5202a455eb6f5137c`

```markdown
---
name: dual-combat-mode
description: Keep real-time as SoulDrifter's default combat mode while ensuring optional turn-based combat uses the same authoritative skills, cooldowns, resources, statuses, pet commands, and hit logic.
---

# Dual Combat Mode

## Default
`real-time`

## Optional
`turn-based`

## Architecture
One combat simulation.
Two schedulers.

Never create:
- separate skill definitions;
- separate damage tables;
- separate resource costs;
- separate cooldown values.

Real-time advances continuously.

Turn-based pauses during planning and advances the same combat clock through committed action resolution.

Every combat ticket must verify both modes unless explicitly scoped otherwise.
```

---

## `source/skills/evidence-gate/SKILL.md`

SHA-256: `81a4c21174007fbaabcc313fa54d3e78dd661418a2db7d8c666f224b3eb5120f`

```markdown
---
name: evidence-gate
description: Require fresh implementation, runtime and independent-review evidence before a SoulDrifter requirement can be marked verified.
---
# Evidence Gate Skill

Evidence must be:
- tied to current commit;
- relevant to exact requirement;
- fresh;
- reproducible;
- sufficient at both wide and close scale for visual work.

Coordinates/logs never substitute for visual proof.
Screenshots never substitute for actual traversal/interaction proof.
```

---

## `source/skills/flat-map-registry/SKILL.md`

SHA-256: `66607e09bb1eb5a2f62eb39a7428e402f78a2b41b6649db2f59597d3fc869f2a`

```markdown
---
name: flat-map-registry
description: Enforce SoulDrifter flat-map-first and measured registry discipline for dungeons and zones.
---
# Flat Map / Registry Skill

The flat map is design authority for spatial content.
Registry values derive from the map and world frame.
Randomization selects from documented legal content; it does not invent undocumented content.
Validate all required sockets, rooms, paths, pools, anchors, and exits.
```

---

## `source/skills/handoff-resume/SKILL.md`

SHA-256: `b31f80debde13df4a18c76387fcae7db9a8c4f6636d06fd567bb66851cbfcff4`

```markdown
---
name: handoff-resume
description: Preserve exact long-running ticket state across agent/context limits and prevent restarted agents from redoing or forgetting work.
---
# Handoff / Resume Skill

Before ending:
- commit completed substeps;
- record current commit;
- record next requirement ID;
- record blockers;
- record test commands/results;
- record evidence locations;
- stop dev server.

On resume:
- read handoff first;
- validate git state;
- continue from next incomplete dependency.
```

---

## `source/skills/houdini-python/SKILL.md`

SHA-256: `880dcd608691f80b195d6f15674658a4eec1af9f184300b2f812b665fd684495`

```markdown
---
name: houdini-python
description: Drive Houdini through Python/HOM reproducibly for SoulDrifter geometry while preserving IDs, constraints and export metadata.
---
# Houdini Python Skill

Use Houdini as the procedural geometry executor, not as an uncontrolled design generator.
Inputs are structured specs/registries.
Outputs preserve semantic IDs and validation metadata.
Save scripts and reproducible build state.
Run geometry integrity checks before export.
```

---

## `source/skills/mixamo-first-breach/SKILL.md`

SHA-256: `f7285705283ddfccd00cb07d6ad81e7c6d132bd5a26c83d6ce7da4f282c7750f`

```markdown
---
name: mixamo-legacy-fallback
description: Legacy/reference humanoid motion lane retained only as explicit fallback, not the primary SoulDrifter production pipeline.
---

Use only for already-accepted legacy motion provenance or explicit fallback after Tripo/custom failure.
Never default the new playable-character program back to Mixamo.
```

---

## `source/skills/modular-character-contract/SKILL.md`

SHA-256: `e5d1c635bedaced6369635d8a9d5a86ae8715db6624db1839c53afd86cfa7439`

```markdown
---
name: modular-character-contract
description: Prevent fused gear, pedestals, class clothing and inconsistent source conventions from entering SoulDrifter base-character assets.
---
# Modular Character Contract Skill

A base body is not a class presentation.

Reject a base-body candidate if it includes:
- pedestal/stand;
- fused weapon/shield;
- fused class armor/robes;
- non-removable boots/gear;
- class-specific prop;
- inconsistent ground plane;
- incompatible pose;
- geometry that prevents modular clothing.

Allow only the project-approved neutral modest underlayer/coverage if required.

Separate:
body, head, hair, clothing, armor, weapon, shield, sheath, accessories, VFX.
```

---

## `source/skills/reactive-combat-design/SKILL.md`

SHA-256: `c40810333b516ba6da52922f421e825bd9fb3153890e389b076a70b66fac16dc`

```markdown
---
name: reactive-combat-design
description: Require class skills to form readable reactive chains with cooldowns, resources, enemy openings, and authoritative verification.
---

# Reactive Combat Design

Use for any player-class combat skill work.

## Mandatory checks

1. Identify the class's three starter active skills.
2. Prove at least two are connected through:
   `setup/reaction -> opening -> payoff`.
3. Define individual cooldowns.
4. Define class-resource behavior.
5. Keep universal Stability separate from class resource.
6. Define target reaction / opening animation.
7. Define boss/elite resistance to hard-control chains.
8. Define deterministic authoritative resolution for chance-based effects.
9. Define UI feedback for:
   - cooldown
   - resource
   - opening
   - chain-ready state
10. Verify at gameplay camera and normal speed.

## Anti-patterns

FAIL:
- press every glowing button on cooldown;
- three unrelated skills;
- invisible debuff booleans;
- one generic mana meter for every class;
- chance-based CC with no fallback value;
- boss permanent turn/stun lock;
- damage resolving before animation contact.
```

---

## `source/skills/real-gpu-qa/SKILL.md`

SHA-256: `ca802c767352b40f48cc583bd84102a20eb9ea1e8d51c2e9b3cb1ed365d88e8a`

```markdown
---
name: real-gpu-qa
description: Prevent software-renderer acceptance from hiding real GPU shader/material/performance failures.
---
# Real GPU QA Skill

Detect renderer.
Abort acceptance on SwiftShader/llvmpipe.
Use installed hardware browser path.
Capture console shader errors and renderer stats.
Test required representative scenes and mobile/desktop sizes.
```

---

## `source/skills/requirement-expansion/SKILL.md`

SHA-256: `4e867b94f924767f7363a34faffeda0b4bbf1061ca3db913baad00df4c79e7ad`

```markdown
---
name: requirement-expansion
description: Expand a ticket's prose requirements into atomic dependency-aware completion criteria so agents cannot stop after partial implementation.
---
# Requirement Expansion Skill

For every deliverable, ask:
- What must exist?
- What must it connect to?
- What must be reachable?
- What must move/animate/respond?
- What must be visible at gameplay distance and close-up?
- What could look correct while still being functionally broken?
- What evidence proves it?
- What negative case disproves it?

Generate stable requirement IDs and dependencies.
```

---

## `source/skills/rig-router/SKILL.md`

SHA-256: `2d55a99ed3c41643cfdd3be2e4f25763d4c65772ee71054f94aa5cb030fa3697`

```markdown
---
name: rig-router
description: Route SoulDrifter assets through primary Tripo, custom, or legacy fallback lanes while keeping runtime contracts vendor-neutral.
---

Primary: Tripo for supported new humanoid/creature assets.
Custom: Blender/Houdini/KineFX when anatomy/quality/bespoke controls require it.
Legacy fallback: Mixamo only where explicitly justified.

Every accepted rig exposes skeleton version, bone map, weights, scale/origin, sockets,
animation compatibility, deformation report, provenance, and runtime validation.
```

---

## `source/skills/session-context-receipt/SKILL.md`

SHA-256: `cf25c607b219eaa38078a1c56c6b0e4e89b0b0607c69ec5a28927e5b8dcd8d2e`

```markdown
---
name: session-context-receipt
description: Reconstruct canonical SoulDrifter context and prove it before a session is allowed to edit.
---

Read `START_HERE.md`, load context version, ticket/comments/PR/state, inspect worktree,
and produce/store the Context Receipt. Fail closed if stale or incomplete.
```

---

## `source/skills/source-grounded-skill-design/SKILL.md`

SHA-256: `8b11142fa3620916a44113d1ab051e997a317bec22f1fea369750b2d79e71496`

```markdown
---
name: source-grounded-skill-design
description: Research current SoulDrifter canon, recovered Lifepaper/Book-of-Life material, and Death Gate source inspiration before proposing any new ability.
---

# Source-Grounded Skill Design

Use this skill whenever a ticket asks for:
- a new class skill;
- a third starter action;
- a specialization action;
- an ancestry active ability;
- a monster/boss ability;
- a summon;
- a magical movement technique.

## Required sequence

1. Search current runtime/canon.
2. Search recovered Lifepaper / historical game data.
3. Search approved Death Gate source-reference material and legally supplied book notes for analogous combat/magic behavior.
4. Only then create an original proposal.

## Classification

Every result is exactly one:
- `CURRENT_CANON`
- `PRESERVED_LIFEPAPER`
- `DEATH_GATE_ADAPTED`
- `ORIGINAL_PROPOSAL`
- `OWNER_DIRECTION_PENDING_CODE_MIGRATION`

#