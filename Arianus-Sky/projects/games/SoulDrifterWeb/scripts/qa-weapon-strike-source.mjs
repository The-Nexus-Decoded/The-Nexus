import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/nvm4w/nodejs/node_modules/openclaw/node_modules/playwright-core");
const outputDir = "H:/Projects/AI_Tools_And_Information/The-Nexus-souldrifter-browser/.planning/debug/artifacts/mobile-hud-avatar-regressions/weapon-strike-baseline-public-audit";
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Users/olawal/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const consoleErrors = [];
const failedRequests = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }));

async function createCharacter() {
  await page.goto("http://127.0.0.1:5174/?debugSeed=2215682322", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("#character-name-input").fill("Strike Source Audit");
  await page.locator("#creation-next").click();
  await page.locator('button[data-race="elf"]').click();
  await page.locator("#creation-next").click();
  await page.locator('button[data-skin-tone="ashen"]').click();
  await page.locator('button[data-hair-style="silver-sweep"]').click();
  await page.locator("#creation-next").click();
  await page.locator('button[data-calling="shadowknight"]').click();
  await page.locator("#creation-next").click();
  while (!(await page.locator("#creation-confirm").count())) {
    await page.locator("button[data-answer]").first().click();
    await page.locator("#creation-next").click();
  }
  await page.locator("#creation-confirm").click();
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_DEBUG__), null, { timeout: 120_000 });
  await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.weapon("drawn"));
  await page.locator('[data-hud-drawer="camera"]').click();
  for (let index = 0; index < 5; index += 1) await page.locator('[data-camera-control="zoom-in"]').click();
  await page.locator('[data-hud-drawer="camera"]').click();
}

try {
  await createCharacter();
  await page.locator("#basic-action").click();
  await page.waitForFunction(() => window.__SOULDRIFTER_DEBUG__.snapshot().playerAnimation === "WeaponStrikeBaseline", null, { timeout: 15_000 });
  await page.screenshot({ path: join(outputDir, "public-active.png") });
  await page.waitForFunction(() => window.__SOULDRIFTER_DEBUG__.snapshot().playerAnimation !== "WeaponStrikeBaseline", null, { timeout: 15_000 });
  await page.screenshot({ path: join(outputDir, "public-recovery.png") });
  const phases = [0, 0.08, 0.16, 0.24, 0.3, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.88, 1];
  const dense = [];
  for (const phase of phases) {
    await page.evaluate((value) => window.__SOULDRIFTER_DEBUG__.pose("WeaponStrikeBaseline", value), phase);
    await page.waitForTimeout(70);
    const state = await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.snapshot());
    const suffix = String(Math.round(phase * 100)).padStart(3, "0");
    await page.screenshot({ path: join(outputDir, `source-${suffix}.png`) });
    dense.push({ phase, animation: state.playerAnimation, bounds: state.playerBounds, handSocket: state.playerHandSocket, rig: state.playerRigProbe });
  }
  const report = {
    outputDir,
    checks: {
      selected: dense.every((sample) => sample.animation === "WeaponStrikeBaseline"),
      grounded: dense.every((sample) => Math.abs(sample.bounds.minY) <= 0.03),
      cleanRuntime: consoleErrors.length === 0 && failedRequests.length === 0,
    },
    dense,
    consoleErrors,
    failedRequests,
  };
  writeFileSync(join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
