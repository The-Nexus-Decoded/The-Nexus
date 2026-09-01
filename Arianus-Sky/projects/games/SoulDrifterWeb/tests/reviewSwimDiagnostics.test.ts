import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { createReviewSwimVolume, measureReviewSwimPose, REVIEW_SWIM_ACTIONS, reviewSwimFrame,
  surveyReviewSwim, type ReviewSwimFrame } from "../src/review/weapon-lab/review-swim-diagnostics";
import type { ReviewAction, ReviewActorAdapter } from "../src/review/weapon-lab/combat-review-types";

type Path = (time: number, duration: number, actionId: string) => THREE.Vector3;
const actions: ReviewAction[] = Object.entries(REVIEW_SWIM_ACTIONS).map(([id, value]) => ({ id, clipName: id,
  label: value.role, semantic: "interaction", approvalStatus: value.approval, durationSeconds: value.durationSeconds,
  rootPolicy: "authored-displacement" }));

function actor(path: Path = () => new THREE.Vector3()): ReviewActorAdapter & { sample: ReturnType<typeof vi.fn> } {
  const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
  const geometry = new THREE.BoxGeometry(.5, 1, .5), material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = .5; model.add(mesh);
  let current = new THREE.Vector3();
  const sample = vi.fn((actionId: string, time: number) => {
    const duration = actions.find((entry) => entry.id === actionId)!.durationSeconds;
    current = path(time, duration, actionId); model.position.copy(current); root.updateMatrixWorld(true);
  });
  return { instanceId: "swimmer", definitionId: "human-foundation-pilot", root, model, actions: () => actions,
    sample, reset() { sample(actions[0]!.id, 0); },
    socketWorld(name, target) { if (name !== "Hips") return false;
      target.copy(model.localToWorld(new THREE.Vector3(0, .5, 0))); return true; },
    dispose() { geometry.dispose(); material.dispose(); } };
}

function frame(actionId: keyof typeof REVIEW_SWIM_ACTIONS, timeSeconds = 0): ReviewSwimFrame {
  const value = REVIEW_SWIM_ACTIONS[actionId];
  return { actorId: "swimmer", slot: "a", actionId, durationSeconds: value.durationSeconds,
    timeSeconds, role: value.role, approval: value.approval };
}

