/**
 * The Soul Weave: the six stats as a hexagonal radar that answers every choice before
 * the imprint resolves it.
 *
 * `previewStats` is the pure half: the stats a draft would derive right now, applied only
 * for the parts of the draft that are set, so the rail's weave can show a half-made soul
 * without asking `deriveCharacter` (which refuses an incomplete draft). It must agree with
 * `deriveCharacter().stats` for every complete draft; `tests/creationWeave.test.ts` sweeps
 * every calling against every answer combination to hold it there.
 *
 * `SoulWeave` is the DOM half: one SVG in a host, a solid polygon for the bound stats, a
 * dashed ghost for whatever the pointer is hovering, and a 480 ms tween between values.
 */

import {
  CALLINGS,
  MEMORY_QUESTIONS,
  RACES,
  raceCallingBonus,
  STAT_KEYS,
  type CharacterDraft,
  type StatKey,
  type Stats,
} from "./game/character";

/**
 * Every stat starts here before ancestry, calling and memory add to it. `deriveCharacter`
 * keeps its own copy private; the parity sweep in the unit tests is what holds the two
 * together, so a change to one fails the suite until the other follows.
 */
export const SOUL_WEAVE_BASE_STAT = 6;

/** The radar's outer ring. The tallest reachable stat (6 + 3 calling + 2 ancestry + 1 resonance + 8 memories) sits on it. */
export const SOUL_WEAVE_STAT_MAX = 20;

/** Spokes and counters (design §7): the polygon over 480 ms, the numerals over 420 ms in 60 ms ticks. */
export const SOUL_WEAVE_TWEEN_MS = 480;
export const SOUL_WEAVE_COUNTER_MS = 420;
export const SOUL_WEAVE_COUNTER_TICK_MS = 60;

/** The abbreviation a stat-delta tick carries ("+1 MIGHT +2 VIT"). */
export const STAT_TICK_LABELS: Readonly<Record<StatKey, string>> = Object.freeze({
  might: "MIGHT",
  finesse: "FIN",
  insight: "INS",
  will: "WILL",
  vitality: "VIT",
  resonance: "RES",
});

export type SoulWeaveDraft = Pick<CharacterDraft, "raceId" | "callingId" | "answers">;

export function blankWeaveStats(): Stats {
  return {
    might: SOUL_WEAVE_BASE_STAT,
    finesse: SOUL_WEAVE_BASE_STAT,
    insight: SOUL_WEAVE_BASE_STAT,
    will: SOUL_WEAVE_BASE_STAT,
    vitality: SOUL_WEAVE_BASE_STAT,
    resonance: SOUL_WEAVE_BASE_STAT,
  };
}

function addModifiers(stats: Stats, modifiers: Partial<Stats>): void {
  for (const key of STAT_KEYS) stats[key] += modifiers[key] ?? 0;
}

/**
 * The stats the draft would derive, for the parts of it that are set: base + ancestry +
 * calling + the ancestry/calling resonance + every answered memory, in `deriveCharacter`'s
 * order. An unset or unknown part contributes nothing rather than throwing.
 */
export function previewStats(draft: SoulWeaveDraft): Stats {
  const stats = blankWeaveStats();
  const race = RACES.find((candidate) => candidate.id === draft.raceId);
  const calling = CALLINGS.find((candidate) => candidate.id === draft.callingId);
  if (race) addModifiers(stats, race.modifiers);
  if (calling) addModifiers(stats, calling.modifiers);
  if (race && calling) {
    const bonus = raceCallingBonus(race.id, calling.id);
    if (bonus) addModifiers(stats, bonus.modifiers);
  }
  for (const question of MEMORY_QUESTIONS) {
    const answer = question.answers.find((candidate) => candidate.id === draft.answers[question.id]);
    if (answer) addModifiers(stats, answer.modifiers);
  }
  return stats;
}

/** The ticks a modifier set renders as, in stat order, zeros skipped: ["+1 MIGHT", "+2 VIT"]. */
export function statDeltaTicks(modifiers: Partial<Stats>): string[] {
  const ticks: string[] = [];
  for (const key of STAT_KEYS) {
    const delta = modifiers[key] ?? 0;
    if (delta === 0) continue;
    ticks.push(`${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${STAT_TICK_LABELS[key]}`);
  }
  return ticks;
}

/** The stats whose value differs between two readings (the spokes a bind pulses). */
export function changedStats(before: Stats, after: Stats): StatKey[] {
  return STAT_KEYS.filter((key) => before[key] !== after[key]);
}

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress, solved for x by bisection
 * (the curve is monotonic in x for any x1, x2 in 0..1, which CSS requires).
 */
