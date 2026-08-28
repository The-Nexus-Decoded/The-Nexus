---
phase: issue-451-remediation
pull_request: 460
reviewed: 2026-08-28T22:36:00Z
depth: deep
review_mode: static-only
diff_base: 7666af63bac70f8d48c864b4a85122975bdaa4cb
files_reviewed: 46
files_reviewed_list:
  - Arianus-Sky/projects/games/SoulDrifterWeb/docs/3d-ai-studio/dungeon-kit-provenance.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/docs/maps/breach-v2/breach-v2-flatmap-1600.webp
  - Arianus-Sky/projects/games/SoulDrifterWeb/docs/reviews/PR-460-REMEDIATION-STATUS.md
  - Arianus-Sky/projects/games/SoulDrifterWeb/package-lock.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/package.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/public/data/dungeons/breach-v2/index.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/public/data/dungeons/breach-v2/registry.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/export-breach-v2-runtime.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/export-breach-v2-topology.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/houdini/build-breach-v2-apprentice.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/houdini/build-soulwell-exit-water-poc.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/houdini/build-soulwell-vestibule-fx-poc.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/houdini/export-breach-v2-layout.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/houdini/poc_output_policy.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/maps/breach-v2-flatmap-receipt.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/maps/make_breach_v2_flatmap.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/maps/make_breach_v2_wallart.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/maps/requirements-flatmap.txt
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/optimize-dungeon-kit.py
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/prune-runtime-assets.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/scripts/runtime-asset-manifest.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/source-assets/houdini/breach-v2-4182-wayfarer.layout.json
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-dev-panel.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-gameplay-ui.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-gameplay.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-mobile-controls.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-preview.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-startup.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/environment/rooms/SoulwellChamber.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/game/persistence.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/src/main.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2CameraCollision.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2Gameplay.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2Generator.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2Layout.test.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2MobileControls.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2Registry.test.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2Startup.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2TopologyRender.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/breachV2WallArtGenerator.test.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/heavyDungeonDoor.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/houdiniBuilderContracts.test.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/houdiniPocPolicy.test.mjs
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/persistenceUpgrade.test.ts
  - Arianus-Sky/projects/games/SoulDrifterWeb/tests/runtimeAssetBudget.test.js
  - Arianus-Sky/projects/games/SoulDrifterWeb/third-party-assets.json
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# PR 460 Fresh Code Review

**Reviewed:** 2026-08-28T22:36:00Z  
**Depth:** Deep, static-only  
**Diff:** `7666af63bac70f8d48c864b4a85122975bdaa4cb..HEAD` under `SoulDrifterWeb`  
**Files Reviewed:** 46  
**Status:** issues_found

## Summary

The remediation substantially improves runtime pruning containment, fitted collision, camera behavior, teardown, mobile controls, IndexedDB recovery, generated-data parity, asset provenance, and Houdini POC segregation. Static contract checks also confirmed that the flat-map bytes agree with the receipt and asset registry, and that all 37 source/runtime GLB pairs agree with the provenance register and protected runtime inventory.

Four actionable issues remain. The most serious is a Windows cross-volume containment bypass in the complete runtime exporter: despite claiming that `--out-dir` must remain in the project, it can replace and then delete an arbitrary directory on another drive. The same containment mistake affects the Houdini layout exporter, although that path writes a single file rather than replacing a directory. Save restoration still accepts internally inconsistent coffer/pickup states, and the legacy wall-art command still exposes a production placeholder-overwrite mode that conflicts with the repository's hard asset policy.

No tests, builds, browsers, or network operations were run in this review. The orchestrator-provided evidence (38 files / 273 tests, typecheck, integrity gates, production audit, and production build) was treated as prior verification, not independently reproduced here.

## Critical Issues

### CR-01: Cross-drive output bypass can replace and delete an arbitrary directory

**File:** `H:/CodexData/.codex/worktrees/451-review-fix/The-Nexus-review-fix/Arianus-Sky/projects/games/SoulDrifterWeb/scripts/export-breach-v2-runtime.mjs:33-39`  
**Issue:** `validateOutputDirectory()` rejects `relative()` results beginning with `..`, but on Windows a target on another drive produces a drive-qualified absolute result such as `C:\\outside`, not a `..` path. That target passes validation. Lines 149-153 then rename the external directory to a backup, replace it with the staged BREACH-V2 export, and recursively delete the backup. A command such as `--out-dir C:\\important-directory` can therefore destroy the original directory even though the function explicitly promises project-root containment.

