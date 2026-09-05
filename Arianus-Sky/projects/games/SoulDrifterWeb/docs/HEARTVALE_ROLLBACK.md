# Heartvale checkpoint restore and rollback

Use this procedure to inspect or recover the pre-redesign Heartvale state. Never reset a shared branch or overwrite an active worktree.

## Restore the committed checkpoint

Choose a new empty disposable directory on `H:`. The verified drill used `H:\CodexData\Temp\heartvale-restore-20260904`.

```powershell
$backupRoot = 'H:\Archives\The-Nexus\heartvale-checkpoint-20260904'
$restoreRoot = 'H:\CodexData\Temp\heartvale-restore-YYYYMMDD'

git clone --no-checkout "$backupRoot\the-nexus-heartvale-source.bundle" $restoreRoot
git -C $restoreRoot checkout --detach checkpoint/heartvale-before-rework-20260904
git -C $restoreRoot rev-parse HEAD
```

The expected HEAD is:

`f0a2bded824339a27f3210a411d07de74700cab3`

Run `git bundle verify` against the bundle and verify its SHA-256 against `backup-integrity-sha256.csv` before trusting a new copy.

## Restore the exact newer local preview

The tag represents the last committed outdoor source. To reproduce the newer local worktree state, overlay the seven preserved files after checking out the tag:

```powershell
$overlayRoot = "$backupRoot\local-work-overlay"
Get-ChildItem -LiteralPath $overlayRoot -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($overlayRoot.Length + 1)
  $destination = Join-Path $restoreRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
}
```

Recompute every file's SHA-256 and compare it with `local-work-overlay-sha256.csv`. The expected result is 7/7 matches. Do not apply unrelated files from `upload.tmp`, another issue worktree, or a provider cache.

## Reproduce and test

```powershell
$gameRoot = Join-Path $restoreRoot 'Arianus-Sky\projects\games\SoulDrifterWeb'
Set-Location -LiteralPath $gameRoot
npm ci
npm test
npm run typecheck
npm run build
npm run dev -- --port 41732 --strictPort
```

Do not run the Houdini terrain builder or regenerate any asset. Open these existing-export review routes:

- `http://127.0.0.1:41732/?zonePreview=hv-1&cam=soulwell`
- `http://127.0.0.1:41732/?zonePreview=hv-1&cam=anwel`
- `http://127.0.0.1:41732/?zonePreview=hv-1&cam=iso`
- `http://127.0.0.1:41732/?zonePreview=hv-1&cam=river`
- `http://127.0.0.1:41732/?zonePreview=hv-1&cam=riverclose`

Press `T` to enter walk mode and use movement keys for a movement check. Stop the preview server after evidence capture.

The runnable artifact can also be inspected without rebuilding by verifying and extracting `runnable-build-dist.tar.gz` into a new empty directory. Its SHA-256 is `665a012098169963b0744a4131672d2625293cdc6df6e100415de4479036f936`.

## Roll back a future redesign in QA

Do not hard-reset `qa`, repoint either checkpoint tag, force-push, or restore the entire repository tree. First create or reference a rollback ticket, fetch the current QA ref, and create a dedicated rollback worktree/branch from that exact QA head.

```powershell
git fetch origin --prune --tags
git worktree add -b codex/<ticket>-heartvale-rollback H:\CodexData\.codex\worktrees\<ticket>\The-Nexus-heartvale-rollback origin/qa
```

In that isolated worktree:

1. Identify the exact outdoor redesign commits and their Heartvale dependencies.
2. Compare them with the source tag and, only when required, the verified seven-file overlay.
3. Restore only reviewed Heartvale outdoor files and necessary dependency edits. Do not blanket-select ours/theirs.
4. Preserve newer First Breach, weapon-lab, persistence/save, asset-review, and release-pipeline changes.
5. Run the full QA tests, typecheck, build, release verification, desktop/mobile GPU evidence, and independent review.
6. Open a reviewed rollback PR targeting `qa`; merge only after its own gates pass.

The original-source tag `checkpoint/heartvale-before-rework-20260904` must remain pointed at `f0a2bded824339a27f3210a411d07de74700cab3`. The post-merge integrated-QA tag is a separate checkpoint and must never replace it.

## Recovery outcomes

- Use `CHECKPOINT_READY` only when bundle, overlay hashes, tests, build, GPU evidence, and independent restore verification all pass.
- Use `SNAPSHOT_CAPTURED / RESTORE_BLOCKED` if an asset is missing, a hash differs, or the restored preview cannot run.
- A successful restore proves recoverability, not that the preserved Heartvale prototype is visually complete.
