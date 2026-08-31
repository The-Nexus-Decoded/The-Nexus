import { createHumanReviewActorFactory, findBone } from "./human-review-actor.js";
import {
  BOW_STRIKE_NAME, GREATSWORD_TWO_HAND_SHEATHE_NAME, ACTION_PRESETS, LOADOUTS,
  PREVIEW_TEXTURE_URLS, CATALOG_ACTIVITIES, CATALOG_LOCOMOTION, CATALOG_WEAPONS,
  CATALOG_WEAPON_ACTIONS, CATALOG_LOADOUT, sourcePrefix,
} from "./human-review-catalog.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { staffUsesSupportHand } from "./staff-grip.js";
import { MobsPanel } from "./mobs-panel.ts";
import { createCombatReviewStudio } from "./combat-review-studio.js";
import { createReviewShadowRig } from "./review-shadow-rig.ts";
import { ReviewPropsPanel } from "./review-props-panel.ts";

const LIVE_CALIBRATION_URL = "./assets/weapon-lab/live-calibration.json";
const LIVE_CALIBRATION_ENABLED = import.meta.env.DEV
  && new URLSearchParams(location.search).get("liveCalibration") === "1";
const status = document.querySelector("#status");
const reviewModeSelect = document.querySelector("#reviewMode");
const weaponSetSelect = document.querySelector("#weaponSet");
const weaponSetRow = document.querySelector("#weaponSetRow");
const catalogActivitySelect = document.querySelector("#catalogActivity");
const catalogActivityRow = document.querySelector("#catalogActivityRow");
const catalogLocomotionSelect = document.querySelector("#catalogLocomotion");
const catalogLocomotionRow = document.querySelector("#catalogLocomotionRow");
const catalogWeaponSelect = document.querySelector("#catalogWeapon");
const catalogWeaponRow = document.querySelector("#catalogWeaponRow");
const catalogActionTypeSelect = document.querySelector("#catalogActionType");
const catalogActionTypeRow = document.querySelector("#catalogActionTypeRow");
const actionLabel = document.querySelector("#actionLabel");
const actionSelect = document.querySelector("#action");
const staffGripSelect = document.querySelector("#staffGripStyle");
const staffGripRow = document.querySelector("#staffGripRow");
const staffGripTransition = { from: { spread: 0, roll: 0 }, to: { spread: 0, roll: 0 }, start: 0 };
function currentStaffGripStyle() {
  const t = THREE.MathUtils.smoothstep(performance.now() - staffGripTransition.start, 0, 700);
  return { spread: THREE.MathUtils.lerp(staffGripTransition.from.spread, staffGripTransition.to.spread, t), roll: THREE.MathUtils.lerp(staffGripTransition.from.roll, staffGripTransition.to.roll, t) };
}
const arrowCountInput = document.querySelector("#arrowCount");
const minimumBowRangeInput = document.querySelector("#minimumBowRange");
const timeInput = document.querySelector("#time");
const speedInput = document.querySelector("#speed");
const loopInput = document.querySelector("#loop");
const playButton = document.querySelector("#play");
const gripInputs = {
  Index: document.querySelector("#indexCurl"),
  Middle: document.querySelector("#middleCurl"),
  Ring: document.querySelector("#ringCurl"),
  Pinky: document.querySelector("#pinkyCurl"),
};
const thumbInput = document.querySelector("#thumb");
const leftGripInputs = {
  Index: document.querySelector("#leftIndexCurl"),
  Middle: document.querySelector("#leftMiddleCurl"),
  Ring: document.querySelector("#leftRingCurl"),
  Pinky: document.querySelector("#leftPinkyCurl"),
};
const leftThumbInput = document.querySelector("#leftThumb");
const twoHandEnabledInput = document.querySelector("#twoHandEnabled");
const twoHandTargetInputs = {
  x: document.querySelector("#twoHandTargetX"),
  y: document.querySelector("#twoHandTargetY"),
  z: document.querySelector("#twoHandTargetZ"),
};
const twoHandWristInputs = {
  x: document.querySelector("#twoHandWristX"),
  y: document.querySelector("#twoHandWristY"),
  z: document.querySelector("#twoHandWristZ"),
};
const socketInputs = {
  x: document.querySelector("#socketX"),
  y: document.querySelector("#socketY"),
  z: document.querySelector("#socketZ"),
  rx: document.querySelector("#rotationX"),
  ry: document.querySelector("#rotationY"),
  rz: document.querySelector("#rotationZ"),
  scale: document.querySelector("#weaponScale"),
};

for (const [key, loadout] of Object.entries(LOADOUTS)) {
  weaponSetSelect.add(new Option(loadout.label, key));
}

function isCatalogMode() {
  return reviewModeSelect.value === "catalog";
}

function isMobsMode() {
  return reviewModeSelect.value === "mobs";
}

function isCombatMode() {
  return reviewModeSelect.value === "combat";
}

function activeLoadout() {
  return isCatalogMode() ? CATALOG_LOADOUT : LOADOUTS[weaponSetSelect.value];
}

function catalogFilter(definitions, key) {
  return definitions.find((definition) => definition.key === key) ?? definitions[0];
}

function catalogClips(
  activityKey = catalogActivitySelect.value,
  weaponKey = catalogWeaponSelect.value,
  actionTypeKey = catalogActionTypeSelect.value,
  locomotionKey = catalogLocomotionSelect.value,
) {
  const activity = catalogFilter(CATALOG_ACTIVITIES, activityKey);
  const weapon = catalogFilter(CATALOG_WEAPONS, weaponKey);
  const actionType = catalogFilter(CATALOG_WEAPON_ACTIONS, actionTypeKey);
  const locomotion = catalogFilter(CATALOG_LOCOMOTION, locomotionKey);
  return [...(actor?.clips?.keys() ?? [])].filter((clipName) => (
    activity.matches(clipName)
      && (activity.key !== "weapons" || (weapon.matches(clipName) && actionType.matches(clipName)))
      && (activity.key !== "locomotion" || locomotion.matches(clipName))
  ));
}

function replaceCountedOptions(select, definitions, countForDefinition) {
  const previousValue = select.value;
  select.replaceChildren();
  for (const definition of definitions) {
    const count = countForDefinition(definition);
    if (!count) continue;
    select.add(new Option(`${definition.label} — ${count}`, definition.key));
  }
  if ([...select.options].some(({ value }) => value === previousValue)) select.value = previousValue;
}

function populateCatalogFilters() {
  replaceCountedOptions(
    catalogActivitySelect,
    CATALOG_ACTIVITIES,
    ({ key }) => catalogClips(key, "all", "all", "all").length,
  );
  replaceCountedOptions(
    catalogLocomotionSelect,
    CATALOG_LOCOMOTION,
    ({ key }) => catalogClips("locomotion", "all", "all", key).length,
  );
  replaceCountedOptions(
    catalogWeaponSelect,
    CATALOG_WEAPONS,
    ({ key }) => catalogClips("weapons", key, "all").length,
  );
  replaceCountedOptions(
    catalogActionTypeSelect,
    CATALOG_WEAPON_ACTIONS,
    ({ key }) => catalogClips("weapons", catalogWeaponSelect.value, key).length,
  );
}

