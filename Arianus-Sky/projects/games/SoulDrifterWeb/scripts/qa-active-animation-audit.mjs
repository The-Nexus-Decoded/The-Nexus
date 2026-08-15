import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/nvm4w/nodejs/node_modules/openclaw/node_modules/playwright-core");

const outputDir = "H:/Projects/AI_Tools_And_Information/The-Nexus-souldrifter-browser/.planning/debug/artifacts/mobile-hud-avatar-regressions/active-animation-audit";
mkdirSync(outputDir, { recursive: true });
const argument = (name, fallback) => {
  const position = process.argv.indexOf(name);
  return position >= 0 ? Number(process.argv[position + 1]) : fallback;
};
const batchStart = argument("--start", 0);
const batchCount = argument("--count", Number.POSITIVE_INFINITY);
const namesPosition = process.argv.indexOf("--names");
const requestedNames = namesPosition >= 0
  ? new Set(String(process.argv[namesPosition + 1] ?? "").split(",").filter(Boolean))
  : null;

const browser = await chromium.launch({
  executablePath: "C:/Users/olawal/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const consoleErrors = [];
const failedRequests = [];
const errorResponses = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }));
page.on("response", (response) => { if (response.status() >= 400 && !response.url().endsWith("favicon.ico")) errorResponses.push({ url: response.url(), status: response.status() }); });

const PHASES = [0, 0.25, 0.5, 0.75, 1];
const clips = [
  { name: "IdleRelaxed", weapon: () => "sheathed", grounded: true },
  { name: "WalkBaseline", weapon: () => "sheathed", grounded: true },
  { name: "RunBaseline", weapon: () => "sheathed", grounded: true },
  { name: "DrawSword", weapon: (phase) => phase < 0.5 ? "sheathed" : "drawn", grounded: true },
  { name: "SheatheSword", weapon: (phase) => phase < 0.5 ? "drawn" : "sheathed", grounded: true },
  { name: "WeaponStrikeBaseline", weapon: () => "drawn", grounded: true },
  { name: "SiphonCleaveBaseline", weapon: () => "drawn", grounded: true },
  { name: "UnarmedPunch", weapon: () => "hidden", grounded: true },
  { name: "UnarmedKick", weapon: () => "hidden", grounded: true },
  { name: "CastWard", weapon: () => "drawn", grounded: true },
  { name: "CastSummon", weapon: () => "sheathed", grounded: true },
  { name: "CastProjectile", weapon: () => "sheathed", grounded: true },
  { name: "DoorOpenInward", weapon: () => "sheathed", grounded: true },
  { name: "DoorOpenOutward", weapon: () => "sheathed", grounded: true },
  { name: "PickupWaist", weapon: () => "sheathed", grounded: true },
  { name: "PickupGround", weapon: () => "sheathed", grounded: true },
  { name: "PullLever", weapon: () => "sheathed", grounded: true },
  { name: "HitReactionMixamo", weapon: () => "drawn", grounded: true },
  { name: "DeathBaseline", weapon: () => "drawn", grounded: true, terminal: true },
];
const auditedClips = requestedNames
  ? clips.filter((clip) => requestedNames.has(clip.name))
  : clips.slice(batchStart, batchStart + batchCount);

async function createCharacter() {
  await page.goto("http://127.0.0.1:5174/?debugSeed=2215682322", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("#character-name-input").fill("Active Animation Audit");
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
  await page.locator('[data-hud-drawer="camera"]').click();
  for (let index = 0; index < 5; index += 1) await page.locator('[data-camera-control="zoom-in"]').click();
  await page.locator('[data-hud-drawer="camera"]').click();
  await page.evaluate(() => {
    const label = document.createElement("div");
    label.id = "animation-audit-label";
    Object.assign(label.style, {
      position: "fixed",
      left: "50%",
      top: "108px",
      transform: "translateX(-50%)",
      zIndex: "200",
      padding: "8px 12px",
      border: "1px solid #d6a84c",
      background: "rgba(3, 12, 13, .88)",
      color: "#f3dfb4",
      font: "700 13px Georgia, serif",
      letterSpacing: ".08em",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    });
    document.body.append(label);
  });
}

try {
  await createCharacter();
  const samples = [];
  for (const clip of auditedClips) {
    const clipDir = join(outputDir, clip.name);
    mkdirSync(clipDir, { recursive: true });
    for (let index = 0; index < PHASES.length; index += 1) {
      const phase = PHASES[index];
      const weapon = clip.weapon(phase);
      await page.evaluate(({ animation, normalizedTime, weaponState }) => {
        window.__SOULDRIFTER_DEBUG__.weapon(weaponState);
        window.__SOULDRIFTER_DEBUG__.pose(animation, normalizedTime);
        document.querySelector("#animation-audit-label").textContent = `${animation} / ${Math.round(normalizedTime * 100)}% / ${weaponState}`;
      }, { animation: clip.name, normalizedTime: phase, weaponState: weapon });
      await page.waitForTimeout(80);
      const state = await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.snapshot());
      await page.screenshot({
        path: join(clipDir, `${String(index).padStart(2, "0")}.jpg`),
        type: "jpeg",
        quality: 84,
      });
      samples.push({
        clip: clip.name,
        phase,
        requestedWeapon: weapon,
        animation: state.playerAnimation,
        weaponState: state.playerWeaponState,
        bounds: state.playerBounds,
        rig: state.playerRigProbe,
      });
    }
  }

  const checks = auditedClips.map((clip) => {
    const clipSamples = samples.filter((sample) => sample.clip === clip.name);
    const minYs = clipSamples.map((sample) => sample.bounds.minY);
    const heights = clipSamples.map((sample) => sample.bounds.height);
    return {
      clip: clip.name,
      selected: clipSamples.every((sample) => sample.animation === clip.name),
      grounded: !clip.grounded || minYs.every((minY) => Math.abs(minY) <= 0.04),
      minYRange: [Math.min(...minYs), Math.max(...minYs)],
      heightRange: [Math.min(...heights), Math.max(...heights)],
      terminalHorizontal: !clip.terminal || clipSamples.at(-1).bounds.horizontalSpan > clipSamples.at(-1).bounds.height,
    };
  });
  const report = {
    outputDir,
    checks,
    allSelected: checks.every((check) => check.selected),
    allGrounded: checks.every((check) => check.grounded),
    terminalDeathReadable: checks.find((check) => check.clip === "DeathBaseline")?.terminalHorizontal === true,
    cleanRuntime: consoleErrors.length === 0 && failedRequests.length === 0 && errorResponses.length === 0,
    samples,
    consoleErrors,
    failedRequests,
    errorResponses,
  };
  writeFileSync(join(outputDir, `report-${batchStart}-${auditedClips.length}.json`), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    outputDir,
    checks,
    allSelected: report.allSelected,
    allGrounded: report.allGrounded,
    terminalDeathReadable: report.terminalDeathReadable,
    cleanRuntime: report.cleanRuntime,
    consoleErrors,
    failedRequests,
    errorResponses,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
