import { BufferGeometry, Group, Line, LineBasicMaterial, MathUtils, Object3D, Vector3 } from "three";
import { displayedQuiverCount, type ArcheryActionState } from "./archeryActions";
import { ARROW_TYPES, type ArrowType, type QuiverInventoryState } from "./archeryInventory";

export interface ArcheryPresentationAssets {
  bow: Object3D;
  quiver: Object3D;
  harness: Object3D;
  arrows: Readonly<Record<ArrowType, Object3D>>;
}

export interface ArcheryPresentationRoots {
  bowHand: Object3D;
  bowBack: Object3D;
  quiverBack: Object3D;
  harnessTorso: Object3D;
  arrowHand: Object3D;
  projectileWorld: Object3D;
}

export interface ArcheryPresentationCallbacks {
  applyBowStringDraw(draw: number): void;
}

function removeChildren(root: Object3D): void {
  while (root.children.length > 0) root.remove(root.children[0]!);
}

function cloneAsset(asset: Object3D, role: string): Object3D {
  const clone = asset.clone(true);
  clone.name = role;
  return clone;
}

function visibleArrowCounts(inventory: QuiverInventoryState, state?: ArcheryActionState): Record<ArrowType, number> {
  const counts = { ...inventory.arrows };
  const visibleTotal = displayedQuiverCount(inventory, state);
  const difference = Object.values(counts).reduce((total, count) => total + count, 0) - visibleTotal;
  if (state && difference > 0) counts[state.arrowType] = Math.max(0, counts[state.arrowType] - difference);
  return counts;
}

function positionArrowInQuiver(arrow: Object3D, index: number, total: number): void {
  const normalized = total <= 1 ? 0 : index / (total - 1);
  const angle = index * 2.399963229728653;
  const radius = Math.sqrt(normalized) * 0.052;
  arrow.position.set(Math.cos(angle) * radius, -0.02 - (index % 4) * 0.004, Math.sin(angle) * radius);
  arrow.rotation.set(Math.PI, 0, 0);
}

export class ArcheryPresentation {
  public readonly root = new Group();
  private readonly bowVisual: Object3D;
  private readonly quiverVisual: Object3D;
  private readonly harnessVisual: Object3D;
  private readonly quiverArrows = new Group();
  private readonly handArrows = new Group();
  private readonly bowStringUpper: Line;
  private readonly bowStringLower: Line;
  private bowStringNockDepth = 0;
  private readonly assets: ArcheryPresentationAssets;
  private readonly roots: ArcheryPresentationRoots;
  private readonly callbacks: ArcheryPresentationCallbacks;

  public constructor(
    assets: ArcheryPresentationAssets,
    roots: ArcheryPresentationRoots,
    callbacks: ArcheryPresentationCallbacks,
  ) {
    this.assets = assets;
    this.roots = roots;
    this.callbacks = callbacks;
    this.root.name = "archery-presentation";
    this.quiverArrows.name = "quiver-arrow-instances";
    this.handArrows.name = "hand-arrow-instances";
    this.bowVisual = cloneAsset(assets.bow, "bow-visual");
    const stringMaterial = new LineBasicMaterial({ color: 0x5a3a22 });
    this.bowStringUpper = new Line(new BufferGeometry(), stringMaterial);
    this.bowStringLower = new Line(new BufferGeometry(), stringMaterial.clone());
    this.bowStringUpper.name = "bow-string-upper-dynamic";
    this.bowStringLower.name = "bow-string-lower-dynamic";
    this.bowVisual.add(this.bowStringUpper, this.bowStringLower);
    this.applyBowStringDraw(0);
    this.quiverVisual = cloneAsset(assets.quiver, "quiver-visual-empty");
    this.harnessVisual = cloneAsset(assets.harness, "quiver-harness-visual");
    roots.bowBack.add(this.bowVisual);
    roots.quiverBack.add(this.quiverVisual, this.quiverArrows);
    roots.harnessTorso.add(this.harnessVisual);
    roots.arrowHand.add(this.handArrows);
  }

  public setBowCarryState(state: "hand" | "back"): void {
    const target = state === "hand" ? this.roots.bowHand : this.roots.bowBack;
    target.add(this.bowVisual);
  }

  public sync(inventory: QuiverInventoryState, state?: ArcheryActionState): void {
    removeChildren(this.quiverArrows);
    removeChildren(this.handArrows);
    const counts = visibleArrowCounts(inventory, state);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    let index = 0;
    for (const type of ARROW_TYPES) {
      for (let count = 0; count < counts[type]; count += 1) {
        const arrow = cloneAsset(this.assets.arrows[type], `quiver-arrow-${type}-${index}`);
        positionArrowInQuiver(arrow, index, total);
        this.quiverArrows.add(arrow);
        index += 1;
      }
    }
    const showInHand = state
      && ["gripped", "extracted", "overhead", "forward-staged", "nocked", "drawn"].includes(state.phase);
    if (showInHand) {
      for (let held = 0; held < state.heldArrowCount; held += 1) {
        const arrow = cloneAsset(this.assets.arrows[state.arrowType], `hand-arrow-${state.arrowType}-${held}`);
        arrow.position.x = (held - (state.heldArrowCount - 1) / 2) * 0.012;
        this.handArrows.add(arrow);
      }
    }
    this.applyBowStringDraw(state?.stringDraw ?? 0);
  }

  public spawnProjectile(type: ArrowType, id: string): Object3D {
    const projectile = cloneAsset(this.assets.arrows[type], `projectile-arrow-${id}`);
    this.roots.projectileWorld.add(projectile);
    return projectile;
  }

  public quiverArrowInstanceCount(): number {
    return this.quiverArrows.children.length;
  }

  public handArrowInstanceCount(): number {
    return this.handArrows.children.length;
  }

  public bowStringNockDepthMeters(): number {
    return this.bowStringNockDepth;
  }

  private applyBowStringDraw(draw: number): void {
    const normalizedDraw = MathUtils.clamp(draw, 0, 1);
    this.bowStringNockDepth = normalizedDraw * 0.48;
    const nock = new Vector3(0, 0, -this.bowStringNockDepth);
    this.bowStringUpper.geometry.setFromPoints([new Vector3(0, 0.59, 0), nock]);
    this.bowStringLower.geometry.setFromPoints([nock, new Vector3(0, -0.59, 0)]);
    this.callbacks.applyBowStringDraw(normalizedDraw);
  }
}
