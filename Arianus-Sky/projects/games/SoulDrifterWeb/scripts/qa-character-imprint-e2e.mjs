import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/nvm4w/nodejs/node_modules/openclaw/node_modules/playwright-core");
const outputDir = "H:/Projects/AI_Tools_And_Information/The-Nexus-souldrifter-browser/.planning/debug/artifacts/mobile-hud-avatar-regressions/character-imprint-e2e";
mkdirSync(outputDir, { recursive: true });
const baseUrl = "http://127.0.0.1:5174/?debugSeed=2215682322";

const browser = await chromium.launch({
  executablePath: "C:/Users/olawal/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--disable-gpu-sandbox"],
});
const errors = [];
const failedRequests = [];

function watch(page, label) {
  page.on("console", (message) => { if (message.type() === "error") errors.push({ label, text: message.text() }); });
  page.on("requestfailed", (request) => failedRequests.push({ label, url: request.url(), failure: request.failure()?.errorText }));
}

async function completeHumanShadowknight(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("#character-name-input").fill("Marvell Mobile");
  await page.locator("#creation-next").click();
  await page.locator("#creation-back").click();
  await page.waitForSelector("#character-name-input");
  if (await page.locator("#character-name-input").inputValue() !== "Marvell Mobile") throw new Error("Creation Back lost the entered name.");
  await page.locator("#creation-next").click();
  await page.locator('button[data-race="human"]').click();
  await page.locator("#creation-next").click();
  await page.locator('button[data-skin-tone="deep"]').click();
  await page.locator('button[data-hair-style="cropped"]').click();
  await page.locator("#creation-next").click();
  const selectionPortrait = await page.locator('button[data-calling="shadowknight"] img').getAttribute("src");
  if (selectionPortrait !== "/assets/generated/characters/human-shadowknight-highlevel.png") {
    throw new Error(`Human Shadowknight selection portrait is wrong: ${selectionPortrait}`);
  }
  await page.screenshot({ path: join(outputDir, "01-mobile-highlevel-selection.jpg"), type: "jpeg", quality: 86 });
  await page.locator('button[data-calling="shadowknight"]').click();
  await page.locator("#creation-next").click();
  while (!(await page.locator("#creation-confirm").count())) {
    await page.locator("button[data-answer]").first().click();
    await page.locator("#creation-next").click();
  }
  await page.locator("#creation-confirm").click();
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_DEBUG__), null, { timeout: 120_000 });
}

