import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  CALLINGS,
  deriveCharacter,
  MEMORY_QUESTIONS,
  RACES,
  raceCallingEligibility,
  STAT_KEYS,
  type CharacterDraft,
  type Stats,
} from "../src/game/character";
import {
  blankWeaveStats,
  changedStats,
  counterDigits,
  counterValueAt,
  cubicBezierEase,
  easeWeave,
  previewStats,
  SOUL_WEAVE_COUNTER_MS,
  SOUL_WEAVE_STAT_MAX,
  statDeltaTicks,
  weaveFraction,
  weavePolygonPoints,
  weaveVertex,
} from "../src/creationWeave";
import { CALLING_ACCENT_HUES, creatorAccentHue } from "../src/characterCreation";
import {
  CREATION_ACCENT_HUE_TWEEN_MS,
  CREATION_RIM_DEFAULT,
  CREATION_UNDERLIGHT_DEFAULT,
  creatorAccentTone,
} from "../src/creationPreview";

/** Every way of answering the four memories: 3^4 answer sets. */
function everyAnswerSet(): Array<Record<string, string>> {
  let sets: Array<Record<string, string>> = [{}];
  for (const question of MEMORY_QUESTIONS) {
    sets = sets.flatMap((set) => question.answers.map((answer) => ({ ...set, [question.id]: answer.id })));
  }
  return sets;
}

function draft(raceId: string, callingId: string, answers: Record<string, string>): CharacterDraft {
  return {
    name: "Aster",
    raceId,
    callingId,
    appearance: { hairStyle: "shaved-buzzed", skinTone: "ashen" },
    answers,
  };
}

describe("soul weave previewStats parity", () => {
  it("equals deriveCharacter().stats for every calling x answer combination on the human body", () => {
    const answerSets = everyAnswerSet();
    expect(answerSets).toHaveLength(81);
    let checked = 0;
    for (const calling of CALLINGS) {
      for (const answers of answerSets) {
        const candidate = draft("human", calling.id, answers);
        expect(previewStats(candidate)).toEqual(deriveCharacter(candidate).stats);
        checked += 1;
      }
    }
    expect(checked).toBe(CALLINGS.length * 81);
  });

  it("carries the ancestry/calling resonance for every allowed and rare pair", () => {
    const answers = everyAnswerSet()[0]!;
    let pairs = 0;
    for (const race of RACES) {
      for (const calling of CALLINGS) {
        if (raceCallingEligibility(race.id, calling.id).status === "forbidden") continue;
        const candidate = draft(race.id, calling.id, answers);
        expect(previewStats(candidate)).toEqual(deriveCharacter(candidate).stats);
        pairs += 1;
      }
    }
    expect(pairs).toBeGreaterThan(CALLINGS.length);
  });

  it("applies only the parts of a draft that are set, and never throws on an unfinished one", () => {
    expect(previewStats({ raceId: "", callingId: "", answers: {} })).toEqual(blankWeaveStats());
    expect(previewStats({ raceId: "human", callingId: "", answers: {} })).toEqual(blankWeaveStats());
    const warrior = previewStats({ raceId: "human", callingId: "warrior", answers: {} });
    expect(warrior.might).toBe(blankWeaveStats().might + 3);
    expect(warrior.vitality).toBe(blankWeaveStats().vitality + 2);
    const held = previewStats({ raceId: "human", callingId: "warrior", answers: { breach: "held" } });
    expect(held.might).toBe(warrior.might + 1);
    expect(held.vitality).toBe(warrior.vitality + 2);
    // a stale answer id for a question contributes nothing
    expect(previewStats({ raceId: "human", callingId: "warrior", answers: { breach: "no-such-answer" } })).toEqual(warrior);
    // the elf mage resonance only lands once both halves are set
    const elfAlone = previewStats({ raceId: "elf", callingId: "", answers: {} });
    const elfMage = previewStats({ raceId: "elf", callingId: "mage", answers: {} });
    expect(elfMage.insight - elfAlone.insight).toBe(3 + 1);
  });

  it("names the spokes a bind changed", () => {
    const before = previewStats({ raceId: "human", callingId: "", answers: {} });
    const after = previewStats({ raceId: "human", callingId: "warrior", answers: {} });
    expect(changedStats(before, after)).toEqual(["might", "vitality"]);
    expect(changedStats(after, after)).toEqual([]);
  });
});

describe("memory stat-delta ticks", () => {
  it("renders the breach answer's modifiers as +1 MIGHT +2 VIT in stat order", () => {
    const held = MEMORY_QUESTIONS[0]!.answers[0]!;
    expect(held.modifiers).toEqual({ might: 1, vitality: 2 });
    expect(statDeltaTicks(held.modifiers).join(" ")).toBe("+1 MIGHT +2 VIT");
  });

  it("skips zero deltas and keeps stat order regardless of the modifier's key order", () => {
    expect(statDeltaTicks({ resonance: 2, finesse: 1, might: 0 })).toEqual(["+1 FIN", "+2 RES"]);
    expect(statDeltaTicks({})).toEqual([]);
  });

  it("covers every answer with at least one tick", () => {
    for (const question of MEMORY_QUESTIONS) {
      for (const answer of question.answers) expect(statDeltaTicks(answer.modifiers).length).toBeGreaterThan(0);
    }
  });
});

