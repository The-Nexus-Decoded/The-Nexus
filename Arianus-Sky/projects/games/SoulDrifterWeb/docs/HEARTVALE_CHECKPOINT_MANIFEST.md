# Heartvale rollback checkpoint manifest

Checkpoint date: 2026-09-04

Verdict: `CHECKPOINT_READY` after the restore drill and independent verification recorded below.

This checkpoint preserves two deliberately distinct states:

1. PR #511's original committed baseline at `3bd383386c962848e6d73a8c6d7cf2d975de07ba`, which is the Heartvale source reconciled into QA by the checkpoint PR.
2. The newer local outdoor state: committed source `f0a2bded824339a27f3210a411d07de74700cab3` plus the exact seven-file local overlay listed below. The overlay is backed up separately and is not silently committed or merged.

No terrain, model, texture, or NPC asset was regenerated while creating or testing this checkpoint.

## Source identity

- Repository: `The-Nexus-Decoded/The-Nexus`
- PR: `#511`
- PR source at capture: `3bd383386c962848e6d73a8c6d7cf2d975de07ba`
- QA at capture: `228a0b3bf235641067e3a419054ff57d37c7e36a`
- Local outdoor branch: `codex/heartvale-outdoor`
- Preserved committed source: `f0a2bded824339a27f3210a411d07de74700cab3`
- Annotated source tag: `checkpoint/heartvale-before-rework-20260904`
- Annotated tag object: `4148c75c08101184c0884a9ce244e5274a69ee76`
- Remote peeled target: `f0a2bded824339a27f3210a411d07de74700cab3`

The source tag was pushed only after reviewing all workflows. No workflow listens for tag pushes; deployment workflows are limited to `main`, and the SoulDrifter release workflow is limited to PRs/pushes targeting `qa` or manual dispatch. The repository has no active tag ruleset, so this is an ordinary annotated tag, not an immutable or protected tag.

The source worktree was 11 commits ahead of `origin/codex/heartvale-outdoor`. The local #453 tip and the common #454/#455 tip are ancestors of the preserved source. The latest #452 branch tip contains follow-ups that were not in the outdoor worktree and was inventoried in the bundle without being automatically merged. The #459/PR source commit is an ancestor of the preserved source.

## Backup inventory

Approved local archive root:

`H:\Archives\The-Nexus\heartvale-checkpoint-20260904`

| Artifact | Bytes | SHA-256 | Verification |
| --- | ---: | --- | --- |
| `the-nexus-heartvale-source.bundle` | 1,176,760,456 | `2d0937bb6510ff567f16120c3a6c0a3e7ccd84793caa9cb44b31f25b4725e442` | `git bundle verify`: complete history, OK |
| `runnable-build-dist.tar.gz` | 544,418,861 | `665a012098169963b0744a4131672d2625293cdc6df6e100415de4479036f936` | full `tar -tzf`: exit 0 |
| `restored-game-tree-sha256.csv` | 123,634 | `4701543aaaf5bb3e15ab36940f11e22d61c7b3a53bbbef88f991f2536b08602d` | 875 restored game files inventoried |
| `backup-integrity-sha256.csv` | generated after all capture artifacts | `eca0c374fd35aa0a36b62e7bca0774012ce8a0e725a526c780d06ccdb987289a` | manifest self-hash |

The Git bundle contains the annotated source tag, the local Heartvale branches for #452-#455 and #459, the local outdoor branch, their relevant remote refs, the original PR checkpoint ref, and the QA ref at capture.

Git LFS files: none. Git submodules: none. All required tracked source and runtime assets are stored as Git objects in the verified bundle. The untracked/ignored/local-only material is stored as real files under `local-work-overlay/`, not as pointers or provider URLs.

No separate independent storage destination was both available and authorized during capture. The preferred second-copy step therefore remains unperformed; nothing was uploaded to public or cloud storage.

## Local-work overlay

The untouched source worktree had five tracked modifications, one untracked runtime source file, and one ignored exported OBJ. `local-work-overlay-sha256.csv` is authoritative.

