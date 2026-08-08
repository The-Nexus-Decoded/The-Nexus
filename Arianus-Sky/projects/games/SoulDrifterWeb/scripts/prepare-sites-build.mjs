import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerSource = resolve(projectRoot, "worker/static-sites-worker.js");
const workerOutput = resolve(projectRoot, "dist/server/index.js");

await mkdir(dirname(workerOutput), { recursive: true });
await copyFile(workerSource, workerOutput);

