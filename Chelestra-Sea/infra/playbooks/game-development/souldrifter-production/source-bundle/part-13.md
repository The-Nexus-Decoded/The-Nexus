eImage": "REQUIRED",
      "sourceGlb": "REQUIRED",
      "cleanBase": "REQUIRED",
      "noFusedGear": true,
      "noPedestal": true,
      "rig": "REQUIRED",
      "animationProof": "REQUIRED",
      "runtimeProof": "REQUIRED"
    },
    {
      "id": "body-halfling-feminine-slim",
      "ancestry": "halfling",
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
      "id": "body-halfling-feminine-athletic",
      "ancestry": "halfling",
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
      "id": "body-halfling-feminine-heavy",
      "ancestry": "halfling",
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
    }
  ]
}
```

---

## `source/examples/issue-451-door-corridor-ledger.json`

SHA-256: `98b0c980d16110eb941e30f8bc827ed221366e2bbde53dee7fabb7b10c2e1845`

```json
{
  "schemaVersion": 1,
  "issue": 451,
  "ticketStatus": "IN_PROGRESS",
  "requirements": [
    {
      "id": "451-PORTAL-WAYFARER-01",
      "description": "Wayfarer choice portal forms a complete traversable connection from choice room to chamber 1.",
      "priority": "critical",
      "dependencies": [],
      "producer": "level-world-builder",
      "status": "IMPLEMENTED_UNVERIFIED",
      "automated_checks": [
        "portal aperture exists",
        "door/socket orientation valid",
        "corridor endpoints match both sockets",
        "nav connectivity graph connects choice room to chamber 1"
      ],
      "runtime_checks": [
        "door closed blocks",
        "door opens fully",
        "real player capsule crosses threshold at repeated samples",
        "player walks full corridor into chamber 1",
        "WASD and click-to-move both work after crossing"
      ],
      "visual_evidence": [
        "closed gate from choice room",
        "open gate from choice room",
        "corridor bend",
        "arrival doorway",
        "reverse view from chamber 1"
      ],
      "verifier": "independent-verifier",
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

## `source/scripts/README.md`

SHA-256: `31b2873af00da8003d4f19679289f3731ae81bc5397ec3c961df0379bea5d459`

```markdown
# Harness Scripts

## Ticket completion
`node check-completion.mjs ../.agent-state/451/completion-ledger.json`

This rejects:
- unverified critical requirements;
- unresolved dependencies;
- self-verification;
- verified rows without a verification commit;
- verified rows with blockers.

## Character matrix
`node check-character-matrix.mjs <path-to-body-anchor-intake.json>`

This computes the expected 24 base-body rows independently and compares the manifest against that expectation.

The script intentionally does not infer the expected count from the current manifest.
```

---

## `source/scripts/check-character-matrix.mjs`

SHA-256: `ae68c7805342dc331ba89955f1f7417a12a7b80fb2d9f2bf03ae2f3dd06478d9`

```javascript
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const intakePath = process.argv[2];
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.argv[3] ?? path.resolve(scriptDir, "../config/character-matrix.json");

if (!intakePath) {
  console.error("Usage: node check-character-matrix.mjs <body-anchor-intake.json> [character-matrix.json]");
  process.exit(2);
}

const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const c = config.baseBodyContract;

const expected = [];
for (const ancestry of c.ancestries)
  for (const presentation of c.presentations)
    for (const bodyProfile of c.bodyProfiles)
      expected.push({ ancestry, presentation, bodyProfile });

const actualRows = intake.artifacts ?? [];
const key = r => `${String(r.ancestry).toLowerCase()}|${String(r.presentation).toLowerCase()}|${String(r.bodyProfile).toLowerCase()}`;
const actual = new Map(actualRows.map(r => [key(r), r]));
const missing = expected.filter(r => !actual.has(key(r)));

console.log(`Expected base-body rows from config: ${expected.length}`);
console.log(`Actual registered rows: ${actualRows.length}`);

if (missing.length) {
  console.error(`MATRIX GATE: FAIL — missing ${missing.length} expected row(s):`);
  for (const r of missing) console.error(`- ${r.ancestry} / ${r.presentation} / ${r.bodyProfile}`);
  process.exit(1);
}

console.log(`MATRIX GATE: PASS — all ${expected.length} expected base-body rows registered`);
```

---

## `source/scripts/check-completion.mjs`

SHA-256: `cea59bf71134643c81a31ca4c19b11d74b684473dc7dae5afe9b43f0d93a5b50`

```javascript
#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node check-completion.mjs <completion-ledger.json>");
  process.exit(2);
}

const ledger = JSON.parse(fs.readFileSync(file, "utf8"));
const reqs = ledger.requirements ?? [];
const errors = [];

if (!reqs.length) errors.push("Ledger contains no requirements.");

for (const r of reqs) {
  const critical = (r.priority ?? "critical") === "critical";
  if (critical && r.status !== "VERIFIED") {
    errors.push(`${r.id}: critical requirement status=${r.status}, expected VERIFIED`);
  }

  if ((r.dependencies ?? []).some(dep => {
    const d = reqs.find(x => x.id === dep);
    return !d || d.status !== "VERIFIED";
  })) {
    errors.push(`${r.id}: has unresolved dependency`);
  }

  if (r.status === "VERIFIED") {
    if (!r.verifier) errors.push(`${r.id}: VERIFIED without verifier identity`);
    if (r.producer && r.verifier && r.producer === r.verifier) {
      errors.push(`${r.id}: producer self-verified`);
    }
    if (r.verification?.status !== "PASS") {
      errors.push(`${r.id}: VERIFIED but verification.status=${r.verification?.status}`);
    }
    if (!(r.verification?.commit)) {
      errors.push(`${r.id}: VERIFIED without verification commit`);
    }
  }

  if (critical) {
    if (!(r.automated_checks?.length || r.runtime_checks?.length || r.visual_evidence?.length)) {
      errors.push(`${r.id}: critical requirement has no evidence/check contract`);
    }
  }

  if ((r.blockers ?? []).length && r.status === "VERIFIED") {
    errors.push(`${r.id}: VERIFIED while blockers remain`);
  }
}

if (errors.length) {
  console.error(`DONE GATE: FAIL (${errors.length} finding${errors.length === 1 ? "" : "s"})`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`DONE GATE: PASS — ${reqs.length} requirements verified`);
```

---

## `source/scripts/discover-souldrifter-workspaces.ps1`

SHA-256: `222b5eb18aadeeff6ee23a521b57bd2c1bf01881b880bd382270d97e2df788a3`

```powershell
param(
    [string]$MainCheckout = "H:\Projects\AI_Tools_And_Information\The-Nexus",
    [string]$ExpectedRepo = "The-Nexus-Decoded/The-Nexus"
)

$ErrorActionPreference = "Stop"

function Invoke-Git([string]$WorkDir, [string[]]$Args) {
    Push-Location $WorkDir
    try {
        return (& git @Args 2>&1)
    } finally {
        Pop-Location
    }
}

function Test-NexusRepo([string]$Path) {
    if (-not (Test-Path $Path)) { return $false }
    try {
        $top = (Invoke-Git $Path @("rev-parse", "--show-toplevel") | Select-Object -First 1).ToString().Trim()
        $remotes = (Invoke-Git $Path @("remote", "-v")) -join "`n"
        return ($top -and $remotes -match "The-Nexus-Decoded[/\\]The-Nexus|The-Nexus-Decoded/The-Nexus")
    } catch {
        return $false
    }
}

$candidates = @()

try {
    $current = (& git rev-parse --show-toplevel 2>$null | Select-Object -First 1)
    if ($current) { $candidates += $current.ToString().Trim() }
} catch {}

$candidates += $MainCheckout
$candidates = $candidates | Where-Object { $_ } | Select-Object -Unique

$root = $null
foreach ($candidate in $candidates) {
    if (Test-NexusRepo $candidate) {
        $root = $candidate
        break
    }
}

if (-not $root) {
    Write-Output (@{
        status = "BLOCKED"
        reason = "No existing The-Nexus checkout was discovered."
        candidatesChecked = $candidates
    } | ConvertTo-Json -Depth 6)
    exit 2
}

$porcelain = Invoke-Git $root @("worktree", "list", "--porcelain")
$worktrees = @()
$currentItem = $null

foreach ($line in $porcelain) {
    $text = $line.ToString()
    if ($text -like "worktree *") {
        if ($currentItem) { $worktrees += [pscustomobject]$currentItem }
        $currentItem = @{
            path = $text.Substring(9).Trim()
            head = $null
            branch = $null
            detached = $false
            locked = $false
            status = @()
        }
    } elseif ($currentItem -and $text -like "HEAD *") {
        $currentItem.head = $text.Substring(5).Trim()
    } elseif ($currentItem -and $text -like "branch *") {
        $ref = $text.Substring(7).Trim()
        $currentItem.branch = $ref -replace "^refs/heads/", ""
    } elseif ($currentItem -and $text -eq "detached") {
        $currentItem.detached = $true
    } elseif ($currentItem -and $text -like "locked*") {
        $currentItem.locked = $true
    }
}
if ($currentItem) { $worktrees += [pscustomobject]$currentItem }

foreach ($wt in $worktrees) {
    try {
        $wt.status = @(Invoke-Git $wt.path @("status", "--short"))
    } catch {
        $wt.status = @("ERROR: unable to inspect worktree")
    }
}

$result = @{
    status = "PASS"
    canonicalCheckout = $root
    repository = $ExpectedRepo
    worktrees = $worktrees
}

Write-Output ($result | ConvertTo-Json -Depth 8)
```

---

## `source/skills/animation-coverage/SKILL.md`

SHA-256: `78900c2e07137551a815ff2b82cbdda372cf39de74736796d66fbdba1cd28c9c`

```markdown
---
name: animation-coverage
description: Derive and verify complete per-actor animation/action matrices so a few working clips cannot be mistaken for completed character animation.
---
# Animation Coverage Skill

Compute expected actions from gameplay definitions, not current files.

For each actor/family:
- list required action IDs;
- source clip;
- retarget status;
- root/contact markers;
- VFX/SFX/damage marker alignment;
- transition coverage;
- terminal-state behavior;
- runtime proof.

Fail on any missing action required by the ticket.
```

---

## `source/skills/asset-matrix-audit/SKILL.md`

SHA-256: `674e96a7220412a58804a083d3a4b387a1caad6876c69f879d3a6e0b823831ad`

```markdown
---
name: asset-matrix-audit
description: Compute the expected character/asset matrix independently and compare it to actual files/register rows so missing assets cannot be hidden by green tests.
---
# Asset Matrix Audit Skill

Never derive expected count from the current manifest.

Expected playable base-body matrix:
- ancestries: Human, Elf, Dwarf, Halfling
- presentations: masculine, feminine
- body profiles: Slim, Athletic, Heavy
- expected body rows: 4 × 2 × 3 = 24

Calling/class identity is modular and is not multiplied into fused body meshes.
Expected Level-1 calling kits: 9 modular kits.
Expected starter weapon/off-hand packages: follow canonical current registry.

For every expected row, track source, cleaned mesh, rig, animation proof, runtime proof.
Report missing rows explicitly.
```

---

## `source/skills/branch-worktree-disc