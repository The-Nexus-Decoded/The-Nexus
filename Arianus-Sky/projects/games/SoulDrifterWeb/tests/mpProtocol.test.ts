import { describe, expect, it } from "vitest";
import {
  MP_MAX_MESSAGE_BYTES,
  MP_MAX_ZONE_PLAYERS,
  MP_PROTOCOL_VERSION,
  isValidPlayerState,
  parseClientMessage,
  withinMessageBudget,
} from "../src/game/net/protocol";

const hello = {
  t: "hello",
  v: MP_PROTOCOL_VERSION,
  zone: "heartvale",
  name: "Wayfarer",
  appearance: { raceId: "elf", callingId: "shadowknight" },
};

const state = { p: [1, 0, -2.5] as [number, number, number], h: 1.2, a: "move", seq: 7 };

describe("multiplayer base-layer protocol", () => {
  it("caps zones at 30 concurrent players", () => {
    expect(MP_MAX_ZONE_PLAYERS).toBe(30);
  });

  it("accepts a well-formed hello", () => {
    expect(parseClientMessage(hello)).toEqual({ ...hello, name: "Wayfarer" });
  });

  it("trims hello names and rejects empty or overlong ones", () => {
    expect(parseClientMessage({ ...hello, name: "  Ilyra  " })).toMatchObject({ name: "Ilyra" });
    expect(parseClientMessage({ ...hello, name: "   " })).toBeNull();
    expect(parseClientMessage({ ...hello, name: "x".repeat(25) })).toBeNull();
  });

  it("rejects wrong protocol versions and malformed zones", () => {
    expect(parseClientMessage({ ...hello, v: 2 })).toBeNull();
    expect(parseClientMessage({ ...hello, zone: "Heart Vale!" })).toBeNull();
    expect(parseClientMessage({ ...hello, zone: "" })).toBeNull();
  });

  it("rejects malformed appearance payloads", () => {
    expect(parseClientMessage({ ...hello, appearance: { raceId: "", callingId: "x" } })).toBeNull();
    expect(parseClientMessage({ ...hello, appearance: { raceId: "elf" } })).toBeNull();
    expect(parseClientMessage({ ...hello, appearance: { raceId: "elf", callingId: "x", tint: "blue" } })).toBeNull();
    expect(parseClientMessage({ ...hello, appearance: { raceId: "elf", callingId: "x", tint: "#8ab4ff" } })).not.toBeNull();
  });

  it("accepts well-formed state and rejects bad shapes", () => {
    expect(isValidPlayerState(state)).toBe(true);
    expect(parseClientMessage({ t: "state", state })).toEqual({ t: "state", state });
    expect(isValidPlayerState({ ...state, p: [1, 2] })).toBe(false);
    expect(isValidPlayerState({ ...state, p: [1, Number.NaN, 3] })).toBe(false);
    expect(isValidPlayerState({ ...state, h: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isValidPlayerState({ ...state, a: "" })).toBe(false);
    expect(isValidPlayerState({ ...state, seq: -1 })).toBe(false);
    expect(isValidPlayerState({ ...state, seq: 1.5 })).toBe(false);
  });

  it("accepts pings with finite timestamps only", () => {
    expect(parseClientMessage({ t: "ping", ts: Date.now() })).toMatchObject({ t: "ping" });
    expect(parseClientMessage({ t: "ping", ts: "now" })).toBeNull();
  });

  it("enforces the wire-size budget", () => {
    expect(withinMessageBudget("x".repeat(MP_MAX_MESSAGE_BYTES))).toBe(true);
    expect(withinMessageBudget("x".repeat(MP_MAX_MESSAGE_BYTES + 1))).toBe(false);
  });
});