| Classification | Path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| tracked modified | `public/data/zones/heartvale/heartvale-village.json` | 7,102 | `9ac5e778897c4397263fa7ac81903d5f95d3ea988d236c40b50ffe40b1513c1b` |
| tracked modified | `scripts/houdini/build-heartvale-realistic.py` | 119,215 | `91877205236583564787dac57b26913cff484dc0eada2a93a3306cf9b44f29a5` |
| tracked modified | `source-assets/houdini/heartvale-realistic.hipnc` | 26,067,071 | `3f82ff7dea28794c659d9933df3afdb939fd82ac599fe03c2c37c4750f909163` |
| tracked modified | `src/game/zones/heartvale/data.ts` | 8,334 | `de3e1429e711fa625baf46ab9985b65793acf3e50cafed69d945a36711f7c6c6` |
| tracked modified | `src/game/zones/heartvale/village.ts` | 53,519 | `98a1d7f33a129baf128036431166f91d1b3a9d6003c19f8b7dc434eb10b07c21` |
| untracked | `src/game/zones/heartvale/ruins.ts` | 6,319 | `39b3537be0aa61a86b2ee09c390fa5f60a78389824b96c6e1ec7274067e378d4` |
| ignored export | `public/data/zones/heartvale/heartvale-realistic-environment.obj` | 119,497,499 | `7e29602b27847e1ad7d7c5588524202669e0afc4f430fa0321dd79a72e44af6d` |

Package receipts in the restored tree:

- `package.json`: SHA-256 `e402c004203a333fa7d8b3aa2cc59b1d00e23466717e8d1e4e6f35f44bf6ed05`
- `package-lock.json`: SHA-256 `3a80475f5b3f08aeaced252c6f94e958e05e14345270995ca3c3415001a3454d`

## Restore drill

- Disposable restore: `H:\CodexData\Temp\heartvale-restore-20260904`
- Restored HEAD: `f0a2bded824339a27f3210a411d07de74700cab3`
- Overlay verification: 7/7 files matched size and SHA-256
- Restored game tree before dependency installation: 875 files, 1,140,367,395 bytes
- Install: `npm ci`, 56 packages added, 57 audited, 0 vulnerabilities
- Tests: 28/28 files passed; 192/192 tests passed; 0 failed; 1.78 seconds
- Typecheck: `npm run typecheck` passed (`tsc -b`)
- Build: `npm run build` passed; 59 modules transformed; 1.71-second Vite build
- Build warning: the main bundle is larger than Vite's advisory 500 kB chunk threshold

Browser evidence used Chrome 152, WebGL 2.0, and ANGLE on an NVIDIA GeForce GTX 1070 through Direct3D 11. Desktop was 1440x900. Mobile was 390x844 at device DPR 3 with renderer DPR capped at 2.

Soul Well, Anwel, the `iso` road-network view, river, and river-close all rendered on desktop and mobile. Each run reported no loop error, no console error, and no failed request. The only browser warnings were the known `THREE.Clock` and `PCFSoftShadowMap` deprecations. Settled capture performance was 19-20 FPS. Walk mode moved the player 5.16096 metres without a loop error.

Evidence is preserved under:

- `H:\Archives\The-Nexus\heartvale-checkpoint-20260904\evidence\restore`
- `H:\CodexData\.codex\visualizations\2026\09\04\01a06e91-2ca4-7a90-bd35-bf6ca4d29525\pr511\restore`

## Known baseline limitations

- NPCs and the walk-mode avatar remain capsule placeholders.
- Anwel and the ruin field remain prototype-quality, with simple proxy construction and unfinished close-up detail.
- Terrain/vegetation is pale, sparse, and visibly repetitive; some bank vegetation intersects the water edge.
- The road network is broad and readable from `iso`, but still lightly dressed.
- Phone-width debug text clips horizontally.
- Settled GPU capture was only 19-20 FPS, below a 30 FPS quality target.
- The Vite chunk-size warning remains.

These are recorded properties of the preserved baseline, not evidence that Heartvale is production-complete.
