import * as THREE from "three";

export type HumanPilotWeaponId =
  | "iron_longsword"
  | "ashwood_staff"
  | "wooden_mace"
  | "rough_shortbow"
  | "arrow"
  | "quiver"
  | "iron_shortsword"
  | "battered_shield"
  | "binding_rod"
  | "ritual_knife"
  | "worn_dagger";

export type HumanPilotWeaponSocket = "right-hand" | "left-hand" | "hips";
export type HumanPilotWeaponPose = "drawn" | "carried";

export interface HumanPilotWeaponFitSpec {
  id: HumanPilotWeaponId;
  label: string;
  tripoModelId: string;
  runtimeUrl: string;
  sourceOrigin: string;
  sourceAxes: string;
  collisionEnvelopeMeters: readonly [number, number, number];
  drawn: {
    socket: HumanPilotWeaponSocket;
    positionMeters: readonly [number, number, number];
    rotationRadians: readonly [number, number, number];
  };
  carried: {
    socket: HumanPilotWeaponSocket;
    positionMeters: readonly [number, number, number];
    rotationRadians: readonly [number, number, number];
  };
}

const spec = (
  value: HumanPilotWeaponFitSpec,
): HumanPilotWeaponFitSpec => value;

export const HUMAN_PILOT_WEAPON_FIT_SPECS: readonly HumanPilotWeaponFitSpec[] = [
  spec({
    id: "iron_longsword",
    label: "Plain iron longsword",
    tripoModelId: "43f259b7-32b5-40e7-a030-38f6e88f6d88",
    runtimeUrl: "/assets/3d/weapons/sword/weapon-sword-longsword-starter-v001.glb",
    sourceOrigin: "grip center at local zero",
    sourceAxes: "guard +X, blade +Y, thickness -Z",
    collisionEnvelopeMeters: [0.23, 1.05, 0.08],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [0.25, 0.02, -0.03], rotationRadians: [0.08, -0.12, 2.1] },
  }),
  spec({
    id: "ashwood_staff",
    label: "Ashwood practice staff",
    tripoModelId: "4273209e-d3a5-44a0-bcc9-330382235e35",
    runtimeUrl: "/assets/3d/weapons/staff/weapon-staff-ashwood-starter-v001.glb",
    sourceOrigin: "lower grip center at local zero",
    sourceAxes: "shaft +Y, grip forward -Z",
    collisionEnvelopeMeters: [0.09, 1.75, 0.09],
    drawn: { socket: "right-hand", positionMeters: [0, -0.28, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "right-hand", positionMeters: [0, -0.28, 0], rotationRadians: [0, 0, 0] },
  }),
  spec({
    id: "wooden_mace",
    label: "Plain wooden mace",
    tripoModelId: "46083d4e-9b58-40df-a74a-fb74aecd21e1",
    runtimeUrl: "/assets/3d/weapons/mace/weapon-mace-wooden-starter-v001.glb",
    sourceOrigin: "grip center at local zero",
    sourceAxes: "head +Y, striking face +X",
    collisionEnvelopeMeters: [0.2, 0.75, 0.2],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [0.24, 0.02, 0.03], rotationRadians: [0.08, 0, 2.75] },
  }),
  spec({
    id: "rough_shortbow",
    label: "Rough shortbow",
    tripoModelId: "ffb009a6-1005-4ddb-aaa4-c61cf06b42f3",
    runtimeUrl: "/assets/3d/weapons/bow/weapon-bow-short-starter-v001.glb",
    sourceOrigin: "handle center at local zero",
    sourceAxes: "limbs +Y/-Y, string -Z",
    collisionEnvelopeMeters: [0.48, 1.35, 0.1],
    drawn: { socket: "left-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [-0.16, 0.24, -0.2], rotationRadians: [0.18, 0.45, 0.2] },
  }),
  spec({
    id: "arrow",
    label: "Separate arrow",
    tripoModelId: "c3dd1796-872c-4c92-89fd-42ee7ac2745b",
    runtimeUrl: "/assets/3d/weapons/bow/weapon-arrow-starter-v001.glb",
    sourceOrigin: "shaft grip point at local zero",
    sourceAxes: "arrowhead +Y, fletching -Y",
    collisionEnvelopeMeters: [0.04, 0.78, 0.04],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [-0.18, 0.48, -0.2], rotationRadians: [0.08, 0, 0] },
  }),
  spec({
    id: "quiver",
    label: "Arrow quiver",
    tripoModelId: "0835a993-b483-4b03-a21a-5d15f2f443bc",
    runtimeUrl: "/assets/3d/weapons/bow/weapon-quiver-starter-v001.glb",
    sourceOrigin: "back mounting center at local zero",
    sourceAxes: "opening +Y, back contact +Z",
    collisionEnvelopeMeters: [0.24, 0.76, 0.2],
    drawn: { socket: "hips", positionMeters: [-0.2, 0.5, -0.17], rotationRadians: [0.08, 0, -0.18] },
    carried: { socket: "hips", positionMeters: [-0.2, 0.5, -0.17], rotationRadians: [0.08, 0, -0.18] },
  }),
  spec({
    id: "iron_shortsword",
    label: "Plain iron shortsword",
    tripoModelId: "561cf46d-c0c7-434c-b0ae-e49d8a986d4f",
    runtimeUrl: "/assets/3d/weapons/sword/weapon-sword-shortsword-starter-v001.glb",
    sourceOrigin: "grip center at local zero",
    sourceAxes: "guard +X, blade +Y, thickness -Z",
    collisionEnvelopeMeters: [0.2, 0.82, 0.07],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [0.24, -0.03, 0], rotationRadians: [0.08, -0.12, 2.15] },
  }),
  spec({
    id: "battered_shield",
    label: "Battered wooden shield",
    tripoModelId: "3afa7ddb-be71-4ed8-b1e5-987c819e84d8",
    runtimeUrl: "/assets/3d/weapons/shield/weapon-shield-wooden-starter-v001.glb",
    sourceOrigin: "inner grip center at local zero",
    sourceAxes: "face +Z, top +Y",
    collisionEnvelopeMeters: [0.66, 0.76, 0.13],
    drawn: { socket: "left-hand", positionMeters: [0, 0, 0.04], rotationRadians: [0, Math.PI / 2, 0] },
    carried: { socket: "hips", positionMeters: [0, 0.48, -0.2], rotationRadians: [0, 0, 0] },
  }),
  spec({
    id: "binding_rod",
    label: "Unadorned binding rod",
    tripoModelId: "05db3bff-0481-46e4-b368-74af66c3a2ab",
    runtimeUrl: "/assets/3d/weapons/rod/weapon-rod-binding-starter-v001.glb",
    sourceOrigin: "grip center at local zero",
    sourceAxes: "tip +Y, forward -Z",
    collisionEnvelopeMeters: [0.1, 0.65, 0.1],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [0.23, -0.02, 0.02], rotationRadians: [0.08, 0, 2.45] },
  }),
  spec({
    id: "ritual_knife",
    label: "Plain ritual knife",
    tripoModelId: "00fac652-fc7e-46a9-9a5d-e56a6a6cf00a",
    runtimeUrl: "/assets/3d/weapons/knife/weapon-knife-ritual-starter-v001.glb",
    sourceOrigin: "grip center at local zero",
    sourceAxes: "blade +Y, edge +X",
    collisionEnvelopeMeters: [0.13, 0.38, 0.05],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [0.18, -0.08, 0.04], rotationRadians: [0, 0, 2.25] },
  }),
  spec({
    id: "worn_dagger",
    label: "Worn dagger (runtime-paired source)",
    tripoModelId: "f634644b-c50c-453e-bc84-7af8101fad43",
    runtimeUrl: "/assets/3d/weapons/dagger/weapon-dagger-worn-starter-v001.glb",
    sourceOrigin: "grip center at local zero",
    sourceAxes: "blade +Y, edge +X",
    collisionEnvelopeMeters: [0.14, 0.43, 0.06],
    drawn: { socket: "right-hand", positionMeters: [0, 0, 0], rotationRadians: [0, 0, 0] },
    carried: { socket: "hips", positionMeters: [0.2, -0.08, 0.04], rotationRadians: [0, 0, 2.2] },
  }),
] as const;

