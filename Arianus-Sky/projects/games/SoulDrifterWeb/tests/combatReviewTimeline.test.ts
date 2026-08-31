import { describe, expect, it } from "vitest";
import { prepareReviewSequence, ReviewClock, sampleReviewSequence } from "../src/review/weapon-lab/combat-review-timeline";
import type { ReviewSequence } from "../src/review/weapon-lab/combat-review-types";

function fixture(): ReviewSequence {
  return {
    id: "pair", actorIds: ["attacker", "defender"], propIds: ["chest"], durationSeconds: 4,
    tracks: [
      { id: "attack", actorId: "attacker", actionId: "claw", startSeconds: 0, durationSeconds: 2, clipDurationSeconds: 2 },
      { id: "recover", actorId: "attacker", actionId: "idle", startSeconds: 2, durationSeconds: 2,
        clipDurationSeconds: 1, loop: true, blendInSeconds: 0.2 },
      { id: "guard", actorId: "defender", actionId: "guard", startSeconds: 0, durationSeconds: 1,
        clipDurationSeconds: 0.8, loop: true },
      { id: "flinch", actorId: "defender", actionId: "hit-front", startSeconds: 1, durationSeconds: 1,
        clipDurationSeconds: 1, blendInSeconds: 0.1 },
      { id: "settle", actorId: "defender", actionId: "guard", startSeconds: 2, durationSeconds: 2,
        clipDurationSeconds: 0.8, loop: true, blendInSeconds: 0.2 },
    ],
    events: [
      { id: "release", kind: "release", actorId: "attacker", timeSeconds: 0 },
      { id: "impact", kind: "contact", actorId: "attacker", targetId: "defender", timeSeconds: 1,
        result: "hit", evidence: "test measured surface", damageType: "physical", position: [0, 1, 1] },
      { id: "react", kind: "reaction", actorId: "defender", timeSeconds: 1 },
      { id: "open", kind: "prop-state", actorId: "attacker", targetId: "chest", timeSeconds: 3, state: "open" },
      { id: "end", kind: "prop-state", actorId: "attacker", targetId: "chest", timeSeconds: 4, state: "closed" },
    ],
  };
}