function updateReviewControls() {
  const catalogMode = isCatalogMode();
  const mobsMode = isMobsMode();
  const combatMode = isCombatMode();
  const weaponMode = !catalogMode && !mobsMode && !combatMode;
  const bow = weaponMode && weaponSetSelect.value === "bow";
  const hasEquipment = weaponMode && Boolean(LOADOUTS[weaponSetSelect.value]?.attachments.length);
  const supportHand = weaponMode && twoHandIKAllowed();
  const weaponCatalog = catalogMode && catalogActivitySelect.value === "weapons";
  const locomotionCatalog = catalogMode && catalogActivitySelect.value === "locomotion";
  weaponSetRow.hidden = !weaponMode;
  document.querySelector("#humanSelection").hidden = !weaponMode && !catalogMode;
  document.querySelector("#soloActionRow").hidden = combatMode;
  document.querySelector("#studioPlayback").hidden = combatMode;
  document.querySelector("#studioSelectionSummary").hidden = combatMode;
  document.querySelector("#combatReview").hidden = !combatMode;
  document.querySelector("#reviewProps").hidden = !combatMode;
  catalogActivityRow.hidden = !catalogMode;
  catalogLocomotionRow.hidden = !locomotionCatalog;
  catalogWeaponRow.hidden = !weaponCatalog;
  catalogActionTypeRow.hidden = !weaponCatalog;
  actionLabel.textContent = isCatalogMode() ? "Source clip" : "Action";
  arrowCountInput.disabled = !bow;
  document.querySelector("#bowControls").hidden = !bow;
  document.querySelector("#humanCalibration").hidden = !hasEquipment;
  document.querySelector("#rightHandSection").hidden = !hasEquipment;
  document.querySelector("#leftHandSection").hidden = !hasEquipment || !(bow || supportHand || weaponSetSelect.value === "daggers");
  document.querySelector("#twoHandSection").hidden = !supportHand;
  document.querySelector("#socketSection").hidden = !hasEquipment;
  for (const id of ["mobSelection", "mobTuning", "mobTools"]) document.querySelector(`#${id}`).hidden = !mobsMode;
  document.querySelector("#actionView").textContent = mobsMode ? "Side view" : "Action view";
  document.querySelector("#handView").textContent = mobsMode ? "Joint view" : "Grip view";
  document.querySelector("#studioHint").textContent = combatMode
    ? "Independent actors share one timeline. Manual response cues are not measured contact. Source motions and unreviewed bindings remain explicitly labeled."
    : mobsMode
    ? "Inspect the current dungeon creatures using their real rigs. Pose offsets are isolated per model and action, and remain drafts until reviewed."
    : catalogMode
      ? "Unmodified human motion library. Choose an activity, then an action. Equipment and grip tuning are hidden in this workspace."
      : bow
        ? "Bow, arrow, quiver and hand contacts are reviewed together. Minimum range is a combat contract; this studio previews the motion."
        : "Choose equipment and an action, then inspect the hands and full-body motion. Only settings relevant to this loadout are shown.";
  const leftTitle = document.querySelector("#leftHandSection summary");
  if (leftTitle) leftTitle.textContent = bow ? "Left hand · bow grip" : supportHand ? "Left hand · support grip" : "Left hand · offhand grip";
  staffGripRow.hidden = !weaponMode || weaponSetSelect.value !== "staff" || !staffUsesSupportHand(actionSelect.value);
  staffGripSelect.disabled = !staffUsesSupportHand(actionSelect.value);
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "default" });
} catch (error) {
  status.textContent = `WEBGL ERROR\n${error}`;
  throw error;
}
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  status.textContent = "WEBGL CONTEXT LOST\nClose the other 3D preview tab, then reload this page.";
});
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151b);
scene.add(new THREE.HemisphereLight(0xc8ddff, 0x1e1813, 2.2));
const keyLight = new THREE.DirectionalLight(0xffe6ca, 5.2);
keyLight.position.set(2.5, 4.5, 4);
const shadowRig = createReviewShadowRig(renderer, keyLight);
scene.add(keyLight, keyLight.target);
const rimLight = new THREE.DirectionalLight(0x86b6ff, 3.1);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(48, 48),
  new THREE.MeshStandardMaterial({ color: 0x20262f, roughness: 0.94 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.02, 40);
camera.position.set(0, 1.3, 4.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 0.45;
controls.maxDistance = 14;
controls.target.set(0, 1.05, 0);


let actor;
const humanFactory = createHumanReviewActorFactory({ maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
let mobsPanel = null;
let combatStudio = null;
let propsPanel = null;
let humanActionBeforeMobs = null;
let playing = true;
let loadoutRevision = 0;
let appliedCalibrationRevision = -1;
let applyingCalibration = false;
let followGrip = false;
let followFullBody = true;
let followedTargetReady = false;
let twoHandIKEnabled = twoHandEnabledInput.checked;
let activeActionCalibrationKey = null;
const followGripOffset = new THREE.Vector3(-1.8, 0.35, 1.8);
const followFullBodyOffset = new THREE.Vector3(0.15, 0.3, 6.35);
const followedTarget = new THREE.Vector3();
const followDelta = new THREE.Vector3();
const twoHandGripTarget = new THREE.Vector3(-0.024, -0.09, 0.016);
const twoHandWristCorrection = new THREE.Euler(0.4, 0, 0, "XYZ");

function syncHumanSettings() {
  if (!actor) return;
  actor.updateSettings({
    normalizedTime: Number(timeInput.value), arrowCount: Number(arrowCountInput.value),
    staffGrip: currentStaffGripStyle(),
    calibration: {
      grip: gripInputValues(gripInputs, thumbInput),
      leftGrip: gripInputValues(leftGripInputs, leftThumbInput),
      socket: actor.primary ? Object.fromEntries(Object.entries(socketInputs).map(([key, input]) => [key, Number(input.value)])) : null,
      twoHandLock: { enabled: twoHandIKEnabled, target: twoHandGripTarget.toArray(),
        wrist: [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z] },
    },
  });
}
function twoHandIKAllowed(name) { return actor?.reviewTools.twoHandIKAllowed(name) ?? false; }
function updateSocketFromControls() { syncHumanSettings(); actor?.reviewTools.updateSocketFromControls(); }
function setAttachmentTransform(role, transform) { return actor?.setAttachmentTransform(role, transform) ?? false; }
function removeOverlay(value) { value?.reviewTools.removeOverlay(value); }
function removeTwoHandIK(value) { value?.reviewTools.removeTwoHandIK(value); }
function applyOverlay(value) { syncHumanSettings(); value?.reviewTools.applyOverlay(value); }
function applyTwoHandIK(value) { syncHumanSettings(); value?.reviewTools.applyTwoHandIK(value); }
function updateBowInventoryPreview() {
  syncHumanSettings();
  const state = actor?.reviewTools.updateBowInventoryPreview();
  if (state) document.querySelector("#arrowCountOut").textContent = `${state.inventory} / 100`;
}
function enforceMountedArtifactClearance(value) { return value?.reviewTools.enforceMountedArtifactClearance(value); }

function setSocketControls(attachment) {
  const position = attachment?.position ?? [0, 0, 0];
  const rotation = attachment?.rotation ?? [0, 0, 0];
  for (const input of Object.values(socketInputs)) input.disabled = !attachment;
  socketInputs.x.value = position[0]; socketInputs.y.value = position[1]; socketInputs.z.value = position[2];
  socketInputs.rx.value = rotation[0]; socketInputs.ry.value = rotation[1]; socketInputs.rz.value = rotation[2];
  socketInputs.scale.value = 1;
  updateOutputs();
  updateSocketFromControls();
}

function gripInputValues(inputs, thumb) {
  return {
    ...Object.fromEntries(Object.entries(inputs).map(([finger, input]) => [finger, Number(input.value)])),
    thumb: Number(thumb.value),
  };
}

function writeGripInputs(inputs, thumb, values) {
  for (const [finger, input] of Object.entries(inputs)) input.value = values[finger] ?? 0;
  thumb.value = values.thumb ?? 0;
}


function captureActiveActionCalibration() {
  if (!activeActionCalibrationKey || !actor?.action) return;
  syncHumanSettings();
  actor.setCalibration({}, { remember: true });
}

function restoreActionCalibration(clipName) {
  const state = actor.getCalibration(clipName);
  activeActionCalibrationKey = actor.snapshot().calibrationKey;
  writeGripInputs(gripInputs, thumbInput, state.grip);
  writeGripInputs(leftGripInputs, leftThumbInput, state.leftGrip);
  twoHandIKEnabled = Boolean(state.twoHandLock.enabled);
  twoHandEnabledInput.checked = twoHandIKEnabled;
  twoHandEnabledInput.disabled = !twoHandIKAllowed(clipName);
  twoHandGripTarget.fromArray(state.twoHandLock.target);
  twoHandWristCorrection.set(...state.twoHandLock.wrist, "XYZ");
  [twoHandTargetInputs.x.value, twoHandTargetInputs.y.value, twoHandTargetInputs.z.value] = state.twoHandLock.target;
  [twoHandWristInputs.x.value, twoHandWristInputs.y.value, twoHandWristInputs.z.value] = state.twoHandLock.wrist;
  if (state.socket && actor.primary) {
    for (const [keyName, input] of Object.entries(socketInputs)) input.value = state.socket[keyName];
    updateSocketFromControls();
  } else {
    setSocketControls(null);
  }
  updateOutputs();
}


async function rebuildLoadout() {
  const revision = ++loadoutRevision;
  captureActiveActionCalibration();
  activeActionCalibrationKey = null;
  actionSelect.replaceChildren();
  for (const select of [actionSelect, weaponSetSelect, reviewModeSelect, catalogActivitySelect,
    catalogLocomotionSelect, catalogWeaponSelect, catalogActionTypeSelect]) select.disabled = true;
  const loadout = activeLoadout();
  status.textContent = `Loading ${loadout.label}\n${[...new Set(loadout.attachments.map(({ asset }) => asset))].join(" + ")}\nOnly this set is attached; source resources are cached and shared.`;
  const loaded = await actor.setLoadout(weaponSetSelect.value, { mode: isCatalogMode() ? "catalog" : "equipment" });
  if (!loaded || revision !== loadoutRevision) return;
  const visible = isCatalogMode() ? new Set(catalogClips()) : null;
  for (const action of actor.actions()) {
    if (!visible || visible.has(action.id)) actionSelect.add(new Option(action.label, action.id));
  }
  if (!actionSelect.options.length) throw new Error("No source animations matched the current human review filters.");
  for (const select of [actionSelect, weaponSetSelect, reviewModeSelect, catalogActivitySelect,
    catalogLocomotionSelect, catalogWeaponSelect, catalogActionTypeSelect]) select.disabled = false;
  updateReviewControls();
  activateAction(actionSelect.value);
  fullView();
}

function activateAction(clipName) {
  captureActiveActionCalibration();
  actor.selectAction(clipName, { playing, loop: loopInput.checked, speed: Number(speedInput.value) });
  timeInput.value = 0;
  restoreActionCalibration(clipName);
  updateReviewControls();
  updateStatus();
}

function updateOutputs() {
  for (const input of [
    ...Object.values(gripInputs), thumbInput,
    ...Object.values(leftGripInputs), leftThumbInput,
    ...Object.values(twoHandTargetInputs), ...Object.values(twoHandWristInputs),
    timeInput, ...Object.values(socketInputs),
  ]) {
    const output = document.querySelector(`#${input.id}Out`);
    if (output) output.textContent = Number(input.value).toFixed(input === socketInputs.scale ? 2 : 3);
  }
  document.querySelector("#speedOut").textContent = `${Number(speedInput.value).toFixed(1)}x`;
  document.querySelector("#minimumBowRangeOut").textContent = `${Number(minimumBowRangeInput.value).toFixed(1)}m`;
}

function updateStatus() {
  if (isMobsMode() || isCombatMode()) return;
  if (!actor?.action) return;
  const loadout = activeLoadout();
  const selectionSummary = document.querySelector("#studioSelectionSummary");
  if (selectionSummary) selectionSummary.textContent = `${loadout.label} / ${actionSelect.selectedOptions[0]?.textContent ?? ""}`;
  const attachments = actor.sockets.map(({ asset, bone, activeBone, activePose, role }) => `${role}:${asset}@${activeBone ?? bone}[${activePose ?? "fixed"}]`).join(" | ") || "none";
  const primarySocket = actor.primary
    ? `position=[${[socketInputs.x, socketInputs.y, socketInputs.z].map((input) => Number(input.value).toFixed(3)).join(", ")}]m euler=[${[socketInputs.rx, socketInputs.ry, socketInputs.rz].map((input) => Number(input.value).toFixed(3)).join(", ")}]rad scale=${Number(socketInputs.scale.value).toFixed(2)}`
    : "none (unarmed)";
  status.textContent = [
    `reviewMode=${isCatalogMode() ? "human-animation-catalog" : "human-weapons"}`,
    `loadout=${loadout.label}`,
    `sourceGroup=${sourcePrefix(actor.action.getClip().name)} catalogFilters=${isCatalogMode() ? `${catalogActivitySelect.value}/${catalogLocomotionSelect.value}/${catalogWeaponSelect.value}/${catalogActionTypeSelect.value}` : "n/a"}`,
    `progression=${loadout.progression ?? "starter"}`,
    `animationMatch=${loadout.match}`,
    `action=${actionSelect.options[actionSelect.selectedIndex]?.text ?? actionSelect.value}`,
    `missingActions=${loadout.missing ?? "none"}`,
    `playback=${playing ? "playing" : "paused"} speed=${Number(speedInput.value).toFixed(1)}x normalizedTime=${Number(timeInput.value).toFixed(3)}`,
    `attachments=${attachments}`,
    `previewTextures=${actor.sockets.map(({ asset }) => `${asset}:${PREVIEW_TEXTURE_URLS[asset] ? "embedded-baseColor-2k" : "source-material"}`).join(" | ") || "none"}`,
    `primarySocket ${primarySocket}`,
    `rightGrip index/middle/ring/pinky=[${Object.values(gripInputs).map((input) => Number(input.value).toFixed(3)).join(", ")}] thumb=${Number(thumbInput.value).toFixed(3)}`,
    `leftGrip index/middle/ring/pinky=[${Object.values(leftGripInputs).map((input) => Number(input.value).toFixed(3)).join(", ")}] thumb=${Number(leftThumbInput.value).toFixed(3)}`,
    ...(!isCatalogMode() && weaponSetSelect.value === "bow" ? [
      `bowInventory total=${actor.arrowBundle?.totalInventory ?? Number(arrowCountInput.value)} inQuiver=${actor.arrowBundle?.displayedInQuiver ?? 0} handArrows=${actor.arrowBundle?.handArrowCount ?? 0} firedArrows=${actor.arrowBundle?.firedArrowCount ?? 0} projectileDistance=${actor.projectile?.distanceMeters?.toFixed(2) ?? "0.00"}m`,
      `bowCombat minimumRangedDistance=${Number(minimumBowRangeInput.value).toFixed(1)}m closeRangeFallbacks=[bow-strike, swap-to-melee]`,
    ] : []),
    `twoHandLock enabled=${twoHandIKEnabled} active=${twoHandIKEnabled && twoHandIKAllowed()} target=[${twoHandGripTarget.toArray().map((value) => value.toFixed(3)).join(", ")}] wrist=[${[twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z].map((value) => value.toFixed(3)).join(", ")}]`,
    `calibrationKey=${activeActionCalibrationKey}`,
    ...(weaponSetSelect.value === "staff" && !isCatalogMode() ? [`staffGripStyle=${staffGripSelect.value} support=${staffUsesSupportHand(actionSelect.value) ? "two-hand fighting" : "source free-hand / caster"}`] : []),
    `placeholderAssetGate=PASS`,
    "source=#435 preserved Smart Mesh GLBs | animation=Human Foundation V2 library",
  ].join("\n");
  window.__weaponLab = {
    ready: true,
    reviewMode: reviewModeSelect.value,
    loadout: isCatalogMode() ? "catalog" : weaponSetSelect.value,
    action: actionSelect.value,
    playing,
    normalizedTime: Number(timeInput.value),
    preset: ACTION_PRESETS[actionSelect.value]?.name ?? "per-action-calibration",
    calibrationKey: activeActionCalibrationKey,
    catalog: {
      totalClips: actor.clips.size,
      sourceClips: actor.sourceClipCount,
      authoredGapClips: actor.authoredGapCount,
      activity: catalogActivitySelect.value,
      locomotionType: catalogLocomotionSelect.value,
      weapon: catalogWeaponSelect.value,
      actionType: catalogActionTypeSelect.value,
      visibleClips: actionSelect.options.length,
    },
    progression: loadout.progression ?? "starter",
    animationMatch: loadout.match,
    combatRules: {
      minimumBowRangeMeters: Number(minimumBowRangeInput.value),
      insideMinimumBowRange: [BOW_STRIKE_NAME, "swap-to-melee"],
    },
    attachments: actor.sockets.map(({ asset, bone, activeBone, activePose, role, socket, visual }) => ({
      asset,
      bone: activeBone ?? bone,
      pose: activePose ?? "fixed",
      role,
      position: socket.position.toArray().map((value) => value * actor.model.scale.x),
      rotation: [socket.rotation.x, socket.rotation.y, socket.rotation.z],
      scale: visual.scale.x,
    })),
    setAttachment: setAttachmentTransform,
    getHandPose: (side = "Left") => Object.fromEntries([...actor.bones]
      .filter(([name]) => name.includes(`${side}Hand`)).map(([name, bone]) => [name, bone.quaternion.toArray()])),
    setWeaponAssetView: (visibleBody = false) => {
      actor.model.traverse((mesh) => { if (mesh.isSkinnedMesh) mesh.visible = visibleBody; });
      if (!actor.primary) return;
      const box = new THREE.Box3().setFromObject(actor.primary.visual, true);
      followGrip = false;
      followFullBody = false;
      setFollowView(box.getCenter(new THREE.Vector3()), new THREE.Vector3(0, 0.15, box.getSize(new THREE.Vector3()).length() * 2), 35);
    },
    setHandGrip: (side, values) => {
      const inputs = side === "Left" ? leftGripInputs : gripInputs;
      const thumb = side === "Left" ? leftThumbInput : thumbInput;
      writeGripInputs(inputs, thumb, { ...gripInputValues(inputs, thumb), ...values });
    },
    setWeaponHandView: (side = "Right", offset = [-0.4, 0.1, 0.5], fov = 32) => {
      const hand = findBone(actor.bones, `${side}Hand`);
      if (!hand) return;
      followGrip = false;
      followFullBody = false;
      setFollowView(hand.getWorldPosition(new THREE.Vector3()), new THREE.Vector3().fromArray(offset), fov);
    },
    getWeaponHandContacts: () => actor.sockets.filter((record) => ["primary", "offhand"].includes(record.role))
      .flatMap((record) => {
        const contacts = [actor.reviewTools.weaponHandContactMetrics(actor, record, record.bone.startsWith("Left") ? "Left" : "Right")];
        if (record.asset === "staff" && twoHandIKEnabled && twoHandIKAllowed()) contacts.push(actor.reviewTools.weaponHandContactMetrics(actor, record, "Left", actor.staffGripFit?.supportAlongShaft ?? twoHandGripTarget.y));
        if (record.asset === "mace" && twoHandIKEnabled && twoHandIKAllowed()) contacts.push(actor.reviewTools.weaponHandContactMetrics(actor, record, "Left", 0.24));
        return contacts;
      }),
    setGripView: (offset = [1.5, 0.3, 1.5], fov = 35) => handView(offset, fov),
    setBowGripView: (offset = [0.55, 0.12, 0.55], fov = 30) => {
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      if (!bow) return;
      followGrip = false;
      followFullBody = false;
      setFollowView(bow.socket.getWorldPosition(new THREE.Vector3()), new THREE.Vector3().fromArray(offset), fov);
    },
    setBowHandPose: ({ position, rotation } = {}) => {
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      if (!bow?.poses?.hand) return null;
      if (position) bow.poses.hand.position = [...position];
      if (rotation) bow.poses.hand.rotation = [...rotation];
      actor.reviewTools.applyAttachmentPose(bow, "hand");
      return { position: [...bow.poses.hand.position], rotation: [...bow.poses.hand.rotation] };
    },
    setLeftGrip: (values = {}) => {
      writeGripInputs(leftGripInputs, leftThumbInput, {
        ...gripInputValues(leftGripInputs, leftThumbInput),
        ...values,
      });
      return gripInputValues(leftGripInputs, leftThumbInput);
    },
    setActionView: actionView,
    setBackView: backView,
    setQuiverView: (offset = [0.75, 0.08, -1.65], fov = 32) => {
      if (!actor.arrowBundle) return;
      const target = actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone().multiplyScalar(0.55));
      followGrip = false;
      followFullBody = false;
      setFollowView(target, new THREE.Vector3().fromArray(offset), fov);
    },
    getArrowBundleTransform: () => ({
      position: actor.arrowBundle?.socket.position.toArray().map((value) => value * actor.model.scale.x) ?? null,
      rotation: actor.arrowBundle
        ? [actor.arrowBundle.socket.rotation.x, actor.arrowBundle.socket.rotation.y, actor.arrowBundle.socket.rotation.z]
        : null,
    }),
    setArrowBundleTransform: ({ position, rotation } = {}) => {
      if (!actor.setArrowBundleTransform({ position, rotation })) return null;
      updateBowInventoryPreview();
      return window.__weaponLab.getArrowBundleTransform();
    },
    getQuiverMeshBounds: () => {
      const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
      if (!quiver) return [];
      const bounds = [];
      quiver.visual.traverse((object) => {
        if (!object.isMesh) return;
        const box = new THREE.Box3().setFromObject(object, true);
        bounds.push({
          name: object.name,
          center: box.getCenter(new THREE.Vector3()).toArray(),
          size: box.getSize(new THREE.Vector3()).toArray(),
        });
      });
      return bounds;
    },
    getCameraState: () => ({
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      distance: camera.position.distanceTo(controls.target),
      followMode: followGrip ? "grip" : followFullBody ? "full" : "free",
    }),
    setTwoHandIKEnabled: (enabled) => {
      twoHandIKEnabled = Boolean(enabled);
      twoHandEnabledInput.checked = twoHandIKEnabled;
      return twoHandIKEnabled;
    },
    setTwoHandTarget: (offset) => {
      twoHandGripTarget.fromArray(offset);
      [twoHandTargetInputs.x.value, twoHandTargetInputs.y.value, twoHandTargetInputs.z.value] = twoHandGripTarget.toArray();
      updateOutputs();
      return twoHandGripTarget.toArray();
    },
    setTwoHandWrist: (euler) => {
      twoHandWristCorrection.fromArray([...euler, "XYZ"]);
      [twoHandWristInputs.x.value, twoHandWristInputs.y.value, twoHandWristInputs.z.value] = [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z];
      updateOutputs();
      return [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z];
    },
    getBowMetrics: () => {
      actor.model.updateMatrixWorld(true);
      const rightHand = findBone(actor.bones, "RightHand");
      const leftHand = findBone(actor.bones, "LeftHand");
      const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      const handArrow = actor.sockets.find(({ role, asset }) => role === "ammo" && asset === "arrow");
      const openingWorld = quiver && actor.arrowBundle?.quiverOpeningLocal
        ? quiver.socket.localToWorld(actor.arrowBundle.quiverOpeningLocal.clone())
        : null;
      const pickupWorld = actor.arrowBundle?.pickupLocal
        ? actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone())
        : null;
      const handWorld = rightHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const drawNockWorld = actor.reviewTools.drawFingerNockWorld(actor);
      const headWorld = findBone(actor.bones, "Head")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const spineWorld = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightUpperArmWorld = findBone(actor.bones, "RightArm")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightElbowWorld = findBone(actor.bones, "RightForeArm")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightThumbWorld = (findBone(actor.bones, "RightHandThumb3")
        ?? findBone(actor.bones, "RightHandThumb2"))?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightIndexWorld = (findBone(actor.bones, "RightHandIndex3")
        ?? findBone(actor.bones, "RightHandIndex2"))?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightElbowAngleDegrees = rightUpperArmWorld && rightElbowWorld && handWorld
        ? THREE.MathUtils.radToDeg(
          rightUpperArmWorld.clone().sub(rightElbowWorld).angleTo(handWorld.clone().sub(rightElbowWorld)),
        )
        : null;
      const handArrowNockWorld = handArrow
        ? handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0))
        : null;
      const handArrowFeatherGripWorld = handArrow
        ? handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y + 0.075, 0))
        : null;
      const handArrowTipWorld = handArrow
        ? handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.max.y, 0))
        : null;
      const leftHandWorld = leftHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const leftFingerBases = ["LeftHandIndex1", "LeftHandMiddle1", "LeftHandRing1", "LeftHandPinky1"]
        .map((name) => findBone(actor.bones, name)?.getWorldPosition(new THREE.Vector3()))
        .filter(Boolean);
      const leftFingerBaseCenterWorld = leftFingerBases.length
        ? leftFingerBases.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / leftFingerBases.length)
        : null;
      const leftPalmGripTargetWorld = leftHandWorld && leftFingerBaseCenterWorld
        ? leftHandWorld.clone().lerp(leftFingerBaseCenterWorld, 0.68)
        : null;
      const leftPalmGripTargetInHand = leftHand && leftPalmGripTargetWorld
        ? leftHand.worldToLocal(leftPalmGripTargetWorld.clone()).multiplyScalar(actor.model.scale.x)
        : null;
      const bowGripWorld = bow?.socket.getWorldPosition(new THREE.Vector3()) ?? null;
      const handArrowDirection = handArrowNockWorld && handArrowTipWorld
        ? handArrowTipWorld.clone().sub(handArrowNockWorld).normalize()
        : null;
      const arrowTipBeyondBowGripMeters = handArrowTipWorld && bowGripWorld && handArrowDirection
        ? handArrowTipWorld.clone().sub(bowGripWorld).dot(handArrowDirection)
        : null;
      const transformSignature = (object) => {
        if (!object) return null;
        object.updateMatrixWorld(true);
        return object.matrixWorld.elements.map((value) => value.toFixed(6)).join(",");
      };
      const backPose = bow?.poses?.back;
      const backBone = backPose ? findBone(actor.bones, backPose.bone) : null;
      const backGripWorld = backBone && backPose
        ? backBone.localToWorld(new THREE.Vector3().fromArray(backPose.position).multiplyScalar(1 / actor.model.scale.x))
        : null;
      const bowStrikeGripWorld = bow
        ? bow.socket.localToWorld(new THREE.Vector3(0, -0.09, 0.02))
        : null;
      const harnessStrapBounds = actor.quiverHarness?.straps?.map((mesh) => {
        const bounds = new THREE.Box3().setFromObject(mesh, true);
        return {
          name: mesh.name,
          centerWorld: bounds.getCenter(new THREE.Vector3()).toArray(),
          sizeMeters: bounds.getSize(new THREE.Vector3()).toArray(),
        };
      }) ?? [];
      return {
        bowPose: bow?.activePose ?? null,
        bowBone: bow?.activeBone ?? null,
        handArrowVisible: actor.arrowBundle?.handArrowVisible ?? false,
        handArrowCount: actor.arrowBundle?.handArrowCount ?? 0,
        displayedInQuiver: actor.arrowBundle?.displayedInQuiver ?? 0,
        arrowBundleVisibleInstanceCount: actor.arrowBundle?.meshes[0]?.count ?? 0,
        arrowBundleIndependent: Boolean(actor.arrowBundle && quiver && actor.arrowBundle.socket.parent !== quiver.socket),
        arrowBundleParentName: actor.arrowBundle?.socket.parent?.name ?? null,
        quiverParentName: quiver?.socket.parent?.name ?? null,
        arrowBundleWorldSignature: transformSignature(actor.arrowBundle?.socket),
        quiverWorldSignature: transformSignature(quiver?.socket),
        projectileVisible: actor.projectile?.visuals.some((visual) => visual.visible) ?? false,
        projectileCount: actor.projectile?.visuals.filter((visual) => visual.visible).length ?? 0,
        projectileDistanceMeters: actor.projectile?.distanceMeters ?? 0,
        rightHandToQuiverMouthMeters: handWorld && openingWorld ? handWorld.distanceTo(openingWorld) : null,
        rightHandToQuiverPickupMeters: handWorld && pickupWorld ? handWorld.distanceTo(pickupWorld) : null,
        drawNockToQuiverMouthMeters: drawNockWorld && openingWorld ? drawNockWorld.distanceTo(openingWorld) : null,
        drawNockToQuiverPickupMeters: drawNockWorld && pickupWorld ? drawNockWorld.distanceTo(pickupWorld) : null,
        handArrowNockToQuiverPickupMeters: handArrowNockWorld && pickupWorld ? handArrowNockWorld.distanceTo(pickupWorld) : null,
        handArrowNockToDrawNockMeters: handArrowNockWorld && drawNockWorld ? handArrowNockWorld.distanceTo(drawNockWorld) : null,
        handArrowFeatherGripToDrawNockMeters: handArrowFeatherGripWorld && drawNockWorld
          ? handArrowFeatherGripWorld.distanceTo(drawNockWorld)
          : null,
        rightElbowAngleDegrees,
        rightGripPinchSpreadMeters: rightThumbWorld && rightIndexWorld
          ? rightThumbWorld.distanceTo(rightIndexWorld)
          : null,
        handArrowHighestPointAboveHeadMeters: headWorld && handArrowNockWorld && handArrowTipWorld
          ? Math.max(handArrowNockWorld.y, handArrowTipWorld.y) - headWorld.y
          : null,
        drawNockBelowSpineMeters: spineWorld && drawNockWorld ? spineWorld.y - drawNockWorld.y : null,
        bowStringPulled: actor.bowString?.pulled ?? false,
        bowStringPullAlpha: actor.bowString?.pullAlpha ?? 0,
        bowStringNockErrorMeters: actor.bowString?.nockErrorMeters ?? null,
        minimumQuiverBodyClearanceMeters: actor.reviewTools.minimumQuiverBodyClearance(actor),
        minimumHarnessBodyClearanceMeters: actor.reviewTools.minimumHarnessBodyClearance(actor),
        artifactBodyClearances: actor.reviewTools.artifactBodyClearanceMetrics(actor),
        handArrowBodyClearanceMeters: actor.reviewTools.minimumHandArrowBodyClearance(actor, handArrow),
        handArrowCollisionMode: actor.reviewTools.handArrowCollisionMode(actor),
        handArrowWristClearanceMeters: actor.reviewTools.minimumHandArrowWristClearance(actor, handArrow),
        handArrowDirection: handArrowDirection?.toArray() ?? null,
        handArrowLengthMeters: handArrow?.prepared.normalizedBounds.getSize(new THREE.Vector3()).y ?? null,
        handArrowRadialDiameterMeters: handArrow
          ? Math.max(
            handArrow.prepared.normalizedBounds.getSize(new THREE.Vector3()).x,
            handArrow.prepared.normalizedBounds.getSize(new THREE.Vector3()).z,
          )
          : null,
        bowHandleRadialDiameterMeters: bow
          ? Math.max(
            bow.prepared.normalizedBounds.getSize(new THREE.Vector3()).x,
            bow.prepared.normalizedBounds.getSize(new THREE.Vector3()).z,
          ) * bow.visual.scale.x
          : null,
        bowGripToWristMeters: bowGripWorld && leftHandWorld ? bowGripWorld.distanceTo(leftHandWorld) : null,
        bowGripToPalmChannelMeters: bowGripWorld && leftPalmGripTargetWorld
          ? bowGripWorld.distanceTo(leftPalmGripTargetWorld)
          : null,
        leftPalmGripTargetWorld: leftPalmGripTargetWorld?.toArray() ?? null,
        leftPalmGripTargetInHand: leftPalmGripTargetInHand?.toArray() ?? null,
        bowGripWorld: bowGripWorld?.toArray() ?? null,
        bowHandleContact: actor.reviewTools.bowHandleContactMetrics(actor, bow),
        quiverHarnessVisible: actor.quiverHarness?.mesh.visible ?? false,
        quiverHarnessStrapCount: actor.quiverHarness?.strapCount ?? 0,
        quiverHarnessFit: actor.quiverHarness?.fitDiagnostic ?? null,
        quiverHarnessStrapBounds: harnessStrapBounds,
        quiverHarnessClearanceDiagnostic: actor.reviewTools.harnessBodyClearanceMetrics(actor),
        arrowTipBeyondBowGripMeters,
        bowStrike: {
          actionName: BOW_STRIKE_NAME,
          selected: actor.action?.getClip().name === BOW_STRIKE_NAME,
          windupEnd: actor.bowStrikeTiming.windupEnd,
          contactNormalizedTime: actor.bowStrikeTiming.contact,
          recoverStart: actor.bowStrikeTiming.recoverStart,
          atContact: actor.action?.getClip().name === BOW_STRIKE_NAME
            && Math.abs(Number(timeInput.value) - actor.bowStrikeTiming.contact) <= 0.035,
          rightHandGripErrorMeters: bowStrikeGripWorld && handWorld
            ? bowStrikeGripWorld.distanceTo(handWorld)
            : null,
          minimumRangedDistanceMeters: Number(minimumBowRangeInput.value),
          fallbackOptions: ["bow-strike", "swap-to-melee"],
        },
        quiverBundleMaxRadiusMeters: actor.arrowBundle?.bundleRadiusMeters ?? null,
        quiverBundleLocalSignature: actor.arrowBundle?.localSignature ?? null,
        arrowBundleMaxRadiusMeters: actor.arrowBundle?.bundleRadiusMeters ?? null,
        arrowBundleLocalSignature: actor.arrowBundle?.localSignature ?? null,
        quiverPickupWorld: pickupWorld?.toArray() ?? null,
        drawNockWorld: drawNockWorld?.toArray() ?? null,
        drawNockInQuiver: quiver && drawNockWorld ? quiver.socket.worldToLocal(drawNockWorld.clone()).toArray() : null,
        drawNockInSpine: drawNockWorld ? findBone(actor.bones, "Spine2")?.worldToLocal(drawNockWorld.clone()).toArray() ?? null : null,
        quiverPickupInSpine: pickupWorld ? findBone(actor.bones, "Spine2")?.worldToLocal(pickupWorld.clone()).toArray() ?? null : null,
        actorScale: actor.model.scale.x,
        rightShoulderWorld: findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        leftShoulderWorld: findBone(actor.bones, "LeftShoulder")?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        leftHandToBackBowGripMeters: leftHandWorld && backGripWorld ? leftHandWorld.distanceTo(backGripWorld) : null,
      };
    },
    getGripMetrics: () => {
      if (!actor.primary) return { unarmed: true, targetErrorMeters: null };
      actor.model.updateMatrixWorld(true);
      const rightHand = findBone(actor.bones, "RightHand");
      const leftHand = findBone(actor.bones, "LeftHand");
      const socket = actor.primary.socket;
      const rightWorld = rightHand.getWorldPosition(new THREE.Vector3());
      const leftWorld = leftHand.getWorldPosition(new THREE.Vector3());
      const targetWorld = socket.localToWorld(twoHandGripTarget.clone());
      return {
        rightWorld: rightWorld.toArray(),
        leftWorld: leftWorld.toArray(),
        rightInSocket: socket.worldToLocal(rightWorld.clone()).toArray(),
        leftInSocket: socket.worldToLocal(leftWorld.clone()).toArray(),
        targetInSocket: twoHandGripTarget.toArray(),
        wristCorrection: [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z],
        targetErrorMeters: leftWorld.distanceTo(targetWorld),
      };
    },
    getArtifactCollisionMetrics: () => ({
      clearances: actor.reviewTools.artifactBodyClearanceMetrics(actor),
      corrections: enforceMountedArtifactClearance(actor),
    }),
    getGreatswordMetrics: () => {
      if (!actor.primary || actor.primary.asset !== "longsword") return { active: false };
      actor.model.updateMatrixWorld(true);
      const socket = actor.primary.socket;
      const state = actor.greatswordSheathe;
      const rightHand = findBone(actor.bones, "RightHand");
      const leftHand = findBone(actor.bones, "LeftHand");
      const rightShoulder = findBone(actor.bones, "RightShoulder");
      const spine = findBone(actor.bones, "Spine2");
      const head = findBone(actor.bones, "Head");
      const rightWorld = rightHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const leftWorld = leftHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const hiltWorld = socket.getWorldPosition(new THREE.Vector3());
      const rightTargetWorld = state
        ? socket.localToWorld(state.rightGripLocal.clone())
        : hiltWorld.clone();
      const leftTargetWorld = socket.localToWorld(state?.leftGripLocal ?? twoHandGripTarget.clone());
      const bladeTipWorld = socket.localToWorld(
        new THREE.Vector3(0, actor.primary.prepared.targetLength * 0.9, 0),
      );
      return {
        active: actor.action?.getClip().name === GREATSWORD_TWO_HAND_SHEATHE_NAME,
        durationSeconds: actor.action?.getClip().duration ?? null,
        pose: actor.primary.activePose,
        socketParentName: socket.parent?.name ?? null,
        hiltWorld: hiltWorld.toArray(),
        hiltInSpine: spine ? spine.worldToLocal(hiltWorld.clone()).toArray() : null,
        bladeTipWorld: bladeTipWorld.toArray(),
        bladeDirection: bladeTipWorld.clone().sub(hiltWorld).normalize().toArray(),
        minimumBladeBodyClearanceMeters: actor.reviewTools.minimumGreatswordBodyClearance(actor, hiltWorld, bladeTipWorld),
        rightShoulderWorld: rightShoulder?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        headWorld: head?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        rightHandErrorMeters: rightWorld ? rightWorld.distanceTo(rightTargetWorld) : null,
        leftHandErrorMeters: leftWorld ? leftWorld.distanceTo(leftTargetWorld) : null,
      };
    },
  };
}

