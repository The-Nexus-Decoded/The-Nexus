import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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

requireCondition(!pagesIndex.includes('url=/play'), "Pages index must open the game at root, not redirect to /play.");
requireCondition(pagesIndex.includes("character-creation"), "Pages index does not contain the SoulDrifter game shell.");
requireCondition(sitesIndex.includes('http-equiv="refresh"') && sitesIndex.includes('url=/play'), "Sites index must redirect traffic to /play without inline JavaScript.");
requireCondition(!sitesIndex.includes("<script"), "Sites redirect shell must remain compatible with the gate's strict CSP.");
requireCondition(!sitesWorker.includes("const EMBEDDED_GAME_HTML = null;"), "Sites worker still contains the empty game-shell marker.");
requireCondition(pagesRelease.sourceCommit === sitesRelease.sourceCommit, "Release artifacts do not identify the same source commit.");
requireCondition(pagesRelease.releaseId === sitesRelease.releaseId, "Release artifacts do not identify the same release.");
requireCondition(pagesRelease.targets.githubPages.entry === "/", "Pages release entry must be root.");
requireCondition(sitesRelease.targets.chatgptSites.entry === "/play", "Sites release entry must be /play.");

await Promise.all([
  access(resolve(pagesRoot, "lore-atlas/index.html")),
  access(resolve(sitesRoot, "client/lore-atlas/index.html")),
]);

const reviewPages = ["weapon-lab.html", "asset-review.html"];
const reviewAssetMap = JSON.parse(await readFile(
  resolve(projectRoot, "docs/3d-ai-studio/issue-435-lab-asset-map.json"), "utf8",
));
for (const clientRoot of [pagesRoot, resolve(sitesRoot, "client")]) {
  for (const page of reviewPages) {
    const html = await readFile(resolve(clientRoot, page), "utf8");
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)];
    requireCondition(scripts.length > 0, `${page} has no built JavaScript entry.`);
    for (const [, scriptUrl] of scripts) {
      requireCondition(!/^(?:[a-z]+:|\/\/)/i.test(scriptUrl), `${page} requires an external script.`);
      const pathname = new URL(scriptUrl, "https://review.invalid/").pathname;
      requireCondition(!pathname.startsWith("/src/") && !pathname.startsWith("/@fs/"), `${page} still references development source.`);
      await access(resolve(clientRoot, `.${pathname}`));
    }
  }
  for (const asset of reviewAssetMap.assets) {
    requireCondition(/^\/assets\//.test(asset.url) && !asset.url.includes(".."), `Invalid review asset URL: ${asset.url}`);
    const bytes = await readFile(resolve(clientRoot, `.${asset.url}`));
    requireCondition(bytes.length === asset.bytes, `Review asset size changed: ${asset.url}`);
    requireCondition(createHash("sha256").update(bytes).digest("hex") === asset.sha256, `Review asset SHA-256 changed: ${asset.url}`);
  }
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  sourceCommit: pagesRelease.sourceCommit,
  releaseId: pagesRelease.releaseId,
  pages: "dist-pages/",
  sites: "dist/",
  reviewPages,
  verifiedReviewAssetsPerTarget: reviewAssetMap.assets.length,
}, null, 2)}\n`);
