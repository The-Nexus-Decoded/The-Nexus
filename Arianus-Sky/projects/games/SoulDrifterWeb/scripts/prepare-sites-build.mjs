import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerSource = resolve(projectRoot, "worker/static-sites-worker.js");
const workerOutput = resolve(projectRoot, "dist/server/index.js");
const sitesClientRoot = resolve(projectRoot, "dist/client");
const clientIndex = resolve(sitesClientRoot, "index.html");
const pagesOutput = resolve(projectRoot, "dist-pages");
const run = promisify(execFile);

async function resolveSourceCommit() {
  if (process.env.SOULDRIFTER_SOURCE_COMMIT) return process.env.SOULDRIFTER_SOURCE_COMMIT;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd: projectRoot });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

await mkdir(dirname(workerOutput), { recursive: true });
const [workerTemplate, gameHtml] = await Promise.all([
  readFile(workerSource, "utf8"),
  readFile(clientIndex, "utf8"),
]);
const marker = "const EMBEDDED_GAME_HTML = null;";
if (!workerTemplate.includes(marker)) throw new Error("Static Sites worker game-shell marker is missing.");

const sourceCommit = await resolveSourceCommit();
const release = {
  app: "SoulDrifter — The First Breach",
  sourceCommit,
  releaseId: process.env.SOULDRIFTER_RELEASE_ID ?? sourceCommit.slice(0, 12),
  builtAt: new Date().toISOString(),
  targets: {
    githubPages: { entry: "/", artifact: "dist-pages" },
    chatgptSites: { entry: "/play", artifact: "dist" },
  },
};
const releaseJson = `${JSON.stringify(release, null, 2)}\n`;

// Preserve the untouched Vite client for GitHub Pages before the Sites-specific
// root shell is rewritten to /play. Keeping this outside dist also prevents the
// Sites archive from doubling in size by packaging the Pages copy.
await rm(pagesOutput, { recursive: true, force: true });
await cp(sitesClientRoot, pagesOutput, { recursive: true });
await Promise.all([
  writeFile(resolve(pagesOutput, "release.json"), releaseJson),
  writeFile(resolve(sitesClientRoot, "release.json"), releaseJson),
]);
await writeFile(workerOutput, workerTemplate.replace(marker, `const EMBEDDED_GAME_HTML = ${JSON.stringify(gameHtml)};`));
await writeFile(clientIndex, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="cache-control" content="no-store"><title>SoulDrifter Beta</title>
<script>location.replace("/play" + location.search + location.hash)</script></head>
<body><p><a href="/play">Enter SoulDrifter</a></p></body></html>`);
