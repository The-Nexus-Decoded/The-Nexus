import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../src/review/weapon-lab/weapon-lab.js", import.meta.url), "utf8")
  .replace(/\r\n/g, "\n");

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Motion Studio source boundary missing: ${startMarker}`);
  return source.slice(start, end);
}

// Execute the real integration handlers without starting WebGL, a browser,
// network requests, or the unrelated human animation/bootstrap pipeline.
const modeSource = section("async function changeReviewMode() {", 'catalogActivitySelect.addEventListener("change"');
const controlSource = section("function updateReviewControls() {", "\nlet renderer;");
const bootstrapSource = section("// The first human load initializes shared playback controls.", "\nconst clock =");
const selectorNames = ["actionSelect", "weaponSetSelect", "reviewModeSelect", "catalogActivitySelect",
  "catalogLocomotionSelect", "catalogWeaponSelect", "catalogActionTypeSelect"];

function element() {
  const listeners = new Map();
  return { hidden: false, disabled: false, value: "", textContent: "", options: [], listeners,
    classList: { toggle: vi.fn() }, addEventListener: (type, listener) => listeners.set(type, listener) };
}

function modeHarness() {
  const scene = new THREE.Scene();
  const model = new THREE.Group(); model.name = "human-model";
  const attachedSocket = new THREE.Group(); attachedSocket.name = "human-attached-socket";
  const transferSocket = new THREE.Group(); transferSocket.name = "world-transfer-bow-socket";
  const projectile = new THREE.Group(); projectile.name = "bow-arrow-projectile-1";
  const stage = new THREE.Group(); stage.name = "mob-stage";
  model.add(attachedSocket);
  const humanRoot = new THREE.Group(); humanRoot.add(model);
  scene.add(humanRoot, transferSocket, projectile, stage);
  const context = {
    ...Object.fromEntries(selectorNames.map((name) => [name, element()])),
    scene, camera: {}, controls: {}, status: element(), playButton: element(),
    ground: { scale: new THREE.Vector3(1, 1, 1) }, humanFactory: {}, document: { querySelector: () => element() },
    combatStudio: null, window: {},
    actor: { root: humanRoot, model, action: { paused: false, getClip: () => ({ name: "BowEquipFromBack" }) },
      sockets: [{ socket: attachedSocket }, { socket: transferSocket }], projectile: { visuals: [projectile] } },
    humanActionBeforeMobs: null, loadoutRevision: 0, playing: false, followGrip: true, followFullBody: true,
    updateReviewControls: vi.fn(), captureActiveActionCalibration: vi.fn(),
    rebuildLoadout: vi.fn(async () => {}), activateAction: vi.fn(), fullView: vi.fn(),
    console: { error: vi.fn() },
  };
  context.reviewModeSelect.value = "mobs";
  context.actionSelect.options = [{ value: "BowEquipFromBack" }];
  context.isMobsMode = () => context.reviewModeSelect.value === "mobs";
  context.isCombatMode = () => context.reviewModeSelect.value === "combat";
  context.createCombatReviewStudio = vi.fn(() => ({ active: false,
    enter: vi.fn(async () => { context.combatStudio.active = true; }),
    leave: vi.fn(() => { context.combatStudio.active = false; }) }));
  context.mobsPanel = { active: false,
    enter: vi.fn(async () => { context.mobsPanel.active = true; }),
    leave: vi.fn(() => { context.mobsPanel.active = false; }) };
  runInNewContext(modeSource, context);
  return { context, scene, change: () => context.reviewModeSelect.listeners.get("change")() };
}

describe("Motion Studio workspace lifecycle", () => {
  it("enters paired review independently and restores solo actions, floor and controls on exit", async () => {
    const { context, change } = modeHarness();
    context.reviewModeSelect.value = "combat"; await change();
    expect(context.createCombatReviewStudio).toHaveBeenCalledOnce();
    expect(context.createCombatReviewStudio.mock.calls[0][0].humanFactory).toBe(context.humanFactory);
    expect(context.combatStudio.enter).toHaveBeenCalledOnce(); expect(context.mobsPanel.leave).toHaveBeenCalledOnce();
    expect(context.actor.root.visible).toBe(false); expect(context.ground.scale.toArray()).toEqual([2, 3, 1]);
    context.reviewModeSelect.value = "mobs"; await change();
    expect(context.combatStudio.leave).toHaveBeenCalledOnce(); expect(context.mobsPanel.enter).toHaveBeenCalledOnce();
    expect(context.captureActiveActionCalibration).toHaveBeenCalledOnce();
    context.reviewModeSelect.value = "weapons"; await change();
    expect(context.actor.root.visible).toBe(true); expect(context.ground.scale.toArray()).toEqual([1, 1, 1]);
    expect(context.activateAction).toHaveBeenCalledWith("BowEquipFromBack");
    expect(context.controls.maxDistance).toBe(14); expect(context.camera.far).toBe(40);
  });

  it("hides detached human transfer sockets and released arrows as well as the model on mob entry", async () => {
    const { context, scene, change } = modeHarness();
    await change();
    const visibleNames = [];
    scene.traverseVisible((object) => { if (object.name) visibleNames.push(object.name); });
    expect(visibleNames).toEqual(["mob-stage"]);
    expect(context.actor.action.paused).toBe(true);
    expect(context.actor.sockets.every(({ socket }) => !socket.visible)).toBe(true);
    expect(context.actor.projectile.visuals.every((visual) => !visual.visible)).toBe(true);
    expect(context.humanActionBeforeMobs).toBe("BowEquipFromBack");
    expect(context.captureActiveActionCalibration).toHaveBeenCalledOnce();
    expect(context.mobsPanel.enter).toHaveBeenCalledOnce();
    expect(context.followGrip).toBe(false);
    expect(context.followFullBody).toBe(false);
  });

  it("rebuilds human equipment and restores its action when returning from mobs", async () => {
    const { context, change } = modeHarness();
    await change();
    context.reviewModeSelect.value = "weapons";
    await change();
    expect(context.mobsPanel.leave).toHaveBeenCalledOnce();
    expect(context.actor.model.visible).toBe(true);
    expect(context.rebuildLoadout).toHaveBeenCalledOnce();
    expect(context.activateAction).toHaveBeenCalledWith("BowEquipFromBack");
    expect(context.playButton.textContent).toBe("Play");
    expect(context.fullView).toHaveBeenCalledOnce();
  });

  it("unlocks every selector after a failed return-to-human load and permits a mob retry", async () => {
    const { context, change } = modeHarness();
    context.reviewModeSelect.value = "weapons";
    context.rebuildLoadout.mockImplementation(async () => {
      for (const name of selectorNames) context[name].disabled = true;
      throw new Error("weapon texture request failed");
    });
    await change();
    expect(selectorNames.every((name) => !context[name].disabled)).toBe(true);
    expect(context.status.textContent).toContain("WORKSPACE ERROR");
    expect(context.status.textContent).toContain("weapon texture request failed");
    expect(context.console.error).toHaveBeenCalledOnce();
    context.reviewModeSelect.value = "mobs";
    await change();
    expect(context.mobsPanel.enter).toHaveBeenCalledOnce();
  });

  it("allows independent mob entry after the initial human asset download fails", async () => {
    const { context, change } = modeHarness();
    context.actor = undefined;
    context.window = {};
    context.humanFactory = { create: vi.fn(async () => { throw new Error("human body unavailable"); }) };
    await runInNewContext(`(async () => { ${bootstrapSource} })()`, context);
    expect(context.reviewModeSelect.disabled).toBe(false);
    expect(context.window.__weaponLab.ready).toBe(false);
    expect(context.status.textContent).toContain("human body unavailable");
    await change();
    expect(context.mobsPanel.enter).toHaveBeenCalledOnce();
    expect(context.console.error).toHaveBeenCalledOnce();
  });
});

function controlsHarness() {
  const nodes = new Map();
  const context = {
    ...Object.fromEntries([...selectorNames, "weaponSetRow", "catalogActivityRow", "catalogLocomotionRow",
      "catalogWeaponRow", "catalogActionTypeRow", "actionLabel", "arrowCountInput", "staffGripRow", "staffGripSelect"]
      .map((name) => [name, element()])),
    document: { querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, element());
      return nodes.get(selector);
    } },
    LOADOUTS: Object.fromEntries(["bow", "sword", "greatsword", "daggers", "staff", "unarmed"]
      .map((name) => [name, { attachments: name === "unarmed" ? [] : [{ role: "primary" }] }])),
  };
  context.isCatalogMode = () => context.reviewModeSelect.value === "catalog";
  context.isMobsMode = () => context.reviewModeSelect.value === "mobs";
  context.isCombatMode = () => context.reviewModeSelect.value === "combat";
  context.twoHandIKAllowed = () => ["greatsword", "staff"].includes(context.weaponSetSelect.value);
  context.staffUsesSupportHand = () => context.actionSelect.value === "StaffAttack";
  runInNewContext(controlSource, context);
  return { context, node: (id) => nodes.get(`#${id}`), refresh: () => context.updateReviewControls() };
}