describe("deterministic shared Combat Review clock", () => {
  it("samples actor-specific action, contact and reaction on one timeline", () => {
    const sequence = prepareReviewSequence(fixture());
    const before = sampleReviewSequence(sequence, 0.99);
    expect(before.actors[1]!.trackId).toBe("guard");
    expect(before.elapsedEvents.map((event) => event.id)).toEqual(["release"]);
    const contact = sampleReviewSequence(sequence, 1);
    expect(contact.actors[0]!.poses[0]!.timeSeconds).toBe(1);
    expect(contact.actors[1]!.trackId).toBe("flinch");
    expect(contact.elapsedEvents.map((event) => event.id)).toEqual(["release", "impact", "react"]);
    expect(sampleReviewSequence(sequence, 1.05).actors[1]!.poses.map((pose) => pose.weight)).toEqual([
      expect.closeTo(0.5, 8), expect.closeTo(0.5, 8),
    ]);
  });

  it("keeps locomotion phase flowing through repeated clip periods and blends", () => {
    const sequence = prepareReviewSequence(fixture());
    expect(sampleReviewSequence(sequence, 3.27).actors[0]!.poses[0]!.timeSeconds).toBeCloseTo(0.27, 9);
    const blend = sampleReviewSequence(sequence, 1.05).actors[1]!.poses;
    expect(blend[0]!.timeSeconds).toBeCloseTo(0.25, 9);
    expect(blend.reduce((sum, pose) => sum + pose.weight, 0)).toBeCloseTo(1, 12);
  });

  it("does not depend on actor family or unique model IDs", () => {
    for (const a of ["human", "breachling", "warden"]) for (const b of ["human", "breachling", "warden"]) {
      const original = fixture();
      const actorIds = [a + "-1", b + "-2"];
      const resolve = (id: string) => id === "attacker" ? actorIds[0]! : id === "defender" ? actorIds[1]! : id;
      const sequence = prepareReviewSequence({ ...original, actorIds,
        tracks: original.tracks.map((track) => ({ ...track, actorId: resolve(track.actorId) })),
        events: original.events.map((event) => ({ ...event, actorId: resolve(event.actorId), targetId: event.targetId ? resolve(event.targetId) : undefined })),
      });
      expect(sampleReviewSequence(sequence, 1.3).actors.map((actor) => actor.actorId)).toEqual(actorIds);
    }
  });

  it("seeks and reconstructs prop state without re-emitting historical hits", () => {
    const clock = new ReviewClock(fixture());
    clock.setPlaying(true);
    expect(clock.advance(1.1).crossedEvents.map(({ event }) => event.id)).toEqual(["release", "impact", "react"]);
    expect(clock.seek(3.2).crossedEvents).toEqual([]);
    expect(clock.snapshot().elapsedEvents.find((event) => event.id === "open")?.state).toBe("open");
    expect(clock.advance(0.1).crossedEvents).toEqual([]);
    expect(clock.seek(0).elapsedEvents.map((event) => event.id)).toEqual(["release"]);
    expect(clock.seek(0).crossedEvents).toEqual([]);
    expect(clock.advance(0.5).crossedEvents).toEqual([]);
  });

  it("holds a one-shot at its end and restarts explicitly", () => {
    const clock = new ReviewClock(fixture());
    clock.setPlaying(true);
    const end = clock.advance(9);
    expect(end.timeSeconds).toBe(4);
    expect(end.playing).toBe(false);
    expect(clock.advance(1).crossedEvents).toEqual([]);
    expect(clock.setPlaying(true).playing).toBe(false);
    expect(clock.restart(true).timeSeconds).toBe(0);
    expect(clock.advance(0.1).crossedEvents).toHaveLength(1);
  });

  it("preserves the specific projectile identity without turning seek into an impact callback", () => {
    const source = fixture();
    const events = source.events.map((event) => event.kind === "contact" ? { ...event, projectileId: "attacker/arrow/2" } : event);
    const clock = new ReviewClock({ ...source, events });
    events[1] = { ...events[1]!, projectileId: "attacker/arrow/1" };
    clock.setPlaying(true);
    const impact = clock.advance(1).crossedEvents.find(({ event }) => event.kind === "contact")!.event;
    expect(impact.projectileId).toBe("attacker/arrow/2"); expect(Object.isFrozen(impact)).toBe(true);
    expect(clock.seek(0.5).crossedEvents).toEqual([]);
    const held = clock.seek(1.2);
    expect(held.crossedEvents).toEqual([]);
    expect(held.elapsedEvents.find((event) => event.kind === "contact")!.projectileId).toBe("attacker/arrow/2");
  });

  it("emits each event once per cycle including exact zero/end boundaries", () => {
    const clock = new ReviewClock(fixture());
    clock.setLoop(true); clock.setPlaying(true);
    const first = clock.advance(4);
    expect(first.cycle).toBe(1);
    expect(first.timeSeconds).toBe(0);
    expect(first.crossedEvents.map(({ event, cycle }) => [event.id, cycle])).toEqual([
      ["release", 0], ["impact", 0], ["react", 0], ["open", 0], ["end", 0], ["release", 1],
    ]);
    expect(clock.advance(0.1).crossedEvents).toEqual([]);
    const next = clock.advance(8);
    expect(next.cycle).toBe(3);
    expect(new Set(next.crossedEvents.map((entry) => entry.occurrenceId)).size).toBe(next.crossedEvents.length);
    expect(next.crossedEvents.filter(({ event }) => event.id === "impact")).toHaveLength(2);
    clock.restart(true);
    expect(clock.advance(0.1).crossedEvents[0]!.occurrenceId).not.toBe(first.crossedEvents[0]!.occurrenceId);
  });

  it("pauses, scales speed, and matches direct sampling after variable frame deltas", () => {
    const clock = new ReviewClock(fixture());
    expect(clock.advance(1).timeSeconds).toBe(0);
    clock.setSpeed(0.5); clock.setPlaying(true);
    clock.advance(0.2); clock.advance(0.7);
    const frame = clock.advance(0.6);
    expect(frame.timeSeconds).toBeCloseTo(0.75, 12);
    expect(frame.actors).toEqual(sampleReviewSequence(clock.sequence, frame.timeSeconds).actors);
    clock.setPlaying(false);
    expect(clock.advance(2).timeSeconds).toBe(frame.timeSeconds);
    for (const bad of [NaN, Infinity, -1]) {
      expect(() => clock.advance(bad)).toThrow(); expect(() => clock.seek(bad)).toThrow();
    }
    expect(() => clock.setSpeed(0)).toThrow();
    clock.setPlaying(true);
    expect(() => clock.advance(Number.MAX_VALUE)).toThrow(/too many/);
  });

  it("holds death without idle resurrection, but reset restores initial state", () => {
    const original = fixture();
    const sequence = { ...original, tracks: original.tracks.filter((track) => track.id !== "settle")
      .map((track) => track.id === "flinch" ? { ...track, actionId: "death", terminal: true } : track) };
    const clock = new ReviewClock(sequence);
    expect(clock.seek(1.5).actors[1]!.terminal).toBe("dying");
    expect(clock.seek(3.9).actors[1]!.terminal).toBe("held");
    expect(clock.snapshot().actors[1]!.poses[0]!.timeSeconds).toBe(1);
    expect(clock.restart().actors[1]!.terminal).toBe("none");
    expect(() => prepareReviewSequence({ ...sequence, tracks: [...sequence.tracks, original.tracks[4]!] })).toThrow(/terminal/);
  });

  it("owns immutable inputs and rejects ambiguous or unmeasured contracts", () => {
    const source = fixture();
    const sequence = prepareReviewSequence(source);
    expect(sequence).not.toBe(source);
    expect(Object.isFrozen(sequence.tracks[0])).toBe(true);
    expect(Object.isFrozen(sequence.events[1]!.position)).toBe(true);
    expect(() => prepareReviewSequence({ ...source, actorIds: ["attacker", "attacker"] })).toThrow(/unique/);
    expect(() => prepareReviewSequence({ ...source, tracks: source.tracks.filter((track) => track.id !== "guard") })).toThrow(/initial/);
    expect(() => prepareReviewSequence({ ...source, tracks: source.tracks.map((track) => track.id === "recover" ? { ...track, startSeconds: 1 } : track) })).toThrow(/overlap/);
    expect(() => prepareReviewSequence({ ...source, events: [{ id: "bad", kind: "contact", actorId: "attacker", timeSeconds: 1, result: "hit" }] })).toThrow(/evidence/);
    expect(() => prepareReviewSequence({ ...source, events: [{ id: "bad", kind: "contact", actorId: "unknown", timeSeconds: 1 }] })).toThrow(/unknown/);
    expect(() => prepareReviewSequence({ ...source, durationSeconds: 0 })).toThrow(/duration/);
  });
});
