import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { ReviewPropsPanel } from "../src/review/weapon-lab/review-props-panel";
import { createReviewPropFactory, REVIEW_PROP_DEFINITIONS, type ReviewPropInstance } from "../src/review/weapon-lab/review-prop-factory";
import { DomNode, domFixture } from "./helpers/reviewDomFixture";

function fixture() {
  const instances: ReviewPropInstance[] = [];
  const create = vi.fn(async ({ instanceId }: { definitionId: string; instanceId: string; signal?: AbortSignal }) => {
    const root = new THREE.Group();
    const instance = { instanceId, definition: REVIEW_PROP_DEFINITIONS[0]!, root,
      bounds: () => new THREE.Box3(root.position.clone(), root.position.clone().addScalar(2)),
      place: vi.fn((position: readonly [number, number, number], yaw: number) => { root.position.fromArray(position); root.rotation.y = yaw; }),
      dispose: vi.fn(() => root.removeFromParent()) } as unknown as ReviewPropInstance;
    instances.push(instance); return instance;
  });
  const factory = { create, dispose: vi.fn(() => instances.forEach((instance) => instance.dispose())) };
  const doc = domFixture(), frame = vi.fn();
  const panel = new ReviewPropsPanel({ document: doc as unknown as Document,
    factory: factory as ReturnType<typeof createReviewPropFactory>, onFrameBounds: frame });
  const element = panel.element as unknown as DomNode;
  const control = (command: string) => element.find((node) => node.dataset.command === command)!;
  const input = (label: string) => element.find((node) => node.attributes["aria-label"] === label)!;
  const emit = (command: string, type = "click") => element.emit(type, control(command));
  return { panel, element, doc, instances, factory, frame, control, input, emit };
}

describe("review prop panel", () => {
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
