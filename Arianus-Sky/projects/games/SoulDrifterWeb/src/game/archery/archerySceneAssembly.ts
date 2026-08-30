import { Box3, Group, Object3D, Vector3 } from "three";
import {
  ARCHERY_ASSET_MANIFEST_PATH,
  ARCHERY_BOW_ASSET_PATH,
  CANONICAL_BOW_LENGTH_METERS,
} from "./archeryAssetContract";
import {
  loadValidatedArcheryAssets,
  parseArcheryAssetManifest,
  type ArcheryAssetLoad,
} from "./archeryAssetLoader";
import type { QuiverInventoryState } from "./archeryInventory";
import {
  ArcheryPresentation,
  type ArcheryPresentationAssets,
  type ArcheryPresentationRoots,
} from "./archeryPresentation";
import { ArcheryRuntimeController } from "./archeryRuntime";

type Vec3 = readonly [number, number, number];

interface SocketFit {
  position: Vec3;
  rotation: Vec3;
  scale?: number;
}

const BOW_HAND_FIT: SocketFit = {
  position: [0, 0, 0],
  rotation: [0, 0, Math.PI / 2],
};
const BOW_BACK_FIT: SocketFit = {
  position: [0.14, -0.04, -0.14],
  rotation: [0.08, Math.PI, -0.62],
};
const QUIVER_BACK_FIT: SocketFit = {
  position: [-0.165, -0.075, -0.165],
  rotation: [0.05, Math.PI, -0.28],
};
const HARNESS_TORSO_FIT: SocketFit = {
  position: [-0.14, -0.24, 0.05],
  rotation: [0, Math.PI, -0.55],
  scale: 0.82,
};
const ARROW_HAND_FIT: SocketFit = {
  position: [0, 0.04, 0],
  rotation: [0, 0, 0],
};

export interface ArcherySceneAssembly {
  readonly roots: ArcheryPresentationRoots;
  readonly presentation: ArcheryPresentation;
  readonly runtime: ArcheryRuntimeController;
  setBowCarryState(state: "hand" | "back"): void;
  dispose(): void;
}

export interface CreateArcherySceneAssemblyOptions {
  model: Object3D;
  projectileWorld: Object3D;
  actorScale: number;
  inventory: QuiverInventoryState;
  assets: ArcheryPresentationAssets;
  applyBowStringDraw(draw: number): void;
}

export interface LoadArcherySceneAssetsOptions {
  loadAsset: ArcheryAssetLoad;
  loadManifest(path: string): Promise<unknown>;
}

function normalizedBoneName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function requiredBone(model: Object3D, role: "LeftHand" | "RightHand" | "Spine2"): Object3D {
  const suffix = role.toLowerCase();
  let match: Object3D | undefined;
  model.traverse((object) => {
    if (match) return;
    const candidate = normalizedBoneName(object.name);
    if (candidate === suffix || candidate.endsWith(suffix)) match = object;
  });
  if (!match) throw new Error(`Human archery assembly requires the ${role} rig bone.`);
  return match;
}

function createSocket(parent: Object3D, name: string, fit: SocketFit, actorScale: number): Group {
  if (!Number.isFinite(actorScale) || actorScale <= 0) throw new Error("Archery actor scale must be positive.");
  const socket = new Group();
  socket.name = name;
  socket.position.set(...fit.position).multiplyScalar(1 / actorScale);
  socket.rotation.set(...fit.rotation);
  socket.scale.setScalar((fit.scale ?? 1) / actorScale);
  parent.add(socket);
  return socket;
}

function normalizeBow(source: Object3D): Object3D {
  const visual = source.clone(true);
  visual.updateMatrixWorld(true);
  const sourceBounds = new Box3().setFromObject(visual, true);
  const sourceLength = sourceBounds.getSize(new Vector3()).y;
  if (!Number.isFinite(sourceLength) || sourceLength <= 0) throw new Error("Shortbow asset has no measurable Y-axis length.");
  visual.scale.multiplyScalar(CANONICAL_BOW_LENGTH_METERS / sourceLength);
  visual.updateMatrixWorld(true);
  const normalizedBounds = new Box3().setFromObject(visual, true);
  const center = normalizedBounds.getCenter(new Vector3());
  visual.position.sub(center);
  visual.updateMatrixWorld(true);
  const root = new Group();
  root.name = "shortbow-canonical-1.18m";
  root.add(visual);
  return root;
}

export async function loadArcherySceneAssets(
  options: LoadArcherySceneAssetsOptions,
): Promise<ArcheryPresentationAssets> {
  const [manifestDocument, bowSource] = await Promise.all([
    options.loadManifest(ARCHERY_ASSET_MANIFEST_PATH),
    options.loadAsset(ARCHERY_BOW_ASSET_PATH),
  ]);
  const manifest = parseArcheryAssetManifest(manifestDocument);
  return loadValidatedArcheryAssets(options.loadAsset, manifest, normalizeBow(bowSource));
}

export function createArcherySceneAssembly(
  options: CreateArcherySceneAssemblyOptions,
): ArcherySceneAssembly {
  const leftHand = requiredBone(options.model, "LeftHand");
  const rightHand = requiredBone(options.model, "RightHand");
  const spine = requiredBone(options.model, "Spine2");
  const roots: ArcheryPresentationRoots = {
    bowHand: createSocket(leftHand, "archery-bow-hand", BOW_HAND_FIT, options.actorScale),
    bowBack: createSocket(spine, "archery-bow-back", BOW_BACK_FIT, options.actorScale),
    quiverBack: createSocket(spine, "archery-quiver-back", QUIVER_BACK_FIT, options.actorScale),
    harnessTorso: createSocket(spine, "archery-harness-torso", HARNESS_TORSO_FIT, options.actorScale),
    arrowHand: createSocket(rightHand, "archery-arrow-hand", ARROW_HAND_FIT, options.actorScale),
    projectileWorld: options.projectileWorld,
  };
  const presentation = new ArcheryPresentation(options.assets, roots, {
    applyBowStringDraw: options.applyBowStringDraw,
  });
  presentation.setBowCarryState("back");
  const runtime = new ArcheryRuntimeController(options.inventory, presentation);
  return {
    roots,
    presentation,
    runtime,
    setBowCarryState: (state) => presentation.setBowCarryState(state),
    dispose: () => {
      roots.bowHand.removeFromParent();
      roots.bowBack.removeFromParent();
      roots.quiverBack.removeFromParent();
      roots.harnessTorso.removeFromParent();
      roots.arrowHand.removeFromParent();
    },
  };
}
