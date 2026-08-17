import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pagesRoot = resolve(projectRoot, "dist-pages");
const sitesRoot = resolve(projectRoot, "dist");

const [pagesIndex, sitesIndex, sitesWorker, pagesRelease, sitesRelease] = await Promise.all([
  readFile(resolve(pagesRoot, "index.html"), "utf8"),
  readFile(resolve(sitesRoot, "client/index.html"), "utf8"),
  readFile(resolve(sitesRoot, "server/index.js"), "utf8"),
  readFile(resolve(pagesRoot, "release.json"), "utf8").then(JSON.parse),
  readFile(resolve(sitesRoot, "client/release.json"), "utf8").then(JSON.parse),
]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

requireCondition(!pagesIndex.includes('location.replace("/play"'), "Pages index must open the game at root, not redirect to /play.");
requireCondition(pagesIndex.includes("character-creation"), "Pages index does not contain the SoulDrifter game shell.");
requireCondition(sitesIndex.includes('location.replace("/play"'), "Sites index must redirect authenticated traffic to /play.");
requireCondition(!sitesWorker.includes("const EMBEDDED_GAME_HTML = null;"), "Sites worker still contains the empty game-shell marker.");
requireCondition(pagesRelease.sourceCommit === sitesRelease.sourceCommit, "Release artifacts do not identify the same source commit.");
requireCondition(pagesRelease.releaseId === sitesRelease.releaseId, "Release artifacts do not identify the same release.");
requireCondition(pagesRelease.targets.githubPages.entry === "/", "Pages release entry must be root.");
requireCondition(sitesRelease.targets.chatgptSites.entry === "/play", "Sites release entry must be /play.");

await Promise.all([
  access(resolve(pagesRoot, "lore-atlas/index.html")),
  access(resolve(sitesRoot, "client/lore-atlas/index.html")),
]);

process.stdout.write(`${JSON.stringify({
  ok: true,
  sourceCommit: pagesRelease.sourceCommit,
  releaseId: pagesRelease.releaseId,
  pages: "dist-pages/",
  sites: "dist/",
}, null, 2)}\n`);