describe("Motion Studio context-specific controls", () => {
  it("exposes only the paired panel in Combat Review, preserving solo control state", () => {
    const { context, node, refresh } = controlsHarness();
    context.reviewModeSelect.value = "combat"; context.weaponSetSelect.value = "bow"; refresh();
    for (const id of ["humanSelection", "soloActionRow", "studioPlayback", "humanCalibration", "bowControls", "mobSelection", "mobTools", "mobTuning"]) {
      expect(node(id).hidden, id).toBe(true);
    }
    expect(node("combatReview").hidden).toBe(false); expect(context.weaponSetSelect.value).toBe("bow");
    expect(node("studioHint").textContent).toMatch(/not measured contact/);
    context.reviewModeSelect.value = "weapons"; refresh();
    expect(node("studioPlayback").hidden).toBe(false); expect(node("soloActionRow").hidden).toBe(false);
    expect(node("combatReview").hidden).toBe(true); expect(node("bowControls").hidden).toBe(false);
  });

  it("hides every human tuning section in mobs mode and exposes only creature tools", () => {
    const { context, node, refresh } = controlsHarness();
    context.reviewModeSelect.value = "mobs";
    context.weaponSetSelect.value = "bow";
    refresh();
    for (const id of ["bowControls", "humanCalibration", "rightHandSection", "leftHandSection", "twoHandSection", "socketSection"]) {
      expect(node(id).hidden, id).toBe(true);
    }
    for (const id of ["mobSelection", "mobTuning", "mobTools"]) expect(node(id).hidden, id).toBe(false);
    expect(context.weaponSetRow.hidden).toBe(true);
    expect(context.catalogActivityRow.hidden).toBe(true);
    expect(context.arrowCountInput.disabled).toBe(true);
    expect(node("handView").textContent).toBe("Joint view");
    expect(node("actionView").textContent).toBe("Side view");
    expect(node("studioHint").textContent).toContain("drafts until reviewed");
  });

  it.each(["weapons", "locomotion"])("shows only the appropriate %s catalog filters without equipment or mob controls", (activity) => {
    const { context, node, refresh } = controlsHarness();
    context.reviewModeSelect.value = "catalog";
    context.catalogActivitySelect.value = activity;
    context.weaponSetSelect.value = "greatsword";
    refresh();
    expect(context.catalogActivityRow.hidden).toBe(false);
    expect(context.catalogLocomotionRow.hidden).toBe(activity !== "locomotion");
    expect(context.catalogWeaponRow.hidden).toBe(activity !== "weapons");
    expect(context.catalogActionTypeRow.hidden).toBe(activity !== "weapons");
    for (const id of ["humanCalibration", "twoHandSection", "bowControls", "mobSelection", "mobTuning", "mobTools"]) {
      expect(node(id).hidden, id).toBe(true);
    }
    expect(context.actionLabel.textContent).toBe("Source clip");
  });

  it.each([
    ["bow", true, true, false], ["sword", false, false, false],
    ["greatsword", false, true, true], ["daggers", false, true, false],
    ["staff", false, true, true], ["unarmed", false, false, false],
  ])("shows only applicable tuning for human %s", (loadout, bow, leftHand, supportHand) => {
    const { context, node, refresh } = controlsHarness();
    context.reviewModeSelect.value = "weapons";
    context.weaponSetSelect.value = loadout;
    context.actionSelect.value = "StaffAttack";
    refresh();
    expect(node("bowControls").hidden).toBe(!bow);
    expect(context.arrowCountInput.disabled).toBe(!bow);
    expect(node("leftHandSection").hidden).toBe(!leftHand);
    expect(node("twoHandSection").hidden).toBe(!supportHand);
    expect(node("humanCalibration").hidden).toBe(loadout === "unarmed");
    expect(node("rightHandSection").hidden).toBe(loadout === "unarmed");
    expect(node("socketSection").hidden).toBe(loadout === "unarmed");
    expect(context.staffGripRow.hidden).toBe(loadout !== "staff");
    for (const id of ["mobSelection", "mobTuning", "mobTools"]) expect(node(id).hidden, id).toBe(true);
    expect(node("handView").textContent).toBe("Grip view");
  });
});
