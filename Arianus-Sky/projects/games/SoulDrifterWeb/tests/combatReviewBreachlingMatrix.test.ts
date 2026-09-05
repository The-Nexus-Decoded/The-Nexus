import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CombatReviewController, type CombatContactDirection, type CombatContactSeverity,
  type CombatSparRow } from "../src/review/weapon-lab/combat-review-controller";
import { createReviewStrikeProbe, reviewContactProfile } from "../src/review/weapon-lab/combat-review-contact-profiles";
import { ReviewContactSurface } from "../src/review/weapon-lab/combat-review-contact";
import { sampleReviewProjectileFlight } from "../src/review/weapon-lab/combat-review-projectiles";
import type { ReviewActorAdapter, ReviewEvent, ReviewProjectileFlight, ReviewSequence } from "../src/review/weapon-lab/combat-review-types";
import { MOB_CATALOG, type MobDefinition } from "../src/review/weapon-lab/mobs-stage";
import { createMobReactionClipLoader, createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { REACTION_ARCHETYPES } from "../src/review/weapon-lab/reaction-contract";
import { REVIEWED_REACTION_PACKS } from "../src/review/weapon-lab/reviewed-reaction-receipt";
import { composerPackForDefinition } from "../src/review/weapon-lab/composer-pack-lookup";
// @ts-expect-error Existing studio wiring (JS); the matrix drives the tool's own loader and definitions.
import { COMBAT_REVIEW_DEFINITIONS, createCombatReviewActorLoader } from "../src/review/weapon-lab/combat-review-studio.js";
// @ts-expect-error Real public-source JS factory; image decoding alone is stubbed below.
import { createHumanReviewActorFactory } from "../src/review/weapon-lab/human-review-actor.js";
// @ts-expect-error Existing immutable shared loadout catalog.
import { LOADOUTS } from "../src/review/weapon-lab/human-review-catalog.js";
import EXPECTED from "./fixtures/combatReviewBreachlingMatrix.json";

/**
 * Combat Review matrix for the Breachling bodies against the human with every
 * weapon set, both directions, measured through the tool's own controller
 * (COMBAT_REVIEW_DEFINITIONS, createCombatReviewActorLoader, runSparMatrix,
 * resolveContact). Every row is a real sampled mesh contact (or a documented
 * miss/unavailable reason), the reaction the tool picked on the receiving side,
 * the effect binding, and a verdict. The measured table is pinned as a fixture
 * so any asset, pack or tool change shows up as a diff on the exact pair.
 *
 * Re-record after an intentional change with
 *   MATRIX_RECORD=<path>.json npx vitest run tests/combatReviewBreachlingMatrix.test.ts
 * and copy the file over tests/fixtures/combatReviewBreachlingMatrix.json.
 * MATRIX_BODIES / MATRIX_LOADOUTS (comma lists) narrow a development run.
 */

// Browser tsconfig has no ambient Node types; limit host declarations to this test.
const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync, writeFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array; writeFileSync(path: string, data: string): void }>("node:fs");
const { webcrypto } = await importHost<{ webcrypto: Crypto }>("node:crypto");
const env = (await importHost<{ env: Record<string, string | undefined> }>("node:process")).env;

const FOURVIEW_BODY_IDS = ["breachling-base-4v", "breachling-stalker-4v", "breachling-oathbound-4v", "breachling-ravager-4v"] as const;
const LEGACY_BODY_IDS = ["breachling-base", "breachling-stalker", "breachling-oathbound", "breachling-ravager"] as const;
/** Every registered human weapon set, in catalog order. */
const LOADOUT_IDS = Object.keys(LOADOUTS) as readonly string[];
/** The legacy bodies are compared against one weapon set only; the four-view bodies get all of them. */
const LEGACY_COMPARISON_LOADOUT = "longswordTwoHand";
const BREACHLING_ATTACKS = ["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip", "SpitAttack"] as const;

const selectedBodies = env.MATRIX_BODIES?.split(",");
const selectedLoadouts = env.MATRIX_LOADOUTS?.split(",");
const pairs: readonly { body: string; loadout: string }[] = [
  ...FOURVIEW_BODY_IDS.flatMap((body) => LOADOUT_IDS.map((loadout) => ({ body, loadout }))),
  ...LEGACY_BODY_IDS.map((body) => ({ body, loadout: LEGACY_COMPARISON_LOADOUT })),
].filter((pair) => (!selectedBodies || selectedBodies.includes(pair.body)) && (!selectedLoadouts || selectedLoadouts.includes(pair.loadout)));

