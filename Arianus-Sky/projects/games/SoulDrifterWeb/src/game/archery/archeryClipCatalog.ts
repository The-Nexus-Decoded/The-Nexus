import { ARCHERY_RETRIEVAL_MARKERS } from "./archeryActions";

export type ArcheryClipRole =
  | "idle"
  | "carry-walk"
  | "carry-run"
  | "drawn-walk"
  | "drawn-run"
  | "retrieve-arrow"
  | "release-arrow"
  | "multishot"
  | "bow-strike"
  | "aim-overdraw"
  | "aim-recoil"
  | "equip-from-back"
  | "stow-to-back";

export interface ArcheryClipSpec {
  role: ArcheryClipRole;
  semanticName: string;
  sourceClipNames: readonly string[];
  authored: boolean;
  loops: boolean;
  sourceDurationSeconds?: number;
  markers?: Readonly<Record<string, number>>;
}

const clip = (spec: ArcheryClipSpec): ArcheryClipSpec => Object.freeze(spec);

export const ARCHERY_CLIP_CATALOG: readonly ArcheryClipSpec[] = Object.freeze([
  clip({ role: "idle", semanticName: "BowIdle", sourceClipNames: ["ProLongbow__StandingIdle01"], authored: false, loops: true }),
  clip({ role: "carry-walk", semanticName: "BowCarryWalk", sourceClipNames: ["ProLongbow__StandingWalkForward"], authored: false, loops: true }),
  clip({ role: "carry-run", semanticName: "BowCarryRun", sourceClipNames: ["ProLongbow__StandingRunForward"], authored: false, loops: true }),
  clip({ role: "drawn-walk", semanticName: "BowDrawnWalk", sourceClipNames: ["ProLongbow__StandingAimWalkForward"], authored: false, loops: true }),
  clip({
    role: "drawn-run",
    semanticName: "BowDrawnRun",
    sourceClipNames: ["ProLongbow__StandingRunForward", "ProLongbow__StandingAimWalkForward"],
    authored: true,
    loops: true,
  }),
  clip({
    role: "retrieve-arrow",
    semanticName: "BowRetrieveArrow",
    sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularBowDrawArrow"],
    authored: true,
    loops: false,
    sourceDurationSeconds: 1.067,
    markers: ARCHERY_RETRIEVAL_MARKERS,
  }),
  clip({
    role: "release-arrow",
    semanticName: "BowReleaseArrow",
    sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularBowShoot"],
    authored: true,
    loops: false,
    sourceDurationSeconds: 5.033,
  }),
  clip({
    role: "multishot",
    semanticName: "BowMultishot",
    sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularBowShoot"],
    authored: true,
    loops: false,
    sourceDurationSeconds: 5.033,
  }),
  clip({
    role: "bow-strike",
    semanticName: "BowStrike",
    sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularStaffButtSmash"],
    authored: true,
    loops: false,
  }),
  clip({ role: "aim-overdraw", semanticName: "BowAimOverdraw", sourceClipNames: ["ProLongbow__StandingAimOverdraw"], authored: false, loops: false, sourceDurationSeconds: 3.8 }),
  clip({ role: "aim-recoil", semanticName: "BowAimRecoil", sourceClipNames: ["ProLongbow__StandingAimRecoil"], authored: false, loops: false, sourceDurationSeconds: 0.733 }),
  clip({ role: "equip-from-back", semanticName: "BowEquipFromBack", sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularBowEquipFromBack"], authored: false, loops: false, sourceDurationSeconds: 0.933 }),
  clip({ role: "stow-to-back", semanticName: "BowStowToBack", sourceClipNames: ["Interactions__HumanMasculineAthleticMuscularBowStowToBack"], authored: false, loops: false, sourceDurationSeconds: 1.133 }),
]);

export function archeryClipSpec(role: ArcheryClipRole): ArcheryClipSpec {
  const spec = ARCHERY_CLIP_CATALOG.find((candidate) => candidate.role === role);
  if (!spec) throw new Error(`Missing archery clip contract for ${role}.`);
  return spec;
}

export function requiredArcherySourceClipNames(): readonly string[] {
  return [...new Set(ARCHERY_CLIP_CATALOG.flatMap((spec) => spec.sourceClipNames))];
}

export function missingArcherySourceClipNames(availableClipNames: Iterable<string>): readonly string[] {
  const available = new Set(availableClipNames);
  return requiredArcherySourceClipNames().filter((name) => !available.has(name));
}
