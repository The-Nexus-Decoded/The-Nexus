import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMBAT_REVIEW_DEFINITIONS, createCombatReviewActorLoader, createCombatReviewStudio } from "../src/review/weapon-lab/combat-review-studio.js";
import { LOADOUTS } from "../src/review/weapon-lab/human-review-catalog.js";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import { ENVIRONMENT_REVIEW_DEFINITION, createHumanEnvironmentReviewAdapter, environmentReviewActions } from "../src/review/weapon-lab/human-environment-review.js";

// Primitive geometry is only a CPU composition fixture, never displayed content.
function actorFixture(instanceId, definitionId = "test") {
  const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), new THREE.MeshBasicMaterial()); mesh.position.y = 1; model.add(mesh);
  const actions = [{ id: "idle", label: "Idle", semantic: "idle", durationSeconds: 1 },
    { id: "attack", label: "Attack", semantic: "attack", durationSeconds: 2 }].map((action) => ({ ...action,
    clipName: action.id, approvalStatus: "source", rootPolicy: "authored-displacement" }));
  const actor = { instanceId, definitionId, root, model, actions: () => actions,
    sample: vi.fn((id, seconds) => { model.position.x = id === "attack" ? seconds * 4 : 0; root.updateMatrixWorld(true); }),
    reset: vi.fn(), dispose: vi.fn(() => { root.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }),
  };
  const original = { grip: { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 },
    leftGrip: { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 },
    socket: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    twoHandLock: { enabled: true, target: [0, 0, 0], wrist: [0, 0, 0] } };
  let calibration = structuredClone(original);
  return Object.assign(actor, { primary: {}, sockets: [],
    getCalibration: () => structuredClone(calibration),
    setCalibration: vi.fn((value) => { calibration = structuredClone(value); }),
    clearActionCalibration: vi.fn(() => { calibration = structuredClone(original); }),
    reviewTools: { twoHandIKAllowed: () => true, applyTwoHandIK: vi.fn() },
  });
}
const studios = new Set();
afterEach(() => { for (const studio of studios) studio.dispose(); studios.clear(); });
function studioFixture(overrides = {}) {
  const camera = new THREE.PerspectiveCamera(40, 1280 / 720, 0.02, 40), scene = new THREE.Scene();
  const orbit = { target: new THREE.Vector3(), maxDistance: 14, update: vi.fn(() => { camera.lookAt(orbit.target); camera.updateMatrixWorld(true); }) };
  const panel = { element: {}, dispose: vi.fn() }, host = { append: vi.fn() }, errors = [];
  const studio = createCombatReviewStudio({ camera, scene, orbit, host, document: {},
    viewport: () => ({ width: 1280, height: 720, usableWidth: 880, usableHeight: 720 }),
    panelFactory: () => panel, loadActor: async ({ instanceId, definition }) => ({ actor: actorFixture(instanceId, definition.id) }),
    onError: (error) => errors.push(error), ...overrides });
  studios.add(studio); return { studio, camera, scene, orbit, panel, host, errors };
}

