import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { ReviewPropsPanel } from "../src/review/weapon-lab/review-props-panel";
import { createReviewPropFactory, REVIEW_PROP_DEFINITIONS, type ReviewPropInstance } from "../src/review/weapon-lab/review-prop-factory";
import { DomNode, domFixture } from "./helpers/reviewDomFixture";
import { reviewPropInteractionFrame } from "../src/review/weapon-lab/review-prop-interactions";
import { ReviewContactSurface } from "../src/review/weapon-lab/combat-review-contact";
import type { ReviewActorAdapter } from "../src/review/weapon-lab/combat-review-types";

function handActor(): ReviewActorAdapter {
  const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
  const geometry = new THREE.BoxGeometry(.1, .1, .1), count = geometry.getAttribute("position").count;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0), 4));
  const weights = new Float32Array(count * 4); for (let index = 0; index < count; index++) weights[index * 4] = 1;
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()), hand = new THREE.Bone();
  hand.name = "mixamorigLeftHand"; mesh.add(hand); mesh.bind(new THREE.Skeleton([hand])); model.add(mesh);
  return { instanceId: "actor-a", definitionId: "human-foundation-pilot", root, model,
    actions: () => [], sample() {}, reset() {}, dispose() { geometry.dispose(); mesh.material.dispose(); } };
}

function fixture() {
  const instances: ReviewPropInstance[] = [];
  const actor = handActor();
  const create = vi.fn(async ({ instanceId, definitionId }: { definitionId: string; instanceId: string; signal?: AbortSignal }) => {
    const root = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial();
    const model = new THREE.Mesh(geometry, material); model.position.y = .5; root.add(model);
    const contactSurface = new ReviewContactSurface(root); contactSurface.update();
    const definition = REVIEW_PROP_DEFINITIONS.find((entry) => entry.id === definitionId)!;
    const joints = definition.joints.map((profile) => ({ ...profile, value: 0 }));
    const instance = { instanceId, definition, root, model, contactSurface,
      joints: () => joints,
      setJoint: vi.fn((id: string, value: number) => { joints.find((joint) => joint.id === id)!.value = value; }),
      resetJoints: vi.fn(() => joints.forEach((joint) => { joint.value = 0; })),
      bounds: () => new THREE.Box3().setFromObject(root),
      place: vi.fn((position: readonly [number, number, number], yaw: number) => { root.position.fromArray(position); root.rotation.y = yaw; }),
      dispose: vi.fn(() => { root.removeFromParent(); contactSurface.dispose(); geometry.dispose(); material.dispose(); }) } as unknown as ReviewPropInstance;
    instances.push(instance); return instance;
  });
  const factory = { create, dispose: vi.fn(() => instances.forEach((instance) => instance.dispose())) };
  const doc = domFixture(), frame = vi.fn();
  const panel = new ReviewPropsPanel({ document: doc as unknown as Document,
    factory: factory as ReturnType<typeof createReviewPropFactory>, onFrameBounds: frame, actorForSlot: () => actor });
  const element = panel.element as unknown as DomNode;
  const control = (command: string) => element.find((node) => node.dataset.command === command)!;
  const input = (label: string) => element.find((node) => node.attributes["aria-label"] === label)!;
  const emit = (command: string, type = "click") => element.emit(type, control(command));
  return { panel, element, doc, instances, factory, frame, control, input, emit };
}

