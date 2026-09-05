import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/nvm4w/nodejs/node_modules/openclaw/node_modules/playwright-core");
const outputDir = "H:/Projects/AI_Tools_And_Information/The-Nexus-souldrifter-browser/.planning/debug/artifacts/mobile-hud-avatar-regressions/character-imprint-e2e";
mkdirSync(outputDir, { recursive: true });
const baseUrl = process.env.SOULDRIFTER_BASE_URL ?? "http://127.0.0.1:5176/?debugSeed=2215682322";

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

async function assertAppearancePanel(page, expectedPanel) {
  await page.waitForSelector(`.appearance-builder--${expectedPanel}`);
  const state = await page.evaluate((panel) => {
    const bodyTab = document.querySelector('button[data-appearance-panel="body"]');
    const faceTab = document.querySelector('button[data-appearance-panel="face"]');
    const sectionHidden = (selector) => document.querySelector(selector)?.closest("section")?.hidden ?? null;
    const normalizeText = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const autoRotate = document.querySelector("#appearance-auto-rotate");
    return {
      panel,
      heading: normalizeText(".creation-heading .eyebrow"),
      bodyTabSelected: bodyTab?.getAttribute("aria-selected") === "true",
      faceTabSelected: faceTab?.getAttribute("aria-selected") === "true",
      skinControlsHidden: sectionHidden("button[data-skin-tone]"),
      previewLabel: document.querySelector("#appearance-preview-canvas")?.getAttribute("aria-label") ?? "",
      autoRotateChecked: autoRotate instanceof HTMLInputElement ? autoRotate.checked : null,
      // Phase 0 removed every control that could not change a pixel; the
      // fail-closed assertion is that none of them came back. Hair style and
      // colour left this list when the first validated hair module landed: they
      // are drawn from availability and every button changes the preview.
      deadControlsPresent: Boolean(document.querySelector(
        "button[data-body-type], button[data-face-type], button[data-facial-hair], #appearance-age, #appearance-hair-greying, #appearance-facial-greying",
      )),
      // "rendered" means visible: the face section keeps its controls in the DOM while hidden
      hairTextures: [...document.querySelectorAll("button[data-hair-texture]")]
        .filter((button) => !button.closest("section")?.hidden)
        .map((button) => button.dataset.hairTexture),
      hairStyles: [...document.querySelectorAll("button[data-hair-style]")]
        .filter((button) => !button.closest("section")?.hidden)
        .map((button) => button.dataset.hairStyle),
      hairColours: [...document.querySelectorAll("button[data-hair-color]")].filter((button) => !button.closest("section")?.hidden).length,
      nextLabel: normalizeText("#creation-next"),
      // the dock's Back/Next reach this panel as a station change, so focus must land on its question
      headingFocused: document.activeElement === document.querySelector(".creation-heading h2"),
    };
  }, expectedPanel);
  const facePanel = expectedPanel === "face";
  const failures = [];
  if (state.bodyTabSelected !== !facePanel || state.faceTabSelected !== facePanel) failures.push("workflow tab selection");
  if (state.skinControlsHidden !== !facePanel) failures.push("face-control visibility");
  if (state.deadControlsPresent) failures.push("a withheld appearance control was rendered");
  if (facePanel && !state.hairStyles.includes("parted")) failures.push("the validated parted hair style is not offered under the straight texture");
  if (facePanel && !(state.hairTextures.includes("straight") && state.hairTextures.includes("curly"))) failures.push("the validated hair textures are not offered");
  if (!facePanel && state.hairTextures.length > 0) failures.push("hair texture controls rendered on the body panel");
  if (!facePanel && state.hairStyles.length > 0) failures.push("hair controls rendered on the body panel");
  if (!state.previewLabel.includes(facePanel ? "Close-up preview of your face" : "Full-body preview of the returned body")) failures.push("preview framing label");
  if (!state.nextLabel.includes(facePanel ? "Choose calling" : "Continue to face & features")) failures.push("forward action label");
  if (state.autoRotateChecked !== false) failures.push("auto-rotate default");
  if (failures.length > 0) throw new Error(`${expectedPanel} appearance panel failed: ${failures.join(", ")}. State: ${JSON.stringify(state)}`);
  return state;
}