describe("diagnostic swim volume", () => {
  it("pins the four owned source/draft roles and exact live-library durations", () => {
    expect(REVIEW_SWIM_ACTIONS).toEqual({
      GapAuthored__SwimRunDiveWaterEntry: { role: "WATER ENTRY DRAFT", durationSeconds: 3.2, approval: "draft" },
      Interactions__HumanMasculineAthleticMuscularSwimForwardLoop: { role: "FORWARD LOOP SOURCE", durationSeconds: 4.566667, approval: "source" },
      Interactions__HumanMasculineAthleticMuscularSwimIdleTread: { role: "TREAD LOOP SOURCE", durationSeconds: 3.033333, approval: "source" },
      Interactions__HumanMasculineAthleticMuscularSwimToEdge: { role: "EDGE-APPROACH SOURCE", durationSeconds: 5.033333, approval: "source" },
    });
  });

  it("selects only exact environmental swim actions on the shared clock", () => {
    const action = actions[1]!;
    const snapshot = { active: true, ready: true, frame: { timeSeconds: 2, actors: [{ actorId: "swimmer" }] },
      slots: [{ slot: "a", definitionId: "human:environment", selected: { action: action.id }, actions: [action] }] };
    expect(reviewSwimFrame(snapshot as never)).toMatchObject({ actorId: "swimmer", slot: "a", actionId: action.id, timeSeconds: 2 });
    expect(reviewSwimFrame({ ...snapshot, slots: [{ ...snapshot.slots[0], selected: { action: "idle" } }] } as never)).toBeNull();
    expect(reviewSwimFrame({ ...snapshot, slots: [{ ...snapshot.slots[0], actions: [{ ...action, durationSeconds: 8 }] }] } as never)).toBeNull();
  });

  it("distinguishes outside, partial, inside and below-volume samples without inventing a body percentage", () => {
    let position = new THREE.Vector3(0, 0, -5); const value = actor(() => position.clone()), volume = createReviewSwimVolume();
    volume.recenter(value); const selected = frame("Interactions__HumanMasculineAthleticMuscularSwimForwardLoop");
    value.sample(selected.actionId, 0); expect(measureReviewSwimPose(value, selected, volume).state).toBe("outside");
    position = new THREE.Vector3(0, 0, -4); value.sample(selected.actionId, 0);
    const partial = measureReviewSwimPose(value, selected, volume); expect(partial.state).toBe("partial");
    expect(partial.sampledInside).toBeGreaterThan(0); expect(partial.sampledInside).toBeLessThan(partial.sampledTotal);
    position = new THREE.Vector3(); value.sample(selected.actionId, 0);
    const inside = measureReviewSwimPose(value, selected, volume); expect(inside.state).toBe("inside");
    expect(inside.label).toContain(`sampled vertices inside diagnostic volume ${inside.sampledTotal}/${inside.sampledTotal}`);
    expect(inside.label).not.toContain("%");
    position = new THREE.Vector3(0, -2, 0); value.sample(selected.actionId, 0);
    expect(measureReviewSwimPose(value, selected, volume).state).toBe("below-volume");
    value.dispose(); volume.dispose();
  });

  it("surveys absolute 30 Hz entry motion, reports its reversal, crossings and restores the latest pose", async () => {
    const selected = frame("GapAuthored__SwimRunDiveWaterEntry");
    const value = actor((time, duration) => {
      const phase = time / duration;
      return new THREE.Vector3(0, 1.2 - phase * 1.2, phase <= .5 ? -5 + phase * 16 : 3 - (phase - .5) * 6);
    });
    const volume = createReviewSwimVolume(); volume.recenter(value); const restore = vi.fn(() => value.sample(selected.actionId, .75));
    const result = await surveyReviewSwim(value, selected, volume, { restore });
    expect(result.sampleCount).toBe(Math.ceil(3.2 * 30) + 1); expect(result.firstVolumeSeconds).not.toBeNull();
    expect(result.firstWaterlineSeconds).not.toBeNull(); expect(result.firstEndPlaneSeconds).toBeNull();
    expect(result.reverseTravelMeters).toBeGreaterThan(2.9); expect(result.loopSeamResidualMeters).toBeGreaterThan(4.9);
    expect(restore).toHaveBeenCalled(); expect(value.model.position.z).toBeCloseTo(-1.25, 5);
    value.dispose(); volume.dispose();
  });

  it("measures loop seams and an end-plane crossing without calling either an exit approval", async () => {
    for (const [actionId, path, crossed] of [
      ["Interactions__HumanMasculineAthleticMuscularSwimForwardLoop", (time: number, duration: number) => new THREE.Vector3(0, 0, Math.sin(time / duration * Math.PI * 2) * .2), false],
      ["Interactions__HumanMasculineAthleticMuscularSwimToEdge", (time: number, duration: number) => new THREE.Vector3(0, 0, -3 + time / duration * 7.2), true],
    ] as const) {
      const selected = frame(actionId), value = actor(path), volume = createReviewSwimVolume(); volume.recenter(value);
      const result = await surveyReviewSwim(value, selected, volume, { restore: () => value.sample(actionId, .5) });
      expect(result.loopSeamResidualMeters).toBeLessThan(crossed ? 7.3 : 1e-5);
      expect(result.firstEndPlaneSeconds !== null).toBe(crossed);
      expect(measureReviewSwimPose(value, { ...selected, timeSeconds: .5 }, volume).label).toContain("no body percentage, buoyancy, collision, water physics, exit or gameplay approval");
      value.dispose(); volume.dispose();
    }
  });

  it("fails closed for missing sockets, duration drift, cancellation and disposed visual resources", async () => {
    const selected = frame("Interactions__HumanMasculineAthleticMuscularSwimIdleTread"), value = actor(), volume = createReviewSwimVolume();
    volume.recenter(value); const noSocket = { ...value, socketWorld: undefined } as ReviewActorAdapter;
    expect(measureReviewSwimPose(noSocket, selected, volume).state).toBe("unavailable");
    const drift = { ...value, actions: () => actions.map((entry) => entry.id === selected.actionId ? { ...entry, durationSeconds: 9 } : entry) };
    expect(measureReviewSwimPose(drift, selected, volume).state).toBe("unavailable");
    const abort = new AbortController(); abort.abort();
    await expect(surveyReviewSwim(value, selected, volume, { restore() {}, signal: abort.signal })).rejects.toMatchObject({ name: "AbortError" });
    volume.dispose(); expect(volume.bounds().isEmpty()).toBe(true); value.dispose();
  });
});