**Fix:** Reject absolute `relative()` results (including Windows drive/UNC forms), then verify the real parent remains contained before any rename/removal. Add a Windows cross-drive regression case.

```js
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";

const projectRelative = relative(PROJECT_ROOT, output);
if (
  projectRelative === ""
  || projectRelative === ".."
  || projectRelative.startsWith(`..${sep}`)
  || isAbsolute(projectRelative)
  || win32.isAbsolute(projectRelative)
) {
  throw new Error("--out-dir must stay inside the SoulDrifterWeb project root.");
}
```

Before promotion, resolve the existing parent with `realpath()` and apply the same containment assertion so an in-project junction cannot redirect the operation outside the repository.

## Warnings

### WR-01: Houdini layout output has the same Windows cross-drive escape

**File:** `H:/CodexData/.codex/worktrees/451-review-fix/The-Nexus-review-fix/Arianus-Sky/projects/games/SoulDrifterWeb/scripts/houdini/export-breach-v2-layout.mjs:31-35`  
**Issue:** The new inside-project check also relies only on `relativeOutPath.startsWith("..")`. On Windows, an absolute path on another drive passes and lines 64-65 create/overwrite that outside file. This defeats the stated Houdini export policy and makes caller-controlled output capable of overwriting an arbitrary JSON path outside SoulDrifterWeb.

**Fix:** Import `isAbsolute`/`win32`, reject absolute `relativeOutPath` results, and realpath-check the destination parent. Cover both same-drive traversal and cross-drive absolute paths in a static CLI test.

### WR-02: Restored environment fields are type-normalized but not made internally consistent

**File:** `H:/CodexData/.codex/worktrees/451-review-fix/The-Nexus-review-fix/Arianus-Sky/projects/games/SoulDrifterWeb/src/game/dungeons/breach-v2-gameplay.ts:170-194`  
**Issue:** `legacyCoffer` becomes true when any coffer field is missing, but `normalizeEnvironmentState()` suppresses migration when any one of those fields is explicitly boolean (`hasExplicitCofferState` uses `some`). A schema-v1 state with `tutorial.cofferOpened = true` and `environment = { cofferOpened: true }` restores with `pickupDropped = false` and `pickupCollected = false`; the objective can advance past collection without granting the deterministic item. Other validly typed but inconsistent schema-v2 combinations can strand the UI on “Collect” while no pickup exists. The new tests cover an empty environment and malformed types, but not partial or contradictory boolean combinations.

**Fix:** Normalize the state machine as a unit after parsing fields. At minimum, `pickupCollected` must imply `pickupDropped`, `cofferOpened`, the deterministic item in `collectedItemIds`, and the coffer collider in `removedColliderIds`; `pickupDropped` must imply `cofferOpened`; and schema-v1 tutorial completion should migrate all three coffer states regardless of which subset happened to be serialized. Add table-driven tests for every partial boolean combination.

### WR-03: Legacy CLI still permits production placeholder replacement

**File:** `H:/CodexData/.codex/worktrees/451-review-fix/The-Nexus-review-fix/Arianus-Sky/projects/games/SoulDrifterWeb/scripts/maps/make_breach_v2_wallart.py:328-365`  
**Issue:** The script documents the non-scroll builders as superseded placeholders, but `--mode legacy-all --acknowledge-placeholder-overwrite` still promotes those outputs directly into `public/assets/textures/environment/breach-v2/art` and rewrites `third-party-assets.json`. The SoulDrifter `AGENTS.md` makes placeholder substitution a hard stop, not an operation that becomes valid after acknowledgement. This command can still replace the approved production narrative art with UI-style placeholder images.

**Fix:** Remove `legacy-all` from production output entirely. If historical reconstruction is necessary, write it only to an explicitly non-shipping external directory, never update `third-party-assets.json`, and refuse any destination under `public/`.

---

_Reviewed: 2026-08-28T22:36:00Z_  
_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: deep, static-only_
