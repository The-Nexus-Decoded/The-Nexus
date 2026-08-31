import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatReviewController, type CombatActorDefinition, type CombatActorHandle, type CombatActorLoader,
  type CombatActorRequest, type CombatSlot } from "../src/review/weapon-lab/combat-review-controller";
import { CombatReviewPanel } from "../src/review/weapon-lab/combat-review-panel";
import type { ReviewAction } from "../src/review/weapon-lab/combat-review-types";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";

// Browser tsconfig has no ambient Node types; limit host declarations to this test.
const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");
const { webcrypto } = await importHost<{ webcrypto: Crypto }>("node:crypto");

const definitions: readonly CombatActorDefinition[] = [
  { id: "human-sword", label: "Human · sword", family: "human", note: "Equipment binding · review draft" },
  { id: "human-staff", label: "Human · staff", family: "human", note: "Equipment binding · review draft" },
  { id: "base", label: "Base Breachling", family: "breachling", note: "Reviewed attacks; remaining actions source" },
  { id: "boss", label: "Warden", family: "warden", note: "Source · not revised" },
];
function action(id: string, semantic: ReviewAction["semantic"], durationSeconds = 1): ReviewAction {
  return { id, clipName: id, label: id, semantic, durationSeconds,
    approvalStatus: semantic === "attack" ? "draft" : "source", rootPolicy: "authored-displacement" };
}
function actorFixture(request: CombatActorRequest, actions = [action("idle", "idle"), action("strike", "attack", 2),
  action("flinch", "reaction", 0.6), action("death", "death", 0.8)]) {
  const root = new THREE.Group(), model = new THREE.Group(), bone = new THREE.Bone();
  root.add(model); model.add(bone);
  let calibration = 0;
  const actor = { instanceId: request.instanceId, definitionId: request.definition.id, root, model,
    actions: () => actions,
    sample: vi.fn((id: string, seconds: number) => {
      const offset = id === "strike" ? 1 : id === "flinch" ? 2 : id === "death" ? 3 : 0;
      model.position.set(0, 0, 0); bone.position.set(calibration, offset + seconds, 0);
      bone.rotation.set(seconds + calibration, 0, 0); model.updateMatrixWorld(true);
    }), reset: vi.fn(), dispose: vi.fn(),
  };
  const handle: CombatActorHandle = { actor, calibration: {
    controls: () => [{ id: "joint", label: "Joint", group: "Rig", min: -1, max: 1, step: 0.1, value: calibration }],
    set: (_id, value) => { calibration = value; }, reset: () => { calibration = 0; },
  }, settleConstraints: vi.fn() };
  return { ...handle, actor, bone };
}
const controllers = new Set<CombatReviewController>();
function controller(loadActor: CombatActorLoader = async (request) => actorFixture(request), initial?: { a: string; b: string }) {
  const value = new CombatReviewController({ definitions, loadActor, initial }); controllers.add(value); return value;
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject };
}
function bonePose(value: CombatReviewController, slot: CombatSlot) {
  const values: number[] = [];
  value.actor(slot)!.model.traverse((node) => values.push(...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray()));
  return values;
}
afterEach(() => { for (const value of controllers) value.dispose(); controllers.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Combat Review actor ownership and deterministic composition", () => {
  it("supports arbitrary families and same-definition actors with independent instance IDs", async () => {
    for (const a of definitions) for (const b of definitions) {
      const value = controller(undefined, { a: a.id, b: b.id }); await value.enter();
      expect(value.snapshot().ready).toBe(true);
      expect(value.actor("a")!.definitionId).toBe(a.id); expect(value.actor("b")!.definitionId).toBe(b.id);
      expect(value.actor("a")!.instanceId).not.toBe(value.actor("b")!.instanceId);
      expect(value.actor("a")!.model).not.toBe(value.actor("b")!.model);
      expect(value.actor("b")!.root.position.z).toBe(1.75); expect(value.actor("b")!.root.rotation.y).toBeCloseTo(Math.PI);
      expect(value.sequence()!.events).toEqual([]); value.dispose();
    }
  });

  it("loads A and B concurrently; replacing A neither cancels nor disposes B", async () => {
    const jobs: Array<{ request: CombatActorRequest; task: ReturnType<typeof deferred<CombatActorHandle>> }> = [];
    const value = controller((request) => { const task = deferred<CombatActorHandle>(); jobs.push({ request, task }); return task.promise; });
    const initial = value.enter(); expect(jobs).toHaveLength(2);
    const b = actorFixture(jobs[1]!.request); jobs[1]!.task.resolve(b); await Promise.resolve();
    const replacement = value.selectActor("a", "boss"); expect(jobs[0]!.request.signal.aborted).toBe(true);
    expect(jobs[1]!.request.signal.aborted).toBe(false); expect(b.actor.dispose).not.toHaveBeenCalled();
    const current = actorFixture(jobs[2]!.request); jobs[2]!.task.resolve(current); await replacement;
    const stale = actorFixture(jobs[0]!.request); jobs[0]!.task.resolve(stale); await initial;
    expect(stale.actor.dispose).toHaveBeenCalledTimes(1); expect(value.actor("a")).toBe(current.actor);
    expect(value.actor("b")).toBe(b.actor); expect(value.snapshot().ready).toBe(true);
  });

  it("ignores stale errors, allows retry after a real error, and keeps the opposite actor", async () => {
    let fail = true;
    const value = controller(async (request) => {
      if (request.definition.id === "human-sword" && fail) throw new Error("Hash unavailable");
      return actorFixture(request);
    });
    await value.enter(); const b = value.actor("b");
    expect(value.snapshot().slots[0]!.error).toBe("Hash unavailable"); expect(value.snapshot().ready).toBe(false);
    fail = false; expect(await value.selectActor("a", "human-sword")).toBe(true);
    expect(value.actor("b")).toBe(b); expect(value.snapshot().error).toBeNull();
    const task = deferred<CombatActorHandle>();
    const pending = controller(() => task.promise); const entering = pending.enter(); pending.leave();
    task.reject(new Error("old failure")); await entering;
    expect(pending.snapshot().slots.every((slot) => slot.status === "empty" && !slot.error)).toBe(true);
  });

  it("disposes late completions after leaving and re-enters with fresh independent actors", async () => {
    const jobs: Array<{ request: CombatActorRequest; task: ReturnType<typeof deferred<CombatActorHandle>> }> = [];
    const value = controller((request) => { const task = deferred<CombatActorHandle>(); jobs.push({ request, task }); return task.promise; });
    const first = value.enter(); value.leave(); const next = value.enter();
    const late = jobs.slice(0, 2).map(({ request }) => actorFixture(request));
    jobs[0]!.task.resolve(late[0]!); jobs[1]!.task.resolve(late[1]!); await first;
    expect(late.every((entry) => entry.actor.dispose.mock.calls.length === 1)).toBe(true);
    jobs[2]!.task.resolve(actorFixture(jobs[2]!.request)); jobs[3]!.task.resolve(actorFixture(jobs[3]!.request)); await next;
    expect(value.root.children).toHaveLength(2); value.dispose(); value.dispose();
    expect(value.root.children).toHaveLength(0); expect(() => value.seek(0)).toThrow(/disposed/);
  });

  it("rejects a loader that shares the other slot's body without destroying that body", async () => {
    let shared: CombatActorHandle | undefined;
    const value = controller(async (request) => shared ?? (shared = actorFixture(request)));
    await value.enter(); expect(value.snapshot().slots[1]!.error).toMatch(/independently owned/);
    expect(shared!.actor.dispose).not.toHaveBeenCalled(); expect(value.actor("a")).toBe(shared!.actor);
  });

  it("rejects wrong identities and unavailable action catalogs, disposing only the rejected load", async () => {
    const fixtures: ReturnType<typeof actorFixture>[] = [];
    const value = controller(async (request) => {
      const fixture = actorFixture({ ...request, instanceId: "wrong" }); fixtures.push(fixture); return fixture;
    });
    await value.enter(); expect(value.snapshot().ready).toBe(false);
    expect(fixtures.every((entry) => entry.actor.dispose.mock.calls.length === 1)).toBe(true);
    const unavailable = controller(async (request) => actorFixture(request, [{ ...action("empty", "idle"), unavailableReason: "missing binding" }]));
    await unavailable.enter(); expect(unavailable.snapshot().slots[0]!.error).toMatch(/no available/);
  });

  it("reconstructs both bones on absolute seek, pause, speed, end hold and loop", async () => {
    const value = controller(); await value.enter(); value.setManualCue({ kind: "reaction", atSeconds: 0.7, blendSeconds: 0.2 });
    value.seek(0.81); const expected = [bonePose(value, "a"), bonePose(value, "b")];
    value.seek(1.75); value.seek(0); value.seek(0.81);
    expect([bonePose(value, "a"), bonePose(value, "b")]).toEqual(expected);
    value.advance(1); expect(value.snapshot().frame!.timeSeconds).toBe(0.81);
    value.restart(true); value.setSpeed(0.5); value.advance(0.42); value.advance(1.2);
    expect(value.snapshot().frame!.timeSeconds).toBeCloseTo(0.81, 10);
    expect(bonePose(value, "b").map((entry, index) => Math.abs(entry - expected[1]![index]!)).every((error) => error < 1e-10)).toBe(true);
    value.seek(99); expect(value.snapshot().frame!.playing).toBe(false);
    const end = bonePose(value, "a"); value.advance(1); expect(bonePose(value, "a")).toEqual(end);
    value.setLoop(true); value.restart(true); value.advance(8.4);
    expect(value.snapshot().frame!.cycle).toBe(2); expect(value.snapshot().frame!.timeSeconds).toBeCloseTo(0.2);
  });

  it("never turns a manual cue into hit evidence, including zero-time cues and seeking", async () => {
    const value = controller(); await value.enter(); value.setManualCue({ kind: "reaction", atSeconds: 0, blendSeconds: 1 });
    expect(value.snapshot().ready).toBe(true);
    expect(value.sequence()!.events).toEqual([expect.objectContaining({ kind: "reaction", result: "unmeasured", timeSeconds: 0 })]);
    expect(value.sequence()!.events[0]!.evidence).toMatch(/not measured contact/);
    expect(value.sequence()!.tracks.find((track) => track.id === "defender-response")!.blendInSeconds).toBe(0);
    value.seek(1.1); expect(value.snapshot().frame!.crossedEvents).toEqual([]);
    expect(value.snapshot().frame!.elapsedEvents.every((event) => event.result !== "hit")).toBe(true);
  });

  it("holds death at its terminal pose until restart, with no idle resurrection", async () => {
    const value = controller(); await value.enter(); value.setManualCue({ kind: "death", atSeconds: 0.2 });
    value.seek(1.9); const defender = value.snapshot().frame!.actors.find((entry) => entry.actorId === value.actor("b")!.instanceId)!;
    expect(defender.terminal).toBe("held"); expect(defender.poses[0]!.actionId).toBe("death");
    expect(defender.poses[0]!.timeSeconds).toBe(0.8); value.restart();
    expect(value.snapshot().frame!.actors[1]!.poses[0]!.actionId).toBe("idle");
    expect(() => value.setAction("b", "ready", "death")).toThrow(/terminal/);
    value.setAttacker("b"); expect(value.snapshot().cue.kind).toBe("none");
    expect(value.sequence()!.tracks[0]!.actorId).toBe(value.actor("b")!.instanceId);
  });

  it("keeps calibration per slot and reapplies it without advancing the paused pose", async () => {
    const value = controller(); await value.enter(); value.seek(0.4); const before = bonePose(value, "b");
    value.setCalibration("a", "joint", 0.6); expect(bonePose(value, "b")).toEqual(before);
    expect(value.snapshot().frame!.timeSeconds).toBe(0.4);
    expect(value.snapshot().slots[0]!.calibration[0]!.value).toBe(0.6);
    value.resetCalibration("a"); expect(value.snapshot().slots[0]!.calibration[0]!.value).toBe(0);
    value.setPlacement({ separationMeters: 3.5, yawADegrees: 45, yawBDegrees: -45 });
    expect(value.actor("b")!.root.position.z).toBe(3.5); expect(value.actor("a")!.root.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(value.snapshot().frame!.timeSeconds).toBe(0.4);
  });

  it("does not silently invent unavailable response clips or accept nonfinite settings", async () => {
    const value = controller(async (request) => actorFixture(request, [action("idle", "idle"), action("attack", "attack")]));
    await value.enter(); expect(value.snapshot().slots[1]!.selected.reaction).toBe("");
    expect(() => value.setManualCue({ kind: "reaction" })).toThrow(/unavailable/);
    expect(() => value.setAction("a", "reaction", "attack")).toThrow(/real reaction/);
    for (const invalid of [NaN, Infinity, -1]) {
      expect(() => value.seek(invalid)).toThrow(); expect(() => value.setSpeed(invalid)).toThrow();
      expect(() => value.advance(invalid)).toThrow(); expect(() => value.setManualCue({ atSeconds: invalid })).toThrow();
    }
    expect(() => value.setCalibration("a", "joint", 2)).toThrow();
    expect(() => value.setPlacement({ separationMeters: Infinity })).toThrow();
    expect(() => value.setPlacement({ yawADegrees: NaN })).toThrow();
  });

  it("retains source labels and protects its sequence from caller mutations", async () => {
    const value = controller(); await value.enter();
    const first = value.snapshot(); (first.slots[0]!.selected as { action: string }).action = "made-up";
    expect(value.snapshot().slots[0]!.selected.action).toBe("strike");
    expect(value.snapshot().slots[0]!.actions.find((entry) => entry.id === "death")!.approvalStatus).toBe("source");
    expect(Object.isFrozen(value.sequence())).toBe(true);
    const updates: number[] = []; const stop = value.subscribe((snapshot) => updates.push(snapshot.revision));
    value.setAttacker("b"); const count = updates.length; stop(); value.restart(); expect(updates).toHaveLength(count);
  });
});

// Small DOM contract host: exercises panel controls without adding a browser
// emulator dependency. It does not claim layout, WebGL or native-browser QA.
class DomNode {
  parentElement: DomNode | null = null; children: DomNode[] = []; dataset: Record<string, string> = {};
  attributes: Record<string, string> = {}; className = ""; textContent = ""; id = ""; value = ""; type = "";
  hidden = false; disabled = false; checked = false; min = ""; max = ""; step = ""; htmlFor = "";
  listeners = new Map<string, Array<(event: Event) => void>>();
  classList = { add: (...names: string[]) => { this.className += " " + names.join(" "); },
    toggle: (_name: string, _enabled: boolean) => {} };
  constructor(readonly tagName: string) {}
  append(...nodes: DomNode[]) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes: DomNode[]) { this.children.forEach((node) => { node.parentElement = null; }); this.children = []; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((node) => node !== this); this.parentElement = null; }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  contains(node: DomNode): boolean { return node === this || this.children.some((child) => child.contains(node)); }
  closest(selector: string): DomNode | null {
    if ((selector === "label" && this.tagName === "LABEL") || (selector === "[data-command]" && this.dataset.command)) return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  querySelector(selector: string): DomNode | null { return this.find((node) => node.tagName === selector.toUpperCase()); }
  find(predicate: (node: DomNode) => boolean): DomNode | null {
    for (const child of this.children) { if (predicate(child)) return child; const found = child.find(predicate); if (found) return found; } return null;
  }
  addEventListener(type: string, handler: (event: Event) => void, options?: { signal: AbortSignal }) {
    const handlers = this.listeners.get(type) ?? []; handlers.push(handler); this.listeners.set(type, handlers);
    options?.signal.addEventListener("abort", () => this.listeners.delete(type));
  }
  emit(type: string, target: DomNode) {
    for (const handler of this.listeners.get(type) ?? []) handler({ type, target, stopPropagation: () => {} } as unknown as Event);
  }
}
function domFixture() {
  return { activeElement: null as DomNode | null,
    createElement: (tag: string) => new DomNode(tag.toUpperCase()), createTextNode: (text: string) => {
      const node = new DomNode("#TEXT"); node.textContent = text; return node;
    } };
}
describe("Combat Review panel wiring", () => {
  it("refreshes sampled-action calibration on seek and playback without a structural revision", async () => {
    const value = controller(async (request) => {
      const fixture = actorFixture(request);
      const sample = fixture.actor.sample.getMockImplementation()!;
      let currentAction = "idle", currentTime = 0;
      fixture.actor.sample.mockImplementation((id, seconds) => { currentAction = id; currentTime = seconds; sample(id, seconds); });
      return { ...fixture, calibration: { controls: () => [{ id: currentAction, label: "Current action", group: "Rig",
        min: 0, max: 4, step: 0.01, value: currentTime }], set: vi.fn(), reset: vi.fn() } };
    });
    const panel = new CombatReviewPanel(value, { document: domFixture() as unknown as Document });
    const root = panel.element as unknown as DomNode;
    const input = () => root.find((node) => node.dataset.command === "calibration" && node.dataset.slot === "b")!;
    await value.enter(); value.setManualCue({ kind: "reaction", atSeconds: 0.6, blendSeconds: 0 });
    const revision = value.snapshot().revision;
    value.seek(0.3); expect(input().dataset.control).toBe("idle"); expect(Number(input().value)).toBeCloseTo(0.3);
    value.seek(0.8); expect(value.snapshot().revision).toBe(revision);
    expect(input().dataset.control).toBe("flinch"); expect(Number(input().value)).toBeCloseTo(0.2);
    const heldInput = input(); value.setPlaying(true); value.advance(0.1);
    expect(input()).toBe(heldInput); expect(Number(input().value)).toBeCloseTo(0.3);
    value.setManualCue({ kind: "death", atSeconds: 0.6, blendSeconds: 0 });
    const deathRevision = value.snapshot().revision; value.seek(1.9);
    expect(value.snapshot().revision).toBe(deathRevision); expect(input().dataset.control).toBe("death");
    expect(Number(input().value)).toBeCloseTo(0.8); panel.dispose();
  });

  it("wires accessible actor selectors, shared transport, manual cues and per-actor calibration", async () => {
    const value = controller(), doc = domFixture();
    const panel = new CombatReviewPanel(value, { document: doc as unknown as Document });
    const root = panel.element as unknown as DomNode;
    expect(root.hidden).toBe(true); await value.enter(); expect(root.hidden).toBe(false);
    const control = (command: string, slot?: string) => root.find((node) => node.dataset.command === command && (!slot || node.dataset.slot === slot))!;
    const cue = control("cue"); cue.value = "reaction"; root.emit("change", cue);
    expect(value.sequence()!.events[0]!.result).toBe("unmeasured");
    root.emit("click", control("play")); expect(value.snapshot().frame!.playing).toBe(true);
    const time = control("time"); time.value = "0.4"; root.emit("input", time);
    expect(value.snapshot().frame!.playing).toBe(false); expect(value.snapshot().frame!.normalizedTime).toBe(0.4);
    expect(time.attributes["aria-label"]).toBe("Combat sequence time");
    const calibration = control("calibration", "b"); doc.activeElement = calibration;
    calibration.value = "0.4"; root.emit("input", calibration);
    expect(control("calibration", "b")).toBe(calibration); expect(value.snapshot().slots[1]!.calibration[0]!.value).toBe(0.4);
    expect(value.snapshot().slots[0]!.calibration[0]!.value).toBe(0);
    expect(root.find((node) => node.textContent.startsWith("Manual cue · not measured contact"))).not.toBeNull();
    const model = control("model", "a"); model.value = "boss"; root.emit("change", model); await Promise.resolve();
    expect(value.actor("a")!.definitionId).toBe("boss");
    expect(control("model", "a").id).not.toBe(control("model", "b").id);
    panel.dispose(); expect(root.listeners.size).toBe(0); expect(value.snapshot().active).toBe(true);
  });

  it("disables missing reactions instead of presenting a fake fallback, and shows validation failures", async () => {
    const value = controller(async (request) => actorFixture(request, [action("idle", "idle"), action("strike", "attack")]));
    const panel = new CombatReviewPanel(value, { document: domFixture() as unknown as Document });
    await value.enter(); const root = panel.element as unknown as DomNode;
    const cue = root.find((node) => node.dataset.command === "cue")!;
    expect(cue.children.find((node) => node.value === "reaction")!.disabled).toBe(true);
    const separation = root.find((node) => node.dataset.command === "separation")!;
    separation.value = "-2"; root.emit("change", separation);
    expect(root.find((node) => node.attributes.role === "alert")!.textContent).toMatch(/Separation/);
    expect(value.snapshot().placement.separationMeters).toBe(1.75); panel.dispose();
  });
});

it("replays actual pinned base GLB attack and source reaction/death on the same controller clock", async () => {
  const definition = MOB_CATALOG.find((entry) => entry.id === "breachling-base")!;
  const bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
  vi.stubGlobal("document", { baseURI: "http://localhost:5179/weapon-lab.html" });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", async () => new Response(bytes));
  const parse = GLTFLoader.prototype.parseAsync;
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
    // Exact source geometry/skin/clips; only image decoding is stubbed in CPU tests.
    this.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: async () => {
      const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
    } }));
    return parse.call(this, data, path);
  });
  const value = controller(async ({ instanceId, signal }) => ({ actor: await createMobReviewActor({
    instanceId, signal, definitionId: definition.id,
  }) }), { a: "base", b: "base" });
  await value.enter(); expect(value.snapshot().ready, JSON.stringify(value.snapshot().slots.map((slot) => slot.error))).toBe(true);
  expect(value.snapshot().slots[0]!.actions.filter((entry) => entry.approvalStatus === "continuous-reviewed")).toHaveLength(5);
  value.setAction("a", "action", "LungeAttack"); value.setManualCue({ kind: "reaction", atSeconds: 0.55, blendSeconds: 0.08 });
  value.seek(0.59); const pose = [bonePose(value, "a"), bonePose(value, "b")];
  value.seek(1.15); expect(bonePose(value, "a")).not.toEqual(pose[0]);
  value.seek(0.59); expect([bonePose(value, "a"), bonePose(value, "b")]).toEqual(pose);
  value.setManualCue({ kind: "death", atSeconds: 0.1 }); value.seek(99);
  const dead = value.snapshot().frame!.actors[1]!; expect(dead.terminal).toBe("held");
  expect(dead.poses[0]!.actionId).toBe("Death");
  expect(value.sequence()!.events.every((event) => event.result === "unmeasured")).toBe(true);
  value.restart(); expect(value.snapshot().frame!.actors[1]!.terminal).toBe("none");
}, 30_000);