function setFollowView(target, offset, fov) {
  followedTarget.copy(target);
  followedTargetReady = true;
  controls.target.copy(target);
  camera.position.copy(target).add(offset);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  controls.update();
}

function translateFollowTarget(target) {
  if (!followedTargetReady) {
    followedTarget.copy(target);
    followedTargetReady = true;
    return;
  }
  followDelta.copy(target).sub(followedTarget);
  camera.position.add(followDelta);
  controls.target.add(followDelta);
  followedTarget.copy(target);
}

function fullView() {
  followGrip = false;
  followFullBody = true;
  const hips = actor ? findBone(actor.bones, "Hips") : null;
  const target = hips?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.05, 0);
  setFollowView(target, followFullBodyOffset, 44);
}

function backView() {
  followGrip = false;
  followFullBody = true;
  const hips = actor ? findBone(actor.bones, "Hips") : null;
  const target = hips?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.05, 0);
  setFollowView(target, new THREE.Vector3(0.15, 0.3, -6.35), 44);
}

function handTarget() {
  const hands = [findBone(actor.bones, "RightHand"), findBone(actor.bones, "LeftHand")].filter(Boolean);
  return hands.reduce((sum, bone) => sum.add(bone.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).multiplyScalar(1 / hands.length);
}

function handView(offset = [1.5, 0.3, 1.5], fov = 35) {
  if (!actor) return;
  const target = handTarget();
  followGrip = true;
  followFullBody = false;
  followGripOffset.fromArray(offset);
  setFollowView(target, followGripOffset, fov);
}

function actionView() {
  handView([-1.8, 0.35, 1.8], 40);
}

function setPlaying(next) {
  if (isCombatMode()) { combatStudio?.setPlaying(next); return; }
  if (isMobsMode()) { mobsPanel?.setPlaying(next); return; }
  playing = next;
  if (playing) (isCatalogMode() ? fullView() : actionView());
  if (actor?.action) actor.action.paused = !playing;
  playButton.textContent = playing ? "Pause" : "Play";
  playButton.classList.toggle("active", playing);
  updateStatus();
}

async function applyLiveCalibration(calibration) {
  if (!actor || calibration.revision === appliedCalibrationRevision) return;
  applyingCalibration = true;
  try {
    if (calibration.reviewMode && calibration.reviewMode !== reviewModeSelect.value) {
      reviewModeSelect.value = calibration.reviewMode;
      updateReviewControls();
      await rebuildLoadout();
    }
    const catalogFilterChanged = [
      ["catalogActivity", catalogActivitySelect],
      ["catalogLocomotion", catalogLocomotionSelect],
      ["catalogWeapon", catalogWeaponSelect],
      ["catalogActionType", catalogActionTypeSelect],
    ].some(([property, select]) => {
      if (!calibration[property] || calibration[property] === select.value) return false;
      select.value = calibration[property];
      return true;
    });
    if (catalogFilterChanged && isCatalogMode()) {
      populateCatalogFilters();
      updateReviewControls();
      await rebuildLoadout();
    }
    if (calibration.loadout && (isCatalogMode() || calibration.loadout !== weaponSetSelect.value)) {
      reviewModeSelect.value = "weapons";
      weaponSetSelect.value = calibration.loadout;
      updateReviewControls();
      await rebuildLoadout();
    }
    if (calibration.action && actor.clips.has(calibration.action) && actionSelect.value !== calibration.action) {
      actionSelect.value = calibration.action;
      activateAction(calibration.action);
    }
    if (Number.isFinite(calibration.speed)) speedInput.value = calibration.speed;
    if (calibration.grip) {
      for (const [finger, input] of Object.entries(gripInputs)) {
        if (Number.isFinite(calibration.grip[finger])) input.value = calibration.grip[finger];
      }
      if (Number.isFinite(calibration.grip.thumb)) thumbInput.value = calibration.grip.thumb;
    }
    if (calibration.leftGrip) {
      for (const [finger, input] of Object.entries(leftGripInputs)) {
        if (Number.isFinite(calibration.leftGrip[finger])) input.value = calibration.leftGrip[finger];
      }
      if (Number.isFinite(calibration.leftGrip.thumb)) leftThumbInput.value = calibration.leftGrip.thumb;
    }
    if (calibration.twoHandLock) {
      if (typeof calibration.twoHandLock.enabled === "boolean") {
        twoHandIKEnabled = calibration.twoHandLock.enabled;
        twoHandEnabledInput.checked = twoHandIKEnabled;
      }
      if (Array.isArray(calibration.twoHandLock.target) && calibration.twoHandLock.target.length === 3) {
        twoHandGripTarget.fromArray(calibration.twoHandLock.target);
        [twoHandTargetInputs.x.value, twoHandTargetInputs.y.value, twoHandTargetInputs.z.value] = twoHandGripTarget.toArray();
      }
      if (Array.isArray(calibration.twoHandLock.wrist) && calibration.twoHandLock.wrist.length === 3) {
        twoHandWristCorrection.fromArray([...calibration.twoHandLock.wrist, "XYZ"]);
        [twoHandWristInputs.x.value, twoHandWristInputs.y.value, twoHandWristInputs.z.value] = calibration.twoHandLock.wrist;
      }
    }
    if (calibration.socket) {
      for (const [key, input] of Object.entries(socketInputs)) {
        if (Number.isFinite(calibration.socket[key])) input.value = calibration.socket[key];
      }
      updateSocketFromControls();
    }
    if (calibration.offhand) setAttachmentTransform("offhand", calibration.offhand);
    if (typeof calibration.playing === "boolean") setPlaying(calibration.playing);
    if (Number.isFinite(calibration.normalizedTime) && actor.action) {
      timeInput.value = THREE.MathUtils.clamp(calibration.normalizedTime, 0, 1);
    }
    if (actor.action) {
      syncHumanSettings();
      actor.sample(actor.action.getClip().name, Number(timeInput.value) * actor.action.getClip().duration);
      actor.setPlayback({ playing, speed: Number(speedInput.value), loop: loopInput.checked });
    }
    if (calibration.view === "full") fullView();
    if (calibration.view === "hands") handView();
    if (calibration.view === "action") actionView();
    captureActiveActionCalibration();
    appliedCalibrationRevision = calibration.revision;
    updateOutputs();
    updateStatus();
    status.textContent += `\nliveCalibrationRevision=${appliedCalibrationRevision}`;
  } finally {
    applyingCalibration = false;
  }
}

async function pollLiveCalibration() {
  if (!LIVE_CALIBRATION_ENABLED || applyingCalibration || isMobsMode() || isCombatMode()) return;
  try {
    const response = await fetch(`${LIVE_CALIBRATION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    await applyLiveCalibration(await response.json());
  } catch {
    // The lab remains manually usable if the optional live-control file is absent.
  }
}

function rebuildWithErrorBoundary() {
  rebuildLoadout().catch((error) => {
    actionSelect.disabled = false;
    weaponSetSelect.disabled = false;
    reviewModeSelect.disabled = false;
    catalogActivitySelect.disabled = false;
    catalogLocomotionSelect.disabled = false;
    catalogWeaponSelect.disabled = false;
    catalogActionTypeSelect.disabled = false;
    status.textContent = `LOAD ERROR\n${error?.stack ?? error}`;
    window.__weaponLab = { ready: false, error: String(error) };
    console.error(error);
  });
}

async function changeReviewMode() {
  updateReviewControls();
  propsPanel?.setActive(isCombatMode());
  if (isMobsMode() || isCombatMode()) {
    if (!mobsPanel?.active && !combatStudio?.active) {
      humanActionBeforeMobs = actor?.action?.getClip().name;
      captureActiveActionCalibration();
    }
    loadoutRevision += 1;
    actor?.cancelPendingLoadout?.();
    if (actor) {
      actor.root.visible = false;
      actor.model.visible = false;
      if (actor.action) actor.action.paused = true;
      // Transfers and released arrows can be world children, not model children.
      for (const { socket } of actor.sockets) socket.visible = false;
      for (const visual of actor.projectile?.visuals ?? []) visual.visible = false;
    }
    followGrip = false; followFullBody = false;
    if (isCombatMode()) {
      mobsPanel?.leave();
      ground.scale.set(2, 3, 1);
      combatStudio ??= createCombatReviewStudio({ scene, camera, orbit: controls, humanFactory,
        host: document.querySelector("#combatReview"), viewport: () => {
          const panel = document.querySelector(".panel"), rect = panel.getBoundingClientRect();
          const bottomSheet = innerWidth <= 700 && innerHeight > innerWidth;
          return { width: innerWidth, height: innerHeight,
            usableWidth: panel.hidden || bottomSheet ? innerWidth : Math.max(180, rect.left - 16),
            usableHeight: panel.hidden || !bottomSheet ? innerHeight : Math.max(180, rect.top - 16) };
        }, onSnapshot: (snapshot) => {
          if (!isCombatMode()) return;
          propsPanel?.syncInteraction(snapshot);
          status.textContent = ["Combat Review · shared timeline, measured contact and explicit manual cues",
            ...snapshot.slots.map((slot) => `${slot.slot.toUpperCase()}: ${slot.definitionId} · ${slot.status}${slot.error ? ` · ${slot.error}` : ""}`),
            `time=${(snapshot.frame?.timeSeconds ?? 0).toFixed(2)} / ${snapshot.durationSeconds.toFixed(2)}s`,
            "No gameplay damage, loot or target reactions are inferred from a timer.", snapshot.error ?? ""].filter(Boolean).join("\n");
          window.__weaponLab = { ready: snapshot.ready, reviewMode: "combat", getCombatSnapshot: () => combatStudio.controller.snapshot() };
          window.__combatReview = combatStudio;
        }, onError: (error) => { status.textContent = `COMBAT REVIEW ERROR\n${String(error)}`; },
      });
      if (!propsPanel) {
        propsPanel = new ReviewPropsPanel({ onFrameBounds: (bounds) => combatStudio.frameBounds(bounds) });
        scene.add(propsPanel.root); document.querySelector("#reviewProps").append(propsPanel.element);
      }
      propsPanel.setActive(true);
      await combatStudio.enter();
    } else {
      combatStudio?.leave(); ground.scale.set(1, 1, 1); controls.maxDistance = 14; camera.far = 40;
      mobsPanel ??= new MobsPanel(scene, camera, controls);
      await mobsPanel.enter();
    }
  } else {
    combatStudio?.leave(); ground.scale.set(1, 1, 1); controls.maxDistance = 14; camera.far = 40;
    mobsPanel?.leave();
    if (actor) {
      actor.root.visible = true;
      actor.model.visible = true;
      await rebuildLoadout();
      if ([...actionSelect.options].some(({ value }) => value === humanActionBeforeMobs)) {
        actionSelect.value = humanActionBeforeMobs;
        activateAction(humanActionBeforeMobs);
      }
      playButton.textContent = playing ? "Pause" : "Play";
      playButton.classList.toggle("active", playing);
      fullView();
    }
  }
}
reviewModeSelect.addEventListener("change", () => changeReviewMode().catch((error) => {
  for (const select of [actionSelect, weaponSetSelect, reviewModeSelect, catalogActivitySelect,
    catalogLocomotionSelect, catalogWeaponSelect, catalogActionTypeSelect]) select.disabled = false;
  status.textContent = `WORKSPACE ERROR\n${String(error)}`;
  console.error(error);
}));
catalogActivitySelect.addEventListener("change", () => {
  populateCatalogFilters();
  updateReviewControls();
  rebuildWithErrorBoundary();
});
catalogLocomotionSelect.addEventListener("change", rebuildWithErrorBoundary);
catalogWeaponSelect.addEventListener("change", () => {
  populateCatalogFilters();
  rebuildWithErrorBoundary();
});
catalogActionTypeSelect.addEventListener("change", rebuildWithErrorBoundary);
weaponSetSelect.addEventListener("change", rebuildWithErrorBoundary);
actionSelect.addEventListener("change", () => activateAction(actionSelect.value));
arrowCountInput.addEventListener("input", () => { updateBowInventoryPreview(); updateOutputs(); updateStatus(); });
minimumBowRangeInput.addEventListener("input", () => { updateOutputs(); updateStatus(); });
playButton.addEventListener("click", () => setPlaying(!playing));
document.querySelector("#restart").addEventListener("click", () => {
  actor.reset(); actor.setPlayback({ playing }); timeInput.value = 0; updateOutputs();
});
loopInput.addEventListener("change", () => activateAction(actionSelect.value));
timeInput.addEventListener("input", () => {
  setPlaying(false);
  syncHumanSettings();
  actor.setPlayback({ playing: false });
  actor.sample(actionSelect.value, Number(timeInput.value) * actor.action.getClip().duration);
  updateOutputs(); updateStatus();
});
speedInput.addEventListener("input", () => { updateOutputs(); updateStatus(); });
for (const input of [...Object.values(gripInputs), thumbInput, ...Object.values(leftGripInputs), leftThumbInput]) {
  input.addEventListener("input", () => { removeOverlay(actor); applyOverlay(actor); updateOutputs(); updateStatus(); });
}
twoHandEnabledInput.addEventListener("change", () => {
  twoHandIKEnabled = twoHandEnabledInput.checked;
  removeOverlay(actor); removeTwoHandIK(actor); applyTwoHandIK(actor); applyOverlay(actor); updateOutputs(); updateStatus();
});
for (const input of [...Object.values(twoHandTargetInputs), ...Object.values(twoHandWristInputs)]) {
  input.addEventListener("input", () => {
    twoHandGripTarget.set(...Object.values(twoHandTargetInputs).map((targetInput) => Number(targetInput.value)));
    twoHandWristCorrection.set(...Object.values(twoHandWristInputs).map((wristInput) => Number(wristInput.value)), "XYZ");
    removeOverlay(actor); removeTwoHandIK(actor); applyTwoHandIK(actor); applyOverlay(actor); updateOutputs(); updateStatus();
  });
}
for (const input of Object.values(socketInputs)) {
  input.addEventListener("input", () => { updateSocketFromControls(); updateOutputs(); updateStatus(); });
}
document.querySelector("#resetGrip").addEventListener("click", () => {
  actor.clearActionCalibration();
  removeOverlay(actor); removeTwoHandIK(actor);
  restoreActionCalibration(actor.action.getClip().name);
  applyTwoHandIK(actor); applyOverlay(actor); updateOutputs(); updateStatus();
});
document.querySelector("#resetSocket").addEventListener("click", () => {
  actor.clearActionCalibration();
  removeOverlay(actor); removeTwoHandIK(actor);
  restoreActionCalibration(actor.action.getClip().name);
  applyTwoHandIK(actor); applyOverlay(actor); updateStatus();
});
document.querySelector("#fullView").addEventListener("click", fullView);
document.querySelector("#actionView").addEventListener("click", actionView);
document.querySelector("#handView").addEventListener("click", () => handView());
document.querySelector("#backView").addEventListener("click", backView);
function setStudioVisible(visible) {
  document.querySelector(".panel").hidden = !visible;
  document.querySelector("#showStudio").hidden = visible;
  fitStudioViewport();
}
document.querySelector("#hide").addEventListener("click", () => setStudioVisible(false));
document.querySelector("#showStudio").addEventListener("click", () => setStudioVisible(true));
addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "h" && !["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) setStudioVisible(document.querySelector(".panel").hidden);
  if (event.code === "Space" && event.target === document.body) {
    event.preventDefault();
    setPlaying(isCombatMode() ? !combatStudio?.controller.snapshot().frame?.playing
      : isMobsMode() ? Boolean(mobsPanel?.stage.snapshot()?.paused) : !playing);
  }
});

// The first human load initializes shared playback controls. Switching workspaces
// before it completes would let its late result overwrite a loaded mob selection.
reviewModeSelect.disabled = true;
try {
  actor = await humanFactory.create({ instanceId: "solo-human", loadoutId: weaponSetSelect.value, deferLoadout: true });
  scene.add(actor.root);
  populateCatalogFilters();
  updateReviewControls();
  await rebuildLoadout();
  updateOutputs();
  fullView();
  if (LIVE_CALIBRATION_ENABLED) {
    await pollLiveCalibration();
    setInterval(pollLiveCalibration, 750);
  }
} catch (error) {
  status.textContent = `LOAD ERROR\n${error?.stack ?? error}`;
  window.__weaponLab = { ready: false, error: String(error) };
  // Creature review is independent of a failed human asset download.
  reviewModeSelect.disabled = false;
  console.error(error);
}

const clock = new THREE.Clock();
staffGripSelect.addEventListener("change", () => {
  staffGripTransition.from = currentStaffGripStyle();
  staffGripTransition.to = { spread: staffGripSelect.value === "wide" ? 0.14 : 0, roll: staffGripSelect.value === "reverse" ? Math.PI : 0 };
  staffGripTransition.start = performance.now();
  updateStatus();
});
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  shadowRig.follow(controls.target);
  if (isCombatMode()) {
    combatStudio?.update(delta);
    controls.update();
    renderer.render(scene, camera);
    return;
  }
  if (isMobsMode()) {
    mobsPanel?.update(delta);
    controls.update();
    renderer.render(scene, camera);
    return;
  }
  if (actor?.action) {
    syncHumanSettings();
    actor.setPlayback({ playing, speed: Number(speedInput.value), loop: loopInput.checked });
    actor.update(delta);
    timeInput.value = actor.snapshot().normalizedTime;
    document.querySelector("#timeOut").textContent = Number(timeInput.value).toFixed(3);
  }
  if (followGrip && actor) {
    const target = handTarget();
    translateFollowTarget(target);
  } else if (followFullBody && actor) {
    const hips = findBone(actor.bones, "Hips");
    if (hips) {
      const target = hips.getWorldPosition(new THREE.Vector3());
      translateFollowTarget(target);
    }
  }
  controls.update();
  renderer.render(scene, camera);
});

// Keep the subject centered in the usable canvas, not underneath the controls.
function fitStudioViewport() {
  const panel = document.querySelector(".panel");
  const rect = panel.getBoundingClientRect();
  const bottomSheet = innerWidth <= 700 && innerHeight > innerWidth;
  const offsetX = panel.hidden || bottomSheet ? 0 : (innerWidth - rect.left) / 2;
  const offsetY = panel.hidden || !bottomSheet ? 0 : (innerHeight - rect.top) / 2;
  camera.setViewOffset(innerWidth, innerHeight, offsetX, offsetY, innerWidth, innerHeight);
}
fitStudioViewport();
const studioResizeObserver = new ResizeObserver(fitStudioViewport);
studioResizeObserver.observe(document.querySelector(".panel"));
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  fitStudioViewport();
  renderer.setSize(innerWidth, innerHeight);
  if (isCombatMode()) combatStudio?.frameActors();
  else if (isMobsMode() && mobsPanel?.stage.ready) mobsPanel.view("full");
});

function releaseRenderer() {
  renderer.setAnimationLoop(null);
  studioResizeObserver.disconnect();
  combatStudio?.dispose();
  propsPanel?.dispose();
  mobsPanel?.dispose();
  humanFactory.dispose();
  shadowRig.dispose();
  ground.geometry.dispose();
  ground.material.dispose();
  renderer.dispose();
}
addEventListener("beforeunload", releaseRenderer, { once: true });
if (import.meta.hot) import.meta.hot.dispose(releaseRenderer);
