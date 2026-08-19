import { describe, expect, it } from "vitest";
import { SnapshotBuffer, lerpAngle } from "../src/game/net/interpolation";
import type { MpPlayerState } from "../src/game/net/protocol";

const at = (x: number, seq: number, h = 0): MpPlayerState => ({ p: [x, 0, 0], h, a: "move", seq });

describe("remote-player snapshot interpolation", () => {
  it("lerps between the snapshots bracketing the render time", () => {
    const buffer = new SnapshotBuffer(100);
    buffer.push(1000, at(0, 1));
    buffer.push(1100, at(4, 2)); // 4 units — under the teleport threshold
    const pose = buffer.sample(1150); // render time 1050 → midpoint
    expect(pose).not.toBeNull();
    expect(pose!.x).toBeCloseTo(2, 3);
    expect(pose!.snapped).toBe(false);
  });

  it("holds the newest pose past the buffer and the oldest before it", () => {
    const buffer = new SnapshotBuffer(100);
    buffer.push(1000, at(0, 1));
    buffer.push(1100, at(10, 2));
    expect(buffer.sample(2000)!.x).toBeCloseTo(10, 3); // past newest → hold
    expect(buffer.sample(1000)!.x).toBeCloseTo(0, 3); // before oldest → hold
  });

  it("drops out-of-order sequences", () => {
    const buffer = new SnapshotBuffer(100);
    buffer.push(1000, at(0, 5));
    buffer.push(1010, at(99, 3)); // stale seq
    expect(buffer.size).toBe(1);
  });

  it("snaps instead of lerping across teleports", () => {
    const buffer = new SnapshotBuffer(100, 6);
    buffer.push(1000, at(0, 1));
    buffer.push(1100, at(50, 2)); // 50 units in one step
    const pose = buffer.sample(1150);
    expect(pose!.x).toBeCloseTo(50, 3);
    expect(pose!.snapped).toBe(true);
  });

  it("lerps headings along the short arc across ±π", () => {
    expect(lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5)).toBeCloseTo(Math.PI, 3);
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 3);
  });

  it("returns null with no snapshots", () => {
    expect(new SnapshotBuffer().sample(1000)).toBeNull();
  });
});
