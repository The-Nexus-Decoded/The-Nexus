,
          "version": {
            "type": "string"
          },
          "role": {
            "type": "string"
          }
        }
      }
    },
    "platforms": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string"
      }
    },
    "gameModes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": [
          "id",
          "name",
          "modules"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "camera": {
            "type": "string"
          },
          "dimension": {
            "type": "string"
          },
          "multiplayer": {
            "type": "string"
          },
          "modules": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }
    },
    "selectedModules": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "overlay": {
      "type": "object",
      "required": [
        "canonIndex"
      ],
      "properties": {
        "canonIndex": {
          "type": "string"
        },
        "root": {
          "type": "string"
        }
      }
    },
    "performanceBudgets": {
      "type": "object"
    },
    "providers": {
      "type": "object"
    },
    "release": {
      "type": "object"
    }
  }
}
```

---

## `source/scripts/check-completion.mjs`

SHA-256: `f115255a54b23cacd313b64ba45affff5ab2b7a31ad7336144fe9518fb8edc50`

```javascript
#!/usr/bin/env node
import fs from "node:fs";
const file=process.argv[2];
if(!file){console.error("Usage: node check-completion.mjs <completion-ledger.json>");process.exit(2)}
const l=JSON.parse(fs.readFileSync(file,"utf8")); const reqs=l.requirements??[]; const errors=[];
if(!reqs.length)errors.push("no requirements");
for(const r of reqs){
  if((r.priority??"critical")==="critical"&&r.status!=="VERIFIED")errors.push(`${r.id}: critical status ${r.status}`);
  for(const dep of r.dependencies??[]){const d=reqs.find(x=>x.id===dep);if(!d||d.status!=="VERIFIED")errors.push(`${r.id}: unresolved dependency ${dep}`)}
  if(r.status==="VERIFIED"){
    if(!r.verifier)errors.push(`${r.id}: no verifier`);
    if(r.producer&&r.verifier===r.producer)errors.push(`${r.id}: producer self-verified`);
    if(r.verification?.status!=="PASS")errors.push(`${r.id}: verification not PASS`);
    if(!r.verification?.commit)errors.push(`${r.id}: no verification commit`);
  }
  if((r.blockers??[]).length&&r.status==="VERIFIED")errors.push(`${r.id}: blockers remain`);
}
if(errors.length){console.error(`DONE GATE: FAIL (${errors.length})`);for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log(`DONE GATE: PASS — ${reqs.length} requirements verified`);
```

---

## `source/scripts/check-project-profile.mjs`

SHA-256: `c649e723132cbe7b7945d264dde2f81ff8694875e8c7c36e34aeff289894925d`

```javascript
#!/usr/bin/env node
import fs from "node:fs";
const file = process.argv[2];
if (!file) { console.error("Usage: node check-project-profile.mjs <project-profile.json>"); process.exit(2); }
const p = JSON.parse(fs.readFileSync(file,"utf8"));
const errors=[];
for (const key of ["schemaVersion","projectId","title","repository","engines","platforms","gameModes","selectedModules","overlay"]) if (!(key in p)) errors.push(`missing ${key}`);
if (!Array.isArray(p.engines)||!p.engines.length) errors.push("engines must be non-empty");
if (!Array.isArray(p.platforms)||!p.platforms.length) errors.push("platforms must be non-empty");
if (!Array.isArray(p.gameModes)||!p.gameModes.length) errors.push("gameModes must be non-empty");
for (const mode of p.gameModes??[]) {
  if (!mode.id||!mode.name) errors.push("each gameMode requires id and name");
  if (!Array.isArray(mode.modules)||!mode.modules.length) errors.push(`gameMode ${mode.id??"?"} requires modules`);
}
if (!p.overlay?.canonIndex) errors.push("overlay.canonIndex required");
if (errors.length) { console.error(`PROJECT PROFILE: FAIL (${errors.length})`); for (const e of errors) console.error(`- ${e}`); process.exit(1); }
console.log(`PROJECT PROFILE: PASS — ${p.projectId}, ${p.gameModes.length} mode(s), ${p.selectedModules.length} selected module(s)`);
```

---

## `source/scripts/discover-game-workspaces.ps1`

SHA-256: `641a9f07cd9a4cfd58ed737456a9ce70e2302b0d6d2518b99b1d2e1edfbbab23`

```powershell
param([string]$RepositoryHint="")
$ErrorActionPreference="Stop"
function Git([string]$Path,[string[]]$Args){Push-Location $Path;try{return (& git @Args 2>&1)}finally{Pop-Location}}
$candidates=@()
try{$cur=(& git rev-parse --show-toplevel 2>$null|Select-Object -First 1);if($cur){$candidates+=$cur.ToString().Trim()}}catch{}
if($RepositoryHint){$candidates+=$RepositoryHint}
$candidates=$candidates|Where-Object{$_}|Select-Object -Unique
$root=$null
foreach($c in $candidates){try{if(Test-Path $c){$top=(Git $c @("rev-parse","--show-toplevel")|Select-Object -First 1);if($top){$root=$top.ToString().Trim();break}}}catch{}}
if(-not $root){@{status="BLOCKED";reason="No git checkout discovered";candidates=$candidates}|ConvertTo-Json -Depth 6;exit 2}
$lines=Git $root @("worktree","list","--porcelain");$items=@();$cur=$null
foreach($line in $lines){$t=$line.ToString();if($t -like "worktree *"){if($cur){$items+=[pscustomobject]$cur};$cur=@{path=$t.Substring(9).Trim();head=$null;branch=$null;detached=$false;locked=$false;status=@()}}elseif($cur -and $t -like "HEAD *"){$cur.head=$t.Substring(5).Trim()}elseif($cur -and $t -like "branch *"){$cur.branch=($t.Substring(7).Trim() -replace "^refs/heads/","")}elseif($cur -and $t -eq "detached"){$cur.detached=$true}elseif($cur -and $t -like "locked*"){$cur.locked=$true}}
if($cur){$items+=[pscustomobject]$cur}
foreach($wt in $items){try{$wt.status=@(Git $wt.path @("status","--short"))}catch{$wt.status=@("ERROR")}}
@{status="PASS";canonicalCheckout=$root;worktrees=$items}|ConvertTo-Json -Depth 8
```

---

## `source/skills/2d-asset-pipeline/SKILL.md`

SHA-256: `c0cd826292a86d0a7aaeb7d2bb74e7c90af26ed23399a4d9c2eb840ddf4ccdaa`

```markdown
---
name: 2d-asset-pipeline
description: Produce sprites, icons, backgrounds, UI and atlases with consistent style, export and runtime validation.
---
Verify dimensions, pivots, slices, compression, mip/filter policy, responsive scaling, localization expansion and device readability.
```

---

## `source/skills/3d-asset-pipeline/SKILL.md`

SHA-256: `dfcfc803b405aa46d27b5e6ae75d23d3836cfcee7203f3c1b10b5a6d8d71dcf7`

```markdown
---
name: 3d-asset-pipeline
description: Produce runtime-ready 3D assets through modeling/generation, cleanup, topology, texture, LOD, collision and export gates.
---
Verify scale, axes, grounding, pivots, sockets, materials, draw cost, LODs, collision, target camera and runtime import.
```

---

## `source/skills/accessibility-input/SKILL.md`

SHA-256: `ae959b353e924c3a4093fbd3e64173938f231cff3599f0ef2eef914e32abeec2`

```markdown
---
name: accessibility-input
description: Validate keyboard/mouse, controller, touch, remapping, subtitles, contrast, motion/comfort and assist options.
---
Accessibility is a production requirement, not only a final checklist.
```

---

## `source/skills/animation-contract/SKILL.md`

SHA-256: `2be02a53230f8e49a8ee015e9779b1f328058f29c378e9f7f90f530b9f1c44fd`

```markdown
---
name: animation-contract
description: Define animation intent, phases, markers, root policy, contacts, transitions and runtime proof.
---
A clip playing is not completion. Verify anticipation, action/contact, reaction, recovery, deformation, equipment and gameplay-camera readability.
```

---

## `source/skills/asset-registry/SKILL.md`

SHA-256: `87c14061b1de67abd31ec2c74e7b4f7af14c1de751ec623f8d0b6bbe66a4c63a`

```markdown
---
name: asset-registry
description: Track expected assets independently from files that happen to exist.
---
Record identity, source, provider, license/provenance, technical metrics, status, runtime slot, evidence and promotion gate.
```

---

## `source/skills/concurrent-work-claims/SKILL.md`

SHA-256: `8cd3cf822b107e90147b28c53b0a665dc5006786e76415e6340e34d39171d0f5`

```markdown
---
name: concurrent-work-claims
description: Prevent parallel agents from racing on conflicting files/subsystems.
---
One ticket/branch/worktree per worker. Record claims and assign an integration owner for shared high-conflict boundaries.
```

---

## `source/skills/gameplay-loop-validation/SKILL.md`

SHA-256: `bbd5625f3a6635af40e5ddd4f66614985f37e2f142edc7c4706b57f22c882513`

```markdown
---
name: gameplay-loop-validation
description: Prove complete loops including goal, action, feedback, success/failure, reward, recovery and persistence.
---
Test actual player behavior, not only isolated functions or editor scenes.
```

---

## `source/skills/handoff-resume/SKILL.md`

SHA-256: `c8801163f3c2a18e91b8b371aa127a634920e506b6bc8f64770d3a48f11230b3`

```markdown
---
name: handoff-resume
description: Preserve exact ticket state across model/context/session limits.
---
Commit atomic work, update ledger/handoff/evidence, record next requirement and blockers, stop servers. Resume from repo state.
```

---

## `source/skills/interaction-contract/SKILL.md`

SHA-256: `1a416e55b5a20267db01fc8fdc03b33bfe359629cc497b8e3b15a1305efd8938`

```markdown
---
name: interaction-contract
description: Make world interactions complete across animation, sockets, state, collision, UI, audio and save/network outcomes.
---
Examples: doors, levers, pickups, vehicle entry, cockpit controls, crafting stations, dialogue and minigame transitions.
```

---

## `source/skills/nested-game-mode/SKILL.md`

SHA-256: `9235f8a9f986fb5e77314f01fe4a948637b7d4858e2088505b87a8547ea47fb5`

```markdown
---
name: nested-game-mode
description: Design a mini-game or simulator inside a host game with explicit shared and isolated systems.
---
Define entry/exit, state transfer, input/camera swap, assets, saves, networking, performance and failure recovery.
```

---

## `source/skills/network-determinism/SKILL.md`

SHA-256: `4f8ff4002f3d3c0432677dffb5510fae7d42925592332743b34262de71a4e007`

```markdown
---
name: network-determinism
description: Define authoritative ownership, replication, timing, prediction, reconciliation and divergence tests.
---
Cosmetic variation must not change authoritative outcomes.
```

---

## `source/skills/performance-budget/SKILL.md`

SHA-256: `0347821ae0f1eec01bc41c4c8b42bf13b16ba182e3cdbcb103fac9bfe3a116d0`

```markdown
---
name: performance-budget
description: Enforce target-platform budgets for frame time, memory, loading, network, draw calls, assets and thermal constraints.
---
Evidence must come from intended devices/renderers, not only developer machines or software rendering.
```

---

## `source/skills/project-profile/SKILL.md`

SHA-256: `baab91c07ad112870f708bb8213a1b0228557e38bc066d70ccfa1e1d19a4fde4`

```markdown
---
name: project-profile
description: Define and validate a game's engines, platforms, modes, modules, budgets, overlays and production constraints.
---
The project profile is mandatory. Do not infer genre/platform architecture only from a title or ticket.
```

---

## `source/skills/provider-routing/SKILL.md`

SHA-256: `c54248c61877a354b188bad4228a48413e389dacacbd77b4911b54db4cceac73`

```markdown
---
name: provider-routing
description: Choose AI/manual tools by asset/task fit while preserving vendor-neutral downstream contracts.
---
Pilot before batch. Record costs/settings/provenance. Provider completion is not runtime acceptance.
```

---

## `source/skills/release-gate/SKILL.md`

SHA-256: `35b25215d2275a9dc4ec1b140af4eed7667afb02b175782b2b76358b9b862141`

```markdown
---
name: release-gate
description: Require build, tests, migrations, signing/config, observability, rollback, legal/assets and owner approval before release.
---
A successful local build is not release readiness.
```
