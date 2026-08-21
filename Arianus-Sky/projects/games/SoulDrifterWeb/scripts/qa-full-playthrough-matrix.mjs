import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/nvm4w/nodejs/node_modules/openclaw/node_modules/playwright-core");

const ALL_CALLINGS = [
  "warrior",
  "mage",
  "priest",
  "sharpshooter",
  "paladin",
  "summoner",
  "asura",
  "slayer",
  "shadowknight",
];
const DIFFICULTIES = ["wayfarer", "oathbreaker"];
const BASIC_RANGES = { sharpshooter: 5, summoner: 4 };
const SIGNATURE_RANGES = { mage: 4, priest: 4, sharpshooter: 5, paladin: 2, summoner: 4, asura: 4 };
const outputDir = process.env.SOULDRIFTER_QA_OUTPUT
  ?? "H:/CodexData/Temp/souldrifter-448-full-playthrough";
const baseUrl = process.env.SOULDRIFTER_QA_URL
  ?? "http://127.0.0.1:5174/?debugSeed=2215682322";
const qaMode = process.env.SOULDRIFTER_QA_MODE ?? "smoke";
if (!["smoke", "matrix"].includes(qaMode)) throw new Error(`Unknown SOULDRIFTER_QA_MODE: ${qaMode}`);
const rendererMode = process.env.SOULDRIFTER_QA_RENDERER ?? "hardware";
if (!["hardware", "ci-swiftshader"].includes(rendererMode)) throw new Error(`Unknown SOULDRIFTER_QA_RENDERER: ${rendererMode}`);
const defaultCallings = qaMode === "smoke" ? ["mage"] : ALL_CALLINGS;
const defaultDifficulties = qaMode === "smoke" ? ["wayfarer"] : DIFFICULTIES;
const selectedCallings = process.env.SOULDRIFTER_QA_CALLINGS
  ? process.env.SOULDRIFTER_QA_CALLINGS.split(",").map((value) => value.trim()).filter(Boolean)
  : defaultCallings;
const selectedDifficulties = process.env.SOULDRIFTER_QA_DIFFICULTIES
  ? process.env.SOULDRIFTER_QA_DIFFICULTIES.split(",").map((value) => value.trim()).filter(Boolean)
  : defaultDifficulties;
const caseTimeoutMs = Number(process.env.SOULDRIFTER_QA_CASE_TIMEOUT_MS ?? 1_200_000);
const hardwareBrowserPath = process.env.SOULDRIFTER_QA_BROWSER_PATH
  ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const gpuLockPath = "H:/CodexData/Temp/souldrifter-playwright-gpu.lock";

mkdirSync(outputDir, { recursive: true });

async function inspectWebglRenderer(browser) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    return await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) throw new Error("WebGL is unavailable.");
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (!debugInfo) throw new Error("WEBGL_debug_renderer_info is unavailable.");
      return String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    });
  } finally {
    await context.close();
  }
}

function assertHardwareRenderer(renderer) {
  if (/swiftshader|llvmpipe|software/i.test(renderer)) {
    throw new Error(`Hardware QA aborted: software WebGL renderer detected (${renderer}).`);
  }
  if (!renderer.includes("NVIDIA GeForce GTX 1080 Ti")) {
    throw new Error(`Hardware QA aborted: expected NVIDIA GeForce GTX 1080 Ti, received ${renderer}.`);
  }
}

function clearStaleGpuLock() {
  try {
    const lockPid = Number.parseInt(readFileSync(gpuLockPath, "utf8").trim(), 10);
    if (Number.isInteger(lockPid) && lockPid > 0) {
      try {
        process.kill(lockPid, 0);
        return;
      } catch (error) {
        if (error?.code !== "ESRCH") return;
      }
    }
    unlinkSync(gpuLockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function distance(left, right) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function nearestEnemy(snapshot, roomId) {
  return snapshot.enemies
    .filter((enemy) => enemy.alive && enemy.roomId === roomId)
    .sort((left, right) => distance(snapshot.player, left) - distance(snapshot.player, right))[0];
}

async function createCharacter(page, callingId) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("#character-name-input").fill(`QA ${callingId}`);
  await page.locator("#creation-next").click();
  await page.locator('button[data-race="human"]').click();
  await page.locator("#creation-next").click();
  await page.locator('button[data-skin-tone="umber"]').click();
  await page.locator('button[data-hair-style="cropped"]').click();
  await page.locator('button[data-hair-color="dark-brown"]').click();
  await page.locator("#creation-next").click();
  await page.locator(`button[data-calling="${callingId}"]`).click();
  await page.locator("#creation-next").click();
  while (!(await page.locator("#creation-confirm").count())) {
    await page.locator("button[data-answer]").first().click();
    await page.locator("#creation-next").click();
  }
  await page.locator("#creation-confirm").click();
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_DEBUG__), null, { timeout: 120_000 });
}

