import * as THREE from "three";

// Carry families reuse source locomotion; weapon identity stays in the loadout.
// No original clip is renamed, modified, or removed.
const FAMILY = {
  greatsword: ["GreatSword__GreatSwordWalk", "GreatSword__GreatSwordRun"],
  melee: ["ProMeleeAxe__StandingWalkForward", "ProMeleeAxe__StandingRunForward"],
  caster: ["ProMagic__StandingWalkForward", "ProMagic__StandingRunForward"],
  bow: ["ProLongbow__StandingWalkForward", "ProLongbow__StandingRunForward"],
  staff: ["CarryLayer__StaffWalk", "CarryLayer__StaffRun"],
};
export const LOCOMOTION_FAMILIES = {
  longswordTwoHand: "greatsword", shortswordOnly: "melee", staff: "staff",
  mace: "melee", bow: "bow", rod: "caster", unarmedMagic: "caster",
  knife: "caster", daggerSingle: "melee", daggers: "melee",
};

export function locomotionActions(loadoutKey, clips) {
  const family = FAMILY[LOCOMOTION_FAMILIES[loadoutKey]];
  if (!family) throw new Error(`No walking/running carry policy for ${loadoutKey}`);
  const rows = family.map((name, index) => [
    `${index ? "Run" : "Walk"} — ${loadoutKey === "staff" ? "two-hand staff carry layer" : "shared weapon carry"}`, name,
  ]);
  if (loadoutKey === "staff") rows.push(
    ["Walk — caster staff / free hand", FAMILY.caster[0]],
    ["Run — caster staff / free hand", FAMILY.caster[1]],
  );
  for (const [, name] of rows) if (!clips.has(name)) throw new Error(`Missing armed locomotion: ${loadoutKey} / ${name}`);
  return rows;
}

export function isStaffCarryClip(name) {
  return name === "CarryLayer__StaffWalk" || name === "CarryLayer__StaffRun";
}

// Layer the approved guard's shoulders/arms over the unchanged gait. Hips,
// spine, head, legs, feet, source timing and root bob all remain locomotion.
export function buildCarryLocomotionClips(clips) {
  const guard = clips.get("GapAuthored__StaffReadyGuard");
  if (!guard) throw new Error("Staff locomotion requires the approved staff ready guard");
  return ["Walking", "StandardRun"].map((motion, index) => {
    const source = clips.get(`MaleLocomotion__${motion}`);
    if (!source) throw new Error(`Missing shared gait ${motion}`);
    const tracks = source.tracks.map((track) => {
      if (!/mixamorig:?(Left|Right)(Shoulder|Arm|ForeArm|Hand)/i.test(track.name)) return track.clone();
      const carry = guard.tracks.find((candidate) => candidate.name === track.name);
      if (!carry) throw new Error(`Staff carry is missing ${track.name}`);
      const value = [...carry.createInterpolant().evaluate(0)];
      const replacement = track.clone();
      replacement.times = new Float32Array([0, source.duration]);
      replacement.values = new Float32Array([...value, ...value]);
      return replacement;
    });
    const clip = new THREE.AnimationClip(FAMILY.staff[index], source.duration, tracks);
    clip.userData = { sourceGait: source.name, carryPose: guard.name, kind: "runtime-composition", mask: "shoulders-arms-hands-only" };
    return clip;
  });
}
