# Output

Write a structured research record.
Do not spend provider credits or begin custom animation/VFX for an unapproved proposal.
```

---

## `source/skills/spatial-connectivity/SKILL.md`

SHA-256: `1b346f4fdbfe1489d2cdcd77e6755526b55536fc3c12c266a39c0661f11e2241`

```markdown
---
name: spatial-connectivity
description: Validate doors, corridors, rooms, roads, bridges, portals, stairs and other spatial relationships as connected graphs rather than isolated meshes.
---
# Spatial Connectivity Skill

Represent traversable spaces as graph nodes and connectors as edges.

For every required edge:
- aperture/source socket;
- connector geometry;
- destination socket;
- collision state;
- navigation continuity;
- clearance for real player radius;
- actual player traversal;
- visual proof in both directions.

No orphan edge can pass.
```

---

## `source/skills/threejs-runtime-proof/SKILL.md`

SHA-256: `a6eac3eb7a658cbb5be9c3caf4d47b969d00a60c1e327808f7225d12c3b443ed`

```markdown
---
name: threejs-runtime-proof
description: Prove generated assets and game systems in the real Three.js runtime rather than assuming file-level correctness.
---
# Three.js Runtime Proof Skill

Required where applicable:
- asset loads;
- no failed requests;
- material identity;
- correct transform/facing;
- collision/nav;
- animations;
- interaction;
- camera visibility;
- desktop + phone-width;
- real GPU for renderer-sensitive work.
```

---

## `source/skills/ticket-intake/SKILL.md`

SHA-256: `0ca3f0d2752d4bf4a81e544f93f10031cb1933397868a6e2fee2819001e41ab8`

```markdown
---
name: ticket-intake
description: Start or resume a SoulDrifter GitHub ticket without losing current owner corrections, branch/worktree rules, or prior progress.
---
# Ticket Intake Skill

1. Read game `AGENTS.md`.
2. Read the issue body and **all current comments**.
3. Identify branch, worktree, base, game root, preview URL, owner-only gates.
4. Read linked runbooks.
5. Inspect current git status/log and existing handoff.
6. Run baseline tests.
7. Update `.agent-state/<issue>/handoff.json`.
8. Never start implementation until requirement compilation is complete.
```

---

## `source/skills/tripo-future-rig/SKILL.md`

SHA-256: `203ef720a6a8bb20470a65f2824a3f8e12d1ec8bef25b5062f6e8bc671fc9d23`

```markdown
---
name: tripo-primary-production
description: Primary new-production generation, segmentation, retopo, texture, rigging, and baseline-animation provider lane, subject to owner-approved spending and pilot gates.
---

Tripo is the primary new-production asset lane.

Use pilot -> verify -> fan out.
Geometry-changing stages precede final rig/animation.
Record task/cost/provenance.
Provider success is not acceptance.
Keep downstream rig/action contracts vendor-neutral.
```

---

## `source/skills/visual-qa/SKILL.md`

SHA-256: `d9e4459b1dcdafddf83656c4d8dbc85e1b3af0af01bc73b6a3906697a0d2e336`

```markdown
---
name: visual-qa
description: Independent wide-and-close visual review for SoulDrifter scenes and characters.
---
# Visual QA Skill

Review fresh evidence after latest content commit.

Environment:
- wide;
- gameplay height;
- close front/side;
- all required walls/portals;
- roof/ceiling;
- grounding/overlap;
- materials;
- lighting.

Character:
- front/back/sides;
- body silhouette;
- no pedestal/fused gear in base body;
- deformation close-ups;
- normal-speed gameplay.