export function cubicBezierEase(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const axis = (a: number, b: number, t: number): number => {
    const inverse = 1 - t;
    return 3 * inverse * inverse * t * a + 3 * inverse * t * t * b + t * t * t;
  };
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let low = 0;
    let high = 1;
    let mid = t;
    for (let step = 0; step < 24; step += 1) {
      mid = (low + high) / 2;
      if (axis(x1, x2, mid) < t) low = mid;
      else high = mid;
    }
    return axis(y1, y2, mid);
  };
}

/** The weave's easing (design §7: cubic-bezier(.83, 0, .17, 1)). */
export const easeWeave = cubicBezierEase(0.83, 0, 0.17, 1);

/**
 * A counter's reading `elapsedMs` into its count: it advances in 60 ms ticks along the
 * weave's easing and lands exactly on `to` at 420 ms.
 */
export function counterValueAt(from: number, to: number, elapsedMs: number): number {
  const ticks = Math.floor(Math.max(0, elapsedMs) / SOUL_WEAVE_COUNTER_TICK_MS);
  const totalTicks = SOUL_WEAVE_COUNTER_MS / SOUL_WEAVE_COUNTER_TICK_MS;
  const progress = Math.min(1, ticks / totalTicks);
  return Math.round(from + (to - from) * easeWeave(progress));
}

/** Might at the top, the rest clockwise. */
export function weaveAngle(index: number): number {
  return -Math.PI / 2 + (index / STAT_KEYS.length) * Math.PI * 2;
}

/** The point `fraction` of the way out along spoke `index`, on a `size`-wide square. */
export function weaveVertex(index: number, fraction: number, size: number): { x: number; y: number } {
  const centre = size / 2;
  const radius = size * 0.42;
  const angle = weaveAngle(index);
  return {
    x: centre + Math.cos(angle) * radius * fraction,
    y: centre + Math.sin(angle) * radius * fraction,
  };
}

export function weaveFraction(value: number): number {
  return Math.min(1, Math.max(0, value / SOUL_WEAVE_STAT_MAX));
}