async function completeIlyraAndImprint(page) {
  await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.interact("ilyra"));
  await page.waitForSelector("#dialogue-panel:not([hidden])", { timeout: 30_000 });
  await page.locator("#dialogue-choices button").first().click();
  await page.locator("#dialogue-choices button", { hasText: "Continue" }).click();
  await page.waitForSelector("#storybook-panel:not([hidden])", { timeout: 20_000 });
  const storyBoards = [];
  for (let pageIndex = 0; pageIndex < 7; pageIndex += 1) {
    const hidden = await page.locator("#storybook-panel").getAttribute("hidden");
    if (hidden !== null) break;
    await page.waitForFunction(() => {
      const image = document.querySelector("#storybook-image");
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    }, null, { timeout: 20_000 });
    const board = await page.evaluate(() => {
      const scene = document.querySelector(".storybook-scene");
      const image = document.querySelector("#storybook-image");
      const caption = document.querySelector(".storybook-scene figcaption");
      const sceneRect = scene.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const captionRect = caption.getBoundingClientRect();
      const imageStyle = getComputedStyle(image);
      return {
        title: document.querySelector("#storybook-title")?.textContent ?? "",
        copy: document.querySelector("#storybook-copy")?.textContent ?? "",
        image: {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          objectFit: imageStyle.objectFit,
          transform: imageStyle.transform,
          top: imageRect.top,
          bottom: imageRect.bottom,
        },
        caption: { top: captionRect.top, bottom: captionRect.bottom, scrollHeight: caption.scrollHeight },
        scene: { top: sceneRect.top, bottom: sceneRect.bottom },
      };
    });
    if (board.image.objectFit !== "contain" || board.image.transform !== "none") throw new Error(`Storyboard ${pageIndex + 1} still crops or scales its mobile image.`);
    if (board.image.naturalWidth <= 0 || board.image.naturalHeight <= 0) throw new Error(`Storyboard ${pageIndex + 1} image did not load.`);
    if (board.image.top < board.scene.top - 1 || board.image.bottom > board.caption.top + 1) throw new Error(`Storyboard ${pageIndex + 1} image overlaps its narration.`);
    if (board.caption.bottom > board.scene.bottom + 1) throw new Error(`Storyboard ${pageIndex + 1} narration escapes the mobile scene.`);
    storyBoards.push(board);
    if (pageIndex === 0) {
      await page.waitForTimeout(460);
      await page.screenshot({ path: join(outputDir, "02-mobile-storybook-full-art.jpg"), type: "jpeg", quality: 88 });
    }
    if (pageIndex === 2) await page.screenshot({ path: join(outputDir, "02b-mobile-xar-board.jpg"), type: "jpeg", quality: 88 });
    if (pageIndex === 3) await page.screenshot({ path: join(outputDir, "02c-mobile-haplo-board.jpg"), type: "jpeg", quality: 88 });
    await page.locator("#storybook-next").click();
  }
  if (storyBoards.length !== 7) throw new Error(`Expected seven storyboards, rendered ${storyBoards.length}.`);
  const storyText = storyBoards.map((board) => `${board.title} ${board.copy}`).join(" ");
  for (const identity of ["not gods or demons", "war for control", "most powerful living Patryn", "Haplo opposed his lord", "Alfred", "Marit", "SoulDrifters are dead mensch", "I am Ilyra"]) {
    if (!storyText.includes(identity)) throw new Error(`Storyboard never explains ${identity}.`);
  }
  await page.waitForSelector("#imprint-panel:not([hidden])", { timeout: 20_000 });
  const modalState = await page.evaluate(() => {
    const hud = document.querySelector(".screen-hud-layer");
    const panel = document.querySelector("#imprint-panel");
    const rect = panel.getBoundingClientRect();
    const style = getComputedStyle(hud);
    return {
      hudObscured: hud.classList.contains("is-modal-obscured"),
      hudVisibility: style.visibility,
      panel: { top: rect.top, bottom: rect.bottom, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  if (!modalState.hudObscured || modalState.hudVisibility !== "hidden") throw new Error("Mobile action HUD remained visible over the starter imprint.");
  await page.locator('#imprint-race-options .imprint-option').first().click();
  await page.locator('#imprint-calling-options .imprint-option').first().click();
  for (let point = 0; point < 3; point += 1) await page.getByRole("button", { name: "Add one Might point" }).click();
  const confirm = page.locator("#imprint-confirm");
  await confirm.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outputDir, "02-mobile-imprint-unblocked.jpg"), type: "jpeg", quality: 86 });
  await confirm.click();
  await page.waitForFunction(() => document.querySelector("#imprint-panel")?.hidden === true);
  const perkState = await page.evaluate(() => {
    const buff = document.querySelector("#buff-strip .buff-chip");
    const skill = document.querySelector("#imprint-skill-action");
    const controls = document.querySelector("#combat-controls");
    const rect = controls.getBoundingClientRect();
    return {
      buffHidden: document.querySelector("#buff-strip").hidden,
      buffLabel: buff?.getAttribute("aria-label") ?? "",
      skillHidden: skill.hidden,
      skillName: document.querySelector("#imprint-skill-name")?.textContent ?? "",
      controls: { left: rect.left, right: rect.right, bottom: rect.bottom },
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  if (perkState.buffHidden || !/passive/i.test(perkState.buffLabel)) throw new Error("Selected ancestry boon is not visible as a passive buff.");
  if (perkState.skillHidden || perkState.skillName !== "Grave-Iron Discipline") throw new Error("Selected class discipline is not visible in action slot 5.");
  if (perkState.controls.left < 0 || perkState.controls.right > perkState.viewport.width) throw new Error("Six-slot action bar overflows the mobile viewport.");
  await page.screenshot({ path: join(outputDir, "03-mobile-perk-buff-action.jpg"), type: "jpeg", quality: 86 });
  return { modalState, perkState, storyBoards };
}

async function waitForPreview(page) {
  await page.waitForFunction(async () => new Promise((resolve) => {
    const request = indexedDB.open("souldrifter-story", 3);
    request.onsuccess = () => {
      const db = request.result;
      const get = db.transaction("avatarPreviews", "readonly").objectStore("avatarPreviews").get("active");
      get.onsuccess = () => resolve(typeof get.result?.dataUrl === "string" && get.result.dataUrl.startsWith("data:image/webp"));
      get.onerror = () => resolve(false);
    };
    request.onerror = () => resolve(false);
  }), null, { timeout: 30_000 });
}

async function mobileFlow() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "mobile");
  await completeHumanShadowknight(page);
  const imprint = await completeIlyraAndImprint(page);
  await waitForPreview(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#continue-character");
  const savedImage = await page.locator("#continue-character img").getAttribute("src");
  if (!savedImage?.startsWith("data:image/webp")) throw new Error("Saved-soul selector did not use the live 3D avatar preview.");
  await page.screenshot({ path: join(outputDir, "04-mobile-live-saved-avatar.jpg"), type: "jpeg", quality: 86 });
  await page.locator("#continue-character").click();
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_DEBUG__), null, { timeout: 120_000 });
  if (await page.locator(".fatal-error").count()) throw new Error("Current saved Human Shadowknight crashed on resume.");
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: join(outputDir, "06-mobile-cinematic-lighting.jpg"), type: "jpeg", quality: 88 });
  const resumed = await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.snapshot());
  await context.close();
  return { imprint, savedImagePrefix: savedImage.slice(0, 32), resumedAnimation: resumed.playerAnimation };
}

