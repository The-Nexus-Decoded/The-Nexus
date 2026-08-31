import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatReviewController, type CombatActorDefinition, type CombatActorHandle, type CombatActorLoader,
  type CombatActorRequest, type CombatSlot } from "../src/review/weapon-lab/combat-review-controller";
import { CombatReviewPanel } from "../src/review/weapon-lab/combat-review-panel";
import type { ReviewAction } from "../src/review/weapon-lab/combat-review-types";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import { resolveReviewContact, type ReviewContactResolution } from "../src/review/weapon-lab/combat-review-contact-resolver";
import type { ReviewContactProfile } from "../src/review/weapon-lab/combat-review-contact-profiles";

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
function controller(loadActor: CombatActorLoader = async (request) => actorFixture(request), initial?: { a: string; b: string },
  contactResolver?: typeof resolveReviewContact) {
  const value = new CombatReviewController({ definitions, loadActor, initial, contactResolver }); controllers.add(value); return value;
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

type ContactRequest = Parameters<typeof resolveReviewContact>[0];
const contactProfile = (): ReviewContactProfile => ({ id: "explicit-test-surface", actionId: "strike", startSeconds: 0.2,
  endSeconds: 1.2, surface: { kind: "bones", names: ["test-hand"] }, evidence: "Test surface fixture" });
function contactResult(request: ContactRequest, status: ReviewContactResolution["status"] = "contact"): ReviewContactResolution {
  return { status, sequenceId: request.sequence.id, profileId: request.profile?.id ?? null, samples: 48, sampleRate: 120,
    toleranceMeters: 0.008, evidence: "Injected unit-test resolver; real geometry is covered by resolver tests",
    event: status === "contact" ? { id: "test-contact", kind: "contact", result: "hit", actorId: request.attacker.actor.instanceId,
      targetId: request.target.actor.instanceId, timeSeconds: 0.6, position: [0, 0.5, 1], normal: [0, 0, -1],
      evidence: "deformed-triangle:test-fixture:0:sample-48" } : undefined };
}
describe("Combat Review measured-contact ownership", () => {
  it("uses one current-sequence surface event for an explicit response; seeking never emits a historical hit", async () => {
    const value = controller(undefined, undefined, async (request) => contactResult(request)); await value.enter();
    value.seek(0.3); const priorTarget = bonePose(value, "b");
    const result = await value.resolveContact({ profile: contactProfile(), response: "reaction" });
    expect(result!.status).toBe("contact"); expect(result!.sequenceId).toBe(value.sequence()!.id);
    expect(value.snapshot().contact).toMatchObject({ status: "contact", response: "reaction" });
    expect(value.sequence()!.events).toHaveLength(2);
    expect(value.sequence()!.events.filter((event) => event.kind === "contact")).toHaveLength(1);
    expect(value.sequence()!.events.find((event) => event.kind === "reaction")).toMatchObject({ timeSeconds: 0.6, result: "hit" });
    expect(bonePose(value, "b")).toEqual(priorTarget);
    value.seek(1.9); expect(value.snapshot().frame!.crossedEvents).toEqual([]);
    const crossed: string[] = [];
    value.subscribe((snapshot) => crossed.push(...snapshot.frame?.crossedEvents.map((entry) => entry.event.kind) ?? []));
    value.restart(true); value.advance(0.61);
    expect(crossed.filter((kind) => kind === "contact")).toHaveLength(1);
    value.advance(0.1); expect(crossed.filter((kind) => kind === "contact")).toHaveLength(1);
  });

  it("retains the measured target pose at impact even after a zero-blend manual cue", async () => {
    const value = controller(undefined, undefined, async (request) => contactResult(request)); await value.enter();
    value.seek(0.6); const expected = bonePose(value, "b");
    value.setManualCue({ kind: "none", blendSeconds: 0 });
    await value.resolveContact({ profile: contactProfile(), response: "reaction" }); value.seek(0.6);
    expect(bonePose(value, "b")).toEqual(expected); expect(value.snapshot().cue.blendSeconds).toBeGreaterThan(0);
  });

  it("records contact without inventing a reaction when none is requested, and preserves caller isolation", async () => {
    let supplied: ReviewContactResolution | undefined;
    const value = controller(undefined, undefined, async (request) => (supplied = contactResult(request))); await value.enter();
    const result = await value.resolveContact({ profile: contactProfile() });
    expect(value.sequence()!.events.map((event) => event.kind)).toEqual(["contact"]);
    expect(value.snapshot().cue.kind).toBe("none");
    (result!.event as { evidence: string }).evidence = "mutated-return";
    (supplied!.event as { evidence: string }).evidence = "mutated-resolver";
    const snapshot = value.snapshot(); (snapshot.contact.result!.event as { evidence: string }).evidence = "mutated-snapshot";
    expect(value.snapshot().contact.result!.event!.evidence).toContain("deformed-triangle:");
    expect(value.sequence()!.events[0]!.evidence).toContain("deformed-triangle:");
  });

  it("keeps miss and unavailable distinct and schedules neither a hit nor a response", async () => {
    for (const status of ["miss", "unavailable"] as const) {
      const value = controller(undefined, undefined, async (request) => contactResult(request, status)); await value.enter();
      await value.resolveContact({ profile: contactProfile(), response: "death" });
      expect(value.snapshot().contact.status).toBe(status); expect(value.snapshot().cue.kind).toBe("none");
      expect(value.sequence()!.events).toEqual([]);
    }
    const unbound = controller(); await unbound.enter();
    expect(unbound.contactProfile()).toBeNull(); expect((await unbound.resolveContact())!.status).toBe("unavailable");
  });

  it("cancels stale work on actor/action/ready/placement/calibration changes and leave", async () => {
    const changes: Array<(value: CombatReviewController) => unknown> = [
      (value) => value.setAction("a", "action", "idle"), (value) => value.setAction("b", "ready", "strike"),
      (value) => value.setAttacker("b"), (value) => value.setPlacement({ separationMeters: 3 }),
      (value) => value.setCalibration("b", "joint", 0.2), (value) => value.resetCalibration("a"),
      (value) => value.selectActor("b", "boss"), (value) => value.leave(),
    ];
    for (const change of changes) {
      const task = deferred<ReviewContactResolution>(); let request!: ContactRequest;
      const value = controller(undefined, undefined, async (input) => { request = input; return task.promise; }); await value.enter();
      const pending = value.resolveContact({ profile: contactProfile(), response: "reaction" });
      expect(value.snapshot().contact.status).toBe("scanning"); await change(value);
      expect(request.signal!.aborted).toBe(true); task.resolve(contactResult(request));
      expect(await pending).toBeNull(); expect(value.snapshot().contact.status).toBe("unmeasured");
      expect(value.sequence()?.events.some((event) => event.result === "hit") ?? false).toBe(false);
    }
  });

  it("keeps newer Play or seek intent when an aborted scan finally restores the clock pose", async () => {
    for (const play of [true, false]) {
      const task = deferred<ReviewContactResolution>(); let request!: ContactRequest;
      const value = controller(undefined, undefined, async (input) => { request = input; return task.promise; }); await value.enter();
      const pending = value.resolveContact({ profile: contactProfile() });
      if (play) { value.setPlaying(true); value.advance(0.2); } else value.seek(0.4);
      const expected = bonePose(value, "a"); request.restore!(); task.resolve(contactResult(request)); await pending;
      expect(value.snapshot().frame!.playing).toBe(play); expect(bonePose(value, "a")).toEqual(expected);
      expect(value.snapshot().frame!.timeSeconds).toBeCloseTo(play ? 0.2 : 0.4);
      expect(value.snapshot().contact.status).toBe("unmeasured");
    }
  });

  it("invalidates resolved evidence and its derived response while preserving honest manual cues", async () => {
    const value = controller(undefined, undefined, async (request) => contactResult(request)); await value.enter();
    await value.resolveContact({ profile: contactProfile(), response: "death" });
    value.seek(1.9); expect(value.snapshot().frame!.actors[1]!.terminal).toBe("held");
    value.restart(); expect(value.snapshot().frame!.actors[1]!.terminal).toBe("none");
    value.setPlacement({ separationMeters: 4 });
    expect(value.snapshot().contact.status).toBe("unmeasured"); expect(value.sequence()!.events).toEqual([]);
    expect(value.snapshot().cue.kind).toBe("none");
    await value.resolveContact({ profile: contactProfile(), response: "reaction" });
    value.setManualCue({ kind: "reaction", atSeconds: 0.3 });
    expect(value.sequence()!.events).toEqual([expect.objectContaining({ id: "manual-response", result: "unmeasured", timeSeconds: 0.3 })]);
  });

  it("rejects foreign results and mismatched profiles instead of fabricating a current hit", async () => {
    const value = controller(undefined, undefined, async (request) => ({ ...contactResult(request), sequenceId: "stale-other-sequence" }));
    await value.enter(); expect((await value.resolveContact({ profile: contactProfile() }))!.status).toBe("unavailable");
    expect(value.sequence()!.events).toEqual([]);
    await expect(value.resolveContact({ profile: { ...contactProfile(), actionId: "idle" } })).rejects.toThrow(/selected/);
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
  it("shows scan state, explicitly selected measured response and actual contact time without calling it manual", async () => {
    const task = deferred<ReviewContactResolution>(); let request!: ContactRequest;
    const value = controller(undefined, undefined, async (input) => { request = input; return task.promise; });
    const onScanContact = vi.fn((response: "none" | "reaction" | "death") => value.resolveContact({ profile: contactProfile(), response }));
    const panel = new CombatReviewPanel(value, { document: domFixture() as unknown as Document, onScanContact });
    await value.enter(); const root = panel.element as unknown as DomNode;
    const control = (command: string) => root.find((node) => node.dataset.command === command)!;
    const status = () => root.find((node) => Boolean(node.dataset.state))!;
    expect(control("contact-response").value).toBe("none"); expect(control("contact-jump").disabled).toBe(true);
    const response = control("contact-response"); response.value = "reaction"; root.emit("change", response);
    expect(control("contact-clip").parentElement!.hidden).toBe(false);
    expect(control("contact-clip").value).toBe("flinch");
    root.emit("click", control("contact-scan"));
    expect(onScanContact).toHaveBeenCalledWith("reaction"); expect(status().dataset.state).toBe("scanning");
    expect(control("contact-scan").textContent).toBe("Cancel scan"); expect(status().attributes["aria-live"]).toBe("polite");
    task.resolve(contactResult(request)); await vi.waitFor(() => expect(status().dataset.state).toBe("contact"));
    expect(status().textContent).toContain("0.600 s"); expect(status().textContent).toContain("reaction scheduled");
    expect(control("cue").value).toBe("none"); expect(control("cue-time").parentElement!.hidden).toBe(true);
    expect(root.find((node) => node.textContent.startsWith("Measured reaction ·"))).not.toBeNull();
    expect(control("contact-jump").disabled).toBe(false); root.emit("click", control("contact-jump"));
    expect(value.snapshot().frame!.timeSeconds).toBe(0.6); expect(value.snapshot().frame!.crossedEvents).toEqual([]);
    const manual = control("cue"); manual.value = "reaction"; root.emit("change", manual);
    expect(status().dataset.state).toBe("unmeasured"); expect(control("contact-jump").disabled).toBe(true);
    expect(root.find((node) => node.textContent.startsWith("Manual cue · not measured contact"))).not.toBeNull();
    panel.dispose();
  });

  it("presents measured miss separately from unavailable with no invented response or contact jump", async () => {
    for (const state of ["miss", "unavailable"] as const) {
      const value = controller(undefined, undefined, async (request) => ({ ...contactResult(request, state), evidence: "No eligible fixture contact" }));
      const panel = new CombatReviewPanel(value, { document: domFixture() as unknown as Document,
        onScanContact: (response) => value.resolveContact({ profile: contactProfile(), response }) });
      await value.enter(); const root = panel.element as unknown as DomNode;
      root.emit("click", root.find((node) => node.dataset.command === "contact-scan")!);
      await vi.waitFor(() => expect(root.find((node) => node.dataset.state === state)).not.toBeNull());
      const text = root.find((node) => node.dataset.state === state)!.textContent;
      expect(text).toContain(state === "miss" ? "Measured miss" : "Contact unavailable");
      if (state === "unavailable") expect(text).toContain("No eligible fixture contact");
      expect(value.sequence()!.events).toEqual([]);
      expect(root.find((node) => node.dataset.command === "contact-jump")!.disabled).toBe(true); panel.dispose();
    }
  });

  it("cancels a scan immediately without waiting for a revision change or accepting its late result", async () => {
    const task = deferred<ReviewContactResolution>(); let request!: ContactRequest;
    const value = controller(undefined, undefined, async (input) => { request = input; return task.promise; });
    const panel = new CombatReviewPanel(value, { document: domFixture() as unknown as Document,
      onScanContact: (response) => value.resolveContact({ profile: contactProfile(), response }) });
    await value.enter(); const root = panel.element as unknown as DomNode;
    const scan = root.find((node) => node.dataset.command === "contact-scan")!;
    root.emit("click", scan); const revision = value.snapshot().revision;
    expect(scan.textContent).toBe("Cancel scan"); root.emit("click", scan);
    expect(request.signal!.aborted).toBe(true); expect(value.snapshot().revision).toBe(revision);
    expect(scan.textContent).toBe("Scan contact"); expect(root.find((node) => node.dataset.state === "unmeasured")).not.toBeNull();
    task.resolve(contactResult(request)); await Promise.resolve(); await Promise.resolve();
    expect(value.snapshot().contact.status).toBe("unmeasured"); panel.dispose();
  });

  it("keeps missing source responses disabled and reports asynchronous scan errors accessibly", async () => {
    const value = controller(async (request) => actorFixture(request, [action("idle", "idle"), action("strike", "attack")]));
    const panel = new CombatReviewPanel(value, { document: domFixture() as unknown as Document,
      onScanContact: async () => { throw new Error("Contact source changed"); } });
    await value.enter(); const root = panel.element as unknown as DomNode;
    const response = root.find((node) => node.dataset.command === "contact-response")!;
    expect(response.children.find((node) => node.value === "reaction")!.disabled).toBe(true);
    expect(response.children.find((node) => node.value === "death")!.disabled).toBe(true);
    expect(root.find((node) => node.textContent.startsWith("No strike surface/window"))).not.toBeNull();
    root.emit("click", root.find((node) => node.dataset.command === "contact-scan")!);
    await vi.waitFor(() => expect(root.find((node) => node.attributes.role === "alert")!.textContent).toBe("Contact source changed"));
    panel.dispose();
  });

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
    separation.value = "-2"; root.emit("input", separation);
    expect(root.find((node) => node.attributes.role === "alert")!.textContent).toMatch(/Separation/);
    expect(value.snapshot().placement.separationMeters).toBe(1.75); panel.dispose();
  });

  it("previews numeric spacing and facing on input without waiting for blur or repeating on change", async () => {
    const value = controller(), doc = domFixture();
    const panel = new CombatReviewPanel(value, { document: doc as unknown as Document });
    await value.enter(); const root = panel.element as unknown as DomNode;
    const separation = root.find((node) => node.dataset.command === "separation")!;
    doc.activeElement = separation; separation.value = "3.85"; root.emit("input", separation);
    expect(value.snapshot().placement.separationMeters).toBe(3.85);
    expect(value.actor("b")!.root.position.z).toBe(3.85);
    const revision = value.snapshot().revision;
    root.emit("change", separation); expect(value.snapshot().revision).toBe(revision);
    separation.value = ""; root.emit("input", separation);
    expect(value.snapshot().placement.separationMeters).toBe(3.85);
    const yaw = root.find((node) => node.dataset.command === "yaw-a")!;
    yaw.value = "-90"; root.emit("input", yaw);
    expect(value.actor("a")!.root.rotation.y).toBeCloseTo(-Math.PI / 2);
    panel.dispose();
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