interface MatrixRow {
  readonly body: string;
  readonly loadout: string;
  /** Loadout action family that selects the human's source response candidates. */
  readonly family: string;
  readonly attacker: "breachling" | "human";
  readonly response: "reaction" | "death";
  readonly actionId: string;
  readonly label: string;
  /** Active interval as the spar table prints it, or "unbound". */
  readonly window: string;
  readonly profileId: string | null;
  readonly status: "contact" | "miss" | "unavailable";
  readonly timeSeconds: number | null;
  readonly separationMeters: number;
  readonly direction: CombatContactDirection | null;
  /** Where the attacker's root stands in the defender's frame at the measured spacing. */
  readonly bearing: CombatContactDirection;
  readonly severity: CombatContactSeverity | null;
  readonly position: readonly number[] | null;
  /** Clip the tool scheduled on the receiving side (reaction or death). */
  readonly responseClip: string | null;
  readonly effect: string | null;
  /** Nearest in-window approach of the strike surface (or flight centreline) over every spacing the spar ladder tried, metres. */
  readonly nearestMeters: number | null;
  /** Spacing at which that nearest approach occurred. */
  readonly nearestAtMeters: number | null;
  readonly verdict: "PASS" | "GAP";
  readonly reason: string;
}

const round = (value: number, digits = 4) => Number(value.toFixed(digits));
const installed = new Map<string, Uint8Array<ArrayBuffer>>();
function bytesAt(path: string) {
  let bytes = installed.get(path);
  if (!bytes) { bytes = Uint8Array.from(readFileSync(new URL(`../public${path}`, import.meta.url))); installed.set(path, bytes); }
  return bytes;
}
function bytesFor(definition: MobDefinition) { return bytesAt(definition.url); }
/** Every pinned reaction pack, by URL: a mob actor now installs its archetype's own. */
const REACTION_PACK_URLS = new Set(REACTION_ARCHETYPES
  .flatMap((archetype) => (REVIEWED_REACTION_PACKS[archetype] ?? []).map((pack) => pack.url)));
const nativeParseAsync = GLTFLoader.prototype.parseAsync;
function realHumanFactory() {
  return createHumanReviewActorFactory({ loader: { loadAsync: async (url: string) => {
    const bytes = Uint8Array.from(readFileSync(new URL(`../public/${url.replace(/^\.\//, "")}`, import.meta.url)));
    const loader = new GLTFLoader(), decode = async () => new THREE.Texture();
    loader.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: decode }));
    loader.register(() => ({ name: "EXT_texture_webp", loadTexture: decode }));
    return loader.parseAsync(bytes.buffer, "");
  } }, textureLoader: { loadAsync: async () => new THREE.Texture() } });
}

const measured: MatrixRow[] = [];
let factory: ReturnType<typeof realHumanFactory>;
// One pack fetch per archetype for the whole matrix, not one per pair.
const mobReactionClips = createMobReactionClipLoader();

beforeAll(() => {
  vi.stubGlobal("document", { baseURI: "http://localhost:5179/weapon-lab.html" });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const pack = [...REACTION_PACK_URLS].find((candidate) => url.pathname.endsWith(candidate));
    const definition = MOB_CATALOG.find((candidate) => url.pathname.endsWith(candidate.url));
    if (!pack && !definition) throw new Error(`Unexpected test fetch ${url}`);
    return new Response(pack ? bytesAt(pack) : bytesFor(definition!), { status: 200, headers: { "content-type": "model/gltf-binary" } });
  }));
  // Exact pinned GLB bytes, skin, rig and clips; only image decoding is stubbed for the CPU host.
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
    this.register(() => ({ name: "TEST_CPU_TEXTURE_DECODE_ONLY", loadTexture: async () => {
      const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
    } }));
    return nativeParseAsync.call(this, data, path);
  });
  factory = realHumanFactory();
});
afterAll(() => {
  factory.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (env.MATRIX_RECORD) writeFileSync(env.MATRIX_RECORD, JSON.stringify(measured, null, 2) + "\n");
});