async function completeHumanShadowknight(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  // The name underline is bronze at one character and soul-teal from the two Bind accepts: a
  // 160 ms flip, polled generously because the fresh page is still parsing the body GLB and
  // the transition cannot start until the main thread is free.
  const underlineColour = () => page.evaluate(() => getComputedStyle(document.querySelector(".name-field__row"), "::after").backgroundColor);
  await page.locator("#character-name-input").fill("M");
  const underlineOneChar = await underlineColour();
  await page.locator("#character-name-input").fill("Ma");
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".name-field__row"), "::after").backgroundColor === "rgb(122, 244, 223)",
    null,
    { timeout: 30_000 },
  ).catch(() => {});
  const underlineTwoChars = await underlineColour();
  await page.locator("#character-name-input").fill("Marvell Mobile");
  await page.locator("#creation-next").click();
  await page.locator("#creation-back").click();
  await page.waitForSelector("#character-name-input");
  if (await page.locator("#character-name-input").inputValue() !== "Marvell Mobile") throw new Error("Creation Back lost the entered name.");
  await page.locator("#creation-next").click();
  await page.waitForSelector('button[data-race="human"]');
  // Ancestry: the one returned body is the only control; the unshaped peoples are notes, never disabled buttons.
  const ancestry = await page.evaluate(() => ({
    raceButtons: document.querySelectorAll("button[data-race]").length,
    notes: document.querySelectorAll('#creation-stage [role="note"]').length,
    disabled: document.querySelectorAll('#creation-stage [disabled], #creation-stage [aria-disabled="true"]').length,
    headingFocused: document.activeElement === document.querySelector(".creation-heading h2"),
  }));
  await page.locator('button[data-race="human"]').click();
  await page.locator("#creation-next").click();
  const bodyPanel = await assertAppearancePanel(page, "body");
  await page.locator("#creation-next").click();
  const facePanel = await assertAppearancePanel(page, "face");
  const loaded = () => document.querySelector("#appearance-preview-status")?.textContent?.startsWith("Human foundation") === true;
  await page.waitForFunction(loaded, null, { timeout: 120_000 });
  const preferredSkin = page.locator('button[data-skin-tone="deep"]:not([disabled])');
  const skinOption = await preferredSkin.count() ? preferredSkin.first() : page.locator('button[data-skin-tone]:not([disabled])').first();
  await skinOption.click();
  const selectedSkin = await skinOption.getAttribute("data-skin-tone");
  if (await skinOption.getAttribute("aria-pressed") !== "true") throw new Error(`Available skin tone did not select: ${selectedSkin}`);
  await page.waitForFunction(loaded, null, { timeout: 120_000 });
  const statusAfterSkin = await page.locator("#appearance-preview-status").textContent();
  if (!statusAfterSkin?.includes("Deep") && selectedSkin === "deep") throw new Error(`Readout did not follow the skin tone: ${statusAfterSkin}`);
  // The skin tint tweens (design §2.2: a 220 ms ease-out of the tone the tint is derived
  // from), so two frames 110 ms apart must differ. Read in real time off the head crop once
  // the face stop has settled: Deep -> Light is the widest step, then back to Deep for the
  // rest of the flow. The readout swaps at the start of the tween, never at its end.
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_CREATOR_DEBUG__?.cueRegion("head")), null, { timeout: 90_000 });
  await page.waitForTimeout(900);
  const skinTween = await page.evaluate(async () => {
    const debug = window.__SOULDRIFTER_CREATOR_DEBUG__;
    const region = debug?.cueRegion("head");
    const light = document.querySelector('button[data-skin-tone="light"]');
    const deep = document.querySelector('button[data-skin-tone="deep"]');
    if (!region || !light || !deep) return null;
    const luma = () => {
      const sample = debug.sampleRegion(region);
      return 0.2126 * sample.r + 0.7152 * sample.g + 0.0722 * sample.b;
    };
    const readout = () => document.querySelector("#appearance-preview-status")?.textContent ?? "";
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let frames = 0;
    let counting = true;
    const count = () => { frames += 1; if (counting) requestAnimationFrame(count); };
    requestAnimationFrame(count);
    const idleBefore = luma();
    await sleep(110);
    const idleDrift = Math.abs(luma() - idleBefore);
    light.click();
    const atPick = luma();
    const readoutAtPick = readout();
    const framesAtPick = frames;
    await sleep(110);
    const at110 = luma();
    const framesAt110 = frames;
    await sleep(490);
    const at600 = luma();
    counting = false;
    deep.click();
    await sleep(400);
    return { region, idleDrift, atPick, at110, at600, readoutAtPick, framesBetween: framesAt110 - framesAtPick, readoutAfter: readout() };
  });
  if (!skinTween) throw new Error("The skin tint tween could not be sampled: no head crop or swatches on the face station.");
  if (!skinTween.readoutAfter.includes("Deep")) throw new Error(`Readout did not return to Deep after the tween sample: ${skinTween.readoutAfter}`);
  await page.locator("#creation-next").click();
  await page.waitForSelector('button[data-calling="shadowknight"]');
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
  return { bodyPanel, facePanel, selectedSkin, ancestry, nameUnderline: { oneChar: underlineOneChar, twoChars: underlineTwoChars }, skinTween };
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
  const appearance = await completeHumanShadowknight(page);
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
  return { appearance, imprint, savedImagePrefix: savedImage.slice(0, 32), resumedAnimation: resumed.playerAnimation };
}

