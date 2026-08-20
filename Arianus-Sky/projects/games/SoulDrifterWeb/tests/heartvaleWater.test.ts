import { describe, expect, it } from "vitest";

import { BreathMeter, WaterBody, type RiverCourse } from "../src/game/zones/heartvale/swim";
import { WATER_TUNING } from "../src/game/zones/heartvale/waterTuning";

/** Synthetic terrain: sloped-bank channel along x=0 — bed −0.2 at the
 * centerline rising 0.45/m to the 2.0 m plain at |x|=5. */
const channelField = {
  height: (x: number, _z: number) => (Math.abs(x) < 5 ? -0.2 + Math.abs(x) * 0.45 : 2.0),
};

const river: RiverCourse = {
  id: "test-run",
  samples: [[0, -100], [0, 0], [0, 100]], // flows south (+z)
  halfWidth: 5,
};

// surface = centerline bed + waterLift = 1.15; depth at x = 1.15 − terrain(x)
describe("WaterBody (real depth, swimmable water)", () => {
  const water = new WaterBody(channelField, [river]);

  it("reports no water off the corridor", () => {
    expect(water.waterSurfaceAt(20, 0)).toBeNull();
    expect(water.classifyAt(20, 0)).toBe("dry");
    expect(water.depthAt(20, 0)).toBe(0);
  });

  it("derives depth from the carved bed, not a flat plane", () => {
    expect(water.waterSurfaceAt(0, 0)).toBeCloseTo(1.15, 5);
    expect(water.depthAt(0, 0)).toBeCloseTo(1.35, 5); // mid-channel: swims
    expect(water.depthAt(5.5, 0)).toBeCloseTo(0, 5); // bank stands above the surface
  });

  it("classifies wade/swim by tunable thresholds across the channel", () => {
    expect(water.classifyAt(0, 0)).toBe("swim"); // 1.35 m
    expect(water.classifyAt(1.6, 0)).toBe("wade"); // ≈ 0.63 m on the sloped bank
    expect(water.classifyAt(5.5, 0)).toBe("dry");
  });

  it("flows downstream along the polyline (+z here)", () => {
    const flow = water.flowAt(1, 0);
    expect(flow).not.toBeNull();
    expect(flow!.x).toBeCloseTo(0, 5);
    expect(flow!.z).toBeCloseTo(1, 5);
  });

  it("current pushes swimmers harder than waders", () => {
    const swimmer = water.currentAt(0, 0);
    expect(Math.hypot(swimmer.x, swimmer.z)).toBeCloseTo(WATER_TUNING.currentStrength, 5);
    const wader = water.currentAt(1.6, 0);
    expect(Math.hypot(wader.x, wader.z)).toBeCloseTo(WATER_TUNING.currentStrength * WATER_TUNING.currentWadeFactor, 5);
  });
});

describe("BreathMeter (forgiving drowning)", () => {
  it("drains submerged, refills at the surface, never over-fills", () => {
    const meter = new BreathMeter();
    meter.update(5, true);
    expect(meter.breath).toBeCloseTo(WATER_TUNING.breathMaxSeconds - 5, 5);
    meter.update(2, false);
    expect(meter.breath).toBe(WATER_TUNING.breathMaxSeconds); // refill clamps at max
    meter.update(100, true);
    expect(meter.breath).toBe(0);
  });

  it("costs health only once breath is empty, at the tunable rate", () => {
    const meter = new BreathMeter();
    meter.update(WATER_TUNING.breathMaxSeconds, true); // empty the lungs
    const before = meter.health;
    meter.update(2, true); // 2 s past empty
    expect(meter.health).toBeCloseTo(before - 2 * WATER_TUNING.drownDamagePerSecond, 5);
    meter.update(1, false);
    expect(meter.health).toBeLessThan(WATER_TUNING.startHealth); // damage persists until healed elsewhere
  });
});
