import { describe, expect, it } from "vitest";
import { ZoneDirectory } from "../server/zone-directory.mjs";
import { resetPlayerSerialForTests } from "../server/zone-room.mjs";

const join = (name) => ({ name, appearance: { raceId: "human", callingId: "wayfarer" } });

describe("zone directory (shard overflow instancing)", () => {
  it("fills shard #1 to 30 and lands the 31st player in shard #2", () => {
    resetPlayerSerialForTests();
    const directory = new ZoneDirectory();
    for (let i = 1; i <= 30; i++) {
      const result = directory.join("hv-1", join(`Drifter ${i}`));
      expect(result.ok).toBe(true);
      expect(result.shard).toBe("hv-1#1");
    }
    const overflow = directory.join("hv-1", join("Drifter 31"));
    expect(overflow.ok).toBe(true);
    expect(overflow.shard).toBe("hv-1#2");
    expect(overflow.shards).toBe(2);
    expect(overflow.snapshot).toHaveLength(0); // fresh instance: no one else here
    expect(directory.shardCount("hv-1")).toBe(2);
  });

  it("welcome data carries shard id and live shard count", () => {
    resetPlayerSerialForTests();
    const directory = new ZoneDirectory();
    const first = directory.join("hv-3", join("A"));
    expect(first).toMatchObject({ ok: true, shard: "hv-3#1", shards: 1 });
    for (let i = 2; i <= 30; i++) directory.join("hv-3", join(`Filler ${i}`));
    const overflow = directory.join("hv-3", join("B"));
    expect(overflow).toMatchObject({ ok: true, shard: "hv-3#2", shards: 2 });
  });

  it("backfills a partially-empty earlier shard before growing", () => {
    resetPlayerSerialForTests();
    const directory = new ZoneDirectory();
    const first = directory.join("hv-1", join("First"));
    for (let i = 2; i <= 30; i++) directory.join("hv-1", join(`Filler ${i}`));
    directory.join("hv-1", join("ShardTwo"));
    // Free a slot in shard #1: the next join should backfill it, not grow #2.
    directory.leave(first.room, first.player.id);
    const backfill = directory.join("hv-1", join("Backfill"));
    expect(backfill.shard).toBe("hv-1#1");
    expect(directory.shardCount("hv-1")).toBe(2);
  });

  it("closes a shard when its last player leaves and reuses the freed serial", () => {
    resetPlayerSerialForTests();
    const directory = new ZoneDirectory();
    for (let i = 1; i <= 30; i++) directory.join("hv-1", join(`Filler ${i}`));
    const overflow = directory.join("hv-1", join("Overflow"));
    expect(directory.shardCount("hv-1")).toBe(2);
    const outcome = directory.leave(overflow.room, overflow.player.id);
    expect(outcome.shardClosed).toBe(true);
    expect(directory.shardCount("hv-1")).toBe(1);
    // Next overflow wave reopens shard #2 (serial reuse), and once both
    // shards are full again a third shard is created.
    for (let i = 1; i <= 30; i++) directory.join("hv-1", join(`Wave2 ${i}`));
    expect(directory.shardCount("hv-1")).toBe(2);
    const refilled = directory.join("hv-1", join("Refill"));
    expect(refilled.shard).toBe("hv-1#3");
  });

  it("rejects only when the maxShards ceiling is hit", () => {
    resetPlayerSerialForTests();
    const directory = new ZoneDirectory({ maxShards: 2 });
    for (let i = 1; i <= 60; i++) {
      expect(directory.join("hv-1", join(`Drifter ${i}`)).ok).toBe(true);
    }
    const rejected = directory.join("hv-1", join("Drifter 61"));
    expect(rejected).toEqual({ ok: false, reason: "full", cap: 30, shards: 2 });
  });

  it("keeps zones independent and describes live state for the health probe", () => {
    resetPlayerSerialForTests();
    const directory = new ZoneDirectory();
    directory.join("hv-1", join("A"));
    directory.join("hv-2", join("B"));
    const view = directory.describe();
    expect(Object.keys(view).sort()).toEqual(["hv-1", "hv-2"]);
    expect(view["hv-1"]["hv-1#1"]).toEqual({ players: 1, cap: 30 });
  });
});
