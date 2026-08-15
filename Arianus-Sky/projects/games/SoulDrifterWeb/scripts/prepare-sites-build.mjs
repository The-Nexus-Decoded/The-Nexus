import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerSource = resolve(projectRoot, "worker/static-sites-worker.js");
const workerOutput = resolve(projectRoot, "dist/server/index.js");
const clientIndex = resolve(projectRoot, "dist/client/index.html");

await mkdir(dirname(workerOutput), { recursive: true });
const [workerTemplate, gameHtml] = await Promise.all([
  readFile(workerSource, "utf8"),
  readFile(clientIndex, "utf8"),
]);
const marker = "const EMBEDDED_GAME_HTML = null;";
if (!workerTemplate.includes(marker)) throw new Error("Static Sites worker game-shell marker is missing.");
await writeFile(workerOutput, workerTemplate.replace(marker, `const EMBEDDED_GAME_HTML = ${JSON.stringify(gameHtml)};`));
await writeFile(clientIndex, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="cache-control" content="no-store"><title>SoulDrifter Beta</title>
<script>location.replace("/play" + location.search + location.hash)</script></head>
<body><p><a href="/play">Enter SoulDrifter</a></p></body></html>`);