async function inspectPaperDoll(page, callingId, difficulty) {
  await page.evaluate(() => document.querySelector("#equipment-toggle-mobile")?.click());
  await page.waitForSelector("#equipment-panel:not([hidden])");
  const state = await page.evaluate(() => {
    const slotText = (id) => document.querySelector(`#slot-${id} strong`)?.textContent?.trim() ?? "";
    const canvas = document.querySelector("#paper-doll-canvas");
    return {
      identity: document.querySelector("#paper-identity")?.textContent?.trim() ?? "",
      slots: Object.fromEntries(["head", "body", "legs", "feet", "mainHand", "offHand"].map((id) => [id, slotText(id)])),
      canvas: canvas instanceof HTMLCanvasElement
        ? { width: canvas.width, height: canvas.height }
        : { width: 0, height: 0 },
    };
  });
  for (const requiredSlot of ["body", "legs", "feet", "mainHand"]) {
    if (!state.slots[requiredSlot] || state.slots[requiredSlot] === "Empty") {
      throw new Error(`${callingId}/${difficulty}: paper-doll ${requiredSlot} slot is empty.`);
    }
  }
  if (state.canvas.width < 2 || state.canvas.height < 2) {
    throw new Error(`${callingId}/${difficulty}: paper-doll canvas did not initialize.`);
  }
  await page.screenshot({
    path: join(outputDir, `${callingId}-${difficulty}-paper-doll.jpg`),
    type: "jpeg",
    quality: 82,
  });
  await page.evaluate(() => document.querySelector("#equipment-close")?.click());
  return state;
}

async function snapshot(page) {
  return page.evaluate(() => window.__SOULDRIFTER_DEBUG__.snapshot());
}

async function act(page, action) {
  await page.evaluate(async (selectedAction) => {
    const bridge = window.__SOULDRIFTER_DEBUG__;
    const reactionPoll = window.setInterval(() => bridge.activeBlock(), 25);
    try {
      await bridge.action(selectedAction);
    } finally {
      window.clearInterval(reactionPoll);
    }
  }, action);
}

async function moveToward(page, target, basicRange) {
  const before = await snapshot(page);
  await act(page, "move");
  await page.evaluate(async (id) => window.__SOULDRIFTER_DEBUG__.approachTarget(id), target.id);
  const after = await snapshot(page);
  return distance(before.player, after.player) > 0 && distance(after.player, target) <= Math.max(1, basicRange);
}

async function retreatFrom(page, target) {
  const before = await snapshot(page);
  await act(page, "move");
  await page.evaluate(async (id) => window.__SOULDRIFTER_DEBUG__.retreatFromTarget(id), target.id);
  const after = await snapshot(page);
  return distance(after.player, target) > distance(before.player, target);
}

