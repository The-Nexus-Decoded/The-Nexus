import { describe, expect, it } from "vitest";
import { ZoneRoom, ZONE_PLAYER_CAP, resetPlayerSerialForTests } from "../server/zone-room.mjs";

const join = (name) => ({ name, appearance: { raceId: "human", callingId: "wayfarer" } });
const state = (seq) => ({ p: [seq, 0, 0], h: 0, a: "move", seq });

describe("zone room (30-player cap)", () => {
  it("admits exactly 30 players and rejects the 31st as full", () => {
    resetPlayerSerialForTests();
    const room = new ZoneRoom("heartvale");
    for (let i = 1; i <= 30; i++) {
      const result = room.addPlayer(join(`Drifter ${i}`));
      expect(result.ok).toBe(true);
    }
    expect(room.size).toBe(ZONE_PLAYER_CAP);
    const overflow = room.addPlayer(join("Drifter 31"));
    expect(overflow).toEqual({ ok: false, reason: "full", cap: 30 });
    expect(room.size).toBe(30);
  });

  it("readmits after a departure frees a slot", () => {
    resetPlayerSerialForTests();
    const room = new ZoneRoom("heartvale");
    const first = room.addPlayer(join("First"));
    for (let i = 2; i <= 30; i++) room.addPlayer(join(`Filler ${i}`));
    expect(room.addPlayer(join("Overflow")).ok).toBe(false);
    room.removePlayer(first.player.id);
    expect(room.addPlayer(join("Overflow")).ok).toBe(true);
  });

  it("gives joiners a snapshot of everyone already inside", () => {
    resetPlayerSerialForTests();
    const room = new ZoneRoom("heartvale");
    const a = room.addPlayer(join("A"));
    room.applyState(a.player.id, state(1));
    const b = room.addPlayer(join("B"));
    expect(b.snapshot).toHaveLength(1);
    expect(b.snapshot[0]).toMatchObject({ name: "A", state: state(1) });
    expect(room.addPlayer(join("C")).snapshot).toHaveLength(2);
  });

  it("relays fresh state and drops stale sequences", () => {
    resetPlayerSerialForTests();
    const room = new ZoneRoom("heartvale");
    const a = room.addPlayer(join("A"));
    expect(room.applyState(a.player.id, state(1)).broadcast).toEqual({ t: "state", id: a.player.id, state: state(1) });
    expect(room.applyState(a.player.id, state(1))).toEqual({ drop: true }); // same seq
    expect(room.applyState(a.player.id, state(0))).toEqual({ drop: true }); // rewound seq
    expect(room.applyState("ghost", state(9))).toEqual({ drop: true }); // unknown id
  });

  it("clamps state relay floods to the per-player rate limit", () => {
    resetPlayerSerialForTests();
    let now = 1_000_000;
    const room = new ZoneRoom("heartvale", { now: () => now });
    const a = room.addPlayer(join("A"));
    let relays = 0;
    for (let seq = 1; seq <= 60; seq++) {
      if (room.applyState(a.player.id, state(seq)).broadcast) relays++;
    }
    expect(relays).toBe(20); // 60 sent in the same instant → 20 relayed
    now += 1001; // window slides fully past the burst
    expect(room.applyState(a.player.id, state(61)).broadcast).toBeTruthy();
  });
});