export function humanPilotWeaponFitSpec(id: HumanPilotWeaponId): HumanPilotWeaponFitSpec {
  const found = HUMAN_PILOT_WEAPON_FIT_SPECS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown Human Pilot weapon ${id}.`);
  return found;
}

export function resolveHumanPilotWeaponBone(
  model: THREE.Object3D,
  socket: HumanPilotWeaponSocket,
): THREE.Object3D | undefined {
  const candidates = socket === "right-hand"
    ? ["mixamorig:RightHand", "mixamorigRightHand", "hand_r"]
    : socket === "left-hand"
      ? ["mixamorig:LeftHand", "mixamorigLeftHand", "hand_l"]
      : ["mixamorig:Hips", "mixamorigHips", "pelvis", "spine_01"];
  return candidates.map((name) => model.getObjectByName(name)).find(Boolean);
}

export interface HumanPilotWeaponAttachment {
  root: THREE.Group;
  socketBone: THREE.Object3D;
  visual: THREE.Object3D;
  spec: HumanPilotWeaponFitSpec;
  pose: HumanPilotWeaponPose;
}

/** Attaches a canonical-meter weapon without inheriting the Human height scale. */
export function attachHumanPilotWeapon(
  model: THREE.Object3D,
  actorScale: number,
  source: THREE.Object3D,
  weapon: HumanPilotWeaponFitSpec,
  pose: HumanPilotWeaponPose,
): HumanPilotWeaponAttachment {
  if (!(actorScale > 0) || !Number.isFinite(actorScale)) {
    throw new Error(`Human Pilot actor scale must be finite and positive; received ${actorScale}.`);
  }
  const transform = weapon[pose];
  const socketBone = resolveHumanPilotWeaponBone(model, transform.socket);
  if (!socketBone) throw new Error(`${weapon.id} cannot resolve ${transform.socket} on the Human Pilot rig.`);

  const root = new THREE.Group();
  root.name = `human-pilot-${weapon.id}-${pose}-scale-compensation`;
  root.scale.setScalar(1 / actorScale);
  root.userData.weaponId = weapon.id;
  root.userData.pose = pose;
  root.userData.tripoModelId = weapon.tripoModelId;
  root.userData.collisionEnvelopeMeters = [...weapon.collisionEnvelopeMeters];
  root.userData.sourceOrigin = weapon.sourceOrigin;
  root.userData.sourceAxes = weapon.sourceAxes;

  const offset = new THREE.Group();
  offset.name = `human-pilot-${weapon.id}-${pose}-offset`;
  offset.position.fromArray(transform.positionMeters);
  offset.rotation.set(...transform.rotationRadians);
  const visual = source.clone(true);
  visual.name = `human-pilot-${weapon.id}-${pose}-visual`;
  offset.add(visual);
  root.add(offset);
  socketBone.add(root);
  return { root, socketBone, visual, spec: weapon, pose };
}