async function clearEncounter(page, callingId, roomId) {
  const basicRange = BASIC_RANGES[callingId] ?? 1;
  const signatureRange = SIGNATURE_RANGES[callingId] ?? 1;
  const prefersMelee = callingId === "priest" && roomId === "skirmish";
  const observations = [];
  let previousRespawnGeneration = (await snapshot(page)).respawnGeneration;
  console.log(`[qa] ${callingId} ${roomId}: combat started`);

  for (let turn = 1; turn <= 90; turn += 1) {
    let state = await snapshot(page);
    if (state.encounter === "none") {
      console.log(`[qa] ${callingId} ${roomId}: cleared in ${turn - 1} turns`);
      return { turns: turn - 1, observations };
    }
    if (turn === 1 || turn % 10 === 0) {
      const checkpointTarget = nearestEnemy(state, roomId);
      console.log(`[qa] ${callingId} ${roomId}: turn ${turn}, hp ${state.player.hp}/${state.player.maxHp}, bands ${state.recoveryCharges}, target hp ${checkpointTarget?.hp ?? 0}`);
    }
    if (state.respawnGeneration !== previousRespawnGeneration) {
      throw new Error(`${callingId}: died during ${roomId} on turn ${turn}. Last actions: ${JSON.stringify(observations.slice(-8))}`);
    }
    previousRespawnGeneration = state.respawnGeneration;
    const target = nearestEnemy(state, roomId);
    if (!target) throw new Error(`${callingId}: ${roomId} has no living target but encounter did not finish.`);
    await page.evaluate(async (id) => window.__SOULDRIFTER_DEBUG__.target(id), target.id);
    state = await snapshot(page);
    const targetDistance = distance(state.player, target);

    if (callingId === "priest"
      && state.player.hp / state.player.maxHp <= 0.62
      && state.player.stability >= 8
      && observations.at(-1)?.action !== "mending-ward") {
      await act(page, "guard");
      observations.push({ turn, action: "mending-ward", hp: state.player.hp, stability: state.player.stability, target: target.id });
      continue;
    }

    const recoveryThreshold = callingId === "priest" ? 0.42 : 0.52;
    if (state.player.hp / state.player.maxHp <= recoveryThreshold && state.recoveryCharges > 0) {
      await act(page, "wait");
      observations.push({ turn, action: "recover", hp: state.player.hp, stability: state.player.stability, target: target.id });
      continue;
    }

    if (!prefersMelee && signatureRange > 1 && targetDistance <= 2) {
      const retreated = await retreatFrom(page, target);
      state = await snapshot(page);
      if (!retreated) {
        await act(page, state.player.stability >= 8 ? "guard" : "wait");
        observations.push({ turn, action: "blocked-retreat", hp: state.player.hp, target: target.id });
        continue;
      }
    }

    state = await snapshot(page);
    if (!prefersMelee && signatureRange > basicRange && state.player.stability < 12) {
      await act(page, "wait");
      observations.push({ turn, action: "center-soul", hp: state.player.hp, stability: state.player.stability, target: target.id });
      continue;
    }

    state = await snapshot(page);
    const movedTarget = state.enemies.find((enemy) => enemy.id === target.id) ?? target;
    const combatRange = prefersMelee ? basicRange : state.player.stability >= 12 ? signatureRange : basicRange;
    if (distance(state.player, movedTarget) > combatRange) {
      const moved = await moveToward(page, target, combatRange);
      state = await snapshot(page);
      const updatedTarget = state.enemies.find((enemy) => enemy.id === target.id) ?? target;
      if (distance(state.player, updatedTarget) > combatRange) {
        const passingAction = state.player.stability >= 8 ? "guard" : "wait";
        await act(page, passingAction);
        observations.push({ turn, action: moved ? `move-${passingAction}` : passingAction, hp: state.player.hp, target: target.id });
        continue;
      }
    }

    state = await snapshot(page);
    const liveTarget = state.enemies.find((enemy) => enemy.id === target.id && enemy.alive) ?? nearestEnemy(state, roomId);
    if (!liveTarget) continue;
    const useSignature = state.player.stability >= 12
      && distance(state.player, liveTarget) <= signatureRange
      && (!prefersMelee || turn % 3 === 0);
    await act(page, useSignature ? "signature" : "basic");
    const after = await snapshot(page);
    observations.push({
      turn,
      action: useSignature ? "signature" : "basic",
      hp: after.player.hp,
      stability: after.player.stability,
      resource: after.player.resource,
      target: liveTarget.id,
      targetHp: after.enemies.find((enemy) => enemy.id === liveTarget.id)?.hp ?? 0,
      playerAnimation: after.playerAnimation,
    });
  }
  throw new Error(`${callingId}: ${roomId} did not clear in 90 turns.`);
}

async function restBetweenEncounters(page) {
  const observations = [];
  for (let rest = 1; rest <= 8; rest += 1) {
    const before = await snapshot(page);
    if (before.player.hp === before.player.maxHp
      && before.player.stability === before.player.maxStability
      && before.player.resource === 100) break;
    await act(page, "wait");
    const after = await snapshot(page);
    observations.push({
      rest,
      hp: after.player.hp,
      stability: after.player.stability,
      resource: after.player.resource,
      recoveryCharges: after.recoveryCharges,
    });
    await page.waitForTimeout(2_500);
  }
  return observations;
}