/** Does the scheduled clip name express the measured side and weight? Mirrors the tool's own naming policy. */
function reactionExpresses(clip: string, direction: CombatContactDirection, severity: CombatContactSeverity): boolean {
  if (direction === "left") return /left/i.test(clip);
  if (direction === "right") return /right/i.test(clip);
  if (direction === "back") return /back|behind/i.test(clip);
  const heavy = /heavy|big|large|strong/i.test(clip);
  return severity === "heavy" ? heavy : !heavy && !/left|right|back|behind/i.test(clip);
}

interface Capture { event: ReviewEvent; responseClip: string; sequence: ReviewSequence; flights: readonly ReviewProjectileFlight[]; projectileError: string | null }

/** Nearest in-window approach at the current placement: strike vertices, or the fixed flight centreline for a projectile. */
function nearestApproachHere(controller: CombatReviewController, attacker: ReviewActorAdapter, target: ReviewActorAdapter, actionId: string): number | null {
  const profile = reviewContactProfile(attacker, actionId, { projectiles: true, deriveHuman: true });
  if (!profile) return null;
  const surface = new ReviewContactSurface(target.model, (mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh);
  const flights = controller.snapshot().projectiles.flights;
  const probe = profile.surface.kind === "projectile" ? null : createReviewStrikeProbe(attacker, profile);
  if (profile.surface.kind === "projectile" ? !flights.length : !probe?.vertexCount) { surface.dispose(); return null; }
  try {
    const count = Math.max(4, Math.ceil((profile.endSeconds - profile.startSeconds) * 60));
    let nearest = Infinity;
    for (let index = 0; index <= count; index++) {
      const time = profile.startSeconds + (profile.endSeconds - profile.startSeconds) * index / count;
      // the strike surface is sampled at 60 Hz; the defender's slow ready pose is refitted at 30 Hz
      controller.seek(time); if (index % 2 === 0) surface.update();
      const points = probe ? probe.sample().map((point) => point.position) : flights.map((flight) => sampleReviewProjectileFlight(flight, time));
      for (const point of points) { const contact = surface.closest(point, nearest); if (contact) nearest = Math.min(nearest, contact.distance); }
    }
    return Number.isFinite(nearest) ? nearest : null;
  } finally { surface.dispose(); }
}

/** Nearest in-window approach over every spacing the spar ladder tried, with the spacing it occurred at. */
function nearestApproach(controller: CombatReviewController, attacker: ReviewActorAdapter, target: ReviewActorAdapter, actionId: string,
  ladder: readonly number[]): { meters: number; atMeters: number } | null {
  let best: { meters: number; atMeters: number } | null = null;
  for (const separationMeters of ladder) {
    controller.setPlacement({ separationMeters });
    const nearest = nearestApproachHere(controller, attacker, target, actionId);
    if (nearest != null && (!best || nearest < best.meters)) best = { meters: round(nearest), atMeters: separationMeters };
  }
  return best;
}

async function measurePair(body: string, loadout: string): Promise<MatrixRow[]> {
  const rows: MatrixRow[] = [];
  const controller = new CombatReviewController({ definitions: COMBAT_REVIEW_DEFINITIONS,
    loadActor: createCombatReviewActorLoader(factory, createMobReviewActor, mobReactionClips),
    initial: { a: `human:${loadout}`, b: body } });
  const captures = new Map<string, Capture>();
  const stop = controller.subscribe((snapshot) => {
    const result = snapshot.contact.result;
    if (snapshot.contact.status !== "contact" || !result?.event || snapshot.contact.response === "none") return;
    const attackerSlot = snapshot.slots.find((slot) => slot.slot === snapshot.attacker)!, defenderSlot = snapshot.slots.find((slot) => slot.slot !== snapshot.attacker)!;
    captures.set(`${snapshot.attacker}:${attackerSlot.selected.action}:${snapshot.contact.response}`, { event: result.event,
      responseClip: defenderSlot.selected[snapshot.contact.response], sequence: controller.sequence()!,
      flights: snapshot.projectiles.flights, projectileError: snapshot.projectiles.unavailableReason });
  });
  try {
    await controller.enter();
    const ready = controller.snapshot();
    expect(ready.ready, JSON.stringify(ready.slots.map((slot) => slot.error))).toBe(true);
    const family = (LOADOUTS as Record<string, { actionFamily: string }>)[loadout]!.actionFamily;
    const pack = composerPackForDefinition(body)!;
    for (const attacker of ["breachling", "human"] as const) {
      const slot = attacker === "human" ? "a" : "b", defender = attacker === "human" ? "b" : "a";
      controller.setAttacker(slot);
      const attackerActor = controller.actor(slot)!, defenderActor = controller.actor(defender)!;
      const defenderActions = controller.snapshot().slots.find((entry) => entry.slot === defender)!.actions;
      const sparRows: readonly CombatSparRow[] = await controller.runSparMatrix();
      if (attacker === "breachling") expect(sparRows.map((row) => row.actionId).sort()).toEqual([...BREACHLING_ATTACKS].sort());
      const ladder = CombatReviewController.sparSeparationLadder(controller.snapshot().placement.separationMeters);
      const describeRow = (row: CombatSparRow, response: MatrixRow["response"], capture: Capture | undefined, nearest: { meters: number; atMeters: number } | null): MatrixRow => {
        controller.setAction(slot, "action", row.actionId);
        const profile = controller.contactProfile();
        controller.setPlacement({ separationMeters: row.separationMeters });
        const bearing = CombatReviewController.classifyContactDirection(defenderActor, attackerActor.root.getWorldPosition(new THREE.Vector3()).toArray());
        const event = capture?.event;
        const scheduled = capture ? capture.sequence.tracks.find((track) => track.id === "defender-response") : undefined;
        const cue = capture ? capture.sequence.events.find((entry) => entry.id === "measured-response") : undefined;
        let effect: string | null = null; const reasons: string[] = [];
        if (row.status === "contact" && event) {
          if (profile?.surface.kind === "projectile") {
            const flight = capture!.flights.find((entry) => entry.id === event.projectileId);
            effect = flight ? `${flight.visualKind} projectile ${event.damageType ?? "untyped"} · stopped at surface anchor` : null;
            if (!flight || !event.surfaceAnchor || capture!.projectileError) reasons.push(`projectile effect not attached: ${capture!.projectileError ?? "no flight or surface anchor"}`);
          } else {
            effect = event.surfaceAnchor ? `surface-anchored ${event.damageType ?? "physical"} impact` : null;
            if (!event.surfaceAnchor) reasons.push("melee contact has no measured surface anchor");
          }
          const clip = capture!.responseClip;
          if (!scheduled || scheduled.actionId !== clip || !cue || cue.kind !== response || cue.result !== "hit"
            || Math.abs(cue.timeSeconds - event.timeSeconds) > 1e-6) reasons.push(`${response} was not scheduled at the measured contact`);
          if (response === "death" && !scheduled?.terminal) reasons.push("death response is not terminal");
          if (response === "reaction" && row.direction && row.severity && !reactionExpresses(clip, row.direction, row.severity)) {
            reasons.push(`no ${row.direction}${row.direction === "front" ? ` ${row.severity}` : ""} reaction clip in the ${attacker === "human" ? "Breachling" : family} response set; tool kept "${clip}"`);
          }
          if (profile && Math.abs(event.timeSeconds - profile.startSeconds) < 1e-6) {
            reasons.push(`contact on the window's opening sample (${profile.startSeconds.toFixed(3)} s): the strike surface already touches the target when the window opens, so a body overlap at ${row.separationMeters} m cannot be told from a landed swing`);
          }
          if (row.direction === "back" && bearing === "front") {
            reasons.push(`contact landed behind the defender root (${event.position!.map((value) => value.toFixed(2)).join(", ")}) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing`);
          }
        } else if (row.status === "miss") {
          reasons.push(`no contact at any spar spacing (${ladder.join(", ")} m); nearest in-window approach ${nearest ? `${(nearest.meters * 1000).toFixed(0)} mm at ${nearest.atMeters} m` : "unmeasured"}`);
        } else reasons.push(row.evidence);
        return { body, loadout, family, attacker, response, actionId: row.actionId, label: row.label, window: row.window, profileId: profile?.id ?? null,
          status: row.status === "contact" || row.status === "miss" ? row.status : "unavailable",
          timeSeconds: row.timeSeconds == null ? null : round(row.timeSeconds), separationMeters: row.separationMeters,
          direction: row.direction, bearing, severity: row.severity, position: event?.position?.map((value) => round(value, 3)) ?? null,
          responseClip: capture?.responseClip ?? null, effect, nearestMeters: nearest?.meters ?? null, nearestAtMeters: nearest?.atMeters ?? null,
          verdict: reasons.length ? "GAP" : "PASS", reason: reasons.join("; ") };
      };
      for (const row of sparRows) {
        let nearest: { meters: number; atMeters: number } | null = null;
        if (row.status === "miss") {
          controller.setAction(slot, "action", row.actionId);
          nearest = nearestApproach(controller, attackerActor, defenderActor, row.actionId, ladder);
        }
        rows.push(describeRow(row, "reaction", captures.get(`${slot}:${row.actionId}:reaction`), nearest));
      }
      // Death on the receiving side: the first landing attack of this direction, re-measured with the death response.
      const landed = sparRows.find((row) => row.status === "contact");
      const deathClip = defenderActions.find((action) => action.semantic === "death" && !action.unavailableReason);
      if (landed && deathClip) {
        controller.setAction(slot, "action", landed.actionId); controller.setPlacement({ separationMeters: landed.separationMeters });
        controller.setAction(defender, "death", deathClip.id);
        const result = await controller.resolveContact({ response: "death" });
        const snapshot = controller.snapshot();
        const row: CombatSparRow = { actionId: landed.actionId, label: landed.label, window: landed.window, status: result?.status ?? "unavailable",
          timeSeconds: result?.event?.timeSeconds ?? null, direction: snapshot.contact.direction, severity: snapshot.contact.severity,
          reaction: null, separationMeters: landed.separationMeters, evidence: result?.evidence ?? "" };
        rows.push(describeRow(row, "death", captures.get(`${slot}:${landed.actionId}:death`), null));
      }
    }
    // Every Breachling attack window comes from the registered composer pack (revision-tagged), never a legacy or invented interval.
    for (const row of rows.filter((entry) => entry.attacker === "breachling" && entry.response === "reaction")) {
      if (row.actionId === "SpitAttack") {
        expect(row.profileId, `${body} ${row.actionId}`).toBe("base-spit:SpitAttack");
        expect(row.window).toBe(`${pack.spit!.releaseSeconds.toFixed(3)}–${pack.spit!.endSeconds.toFixed(3)} s`);
      } else {
        const strike = pack.strikes[row.actionId]!;
        expect(row.profileId, `${body} ${row.actionId}`).toBe(`${strike.revision}:${row.actionId}`);
        expect(row.window).toBe(`${strike.start.toFixed(3)}–${strike.end.toFixed(3)} s`);
      }
    }
  } finally { stop(); controller.dispose(); }
  return rows;
}

describe("Combat Review Breachling matrix (four-view bodies × every human weapon set, both directions)", () => {
  const expected = EXPECTED as readonly MatrixRow[];
  it.each(pairs)("$body vs human:$loadout", async ({ body, loadout }) => {
    const rows = await measurePair(body, loadout);
    measured.push(...rows);
    expect(rows.length).toBeGreaterThan(0);
    // Assert the pinned fixture pair by pair so an asset, pack or tool change names the exact row.
    const pinned = expected.filter((row) => row.body === body && row.loadout === loadout);
    if (!env.MATRIX_RECORD) expect(rows).toEqual(pinned);
  }, 600_000);

  // A recording or narrowed development run is not the pinned matrix.
  it.skipIf(Boolean(env.MATRIX_RECORD || selectedBodies || selectedLoadouts))("pins the full matrix once: every four-view body × every weapon set, plus the legacy comparison", () => {
    for (const body of FOURVIEW_BODY_IDS) {
      for (const loadout of LOADOUT_IDS) {
        const rows = expected.filter((row) => row.body === body && row.loadout === loadout);
        expect(rows.filter((row) => row.attacker === "breachling" && row.response === "reaction").map((row) => row.actionId).sort(), `${body} ${loadout}`)
          .toEqual([...BREACHLING_ATTACKS].sort());
        expect(rows.some((row) => row.attacker === "human"), `${body} ${loadout} human attacks`).toBe(true);
      }
    }
    for (const body of LEGACY_BODY_IDS) expect(expected.some((row) => row.body === body && row.loadout === LEGACY_COMPARISON_LOADOUT)).toBe(true);
    expect(expected.every((row) => row.verdict === "PASS" ? !row.reason : row.reason.length > 0)).toBe(true);
  });
});
