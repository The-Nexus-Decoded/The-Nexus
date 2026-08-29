# Issue #458 rollback-baseline validation findings

## Accepted baseline and scope

- Worktree: `H:/CodexData/.codex/worktrees/458-pre-codex-fixes-validation/The-Nexus`
- Branch: `codex/458-pre-codex-fixes-validation`
- Accepted pre-Codex-fixes baseline parent: `7666af63`
- Validated implementation head before this report commit: `925eddff`
- No merge, QA promotion, or deployment was performed.
- Port `4178` remains the stale/offline preview. The verified local/LAN preview is served from `dist-pages` on port `4180`.

The implementation selectively reinstalls the issue #458 creature, Warden, and real Human Foundation V2 animation/runtime work on the accepted baseline. It does not restore the rejected Codex-fix batch or the capsule/fallback player preview.

## Runtime asset identity

- Exactly one real Human Foundation V2 player root is present; no visible capsule player exists.
- The only issue #435 donor accepted in this lane is `weapon-sword-longsword-starter-v001.glb` from source commit `a6608fea`.
- The longsword keeps its 1.05 m canonical length and runtime world scale `(1,1,1)`.
- The real rig resolves `weapon-socket-hand-r` to `mixamorigRightHand` and `weapon-socket-hip-l` to `mixamorigHips`.
- Draw and sheath transfer at the measured contact windows: `0.90` and `0.74` normalized clip time. Runtime separation at those transfers is approximately `0.0281 m` and `0.0342 m`.
- No issue #435 camera, capsule, runtime harness, unfinished clothing/armor, or unexported weapon candidate was imported.

## Creature and Warden results

- Oathbreaker galleries load three Breachlings per active combat room; Wayfarer galleries load two.
- Breachlings expose idle, combat idle, walk, run, bite, claw, tail whip, hit, death, and upper-tier poison spit actions.
- Each boss path loads exactly one path-specific Warden in the Ashen Lock and no Wardens in non-boss rooms.
- Both Wardens expose 13 local actions, including heavy locomotion, sweeps, Palm Fire, Ash Call, hit, turn, and grounded death.
- Palm Fire was visible on desktop and mobile.
- Break-off stages resolve at 30%, 60%, and 90% damage; both final death clearances settled to effectively `0 m`.
- Runtime Warden inventory contains only the body plus the three authored break-off groups. No stand, pedestal, plinth, or base mesh remains.
- Authored albedo is preserved and the runtime dark-iron/ember presentation is active; no source texture was replaced or dropped.

## Verification

- `yarn typecheck`: passed.
- `yarn vitest run --reporter=verbose --maxWorkers=1`: 38 files passed, 257 tests passed.
- `yarn build`: passed; `dist-pages` is 246,372,380 bytes and remains under the preferred runtime budget.
- ESLint is not configured in this package, so there is no repository lint command to run.
- Full browser walkthrough: HTTP 200 and network idle on all five desktop/mobile runs, with zero console errors, page errors, request failures, loop errors, or WebGL context losses.
- Both 13-room path walkthroughs reported zero unreachable or population-mismatched rooms.
- Mobile camera button probe changed distance `18.5 -> 15.0 -> 18.5` with no loop error or context loss.

Primary machine-readable evidence:

- `H:/CodexData/.codex/visualizations/2026/08/29/01a04b65-b2db-7312-8bb0-35ced29d45ff/runtime-proof/breach-v2-full-walkthrough.json`
- `H:/CodexData/.codex/visualizations/2026/08/29/01a04b65-b2db-7312-8bb0-35ced29d45ff/runtime-proof/human-longsword-runtime-proof.json`
- `H:/CodexData/.codex/visualizations/2026/08/29/01a04b65-b2db-7312-8bb0-35ced29d45ff/runtime-proof/weapon-fit/candidate-fit.json`
- `H:/CodexData/.codex/visualizations/2026/08/29/01a04b65-b2db-7312-8bb0-35ced29d45ff/runtime-proof/warden-production/warden-runtime-appearance.json`

## Review locations

- Combined creature and Human V2 animation review: `http://192.168.1.118:4180/?dungeonPreview=breach-v2&seed=4182&path=oathbreaker&cam=isometric&start=H-01&animationReview=1&creatureReview=1`
- Greater Warden review: `http://192.168.1.118:4180/?dungeonPreview=breach-v2&seed=4182&path=oathbreaker&cam=isometric&start=ashen-lock&animationReview=1&wardenReview=1`
- Wayfarer Warden review: `http://192.168.1.118:4180/?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=isometric&start=ashen-lock&animationReview=1&wardenReview=1`

## Remaining donor limitation

Issue #435 currently supplies one finished standalone weapon suitable for this acceptance lane. Additional weapons, clothing, armor, scabbards, and sheath harnesses remain external donor deliverables and were not fabricated or substituted in issue #458.
