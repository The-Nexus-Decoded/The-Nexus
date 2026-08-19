import { describe, expect, it } from "vitest";
import { ZoneCrossover, type CrossoverClient } from "../src/game/net/zoneCrossover";

/** Fake CrossoverClient recording lifecycle + sends. */
function makeFakeClientFactory() {
  const created: FakeClient[] = [];
  const factory = (zoneId: string) => {
    const client = new FakeClient(zoneId);
    created.push(client);
    return client;
  };
  return { created, factory };
}

class FakeClient implements CrossoverClient {
  connected = false;
  disconnected = false;
  online = false;
  sent: { p: [number, number, number]; h: number; a: string }[] = [];
  constructor(readonly zoneId: string) {}
  connect() {
    this.connected = true;
  }
  disconnect() {
    this.disconnected = true;
  }
  sendState(p: [number, number, number], h: number, a: string) {
    this.sent.push({ p, h, a });
  }
}

// World-frame landmarks (meters). hv-1: x 4980–6240, z 2531.25–2970.
const HV1_CENTER: [number, number] = [5600, 2750];
const NEAR_HV2_EDGE: [number, number] = [5600, 2561.25]; // 30 m south of the hv-2 seam (z=2531.25)
const INSIDE_HV2: [number, number] = [5600, 2520]; // 11.25 m into hv-2
const DEEP_HV2: [number, number] = [5600, 2400];

function makeCrossover(extra: Partial<ConstructorParameters<typeof ZoneCrossover>[0]> = {}) {
  const { created, factory } = makeFakeClientFactory();
  let now = 0;
  const statuses: unknown[] = [];
  const crossover = new ZoneCrossover({
    startZone: "hv-1",
    clientFactory: factory,
    now: () => now,
    onStatus: (s) => statuses.push(s),
    ...extra,
  });
  return { crossover, created, statuses, advance: (ms: number) => (now += ms) };
}

