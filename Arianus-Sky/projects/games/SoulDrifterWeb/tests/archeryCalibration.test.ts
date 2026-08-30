import { describe, expect, it } from "vitest";
import {
  ArcheryCalibrationRegistry,
  archeryCalibrationKey,
  type ArcheryCalibrationIdentity,
  type ArcheryCalibrationValues,
} from "../src/game/archery/archeryCalibration";

const baseIdentity: ArcheryCalibrationIdentity = {
  species: "human",
  bodyArchetype: "athletic-masculine",
  rigRevision: "human-foundation-v3",
  clipRevision: "prolongbow-shoot-v4",
  equipmentCombination: "shortbow+quiver-v2+arrow-standard-v2",
  assetRevision: "archery-tripo-v2",
  socketRole: "arrow-hand",
};

function values(positionX: number): ArcheryCalibrationValues {
  return {
    socketTransform: {
      position: [positionX, 0.2, 0.3],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    collision: {
      minimumBodyClearanceMeters: 0.01,
      minimumEquipmentClearanceMeters: 0.01,
      evidenceRevision: "qa-v1",
    },
  };
}

describe("archery calibration isolation", () => {
  it("keys every body, rig, clip, equipment, asset, and socket dimension", () => {
    const variants = [
      { ...baseIdentity, species: "elf" },
      { ...baseIdentity, bodyArchetype: "large-masculine" },
      { ...baseIdentity, rigRevision: "human-foundation-v4" },
      { ...baseIdentity, clipRevision: "prolongbow-shoot-v5" },
      { ...baseIdentity, equipmentCombination: "longbow+quiver-v2+arrow-standard-v2" },
      { ...baseIdentity, assetRevision: "archery-tripo-v3" },
      { ...baseIdentity, socketRole: "quiver-back" as const },
    ];
    const keys = new Set([archeryCalibrationKey(baseIdentity), ...variants.map(archeryCalibrationKey)]);
    expect(keys.size).toBe(variants.length + 1);
  });

  it("keeps base fit separate from an exact per-action override", () => {
    const registry = new ArcheryCalibrationRegistry();
    const { clipRevision: _clipRevision, ...baseFitIdentity } = baseIdentity;
    registry.registerBaseFit({
      identity: baseFitIdentity,
      calibrationRevision: "fit-v1",
      values: values(0.1),
    });
    registry.registerAction({
      identity: baseIdentity,
      calibrationRevision: "shoot-v2",
      values: values(0.4),
    });

    expect(registry.resolve(baseIdentity).values.socketTransform.position[0]).toBe(0.4);
    expect(registry.resolve({ ...baseIdentity, clipRevision: "prolongbow-run-v1" }).values.socketTransform.position[0]).toBe(0.1);
  });

  it("returns independent clones and cannot regress another animation", () => {
    const registry = new ArcheryCalibrationRegistry();
    registry.registerAction({ identity: baseIdentity, calibrationRevision: "shoot-v2", values: values(0.4) });
    const runIdentity = { ...baseIdentity, clipRevision: "prolongbow-run-v1" };
    registry.registerAction({ identity: runIdentity, calibrationRevision: "run-v1", values: values(0.8) });

    const shoot = registry.resolve(baseIdentity);
    const run = registry.resolve(runIdentity);
    const mutableResolvedPosition = shoot.values.socketTransform.position as unknown as number[];
    mutableResolvedPosition[0] = 99;

    expect(run.values.socketTransform.position[0]).toBe(0.8);
    expect(registry.resolve(baseIdentity).values.socketTransform.position[0]).toBe(0.4);
  });

  it("rejects penetration tolerances and invalid normalized markers", () => {
    const registry = new ArcheryCalibrationRegistry();
    expect(() => registry.registerAction({
      identity: baseIdentity,
      calibrationRevision: "invalid-collision",
      values: {
        ...values(0),
        collision: {
          minimumBodyClearanceMeters: -0.02,
          minimumEquipmentClearanceMeters: 0,
          evidenceRevision: "rejected",
        },
      },
    })).toThrow(/cannot accept penetration/i);

    expect(() => registry.registerAction({
      identity: baseIdentity,
      calibrationRevision: "invalid-markers",
      values: {
        ...values(0),
        markers: {
          contactQuiver: 0.1,
          gripFletching: 0.2,
          arrowClearsQuiver: 0.3,
          nock: 0.4,
          fullDraw: 0.8,
          release: 1.2,
          projectileSpawn: 0.9,
          recovery: 1,
        },
      },
    })).toThrow(/release.*normalized/i);
  });
});