describe("review prop panel", () => {
  it("maps the actual chest source phases without pretending a contact solve", async () => {
    const f=fixture();f.panel.setActive(true);f.control("asset").value="iron-bound-chest-draft";f.emit("spawn");
    await vi.waitFor(()=>expect(f.instances).toHaveLength(1));
    const snapshot=(phase:number,action="Interactions__HumanMasculineAthleticMuscularOpenChestLid")=>({active:true,ready:true,
      frame:{timeSeconds:phase*10,actors:[{actorId:"actor-a"}]},slots:[{slot:"a",definitionId:"human:environment",
        selected:{action},actions:[{id:action,durationSeconds:10}]}]}) as never;
    expect(reviewPropInteractionFrame("tree",snapshot(.5))).toBeNull();
    f.panel.syncInteraction(snapshot(.18));expect(f.instances[0]!.setJoint).not.toHaveBeenCalled();
    f.panel.syncInteraction(snapshot(.235));expect((f.instances[0]!.setJoint as ReturnType<typeof vi.fn>).mock.lastCall).toEqual(["hasp",expect.closeTo(30,8)]);
    f.panel.syncInteraction(snapshot(.49));expect((f.instances[0]!.setJoint as ReturnType<typeof vi.fn>).mock.lastCall).toEqual(["lid",expect.closeTo(52.5,8)]);
    f.panel.syncInteraction(snapshot(.7));expect(f.input("Lid opening").value).toBe("105");
    const diagnostic=()=>f.element.find((node)=>node.dataset.interactionState!==undefined)!;
    expect(diagnostic().dataset.interactionState).toBe("clear");
    expect(diagnostic().textContent).toContain("NO CONTACT");expect(diagnostic().textContent).toContain("shared time 7 s (70%, open hold)");
    expect(diagnostic().textContent).toContain("no continuous hand-contact");expect(diagnostic().textContent).toContain("no continuous hand-contact, gameplay, damage, climbing or destruction approval");
    const calls=(f.instances[0]!.setJoint as ReturnType<typeof vi.fn>).mock.calls.length;f.panel.syncInteraction(snapshot(.7));
    expect(f.instances[0]!.setJoint).toHaveBeenCalledTimes(calls);f.panel.syncInteraction(snapshot(.7,"idle"));
    expect(diagnostic().dataset.interactionState).toBe("unavailable");expect(diagnostic().textContent).toContain("UNAVAILABLE");f.panel.dispose();
  });

  it("recomputes deterministic actor-to-prop contact, placement and timing labels when the chest moves", async () => {
    const f=fixture(),action="Interactions__HumanMasculineAthleticMuscularOpenChestLid";f.panel.setActive(true);
    f.control("asset").value="iron-bound-chest-draft";f.emit("spawn");await vi.waitFor(()=>expect(f.instances).toHaveLength(1));
    f.panel.syncInteraction({active:true,ready:true,frame:{timeSeconds:4.9,actors:[{actorId:"actor-a"}]},
      slots:[{slot:"a",definitionId:"human:environment",selected:{action},actions:[{id:action,durationSeconds:10}]}]} as never);
    const diagnostic=()=>f.element.find((node)=>node.dataset.interactionState!==undefined)!;
    const x=f.input("Prop X"),z=f.input("Prop Z");x.value="0";f.element.emit("input",x);z.value="0.55";f.element.emit("input",z);
    expect(diagnostic().dataset.interactionState).toBe("contact");expect(diagnostic().textContent).toContain("CONTACT SAMPLE ≤ 8 mm");
    expect(diagnostic().textContent).toContain("Actor A → prop-1");expect(diagnostic().textContent).toContain("49%, lid rotation");
    expect(diagnostic().textContent).toContain("root-to-solid");expect(diagnostic().textContent).toContain("facing error 0°");
    z.value="3";f.element.emit("input",z);expect(diagnostic().dataset.interactionState).toBe("clear");
    expect(diagnostic().textContent).toContain("NO CONTACT at 8 mm tolerance");f.panel.dispose();
  });
  it("only exposes the selected prop's named joints and keeps them independent of placement", async () => {
    const f = fixture(); f.panel.setActive(true); f.control("asset").value = "iron-bound-chest-draft";
    f.emit("spawn"); await vi.waitFor(() => expect(f.control("spawn").disabled).toBe(false));
    const lid = f.input("Lid opening"), chest = f.instances[0]!, home = chest.root.position.clone();
    lid.value = "38"; f.doc.activeElement = lid; f.element.emit("input", lid);
    expect(chest.setJoint).toHaveBeenCalledWith("lid", 38); expect(f.input("Lid opening")).toBe(lid);
    expect(chest.root.position.equals(home)).toBe(true); f.emit("reset-joints"); expect(lid.value).toBe("0");
    f.control("asset").value = "tree-small-02"; f.emit("spawn"); await vi.waitFor(() => expect(f.instances).toHaveLength(2));
    expect(f.input("Lid opening")).toBeNull(); f.control("selected").value = "prop-1"; f.emit("selected", "change");
    expect(f.input("Lid opening").value).toBe("0"); f.panel.dispose();
  });
  it("spawns a real factory instance, edits placement immediately and frames without touching other scene actors", async () => {
    const f = fixture(), scene = new THREE.Scene(), actor = new THREE.Group();
    actor.position.set(1, 2, 3); scene.add(actor, f.panel.root);
    expect(f.element.hidden).toBe(true); f.emit("spawn"); expect(f.factory.create).not.toHaveBeenCalled();
    f.panel.setActive(true); f.emit("spawn"); await vi.waitFor(() => expect(f.control("spawn").disabled).toBe(false));
    expect(f.factory.create).toHaveBeenCalledOnce(); expect(f.panel.root.children).toEqual([f.instances[0]!.root]);
    expect(f.instances[0]!.root.position.toArray()).toEqual([4.5, 0, 0]); expect(f.frame).toHaveBeenCalledOnce();
    const x = f.input("Prop X"); f.doc.activeElement = x; x.value = "2.7"; f.element.emit("input", x);
    expect(f.instances[0]!.root.position.x).toBe(2.7); expect(f.input("Prop X")).toBe(x);
    const yaw = f.input("Prop facing"); yaw.value = "90"; f.element.emit("input", yaw);
    expect(f.instances[0]!.root.rotation.y).toBeCloseTo(Math.PI / 2);
    f.emit("frame"); expect(f.frame).toHaveBeenCalledTimes(2);
    f.emit("reset"); expect(f.instances[0]!.root.position.toArray()).toEqual([4.5, 0, 0]);
    expect(actor.position.toArray()).toEqual([1, 2, 3]);
    f.panel.setActive(false); expect(f.panel.root.visible).toBe(false);
    f.panel.setActive(true); expect(f.panel.root.children).toHaveLength(1); expect(f.factory.create).toHaveBeenCalledOnce();
    f.panel.dispose(); f.panel.dispose(); expect(f.factory.dispose).toHaveBeenCalledOnce(); expect(f.element.listeners.size).toBe(0);
    expect(scene.children).toEqual([actor]);
  });

  it("rejects incomplete/out-of-range values without teleporting a prop and restores a valid value on blur", async () => {
    const f = fixture(); f.panel.setActive(true); f.emit("spawn"); await vi.waitFor(() => expect(f.control("spawn").disabled).toBe(false));
    const x = f.input("Prop X"); x.value = ""; f.element.emit("input", x); expect(f.instances[0]!.root.position.x).toBe(4.5);
    x.value = "200"; f.element.emit("change", x); expect(x.value).toBe("4.5");
    expect(f.element.find((node) => node.attributes.role === "alert")!.textContent).toContain("20 m"); f.panel.dispose();
  });

  it("keeps independent props selectable, caps six instances and reuses freed placement slots", async () => {
    const f = fixture(); f.panel.setActive(true);
    for (let index = 0; index < 6; index++) { f.emit("spawn"); await vi.waitFor(() => expect(f.control("selected").children).toHaveLength(index + 1)); }
    expect(f.control("spawn").disabled).toBe(true); f.emit("spawn"); expect(f.factory.create).toHaveBeenCalledTimes(6);
    expect(new Set(f.instances.map((entry) => entry.root.position.toArray().join(","))).size).toBe(6);
    f.control("selected").value = "prop-1"; f.emit("selected", "change"); f.emit("remove");
    expect(f.instances[0]!.dispose).toHaveBeenCalledOnce(); expect(f.control("spawn").disabled).toBe(false);
    f.emit("spawn"); await vi.waitFor(() => expect(f.control("selected").children).toHaveLength(6));
    expect(f.instances[6]!.root.position.toArray()).toEqual([4.5, 0, 0]); f.panel.dispose();
  });

  it("ignores a stale load after leaving the workspace without cancelling the new load", async () => {
    const f = fixture(), original = f.factory.create.getMockImplementation()!;
    let release!: () => void; const wait = new Promise<void>((resolve) => { release = resolve; });
    f.factory.create.mockImplementationOnce(async (request) => { await wait; return original(request); });
    f.panel.setActive(true); f.emit("spawn"); const signal = f.factory.create.mock.calls[0]![0].signal!;
    f.panel.setActive(false); expect(signal.aborted).toBe(true);
    f.panel.setActive(true); f.emit("spawn"); await vi.waitFor(() => expect(f.panel.root.children).toHaveLength(1));
    release(); await vi.waitFor(() => expect(f.instances).toHaveLength(2));
    expect(f.instances[1]!.dispose).toHaveBeenCalledOnce(); expect(f.panel.root.children).toEqual([f.instances[0]!.root]);
    expect(f.frame).toHaveBeenCalledOnce(); f.panel.dispose();
  });

  it("shows download errors with retry and releases late completion after disposal", async () => {
    const f = fixture(), original = f.factory.create.getMockImplementation()!;
    f.factory.create.mockRejectedValueOnce(new Error("source checksum mismatch")); f.panel.setActive(true); f.emit("spawn");
    await vi.waitFor(() => expect(f.control("spawn").disabled).toBe(false));
    expect(f.element.find((node) => node.attributes.role === "alert")!.textContent).toContain("checksum mismatch");
    let release!: () => void; const wait = new Promise<void>((resolve) => { release = resolve; });
    f.factory.create.mockImplementationOnce(async (request) => { await wait; return original(request); });
    f.emit("spawn"); f.panel.dispose(); release(); await vi.waitFor(() => expect(f.instances).toHaveLength(1));
    expect(f.instances[0]!.dispose).toHaveBeenCalledOnce(); expect(f.frame).not.toHaveBeenCalled();
  });
});