describe("soul weave geometry and timing", () => {
  it("puts might at the top and walks the spokes clockwise on the outer ring", () => {
    const top = weaveVertex(0, 1, 200);
    expect(top.x).toBeCloseTo(100, 5);
    expect(top.y).toBeLessThan(100);
    const next = weaveVertex(1, 1, 200);
    expect(next.x).toBeGreaterThan(100);
    expect(weaveVertex(0, 0, 200)).toEqual({ x: 100, y: 100 });
  });

  it("scales a stat to the ring and clamps past the tallest reachable value", () => {
    expect(weaveFraction(0)).toBe(0);
    expect(weaveFraction(SOUL_WEAVE_STAT_MAX)).toBe(1);
    expect(weaveFraction(SOUL_WEAVE_STAT_MAX * 2)).toBe(1);
    const tallest = 6 + 3 + 2 + 1 + 8;
    expect(tallest).toBeLessThanOrEqual(SOUL_WEAVE_STAT_MAX);
  });

  it("writes six points and moves only the spokes whose stat changed", () => {
    const base = blankWeaveStats();
    const points = weavePolygonPoints(base, 200).split(" ");
    expect(points).toHaveLength(STAT_KEYS.length);
    const raised: Stats = { ...base, might: base.might + 4 };
    const moved = weavePolygonPoints(raised, 200).split(" ");
    expect(moved[0]).not.toBe(points[0]);
    expect(moved.slice(1)).toEqual(points.slice(1));
  });

  it("solves the weave's cubic-bezier as a monotonic ease that starts slow and lands at one", () => {
    expect(easeWeave(0)).toBe(0);
    expect(easeWeave(1)).toBe(1);
    expect(easeWeave(0.1)).toBeLessThan(0.05);
    expect(easeWeave(0.9)).toBeGreaterThan(0.95);
    let previous = 0;
    for (let step = 1; step <= 20; step += 1) {
      const value = easeWeave(step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    const linear = cubicBezierEase(0, 0, 1, 1);
    expect(linear(0.25)).toBeCloseTo(0.25, 6);
  });

  it("counts in 60 ms ticks and lands exactly on the value at 420 ms", () => {
    expect(counterValueAt(6, 14, 0)).toBe(6);
    expect(counterValueAt(6, 14, 59)).toBe(6);
    expect(counterValueAt(6, 14, SOUL_WEAVE_COUNTER_MS)).toBe(14);
    expect(counterValueAt(6, 14, SOUL_WEAVE_COUNTER_MS + 1000)).toBe(14);
    const readings = [60, 120, 180, 240, 300, 360].map((elapsed) => counterValueAt(6, 14, elapsed));
    for (let index = 1; index < readings.length; index += 1) expect(readings[index]).toBeGreaterThanOrEqual(readings[index - 1]!);
    expect(readings[readings.length - 1]).toBeLessThanOrEqual(14);
  });

  it("puts every digit of a numeral in its own cell", () => {
    expect(counterDigits(7)).toBe('<span class="weave-digit">7</span>');
    expect(counterDigits(14)).toBe('<span class="weave-digit">1</span><span class="weave-digit">4</span>');
  });
});

describe("calling accent hue", () => {
  it("gives every calling its own hue and no hue to an unset calling", () => {
    const hues = new Set<number>();
    for (const calling of CALLINGS) {
      const hue = creatorAccentHue(calling.id);
      expect(hue).toBe(CALLING_ACCENT_HUES[calling.id]);
      expect(hue).not.toBeNull();
      hues.add(hue!);
    }
    expect(hues.size).toBe(CALLINGS.length);
    expect(creatorAccentHue("")).toBeNull();
    expect(creatorAccentHue("no-such-calling")).toBeNull();
    expect(CALLING_ACCENT_HUES.warrior).toBe(0xefb85f);
    expect(CALLING_ACCENT_HUES.shadowknight).toBe(0x3b5a6e);
    expect(CALLING_ACCENT_HUES.priest).toBe(0xfff2d2);
  });

  it("travels linearly from one light colour to the next over 550 ms and holds the ends", () => {
    expect(CREATION_ACCENT_HUE_TWEEN_MS).toBe(550);
    const from = new THREE.Color(CREATION_RIM_DEFAULT);
    const to = new THREE.Color(CALLING_ACCENT_HUES.warrior);
    const target = new THREE.Color();
    expect(creatorAccentTone(from, to, -1, target).getHex()).toBe(from.getHex());
    expect(creatorAccentTone(from, to, 0, target).getHex()).toBe(from.getHex());
    expect(creatorAccentTone(from, to, 1, target).getHex()).toBe(to.getHex());
    expect(creatorAccentTone(from, to, 2, target).getHex()).toBe(to.getHex());
    const half = creatorAccentTone(from, to, 0.5, target).clone();
    expect(half.r).toBeCloseTo((from.r + to.r) / 2, 6);
    expect(half.g).toBeCloseTo((from.g + to.g) / 2, 6);
    expect(half.b).toBeCloseTo((from.b + to.b) / 2, 6);
    expect(new THREE.Color(CREATION_UNDERLIGHT_DEFAULT).getHex()).not.toBe(CREATION_RIM_DEFAULT);
  });
});
