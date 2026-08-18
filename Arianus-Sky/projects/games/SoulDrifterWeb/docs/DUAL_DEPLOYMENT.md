# SoulDrifter dual deployment

Tracking: [The-Nexus #437](https://github.com/The-Nexus-Decoded/The-Nexus/issues/437)

SoulDrifter has two release surfaces with different routing and access contracts:

| Target | Source branch | URL | Audience | Entry route | Build artifact |
|---|---|---|---|---|---|
| GitHub Pages | `main` | `https://the-nexus-decoded.github.io/` | Public | `/` | `dist-pages/` |
| ChatGPT Sites | `qa` | `https://souldrifter-first-breach.ola-lawal.chatgpt.site/play` | Password-gated QA | `/play` | `dist/` |

## One source, two artifacts

Run the normal build once:

```powershell
yarn build
yarn verify:release
```

The Vite client is first copied unchanged to `dist-pages/`. That copy opens the game directly at the root and is the only artifact allowed to enter the Pages repository. The build then prepares `dist/` for ChatGPT Sites by embedding the original game shell in the worker and replacing `dist/client/index.html` with the `/play` redirect.

Both artifacts contain a `release.json`, including the source commit and release ID. The QA site may intentionally run ahead while a release is under review. A promoted deployment is synchronized only when those values match on both targets.

## Branch and merge policy

- Merging a PR into `qa` publishes a validated candidate to the gated ChatGPT Sites project. The QA Action runs on the resulting branch update and refuses to package the commit unless GitHub associates it with a merged PR whose base is `qa`; this lets the gate work before the workflow is promoted to the default branch.
- PRs targeting `qa` run the same tests, typecheck, build, and release verification before merge once this workflow exists on the default branch. The initial workflow bootstrap must carry equivalent local verification evidence on its PR.
- Merging a PR into `main` publishes a validated stable build to public GitHub Pages.
- Opening, updating, or closing a PR without merging never deploys.
- Feature-branch pushes and direct branch pushes do not satisfy the merge gate.
- The Sites publication monitor polls because GitHub Actions and ChatGPT Sites do not share a native deployment event. Expect a successfully packaged QA merge to be detected within several minutes.

## GitHub Pages publication

The public repository owns a `Deploy SoulDrifter` workflow. It detects a new PR merge on The-Nexus `main`, resolves the exact merge commit, runs the full SoulDrifter test and build gates, and uploads only `dist-pages/` through GitHub Pages. Unchanged commits are skipped, and no cross-repository write token is required.

Manual dispatch remains available for a reviewed rollback commit:

```powershell
$sourceCommit = git rev-parse HEAD
gh workflow run deploy-souldrifter.yml `
  --repo The-Nexus-Decoded/The-Nexus-Decoded.github.io `
  --ref main `
  -f source_ref=$sourceCommit
```

The workflow's checkout SHA is passed to `SOULDRIFTER_SOURCE_COMMIT`, so the hosted `release.json` identifies The-Nexus source rather than the Pages workflow commit.

The gated Sites project is deployed by the Codex QA monitor because Sites version saving and deployment are connector operations, not a public GitHub Action. The monitor applies the same test, typecheck, build, target-separation, and source-commit gates before publishing a newly merged `qa` commit.

## Release order

1. Merge the reviewed release candidate PR into `qa`.
2. Let the QA monitor run tests, typecheck, build, `verify:release`, package `dist/`, and deploy the gated Sites version.
3. Verify the gated `/play` route, lore atlas, character creation, 3D asset loading, and First Breach entry.
4. Promote the approved candidate through a PR into `main`.
5. Let the Pages workflow rebuild the merged `main` commit and publish only `dist-pages/`.
6. Verify the public root and compare hosted `release.json` files when the release is expected to be synchronized.

Never copy all of `dist/` into GitHub Pages. Its root document intentionally redirects to `/play`, a worker route that static Pages cannot provide.

## Access and rollback

The ChatGPT Sites project currently uses the app worker's `BETA_PASSWORD` and `SESSION_SECRET` gate. Those values stay in Sites environment secrets and never enter Git. Platform-level Sites sharing is a separate setting and must not be described as the beta gate.

Roll back Pages by dispatching the workflow with the prior known-good The-Nexus source commit. Roll back Sites by redeploying the prior saved Sites version. Rollbacks are independent; record both resulting versions on issue #437.