describe("zone crossover (seamless section transitions)", () => {
  it("stays single far from any edge and publishes via the primary", () => {
    const { crossover, created } = makeCrossover();
    crossover.connect();
    crossover.update(...HV1_CENTER);
    expect(crossover.currentPhase).toBe("single");
    expect(created).toHaveLength(1);
    crossover.sendState([1, 0, 2], 0.5, "move");
    expect(created[0]!.sent).toHaveLength(1);
  });

  it("pre-joins the adjacent zone inside the 50 m band and goes dual once online", () => {
    const { crossover, created } = makeCrossover();
    crossover.connect();
    crossover.update(...NEAR_HV2_EDGE);
    expect(crossover.currentPhase).toBe("prejoining");
    expect(created).toHaveLength(2);
    expect(created[1]!.zoneId).toBe("hv-2");
    expect(created[1]!.connected).toBe(true);
    created[1]!.online = true; // welcome received
    crossover.update(...NEAR_HV2_EDGE);
    expect(crossover.currentPhase).toBe("dual");
    // local state still publishes through hv-1 only
    crossover.sendState([5600, 0, 2561], 0, "move");
    expect(created[0]!.sent).toHaveLength(1);
    expect(created[1]!.sent).toHaveLength(0);
  });

  it("releases the pre-joined client when the player turns back", () => {
    const { crossover, created } = makeCrossover();
    crossover.connect();
    crossover.update(...NEAR_HV2_EDGE);
    expect(created).toHaveLength(2);
    crossover.update(...HV1_CENTER); // walks away, edge now ~219 m out
    expect(crossover.currentPhase).toBe("single");
    expect(created[1]!.disconnected).toBe(true);
  });

  it("transfers presence on crossing; retired shard becomes the return pre-join while in the band", () => {
    const { crossover, created, advance } = makeCrossover();
    crossover.connect();
    crossover.update(...NEAR_HV2_EDGE);
    created[1]!.online = true;
    crossover.update(...NEAR_HV2_EDGE);
    expect(crossover.currentPhase).toBe("dual");

    // Step across the seam into hv-2.
    crossover.update(...INSIDE_HV2);
    expect(crossover.currentPhase).toBe("transferring");
    expect(crossover.primaryZoneId).toBe("hv-2");
    // New primary publishes; old shard is retained during hysteresis.
    crossover.sendState([5600, 0, 2520], 0, "move");
    expect(created[1]!.sent).toHaveLength(1);
    expect(created[0]!.disconnected).toBe(false);

    // 11.25 m in (> 10 m hysteresis) → settles next update. Still inside the
    // 50 m band, so the retired hv-1 client is RETAINED as the return
    // pre-join — no disconnect/reconnect churn.
    crossover.update(...INSIDE_HV2);
    expect(crossover.currentPhase).toBe("prejoining");
    expect(created[0]!.disconnected).toBe(false);
    expect(created).toHaveLength(2);

    // Walk deep into hv-2: the band recedes past release distance → single.
    crossover.update(...DEEP_HV2);
    expect(crossover.currentPhase).toBe("single");
    expect(created[0]!.disconnected).toBe(true);
    expect(created).toHaveLength(2);
  });

  it("also settles via the time window when hovering just inside the edge", () => {
    const { crossover, created, advance } = makeCrossover();
    crossover.connect();
    crossover.update(...NEAR_HV2_EDGE);
    created[1]!.online = true;
    crossover.update(...NEAR_HV2_EDGE);
    // Cross by only 1 m — inside the 10 m meter-hysteresis, needs the 2 s timer.
    crossover.update(5600, 2530.25);
    expect(crossover.currentPhase).toBe("transferring");
    advance(2100);
    crossover.update(5600, 2530.25);
    // Settled — but 1 m inside is still deep in the band, so the retired
    // client stays on as the return pre-join rather than disconnecting.
    expect(crossover.currentPhase).toBe("prejoining");
    expect(created[0]!.disconnected).toBe(false);
    // Walking away releases it.
    crossover.update(...DEEP_HV2);
    expect(crossover.currentPhase).toBe("single");
    expect(created[0]!.disconnected).toBe(true);
  });

  it("crossing without a pre-join (teleport/spawn) joins the new zone cold", () => {
    const { crossover, created } = makeCrossover();
    crossover.connect();
    crossover.update(...HV1_CENTER);
    crossover.update(...DEEP_HV2); // teleport deep into hv-2
    expect(crossover.primaryZoneId).toBe("hv-2");
    expect(crossover.currentPhase).toBe("transferring");
    expect(created).toHaveLength(2);
    expect(created[1]!.zoneId).toBe("hv-2");
    expect(created[1]!.connected).toBe(true);
  });

  it("retargets the pre-join when the nearest edge changes mid-band (corner case)", () => {
    const { crossover, created } = makeCrossover();
    crossover.connect();
    // Near the hv-1/hv-2 seam first…
    crossover.update(5600, 2561.25);
    expect(created[1]!.zoneId).toBe("hv-2");
    // …then slide west along the band until hv-6 is the nearer neighbor
    // (x = 5000 → 20 m from hv-6's edge at 4980 vs 30 m from hv-2's seam).
    crossover.update(5000, 2561.25);
    expect(created[1]!.disconnected).toBe(true);
    const latest = created[created.length - 1]!;
    expect(latest.zoneId).toBe("hv-6");
    expect(latest.connected).toBe(true);
  });

  it("reports phase transitions through onStatus", () => {
    const { crossover, created, statuses } = makeCrossover();
    crossover.connect();
    crossover.update(...NEAR_HV2_EDGE);
    created[1]!.online = true;
    crossover.update(...NEAR_HV2_EDGE);
    const phases = (statuses as { phase: string }[]).map((s) => s.phase);
    expect(phases).toContain("single");
    expect(phases).toContain("prejoining");
    expect(phases).toContain("dual");
  });
});
