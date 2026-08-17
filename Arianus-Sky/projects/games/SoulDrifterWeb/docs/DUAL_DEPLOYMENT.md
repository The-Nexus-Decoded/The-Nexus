# SoulDrifter dual deployment

Tracking: [The-Nexus #437](https://github.com/The-Nexus-Decoded/The-Nexus/issues/437)

SoulDrifter has two release surfaces with different routing and access contracts:

| Target | URL | Audience | Entry route | Build artifact |
|---|---|---|---|---|
| GitHub Pages | `https://the-nexus-decoded.github.io/` | Public | `/` | `dist-pages/` |
| ChatGPT Sites | `https://souldrifter-first-breach.ola-lawal.chatgpt.site/play` | Password-gated QA | `/play` | `dist/` |

## One source, two artifacts

Run the normal build once:

```powershell
yarn build
yarn verify:release
```

The Vite client is first copied unchanged to `dist-pages/`. That copy opens the game directly at the root and is the only artifact allowed to enter the Pages repository. The build then prepares `dist/` for ChatGPT Sites by embedding the original game shell in the worker and replacing `dist/client/index.html` with the `/play` redirect.

Both artifacts contain the same `release.json`, including the source commit and release ID. A deployment is synchronized only when those values match on both targets.

## Release order

1. Start from a clean, reviewed commit on `main`.
2. Run tests, typecheck, build, and `verify:release`.
3. Publish `dist-pages/` to `The-Nexus-Decoded/The-Nexus-Decoded.github.io`.
4. Package `dist/` with the Sites packaging helper, save a Sites version using the same source commit, and deploy it.
5. Verify the Pages root, the gated Sites `/play` route, the lore atlas, character creation, 3D asset loading, and entry into First Breach combat.
6. Compare both hosted `release.json` files before declaring the release synchronized.

Never copy all of `dist/` into GitHub Pages. Its root document intentionally redirects to `/play`, a worker route that static Pages cannot provide.

## Access and rollback

The ChatGPT Sites project currently uses the app worker's `BETA_PASSWORD` and `SESSION_SECRET` gate. Those values stay in Sites environment secrets and never enter Git. Platform-level Sites sharing is a separate setting and must not be described as the beta gate.

Roll back Pages by restoring the prior known-good Pages commit. Roll back Sites by redeploying the prior saved Sites version. Rollbacks are independent; record both resulting versions on issue #437.