async function desktopLegacyFlow() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "desktop-legacy");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.evaluate(async () => {
    const profile = {
      name: "Legacy Dwarf",
      raceId: "dwarf",
      raceName: "Dwarf",
      raceGlyph: "D",
      callingId: "shadowknight",
      callingName: "Shadowknight",
      stats: { might: 10, finesse: 7, insight: 6, will: 9, vitality: 11, resonance: 8 },
      skills: ["Weapon Strike", "Siphon Cleave", "Cinder Guard"],
      memoryConsequences: [],
      maxHp: 46,
      maxStability: 94,
      movement: 4,
      onboarding: { ilyraAnswered: true, storybookCompleted: true, storybookPage: 6 },
      starterImprint: {
        allocations: { might: 1, will: 1, vitality: 1 },
        raceBoonId: "dwarf-forgeheart",
        callingPerkId: "shadowknight-graveiron",
        raceBoonName: "Forgeheart",
        callingPerkName: "Grave-Iron Discipline"
      }
    };
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("souldrifter-story", 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("characters")) db.createObjectStore("characters", { keyPath: "id" });
        if (!db.objectStoreNames.contains("avatarPreviews")) db.createObjectStore("avatarPreviews", { keyPath: "id" });
        if (!db.objectStoreNames.contains("inventories")) db.createObjectStore("inventories", { keyPath: "id" });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("characters", "readwrite");
        tx.objectStore("characters").put({ id: "active", profile, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#continue-character");
  const fallback = await page.locator("#continue-character img").getAttribute("src");
  if (fallback !== "/assets/generated/characters/dwarf-shadowknight-highlevel.png") throw new Error(`Legacy fallback portrait is wrong: ${fallback}`);
  await page.locator("#continue-character").click();
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_DEBUG__), null, { timeout: 120_000 });
  if (await page.locator(".fatal-error").count()) throw new Error("Legacy Dwarf Shadowknight crashed on resume.");
  const state = await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.snapshot());
  await page.screenshot({ path: join(outputDir, "05-desktop-legacy-dwarf-resume.jpg"), type: "jpeg", quality: 86 });
  await context.close();
  return { fallback, animation: state.playerAnimation, bounds: state.playerBounds };
}

try {
  const mobile = await mobileFlow();
  const desktopLegacy = await desktopLegacyFlow();
  const ignoredReloadAborts = failedRequests.filter(({ failure, url }) => failure === "net::ERR_ABORTED" && /\/assets\/fonts\//.test(url));
  const relevantFailedRequests = failedRequests.filter((request) => !ignoredReloadAborts.includes(request));
  const report = {
    mobile,
    desktopLegacy,
    checks: {
      currentSavedResume: Boolean(mobile.resumedAnimation),
      legacySavedResume: Boolean(desktopLegacy.animation),
      liveSavedAvatar: mobile.savedImagePrefix.startsWith("data:image/webp"),
      mobileImprintUnblocked: mobile.imprint.modalState.hudVisibility === "hidden",
      passiveBuffVisible: /passive/i.test(mobile.imprint.perkState.buffLabel),
      classActionVisible: mobile.imprint.perkState.skillName === "Grave-Iron Discipline",
      completeMobileStoryboardArt: mobile.imprint.storyBoards.every((board) => board.image.objectFit === "contain" && board.image.transform === "none"),
      identifiedStoryboardCast: mobile.imprint.storyBoards.length === 7,
      cleanRuntime: errors.length === 0 && relevantFailedRequests.length === 0,
    },
    errors,
    failedRequests,
    ignoredReloadAborts,
    relevantFailedRequests,
  };
  writeFileSync(join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