/** SVG `points` for the six stats on a `size`-wide square. */
export function weavePolygonPoints(stats: Stats, size: number): string {
  return STAT_KEYS.map((key, index) => {
    const { x, y } = weaveVertex(index, weaveFraction(stats[key]), size);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function ringPoints(fraction: number, size: number): string {
  return STAT_KEYS.map((_, index) => {
    const { x, y } = weaveVertex(index, fraction, size);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

/** Every digit in its own 1ch cell so a counting numeral never shifts its neighbours. */
export function counterDigits(value: number): string {
  return String(Math.max(0, Math.round(value)))
    .split("")
    .map((digit) => `<span class="weave-digit">${digit}</span>`)
    .join("");
}

function lerpStats(from: Stats, to: Stats, t: number, target: Stats): Stats {
  for (const key of STAT_KEYS) target[key] = from[key] + (to[key] - from[key]) * t;
  return target;
}

export interface SoulWeaveOptions {
  /** The rail widget: rings and polygon only, no spoke labels. */
  compact?: boolean;
  reducedMotion?: boolean;
}

const WEAVE_SVG_NS = "http://www.w3.org/2000/svg";
const WEAVE_SIZE = 200;

/**
 * One radar in a host element. `setStats` moves the solid polygon (tweened when asked and
 * motion is allowed), `setGhost` draws the dashed preview of a hovered choice, `pulse`
 * flares the spokes a bind changed.
 */
export class SoulWeave {
  private readonly svg: SVGSVGElement;
  private readonly polygon: SVGPolygonElement;
  private readonly ghost: SVGPolygonElement;
  private readonly labels: SVGTextElement[] = [];
  private stats: Stats = blankWeaveStats();
  private readonly shown: Stats = blankWeaveStats();
  private tween: { from: Stats; startedAt: number } | null = null;
  private frame = 0;
  private reducedMotion: boolean;

  public constructor(private readonly host: HTMLElement, options: SoulWeaveOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
    const svg = document.createElementNS(WEAVE_SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${WEAVE_SIZE} ${WEAVE_SIZE}`);
    svg.setAttribute("class", "soul-weave__svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const fraction of [1 / 3, 2 / 3, 1]) {
      const ring = document.createElementNS(WEAVE_SVG_NS, "polygon");
      ring.setAttribute("class", "soul-weave__ring");
      ring.setAttribute("points", ringPoints(fraction, WEAVE_SIZE));
      svg.append(ring);
    }
    STAT_KEYS.forEach((_, index) => {
      const spoke = document.createElementNS(WEAVE_SVG_NS, "line");
      const centre = weaveVertex(index, 0, WEAVE_SIZE);
      const tip = weaveVertex(index, 1, WEAVE_SIZE);
      spoke.setAttribute("class", "soul-weave__spoke");
      spoke.setAttribute("x1", centre.x.toFixed(2));
      spoke.setAttribute("y1", centre.y.toFixed(2));
      spoke.setAttribute("x2", tip.x.toFixed(2));
      spoke.setAttribute("y2", tip.y.toFixed(2));
      svg.append(spoke);
    });
    this.ghost = document.createElementNS(WEAVE_SVG_NS, "polygon");
    this.ghost.setAttribute("class", "soul-weave__ghost");
    this.ghost.setAttribute("points", weavePolygonPoints(this.stats, WEAVE_SIZE));
    this.polygon = document.createElementNS(WEAVE_SVG_NS, "polygon");
    this.polygon.setAttribute("class", "soul-weave__value");
    this.polygon.setAttribute("points", weavePolygonPoints(this.stats, WEAVE_SIZE));
    svg.append(this.ghost, this.polygon);
    if (!options.compact) {
      STAT_KEYS.forEach((key, index) => {
        const label = document.createElementNS(WEAVE_SVG_NS, "text");
        const at = weaveVertex(index, 1.17, WEAVE_SIZE);
        label.setAttribute("class", "soul-weave__label");
        label.setAttribute("x", at.x.toFixed(2));
        label.setAttribute("y", at.y.toFixed(2));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.textContent = STAT_TICK_LABELS[key];
        this.labels.push(label);
        svg.append(label);
      });
    }
    this.svg = svg;
    this.host.classList.add("soul-weave");
    this.host.replaceChildren(svg);
  }

  public get value(): Readonly<Stats> {
    return this.stats;
  }

  /** The bound stats. With `animate` the polygon travels over 480 ms; reduced motion lands it at once. */
  public setStats(stats: Stats, animate: boolean): void {
    this.stats = { ...stats };
    if (animate && !this.reducedMotion) {
      this.tween = { from: { ...this.shown }, startedAt: performance.now() };
      this.schedule();
      return;
    }
    this.tween = null;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.show(this.stats);
  }

  /** The dashed preview of a hovered or focused choice; null clears it. */
  public setGhost(stats: Stats | null): void {
    this.host.classList.toggle("has-ghost", stats !== null);
    if (stats) this.ghost.setAttribute("points", weavePolygonPoints(stats, WEAVE_SIZE));
  }

  /** Flares the spokes a bind just changed (restarts if already flaring). */
  public pulse(keys: readonly StatKey[]): void {
    if (this.reducedMotion || keys.length === 0) return;
    this.host.classList.remove("is-pulsing");
    void this.host.offsetWidth;
    this.host.classList.add("is-pulsing");
    this.labels.forEach((label, index) => {
      label.classList.toggle("is-pulsing", keys.includes(STAT_KEYS[index]!));
    });
  }

  public setReducedMotion(flag: boolean): void {
    this.reducedMotion = flag;
    if (flag && this.tween) this.setStats(this.stats, false);
  }

  public dispose(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.tween = null;
    this.host.replaceChildren();
    this.host.classList.remove("soul-weave", "has-ghost", "is-pulsing");
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.step(performance.now());
    });
  }

  private step(now: number): void {
    const tween = this.tween;
    if (!tween) return;
    const progress = Math.min(1, (now - tween.startedAt) / SOUL_WEAVE_TWEEN_MS);
    this.show(lerpStats(tween.from, this.stats, easeWeave(progress), { ...this.shown }));
    if (progress >= 1) {
      this.tween = null;
      return;
    }
    this.schedule();
  }

  private show(stats: Stats): void {
    for (const key of STAT_KEYS) this.shown[key] = stats[key];
    this.polygon.setAttribute("points", weavePolygonPoints(this.shown, WEAVE_SIZE));
  }
}

/**
 * Counts every `[data-stat]` numeral in `root` from `from` to its stat's value in 60 ms
 * ticks over 420 ms, each digit in its own cell. Reduced motion writes the final reading.
 * Returns a function that stops the count (a station change mid-count).
 */
export function animateStatCounters(root: ParentNode, from: Stats, to: Stats, reducedMotion: boolean): () => void {
  const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-stat]"));
  const write = (elapsedMs: number): void => {
    for (const counter of counters) {
      const key = counter.dataset.stat as StatKey | undefined;
      if (!key || !(key in to)) continue;
      counter.innerHTML = counterDigits(counterValueAt(from[key], to[key], elapsedMs));
    }
  };
  if (reducedMotion) {
    write(SOUL_WEAVE_COUNTER_MS);
    return () => undefined;
  }
  const startedAt = performance.now();
  let timer = 0;
  const tick = (): void => {
    const elapsed = performance.now() - startedAt;
    write(elapsed);
    if (elapsed >= SOUL_WEAVE_COUNTER_MS) return;
    timer = window.setTimeout(tick, SOUL_WEAVE_COUNTER_TICK_MS);
  };
  write(0);
  timer = window.setTimeout(tick, SOUL_WEAVE_COUNTER_TICK_MS);
  return () => window.clearTimeout(timer);
}