async function runPlaythrough(browser, callingId, difficulty) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    void context.close().catch(() => undefined);
  }, caseTimeoutMs);
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  try {
    await createCharacter(page, callingId);
    await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.setCombatSpeed(8));
    const paperDoll = await inspectPaperDoll(page, callingId, difficulty);
    await page.evaluate(async (selectedDifficulty) => {
      const bridge = window.__SOULDRIFTER_DEBUG__;
      bridge.prepareTrialGate();
      await bridge.selectTrial(selectedDifficulty);
      await bridge.prepareCorridor();
    }, difficulty);
    const start = await snapshot(page);
    if (start.trialDifficulty !== difficulty) throw new Error(`Trial selected ${start.trialDifficulty}, expected ${difficulty}.`);
    const skirmish = await clearEncounter(page, callingId, "skirmish");
    const afterSkirmish = await snapshot(page);
    await page.screenshot({
      path: join(outputDir, `${callingId}-${difficulty}-skirmish-cleared.jpg`),
      type: "jpeg",
      quality: 82,
    });
    const rest = await restBetweenEncounters(page);
    await page.evaluate(async () => window.__SOULDRIFTER_DEBUG__.prepareBoss());
    const boss = await clearEncounter(page, callingId, "boss");
    await page.screenshot({
      path: join(outputDir, `${callingId}-${difficulty}-boss-defeated.jpg`),
      type: "jpeg",
      quality: 82,
    });
    await page.evaluate(async () => {
      await window.__SOULDRIFTER_DEBUG__.interact("first-memory");
      await window.__SOULDRIFTER_DEBUG__.interact("first-memory");
    });
    const completed = await snapshot(page);
    if (!completed.complete || !completed.ascended) {
      throw new Error(`${callingId}/${difficulty}: completion failed (complete=${completed.complete}, ascended=${completed.ascended}).`);
    }
    await page.screenshot({
      path: join(outputDir, `${callingId}-${difficulty}-ascended.jpg`),
      type: "jpeg",
      quality: 82,
    });
    return {
      callingId,
      difficulty,
      status: "passed",
      paperDoll,
      start: { hp: start.player.hp, stability: start.player.stability, enemies: start.enemies.filter((enemy) => enemy.alive && enemy.roomId === "skirmish").length },
      afterSkirmish: { hp: afterSkirmish.player.hp, stability: afterSkirmish.player.stability, recoveryCharges: afterSkirmish.recoveryCharges },
      rest,
      skirmish,
      boss,
      completion: { complete: completed.complete, ascended: completed.ascended },
      consoleErrors,
      failedRequests,
    };
  } catch (error) {
    const caseError = timedOut
      ? new Error(`${callingId}/${difficulty}: exceeded the ${caseTimeoutMs} ms per-case timeout.`)
      : error;
    const failedState = await snapshot(page).catch(() => null);
    await page.screenshot({
      path: join(outputDir, `${callingId}-${difficulty}-failure.jpg`),
      type: "jpeg",
      quality: 82,
      fullPage: true,
    }).catch(() => undefined);
    return {
      callingId,
      difficulty,
      status: "failed",
      error: caseError instanceof Error ? caseError.stack : String(caseError),
      failedState,
      consoleErrors,
      failedRequests,
    };
  } finally {
    clearTimeout(timeoutId);
    await context.close().catch(() => undefined);
  }
}

const results = [];
let browser;
let gpuLockFd;
let renderer = "not inspected";
try {
  if (rendererMode === "hardware") {
    clearStaleGpuLock();
    try {
      gpuLockFd = openSync(gpuLockPath, "wx");
      writeFileSync(gpuLockFd, `${process.pid}\n`);
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new Error(`Another SoulDrifter hardware QA process owns ${gpuLockPath}. GPU QA is single-instance; do not start a second matrix.`);
      }
      throw error;
    }
  }

  const launchOptions = rendererMode === "hardware"
    ? {
      executablePath: hardwareBrowserPath,
      headless: false,
      args: ["--enable-webgl", "--use-angle=d3d11", "--enable-gpu-rasterization", "--ignore-gpu-blocklist"],
    }
    : {
      headless: true,
      args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader"],
    };
  browser = await chromium.launch(launchOptions);
  renderer = await inspectWebglRenderer(browser);
  console.log(`[qa] WebGL renderer: ${renderer}`);
  if (rendererMode === "hardware") assertHardwareRenderer(renderer);

  for (const callingId of selectedCallings) {
    for (const difficulty of selectedDifficulties) {
      const result = await runPlaythrough(browser, callingId, difficulty);
      results.push(result);
      console.log(`${result.status.toUpperCase()} ${callingId}/${difficulty}${result.error ? `: ${result.error.split("\n")[0]}` : ""}`);
    }
  }
} finally {
  await browser?.close().catch(() => undefined);
  if (gpuLockFd !== undefined) closeSync(gpuLockFd);
  if (rendererMode === "hardware") {
    try {
      unlinkSync(gpuLockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  qaMode,
  rendererMode,
  renderer,
  caseTimeoutMs,
  selectedCallings,
  selectedDifficulties,
  passed: results.filter((result) => result.status === "passed").length,
  failed: results.filter((result) => result.status === "failed").length,
  results,
};
writeFileSync(join(outputDir, "playthrough-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, outputDir }, null, 2));
if (report.failed > 0) process.exitCode = 1;
