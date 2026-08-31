import type { ReviewActorFrame, ReviewEvent, ReviewSequence, ReviewSequenceFrame, ReviewTrack } from "./combat-review-types";

const finite = (value: number, label: string, positive = false) => {
  if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0)) throw new Error(label + " must be finite and " + (positive ? "positive." : "nonnegative."));
};
const unique = (ids: readonly string[], label: string) => {
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) throw new Error(label + " must have nonempty unique IDs.");
};

/** Own a snapshot: callers cannot mutate a playing sequence underneath a seek. */
export function prepareReviewSequence(input: ReviewSequence): ReviewSequence {
  const value = structuredClone(input);
  finite(value.durationSeconds, "Sequence duration", true);
  if (!value.id.trim() || !value.actorIds.length) throw new Error("A sequence requires an ID and actors.");
  unique([...value.actorIds, ...value.propIds ?? []], "Subjects");
  unique(value.tracks.map((track) => track.id), "Tracks");
  unique(value.events.map((event) => event.id), "Events");
  for (const track of value.tracks) {
    if (!value.actorIds.includes(track.actorId) || !track.actionId.trim()) throw new Error("Unknown actor or empty action in track " + track.id);
    finite(track.startSeconds, "Track start");
    finite(track.durationSeconds, "Track duration", true);
    finite(track.clipDurationSeconds, "Clip duration", true);
    finite(track.rate ?? 1, "Clip rate", true);
    finite(track.blendInSeconds ?? 0, "Blend duration");
    if (track.startSeconds + track.durationSeconds > value.durationSeconds + 1e-9) throw new Error("Track exceeds sequence duration.");
    if ((track.blendInSeconds ?? 0) > track.durationSeconds) throw new Error("Blend exceeds track duration.");
    if (track.terminal && track.loop) throw new Error("A terminal action cannot loop.");
  }
  for (const actorId of value.actorIds) {
    const tracks = value.tracks.filter((track) => track.actorId === actorId).sort((a, b) => a.startSeconds - b.startSeconds);
    if (!tracks.length || tracks[0]!.startSeconds !== 0) throw new Error("Every actor requires an initial track at zero.");
    if (tracks[0]!.blendInSeconds) throw new Error("An initial track has no prior pose to blend.");
    for (let index = 1; index < tracks.length; index++) {
      const previous = tracks[index - 1]!, track = tracks[index]!;
      if (previous.terminal) throw new Error("An actor cannot resume after a terminal action without reset.");
      if (track.startSeconds < previous.startSeconds + previous.durationSeconds - 1e-9) throw new Error("Actor tracks overlap; use a bounded blend-in instead.");
    }
  }
  const subjects = new Set([...value.actorIds, ...value.propIds ?? []]);
  for (const event of value.events) {
    finite(event.timeSeconds, "Event time");
    if (event.timeSeconds > value.durationSeconds || !value.actorIds.includes(event.actorId)
      || (event.targetId && !subjects.has(event.targetId))) throw new Error("Event has an unknown subject or time outside sequence.");
    if (event.result === "hit" && !event.evidence?.trim()) throw new Error("A hit requires spatial evidence, not just a timing marker.");
    if ([...event.position ?? [], ...event.normal ?? []].some((component) => !Number.isFinite(component))) throw new Error("Event vectors must be finite.");
  }
  // Stable ordering handles events at the same instant identically on every seek.
  return deepFreeze({ ...value, events: [...value.events].sort((a, b) => a.timeSeconds - b.timeSeconds || a.id.localeCompare(b.id)) });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function clipTime(track: ReviewTrack, elapsed: number, continueLoop = false): number {
  const seconds = Math.max(0, continueLoop ? elapsed : Math.min(elapsed, track.durationSeconds)) * (track.rate ?? 1);
  return track.loop ? seconds % track.clipDurationSeconds : Math.min(seconds, track.clipDurationSeconds);
}

/** Pure sampling; it never dispatches callbacks, damage, sound, projectiles or loot. */
export function sampleReviewSequence(sequence: ReviewSequence, timeSeconds: number): ReviewSequenceFrame {
  finite(timeSeconds, "Review time");
  const time = Math.min(sequence.durationSeconds, timeSeconds);
  const actors: ReviewActorFrame[] = sequence.actorIds.map((actorId) => {
    const tracks = sequence.tracks.filter((track) => track.actorId === actorId).sort((a, b) => a.startSeconds - b.startSeconds);
    let index = tracks.length - 1;
    while (index >= 0 && tracks[index]!.startSeconds > time) index--;
    const current = tracks[index];
    if (!current) throw new Error("Actor has no initial review pose.");
    const elapsed = time - current.startSeconds;
    const blend = current.blendInSeconds ?? 0;
    const previous = tracks[index - 1];
    const alpha = blend > 0 ? Math.min(1, elapsed / blend) : 1;
    const weight = alpha * alpha * (3 - 2 * alpha);
    const poses = [{ actionId: current.actionId, timeSeconds: clipTime(current, elapsed), weight }];
    if (previous && weight < 1) poses.unshift({ actionId: previous.actionId,
      timeSeconds: clipTime(previous, time - previous.startSeconds, true), weight: 1 - weight });
    return { actorId, trackId: current.id, poses,
      terminal: current.terminal ? (elapsed >= current.durationSeconds ? "held" : "dying") : "none" };
  });
  return { timeSeconds: time, normalizedTime: time / sequence.durationSeconds, actors,
    elapsedEvents: sequence.events.filter((event) => event.timeSeconds <= time) };
}

export interface ReviewEventOccurrence {
  readonly event: ReviewEvent;
  readonly cycle: number;
  readonly occurrenceId: string;
}
export interface ReviewClockFrame extends ReviewSequenceFrame {
  readonly playing: boolean;
  readonly speed: number;
  readonly loop: boolean;
  readonly cycle: number;
  readonly crossedEvents: readonly ReviewEventOccurrence[];
}

/** One clock for every actor and prop. No actor owns its own wall-clock delay. */
export class ReviewClock {
  readonly sequence: ReviewSequence;
  private time = 0;
  private currentCycle = 0;
  private generation = 0;
  private rate = 1;
  private repeating = false;
  private running = false;
  private includeZero = true;

  constructor(sequence: ReviewSequence) { this.sequence = prepareReviewSequence(sequence); }
  snapshot(): ReviewClockFrame { return this.frame([]); }
  setPlaying(value: boolean): ReviewClockFrame {
    this.running = value && (this.time < this.sequence.durationSeconds || this.repeating);
    return this.snapshot();
  }
  setSpeed(value: number): ReviewClockFrame {
    finite(value, "Playback speed", true);
    this.rate = Math.max(0.05, Math.min(3, value));
    return this.snapshot();
  }
  setLoop(value: boolean): ReviewClockFrame { this.repeating = value; return this.snapshot(); }
  /** Seeking reconstructs state; no historical event is emitted as a new hit. */
  seek(timeSeconds: number): ReviewClockFrame {
    finite(timeSeconds, "Seek time");
    this.time = Math.min(timeSeconds, this.sequence.durationSeconds);
    this.includeZero = false;
    if (!this.repeating && this.time === this.sequence.durationSeconds) this.running = false;
    return this.snapshot();
  }
  restart(playing = this.running): ReviewClockFrame {
    this.time = 0; this.currentCycle = 0; this.generation++; this.includeZero = true; this.running = playing;
    return this.snapshot();
  }
  advance(deltaSeconds: number): ReviewClockFrame {
    finite(deltaSeconds, "Frame delta");
    if (!this.running || deltaSeconds === 0) return this.snapshot();
    let remaining = deltaSeconds * this.rate;
    // Reject pathological input rather than dropping events or freezing the UI.
    if (!Number.isFinite(remaining) || remaining / this.sequence.durationSeconds > 1000) throw new Error("Frame delta spans too many review cycles.");
    const crossed: ReviewEventOccurrence[] = [];
    while (remaining > 0) {
      const available = this.sequence.durationSeconds - this.time;
      const step = Math.min(remaining, available);
      const end = this.time + step;
      for (const event of this.sequence.events) {
        if ((event.timeSeconds > this.time || (this.includeZero && event.timeSeconds === 0)) && event.timeSeconds <= end) {
          crossed.push({ event, cycle: this.currentCycle,
            occurrenceId: this.sequence.id + "/" + this.generation + "/" + this.currentCycle + "/" + event.id });
        }
      }
      this.includeZero = false; this.time = end; remaining -= step;
      if (this.time < this.sequence.durationSeconds) break;
      if (!this.repeating) { this.running = false; break; }
      this.currentCycle++; this.time = 0; this.includeZero = true;
      // A zero-time event of the new cycle belongs to the boundary just crossed.
      if (remaining === 0) {
        for (const event of this.sequence.events.filter((entry) => entry.timeSeconds === 0)) crossed.push({ event,
          cycle: this.currentCycle, occurrenceId: this.sequence.id + "/" + this.generation + "/" + this.currentCycle + "/" + event.id });
        this.includeZero = false;
      }
    }
    return this.frame(crossed);
  }
  private frame(crossedEvents: readonly ReviewEventOccurrence[]): ReviewClockFrame {
    return { ...sampleReviewSequence(this.sequence, this.time), playing: this.running, speed: this.rate,
      loop: this.repeating, cycle: this.currentCycle, crossedEvents };
  }
}