describe("Combat Review studio composition", () => {
  it("uses all existing ten human loadouts and every catalogued creature without inventing source approval", async () => {
    expect(COMBAT_REVIEW_DEFINITIONS.filter((entry) => entry.family === "human" && entry.id !== ENVIRONMENT_REVIEW_DEFINITION.id).map((entry) => entry.id))
      .toEqual(Object.keys(LOADOUTS).map((id) => `human:${id}`));
    expect(COMBAT_REVIEW_DEFINITIONS.filter((entry) => entry.family !== "human").map((entry) => entry.id))
      .toEqual(MOB_CATALOG.map((entry) => entry.id));
    const wardens = COMBAT_REVIEW_DEFINITIONS.filter((entry) => entry.family === "warden");
    const shipped = wardens.filter((entry) => !entry.id.endsWith("-4v"));
    const rebuilt = wardens.filter((entry) => entry.id.endsWith("-4v"));
    expect(shipped.length).toBeGreaterThan(0);
    expect(shipped.every((entry) => entry.note.includes("not revised"))).toBe(true);
    expect(rebuilt.every((entry) => entry.note.includes("clips authored") && !entry.note.includes("not revised"))).toBe(true);
    const factory = { create: vi.fn(async ({ instanceId, loadoutId }) => actorFixture(instanceId, loadoutId)), dispose: vi.fn() };
    const mobLoader = vi.fn(async ({ instanceId, definitionId }) => Object.assign(actorFixture(instanceId, definitionId), {
      controls: [{ id: "jaw", label: "Jaw", group: "Head", min: -20, max: 20, step: 1 }],
      calibration: () => ({ controls: { jaw: 3 } }), setControl: vi.fn(), clearCalibration: vi.fn(),
    }));
    const mobReactionClips = vi.fn(async () => []);
    const loader = createCombatReviewActorLoader(factory, mobLoader, mobReactionClips);
    for (const definition of COMBAT_REVIEW_DEFINITIONS) {
      if (definition.id === ENVIRONMENT_REVIEW_DEFINITION.id) continue; // separate source-catalog contract below
      const abort = new AbortController();
      const handle = await loader({ definition, instanceId: definition.id, signal: abort.signal });
      if (definition.family === "human") {
        // A factory with no pinned reaction-pack loader is never asked for one:
        // source clips are not silently substituted for the authored set.
        expect(factory.create).toHaveBeenLastCalledWith({ instanceId: definition.id,
          loadoutId: definition.id.slice(6), mode: "equipment", includeSourceResponses: true, includeReactionPack: false });
        expect(definition.note).toContain("unverified equipment suitability");
      } else {
        // The mob half of the same contract: a special attack lands on the body, so
        // every mob definition is offered its archetype's pack and the receipt, not
        // the call site, decides whether this body is the rig it was authored on.
        expect(mobLoader).toHaveBeenLastCalledWith({ instanceId: definition.id, definitionId: definition.id,
          signal: abort.signal, loadReactionClips: mobReactionClips });
        expect(handle.calibration.controls()[0].value).toBe(3); handle.calibration.set("jaw", 4);
        expect(handle.actor.setControl).toHaveBeenCalledWith("jaw", 4); }
      handle.actor.dispose();
    }
    expect(factory.create).toHaveBeenCalledTimes(10); expect(mobLoader).toHaveBeenCalledTimes(MOB_CATALOG.length);
    expect(factory.dispose).not.toHaveBeenCalled();

    // A factory that does carry the pinned pack binds it for every loadout: a
    // special attack lands on the body, not on the weapon.
    const packed = { create: vi.fn(async ({ instanceId, loadoutId }) => actorFixture(instanceId, loadoutId)),
      dispose: vi.fn(), reactionPackAvailable: true };
    const packedLoader = createCombatReviewActorLoader(packed, mobLoader);
    const human = COMBAT_REVIEW_DEFINITIONS.filter((entry) => entry.family === "human" && entry.id !== ENVIRONMENT_REVIEW_DEFINITION.id);
    for (const definition of human) {
      const handle = await packedLoader({ definition, instanceId: definition.id, signal: new AbortController().signal });
      expect(packed.create).toHaveBeenLastCalledWith({ instanceId: definition.id,
        loadoutId: definition.id.slice(6), mode: "equipment", includeSourceResponses: true, includeReactionPack: true });
      handle.actor.dispose();
    }
    expect(packed.create).toHaveBeenCalledTimes(human.length);
  });

  it("reuses an unarmed catalog actor for environment motions without removing its source library", async () => {
    const names = ["Interactions__HumanMasculineAthleticMuscularOpenChestLid", "Interactions__HumanMasculineAthleticMuscularSwimForwardLoop",
      "Interactions__HumanMasculineAthleticMuscularClimbRopeHandsFeet", "Interactions__HumanMasculineAthleticMuscularIdleStandingRelaxed",
      "Interactions__HumanMasculineAthleticMuscularWave", "GreatSword__GreatSwordSlash", "ProMeleeAxe__StandingTauntChestThump"];
    const source = actorFixture("environment"), rows = names.map((name) => ({id:name,clipName:name,label:name,
      semantic:name.endsWith("Relaxed")?"idle":"interaction",approvalStatus:"source",durationSeconds:3,rootPolicy:"authored-displacement"}));
    source.primary = null; source.actions = () => rows; source.snapshot = () => ({mode:"catalog"});
    const factory = {create:vi.fn(async()=>source)}, loader = createCombatReviewActorLoader(factory);
    const handle = await loader({definition:ENVIRONMENT_REVIEW_DEFINITION,instanceId:"environment",signal:new AbortController().signal});
    expect(factory.create).toHaveBeenCalledWith({instanceId:"environment",mode:"catalog"});
    expect(handle.actor.root).toBe(source.root);expect(handle.actor.model).toBe(source.model);
    expect(handle.actor.actions()).toHaveLength(4);expect(handle.actor.actions()[0].semantic).toBe("idle");
    expect(source.actions()).toHaveLength(7);expect(handle.calibration.controls()).toEqual([]);
    expect(handle.actor).not.toHaveProperty("setLoadout");expect(handle.actor).not.toHaveProperty("reviewTools");
    expect(handle.actor).not.toHaveProperty("getCalibration");expect(handle.actor).not.toHaveProperty("snapshot");
    handle.actor.sample(names[0],1);expect(source.sample).toHaveBeenLastCalledWith(names[0],1);
    expect(()=>handle.actor.sample(names[5],0)).toThrow("outside");
    handle.actor.reset();expect(source.sample).toHaveBeenLastCalledWith(names[3],0);
    handle.actor.dispose();expect(source.dispose).toHaveBeenCalledOnce();
    expect(environmentReviewActions(rows).every(Object.isFrozen)).toBe(true);
    expect(()=>createHumanEnvironmentReviewAdapter({...source,snapshot:()=>({mode:"equipment"})})).toThrow("unarmed");
  });

  it("disposes an environmental source when cancelled or no relevant clips exist", async () => {
    for (const cancel of [false,true]) {
      const source = actorFixture("environment"), abort = new AbortController();source.snapshot=()=>({mode:"catalog"});
      const loader = createCombatReviewActorLoader({create:async()=>{if(cancel)abort.abort();return source;}});
      await expect(loader({definition:ENVIRONMENT_REVIEW_DEFINITION,instanceId:"environment",signal:abort.signal})).rejects.toThrow();
      expect(source.dispose).toHaveBeenCalledOnce();
    }
  });

  it("bridges grip/socket/support calibration without sharing mutable state or additive overlay", async () => {
    const factory = { create: async ({ instanceId }) => actorFixture(instanceId) };
    const loader = createCombatReviewActorLoader(factory), definition = COMBAT_REVIEW_DEFINITIONS[0];
    const first = await loader({ definition, instanceId: "one", signal: new AbortController().signal });
    const second = await loader({ definition, instanceId: "two", signal: new AbortController().signal });
    first.calibration.set("grip.Index", 0.9); first.calibration.set("socket.rx", 0.2);
    first.calibration.set("twoHandLock.target.1", 0.12); first.calibration.set("twoHandLock.enabled", 0);
    expect(first.actor.getCalibration()).toMatchObject({ grip: { Index: 0.9 }, socket: { rx: 0.2 }, twoHandLock: { enabled: false, target: [0, 0.12, 0] } });
    expect(second.actor.getCalibration().grip.Index).toBe(0.5);
    first.settleConstraints(); expect(first.actor.reviewTools.applyTwoHandIK).toHaveBeenCalledWith(first.actor);
    first.calibration.reset(); expect(first.actor.getCalibration().grip.Index).toBe(0.5);
    first.actor.primary = null; expect(first.calibration.controls()).toEqual([]);
    first.actor.dispose(); second.actor.dispose();
  });

  it("disposes a cancelled human instance but never its shared resource factory", async () => {
    let resolve; const pending = new Promise((done) => { resolve = done; });
    const factory = { create: vi.fn(() => pending), dispose: vi.fn() }, abort = new AbortController();
    const request = createCombatReviewActorLoader(factory)({ definition: COMBAT_REVIEW_DEFINITIONS[0], instanceId: "cancelled", signal: abort.signal });
    abort.abort(); const actor = actorFixture("cancelled"); resolve(actor);
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(actor.dispose).toHaveBeenCalledOnce(); expect(factory.dispose).not.toHaveBeenCalled();
  });

  it("frames actual rendered geometry on desktop and phone, preserving scene ownership", async () => {
    const { studio, camera, scene, orbit, host, panel } = studioFixture();
    expect(host.append).toHaveBeenCalledWith(panel.element); await studio.enter();
    expect(studio.controller.snapshot().ready).toBe(true); expect(camera.position.length()).toBeGreaterThan(3);
    expect(studio.frameActors()).toBe(true); expect(orbit.target.z).toBeCloseTo(0.875);
    const combatView = camera.position.clone().sub(orbit.target);
    expect(Math.abs(combatView.x)).toBeGreaterThan(Math.abs(combatView.z) * 4);
    studio.leave(); expect(studio.controller.root.children).toHaveLength(0); expect(studio.frameActors()).toBe(false);
    expect(scene.children).toContain(studio.controller.root); studio.dispose();
    expect(scene.children).not.toContain(studio.controller.root); expect(panel.dispose).toHaveBeenCalledOnce();
    const phone = studioFixture({ viewport: () => ({ width: 390, height: 844, usableWidth: 390, usableHeight: 460 }) });
    phone.camera.aspect = 390 / 844; await phone.studio.enter();
    expect(phone.camera.position.toArray().every(Number.isFinite)).toBe(true);
    expect(phone.camera.position.distanceTo(phone.orbit.target)).toBeGreaterThan(5);
  });

  it("surveys motion bounds, restores the selected pose and never displays intermediate survey frames", async () => {
    const { studio, camera, orbit, errors } = studioFixture(); await studio.enter();
    studio.controller.seek(0.3); const actor = studio.controller.actor("a");
    const initialPose = actor.model.position.clone(), originalDistance = camera.position.distanceTo(orbit.target);
    const survey = studio.frameMotion(); studio.update(0.016);
    expect(actor.model.position.toArray()).toEqual(initialPose.toArray());
    expect(await survey).toBe(true); expect(actor.model.position.toArray()).toEqual(initialPose.toArray());
    expect(camera.position.distanceTo(orbit.target)).toBeGreaterThan(originalDistance);
    expect(studio.controller.snapshot().frame.timeSeconds).toBe(0.3); expect(errors).toEqual([]);
  });

  it("reuses the shared bounds framing for props without sampling or moving actors", async () => {
    const { studio, orbit } = studioFixture(); await studio.enter(); studio.controller.seek(0.3);
    const actors = [studio.controller.actor("a"), studio.controller.actor("b")];
    const poses = actors.map((actor) => actor.model.matrixWorld.toArray());
    const snapshot = studio.controller.snapshot();
    for (const actor of actors) actor.sample.mockClear();
    const bounds = new THREE.Box3(new THREE.Vector3(-2, 0, 1), new THREE.Vector3(2, 5, 3));
    expect(studio.frameBounds(bounds)).toBe(true); expect(orbit.target.toArray()).toEqual([0, 2.5, 2]);
    expect(studio.controller.snapshot()).toEqual(snapshot);
    actors.forEach((actor, index) => { expect(actor.sample).not.toHaveBeenCalled();
      expect(actor.model.matrixWorld.toArray()).toEqual(poses[index]); });
    expect(studio.frameBounds(new THREE.Box3())).toBe(false);
    studio.dispose(); expect(studio.frameBounds(bounds)).toBe(false);
  });

  it("unions owned fluid flight geometry into the same actor motion framing and restores playback time", async () => {
    const { studio, orbit, errors } = studioFixture(); await studio.enter(); studio.controller.seek(0.3);
    const geometryBounds = new THREE.Box3(new THREE.Vector3(-0.02, 0.5, 0.8), new THREE.Vector3(0.02, 1.2, 5.26));
    const bounds = vi.spyOn(studio.controller, "projectileMotionBounds").mockReturnValue(geometryBounds);
    expect(await studio.frameMotion()).toBe(true); expect(bounds).toHaveBeenCalledOnce();
    expect(orbit.target.z).toBeGreaterThan(2.5);
    expect(studio.controller.snapshot().frame.timeSeconds).toBe(0.3);
    expect(errors).toEqual([]);
  });

  it("cancels a motion survey on a new actor and on workspace exit without applying stale framing", async () => {
    const { studio, errors } = studioFixture(); await studio.enter();
    const survey = studio.frameMotion(); await studio.controller.selectActor("b", "warden-wayfarer");
    expect(await survey).toBe(false); expect(studio.controller.actor("b").definitionId).toBe("warden-wayfarer");
    expect(studio.controller.snapshot().ready).toBe(true);
    const cancelled = studio.frameMotion(); studio.leave(); expect(await cancelled).toBe(false);
    expect(errors).toEqual([]); expect(studio.active).toBe(false);
  });

  it("preserves newer Play intent while an aborted motion survey is still pending", async () => {
    let callbacks;
    const { studio, errors } = studioFixture({ panelFactory: (_controller, options) => {
      callbacks = options; return { element: {}, dispose() {} };
    } }); await studio.enter();
    studio.controller.seek(0.3);
    const survey = callbacks.onFrameAction(); expect(survey).toBeInstanceOf(Promise);
    studio.controller.setPlaying(true);
    expect(studio.controller.snapshot().frame.playing).toBe(true);
    studio.update(0.016);
    expect(studio.controller.snapshot().frame).toMatchObject({ playing: true, timeSeconds: 0.316 });
    expect(await survey).toBe(false);
    expect(studio.controller.snapshot().frame).toMatchObject({ playing: true, timeSeconds: 0.316 });
    studio.update(0.016); expect(studio.controller.snapshot().frame.timeSeconds).toBeCloseTo(0.332);
    expect(errors).toEqual([]);
  });

  it("retires a pending motion survey before contact scan so its finally cannot cancel newer sampling", async () => {
    let callbacks;
    const { studio, errors } = studioFixture({ panelFactory: (_controller, options) => {
      callbacks = options; return { element: {}, dispose() {} };
    } });
    await studio.enter(); studio.controller.seek(0.3);
    const survey = studio.frameMotion();
    const seek = vi.spyOn(studio.controller, "seek"), resolve = vi.spyOn(studio.controller, "resolveContact");
    const scan = callbacks.onScanContact("none"); studio.update(0.016);
    expect(await survey).toBe(false); expect((await scan).status).toBe("unavailable");
    expect(resolve).toHaveBeenCalledWith({ response: "none" });
    expect(seek).not.toHaveBeenCalled(); expect(studio.controller.snapshot().frame.timeSeconds).toBe(0.3);
    expect(errors).toEqual([]);
  });

  it("surveys the same injected constrained blends as live playback", async () => {
    const constraints = [];
    const { studio, errors } = studioFixture({ loadActor: async ({ instanceId, definition }) => {
      const actor = actorFixture(instanceId, definition.id), source = actor.actions();
      actor.actions = () => [...source, { ...source[0], id: "reaction", clipName: "reaction", semantic: "reaction" }];
      const settleConstraints = vi.fn(() => { actor.model.position.y = 0.1; });
      constraints.push(settleConstraints); return { actor, settleConstraints };
    } });
    await studio.enter(); studio.controller.setManualCue({ kind: "reaction", atSeconds: 0.5, blendSeconds: 0.3 });
    studio.controller.seek(0.65);
    const defender = studio.controller.actor("b");
    expect(defender.model.position.y).toBe(0.1);
    for (const settle of constraints) settle.mockClear();
    expect(await studio.frameMotion()).toBe(true);
    // More than the final restoration: the surveyed overlap samples settle too.
    expect(constraints[1].mock.calls.length).toBeGreaterThan(1);
    expect(defender.model.position.y).toBe(0.1); expect(errors).toEqual([]);
  });
});