Reviewer should find defects, not confirm the producer's narrative.
```

---

## `source/templates/action_demand.template.json`

SHA-256: `7b991e5c696bfc387cc6e9d4744fe35c88cff3429406b31135d51b7ea3e51674`

```json
{
  "schemaVersion": 1,
  "actionId": "mage-cinder-bolt",
  "source": {
    "type": "class_signature",
    "codeFile": "src/game/character.ts"
  },
  "required": true,
  "weaponFamily": "staff",
  "motionContract": "custom_or_tripo_then_authored",
  "vfxRequired": true,
  "hitReactionRequired": true,
  "markers": ["telegraph_start", "release", "impact"],
  "status": "NOT_STARTED"
}
```

---

## `source/templates/ancestry_ability.template.json`

SHA-256: `6adb21f09d98e32ec01e921981b1314333a166c85adc903dbad7ddf100001b2d`

```json
{
  "schemaVersion": 1,
  "abilityId": "elf-ghoststep",
  "ownerType": "ancestry_boon",
  "ancestry": "elf",
  "currentGameplayType": "passive_stat_modifier",
  "desiredGameplayType": "TBD",
  "animationRequired": false,
  "animationId": null,
  "vfxId": null,
  "activation": "none",
  "approval": "CURRENT_CODE_IDENTITY_ONLY",
  "notes": "If promoted to active movement ability, define mechanics before producing animation."
}
```

---

## `source/templates/animation_requirement.template.json`

SHA-256: `e81be00b50f75a95d17fcfae36b199121389de1a33c79a81a7a57a608f8aba8e`

```json
{
  "schemaVersion": 1,
  "animationId": "mage_arc_bolt_cast",
  "group": "class_ability",
  "owner": "animation-combat-worker",
  "provider": "custom",
  "skeletonFamily": "SoulDrifter_Humanoid_v1",
  "sourceClass": "Mage",
  "sourceWeaponFamily": "staff",
  "required": true,
  "states": {
    "windup": true,
    "release": true,
    "recovery": true
  },
  "markers": [
    "cast_start",
    "projectile_spawn",
    "impact_window"
  ],
  "vfxHooks": [
    "staff_tip_socket",
    "projectile_prefab",
    "impact_prefab"
  ],
  "verification": {
    "runtimeProofRequired": true,
    "targetReactionRequired": true,
    "independentVerifierRequired": true
  }
}
```

---

## `source/templates/class_ability_matrix.template.json`

SHA-256: `6c4e91ca413a1b09139d37f656c6ee90ffd202c4582fbd390a00a16d70fd2f69`

```json
{
  "schemaVersion": 1,
  "classes": [
    {
      "classId": "warrior",
      "starterAbilities": ["cleave", "shield_ram", "guard_break"]
    },
    {
      "classId": "mage",
      "starterAbilities": ["arc_bolt", "burst_nova", "channel_flame"]
    }
  ]
}
```

---

## `source/templates/combat_chain_contract.template.json`

SHA-256: `3afa68eed538205c9bc16c047a34c0731c3f9f528572797d7164742c06966dce`

```json
{
  "schemaVersion": 1,
  "chainId": "slayer-feint-backstab",
  "classId": "slayer",
  "setupAction": "feinting-cut",
  "openingState": {
    "id": "feinted",
    "durationMs": 3000,
    "standardEnemyForcedTurnChance": 0.30,
    "eliteMultiplier": "TBD",
    "bossForcedTurnAllowed": false,
    "fallbackEffect": "minor_off_balance"
  },
  "payoffAction": "backstab",
  "payoffRequires": ["rear_arc_or_explicit_exposure"],
  "resourceHooks": {
    "resource": "Edge",
    "setupGain": "TBD",
    "payoffCost": "TBD"
  },
  "cooldowns": {
    "setupMs": "TBD",
    "payoffMs": "TBD"
  },
  "network": {
    "authoritativeResolution": true,
    "seededChanceRequired": true
  },
  "verification": {
    "targetReactionVisible": true,
    "openingIndicatorVisible": true,
    "chainExecutableAtGameplayCamera": true
  }
}
```

---

## `source/templates/completion-ledger.template.json`

SHA-256: `27e4bc7b911147c59ce85fef5522cfa11c6669e0eb359c0de5710c5464a986ab`

```json
{
  "schemaVersion": 1,
  "issue": 0,
  "ticketStatus": "NOT_STARTED",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Replace with atomic requirement",
      "priority": "critical",
      "dependencies": [],
      "producer": null,
      "status": "NOT_STARTED",
      "automated_checks": [],
      "runtime_checks": [],
      "visual_evidence": [],
      "verifier": null,
      "verification": {
        "status": "NOT_RUN",
        "commit": null,
        "notes": null
      },
      "blockers": []
    }
  ]
}
```

---

## `source/templates/context-receipt.template.json`

SHA-256: `311ca17a54dcda42fea22dcdc12bfbf25687a7557488b52b317c9e9670d04c6d`

```json
{
  "schemaVersion": 1,
  "contextVersion": "2026-08-23-master-v1",
  "model": "",
  "role": "",
  "ticket": "",
  "branch": "",
  "worktree": "",
  "gameRoot": "Arianus-Sky/projects/games/SoulDrifterWeb",
  "requiredFilesRead": [],
  "ticketStateLoaded": false,
  "latestOwnerDirectionChecked": false,
  "blockingConflicts": [],
  "plannedScope": ""
}
```

---

## `source/templates/evidence-manifest.template.json`

SHA-256: `3bba5be0dfcd1d97c61bc69f4ffb75512d070c9ccda8b65a93afd23e86a08817`

```json
{
  "schemaVersion": 1,
  "issue": 0,
  "commit": "",
  "generatedAt": "",
  "evidence": [
    {
      "requirementId": "REQ-001",
      "type": "runtime|screenshot|video|test|log|metric",
      "path": "",
      "freshAfterCommit": true,
      "notes": ""
    }
  ]
}
```

---

## `source/templates/gear_generation_queue.template.json`

SHA-256: `19f27ce65ff389ed2aee51ce69c4e995dfff8f628641a9ebfb6e819263662c50`

```json
{
  "schemaVersion": 1,
  "generationPolicy": {
    "playableCharactersUseSegmentationAsPrimaryPath": false,
    "npcsMayUseSegmentation": true,
    "bossOutfitsMayBecomeLootableSets": true
  },
  "queue": [
    {
      "assetId": "starter_warrior_chest_v001",
      "slot": "body",
      "classId": "warrior",
      "rarity": "grey",
      "level": 1,
      "provider": "tripo",
      "status": "planned"
    }
  ]
}
```

---

## `source/templates/global-ticket-audit.template.json`

SHA-256: `0f1d8a0efc18bc2ddc2b61f00a991e02af5c1688db0c12e77fb3a017f26b56c0`

```json
{
  "schemaVersion": 1,
  "generatedAt": "",
  "contextVersion": "2026-08-23-master-v1",
  "tickets": [
    {
      "issue": 0,
      "title": "",
      "classification": "REVALIDATE",
      "latestOwnerIntent": "",
      "relatedPrs": [],
      "currentBranch": "",
      "verifiedRequirements": [],
      "unverifiedClaims": [],
      "newHarnessConflicts": [],
      "dependencies": [],
      "parallelSafe": false,
      "recommendedWorker": "",
      "recommendedVerifier": "",
      "nextAtomicAction": ""
    }
  ]
}
```

---

## `source/templates/handoff.template.json`

SHA-256: `14a010d39baf70642ab51b4b8c8836c4943966ad1156b7328f5022ea865edb80`

```json
{
  "schemaVersion": 1,
  "issue": 0,
  "commit": "",
  "nextRequirementId": "",
  "completedThisSession": [],
  "blockers": [],
  "commandsRun": [],
  "evidencePaths": [],
  "devServerStopped": true
}
```

---

## `source/templates/skill_research_record.template.json`

SHA-256: `b2726e7dc72c4daaf52ecda2dbea8634d73a3371c098fad4fcc873fc989aa154`

```json
{
  "schemaVersion": 1,
  "skillId": "",
  "displayName": "",
  "classification": "ORIGINAL_PROPOSAL",
  "classOrOwner": "",
  "levelBand": "",
  "search": {
    "currentCanon": {
      "completed": false,
      "sources": [],
      "findings": []
    },
    "lifepaperHistorical": {
      "completed": false,
      "sources": [],
      "findings": []
    },
    "deathGateSource": {
      "completed": false,
      "sources": [],
      "conceptFindings": [],
      "copyrightSafeSummaryOnly": true
    }
  },
  "reasonForProposal": "",
  "mechanicalRole": "",
  "weaponFamily": "",
  "animationRequired": false,
  "vfxRequired": false,
  "approval": "PENDING_OWNER"
}
```

---

## `source/templates/ticket-contract.template.json`

SHA-256: `1382a603c66a1578bed65e63d528046bcbe19ad483576f9aca2f4fef824bccf2`

```json
{
  "schemaVersion": 1,
  "issue": 0,
  "source": {
    "issueUrl": "",
    "latestOwnerCorrectionChecked": false
  },
  "branch": "",
  "worktree": "",
  "gameRoot": "Arianus-Sky/projects/games/SoulDrifterWeb",
  "runbooks": [],
  "ownerOnlyGates": [
    "merge",
    "deploy",
    "paid-provider-operation"
  ],
  "requirements": [],
  "expectedMatrices": [],
  "doneGate": {
    "allCriticalRequirementsVerified": true,
    "independentVerifierRequired": true,
    "freshEvidenceRequired": true,
    "testsRequired": true
  }
}
```

---

## `source/templates/work-claim.template.json`

SHA-256: `2c46321b8726da8145cf515550d872fe99d2381d645a5c8a01226523307306a0`

```json
{
  "schemaVersion": 1,
  "ticket": 0,
  "role": "",
  "model": "",
  "branch": "",
  "worktree": "",
  "claimedSubsystems": [],
  "highConflictPaths": [],
  "startedAt": "",
  "status": "ACTIVE"
}
```

---

## `legacy-source/AGENTS.md`

SHA-256: `744574cc981006f1d008d9ffc7bb2ac0e61458c3a2ff0270acb68a5dee2a221d`

```markdown
# AGENTS.md — Autonomous RPG World Production Agent

## Mission