async function desktopLegacyFlow() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "desktop-legacy");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.evaluate(async () => {
    // A legacy non-human save that the ancestry/calling contract (#443) still allows:
    // dwarf + shadowknight became forbidden there, so a save with that pair is
    // legitimately refused at boot and cannot be the resume scenario.
    const profile = {
      name: "Legacy Dwarf",
      raceId: "dwarf",
      raceName: "Dwarf",
      raceGlyph: "D",
      callingId: "warrior",
      callingName: "Warrior",
      stats: { might: 10, finesse: 7, insight: 6, will: 9, vitality: 11, resonance: 8 },
      skills: ["Weapon Strike", "Cleaving Strike", "Anchor Guard"],
      memoryConsequences: [],
      maxHp: 46,
      maxStability: 94,
      movement: 4,
      onboarding: { ilyraAnswered: true, storybookCompleted: true, storybookPage: 6 },
      starterImprint: {
        allocations: { might: 1, will: 1, vitality: 1 },
        raceBoonId: "dwarf-forgeheart",
        callingPerkId: "warrior-vanguard",
        raceBoonName: "Forgeheart",
        callingPerkName: "Vanguard Drill"
      }
    };
    await new Promise((resolve, reject) => {
      // No explicit version: the page has already upgraded the database to the
      // app's current schema, and requesting an older version throws VersionError.
      const request = indexedDB.open("souldrifter-story");
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
  // The persistent stage starts loading the foundation body at boot; reloading
  // mid-load aborts its texture blobs and logs a GLTFLoader error that is the
  // harness's doing, not the runtime's. Wait for the stage the way a player would.
  await page.waitForFunction(() => {
    const preview = window.__souldrifterCreationPreview;
    return Boolean(preview && preview.model && preview.framing);
  }, null, { timeout: 90_000 });
  // The key light rises with the name: the chest crop (the design's 200 px square over the
  // shoulders at the name stop) must move by a mean >= 6/255 per channel and get brighter
  // between an empty field and six characters, after the 700 ms light lerp has settled.
  // The crop exists once the idle has bound the cue joints; the arrival dolly (2.4 s from
  // the figure's first paint) is allowed to end so the camera is not part of the difference.
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_CREATOR_DEBUG__?.cueRegion("shoulders")), null, { timeout: 90_000 });
  await page.waitForTimeout(2_600);
  const keyLight = await page.evaluate(async () => {
    const debug = window.__SOULDRIFTER_CREATOR_DEBUG__;
    const region = debug?.cueRegion("shoulders");
    if (!region) return null;
    const luma = (sample) => 0.2126 * sample.r + 0.7152 * sample.g + 0.0722 * sample.b;
    const before = debug.sampleRegion(region);
    const input = document.querySelector("#character-name-input");
    input.value = "Marvel";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const after = debug.sampleRegion(region);
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return { region, before: { ...before, luma: luma(before) }, after: { ...after, luma: luma(after) } };
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#continue-character");
  const fallback = await page.locator("#continue-character img").getAttribute("src");
  if (fallback !== "/assets/generated/characters/dwarf-warrior.png") throw new Error(`Legacy fallback portrait is wrong: ${fallback}`);
  await page.locator("#continue-character").click();
  await page.waitForFunction(() => Boolean(window.__SOULDRIFTER_DEBUG__), null, { timeout: 120_000 });
  if (await page.locator(".fatal-error").count()) throw new Error("Legacy Dwarf Warrior crashed on resume.");
  const state = await page.evaluate(() => window.__SOULDRIFTER_DEBUG__.snapshot());
  await page.screenshot({ path: join(outputDir, "05-desktop-legacy-dwarf-resume.jpg"), type: "jpeg", quality: 86 });
  await context.close();
  return { fallback, animation: state.playerAnimation, bounds: state.playerBounds, keyLight };
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
      appearanceBodyStep: mobile.appearance.bodyPanel.bodyTabSelected && mobile.appearance.bodyPanel.skinControlsHidden,
      appearanceFaceStep: mobile.appearance.facePanel.faceTabSelected && !mobile.appearance.facePanel.skinControlsHidden,
      appearanceAutoRotateDefaultsOff: !mobile.appearance.bodyPanel.autoRotateChecked && !mobile.appearance.facePanel.autoRotateChecked,
      appearanceNoDeadControls: !mobile.appearance.bodyPanel.deadControlsPresent && !mobile.appearance.facePanel.deadControlsPresent,
      appearanceReadySelections: Boolean(mobile.appearance.selectedSkin),
      nameUnderlineFlipsAtTwoChars: mobile.appearance.nameUnderline.oneChar === "rgb(239, 184, 95)" && mobile.appearance.nameUnderline.twoChars === "rgb(122, 244, 223)",
      nameKeyLightRises: Boolean(desktopLegacy.keyLight?.after.diff)
        && (desktopLegacy.keyLight.after.diff.r + desktopLegacy.keyLight.after.diff.g + desktopLegacy.keyLight.after.diff.b) / 3 >= 6
        && desktopLegacy.keyLight.after.luma > desktopLegacy.keyLight.before.luma,
      ancestryOneBodyThreeNotes: mobile.appearance.ancestry.raceButtons === 1 && mobile.appearance.ancestry.notes === 3 && mobile.appearance.ancestry.disabled === 0,
      stationHeadingFocused: mobile.appearance.ancestry.headingFocused && mobile.appearance.bodyPanel.headingFocused && mobile.appearance.facePanel.headingFocused,
      // Deep -> Light: the head crop is brighter 110 ms after the pick than at it, brighter
      // again once landed, and the tone travels far enough to be the tint and not the idle.
      skinToneTweens: Boolean(mobile.appearance.skinTween)
        && mobile.appearance.skinTween.at110 - mobile.appearance.skinTween.atPick >= 4
        && mobile.appearance.skinTween.at600 - mobile.appearance.skinTween.at110 >= 1
        && mobile.appearance.skinTween.at600 - mobile.appearance.skinTween.atPick >= 20
        && mobile.appearance.skinTween.readoutAtPick.includes("Light"),
      appearanceHairOffered: mobile.appearance.facePanel.hairStyles.includes("parted") && mobile.appearance.facePanel.hairStyles.includes("shaved-buzzed")
        && mobile.appearance.facePanel.hairTextures.includes("straight") && mobile.appearance.facePanel.hairTextures.includes("curly"),
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
