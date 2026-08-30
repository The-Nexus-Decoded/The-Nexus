import { Object3D, Quaternion, Vector3 } from "three";
import {
  advanceArcheryPhase,
  archeryRetrievalPhaseAt,
  beginArcheryAction,
  cancelArcheryAction,
  commitArcheryRelease,
  type ArcheryAction,
  type ArcheryActionState,
  type ArcheryArrowPhase,
} from "./archeryActions";
import type { ArcheryPresentation } from "./archeryPresentation";
import type { ArrowReleaseResult, QuiverInventoryState } from "./archeryInventory";
import {
  advanceArrowProjectile,
  createArrowProjectile,
  type ArrowProjectile,
  type ArrowProjectileStep,
  type ArrowProjectileTarget,
  type ProjectileVec3,
} from "./arrowProjectile";

const RETRIEVAL_PHASES: readonly ArcheryArrowPhase[] = [
  "stored",
  "reaching",
  "gripped",
  "extracted",
  "overhead",
  "forward-staged",
  "nocked",
];

interface RuntimeProjectile {
  simulation: ArrowProjectile;
  visual: Object3D;
}

export type ArcheryRuntimeProjectileEvent = NonNullable<ArrowProjectileStep["event"]> & {
  projectileId: string;
};

export interface ArcheryRuntimeRelease {
  release: ArrowReleaseResult;
  projectiles: readonly ArrowProjectile[];
}

function cloneActionState(state: ArcheryActionState | undefined): ArcheryActionState | undefined {
  return state ? { ...state } : undefined;
}

function orientProjectileVisual(visual: Object3D, projectile: ArrowProjectile): void {
  visual.position.set(...projectile.position);
  const direction = new Vector3(...projectile.tipDirection).normalize();
  visual.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction));
}

export class ArcheryRuntimeController {
  private actionState: ArcheryActionState | undefined;
  private readonly projectiles = new Map<string, RuntimeProjectile>();
  private projectileSequence = 0;

  public constructor(
    private readonly inventory: QuiverInventoryState,
    private readonly presentation: ArcheryPresentation,
  ) {
    presentation.sync(inventory);
  }

  public begin(action: ArcheryAction): ArcheryActionState {
    if (this.actionState && !["stored", "recovered"].includes(this.actionState.phase)) {
      throw new Error(`Cannot begin ${action} while ${this.actionState.phase} is active.`);
    }
    this.actionState = beginArcheryAction(this.inventory, action);
    this.presentation.sync(this.inventory, this.actionState);
    return { ...this.actionState };
  }

  public setRetrievalTime(normalizedTime: number): ArcheryActionState {
    if (!this.actionState) throw new Error("Cannot scrub retrieval before beginning an archery action.");
    const currentIndex = RETRIEVAL_PHASES.indexOf(this.actionState.phase);
    if (currentIndex < 0) throw new Error(`Cannot scrub retrieval while ${this.actionState.phase} is active.`);
    const targetPhase = archeryRetrievalPhaseAt(normalizedTime);
    const targetIndex = RETRIEVAL_PHASES.indexOf(targetPhase);
    if (targetIndex < currentIndex) throw new Error("Archery retrieval time cannot move backward during an active action.");
    for (let index = currentIndex + 1; index <= targetIndex; index += 1) {
      this.actionState = advanceArcheryPhase(this.actionState, RETRIEVAL_PHASES[index]!);
    }
    this.presentation.sync(this.inventory, this.actionState);
    return { ...this.actionState };
  }

  public draw(): ArcheryActionState {
    if (!this.actionState || this.actionState.phase !== "nocked") {
      throw new Error("The arrow must be nocked before drawing the bow string.");
    }
    this.actionState = advanceArcheryPhase(this.actionState, "drawn");
    this.presentation.sync(this.inventory, this.actionState);
    return { ...this.actionState };
  }

  public release(origin: ProjectileVec3, targetPoints: readonly ProjectileVec3[]): ArcheryRuntimeRelease {
    if (!this.actionState || this.actionState.phase !== "drawn") {
      throw new Error("The bow must be at full draw before release.");
    }
    if (targetPoints.length !== this.actionState.heldArrowCount) {
      throw new Error(`Expected ${this.actionState.heldArrowCount} projectile target point(s), received ${targetPoints.length}.`);
    }
    const pending = targetPoints.map((target) => {
      const id = `arrow-${++this.projectileSequence}`;
      return createArrowProjectile({ id, arrowType: this.actionState!.arrowType, origin, target });
    });
    const committed = commitArcheryRelease(this.inventory, this.actionState);
    this.actionState = committed.state;
    if (!committed.release.released) {
      this.presentation.sync(this.inventory, this.actionState);
      return { release: committed.release, projectiles: [] };
    }
    for (const projectile of pending) {
      const visual = this.presentation.spawnProjectile(projectile.arrowType, projectile.id);
      orientProjectileVisual(visual, projectile);
      this.projectiles.set(projectile.id, { simulation: projectile, visual });
    }
    this.actionState = advanceArcheryPhase(this.actionState, "projectile");
    this.presentation.sync(this.inventory, this.actionState);
    return { release: committed.release, projectiles: pending.map((projectile) => structuredClone(projectile)) };
  }

  public step(
    deltaSeconds: number,
    targets: readonly ArrowProjectileTarget[] = [],
  ): readonly ArcheryRuntimeProjectileEvent[] {
    const events: ArcheryRuntimeProjectileEvent[] = [];
    for (const [id, runtime] of this.projectiles) {
      const result = advanceArrowProjectile(runtime.simulation, deltaSeconds, targets);
      runtime.simulation = result.projectile;
      orientProjectileVisual(runtime.visual, result.projectile);
      if (!result.event) continue;
      events.push({ ...result.event, projectileId: id });
      runtime.visual.removeFromParent();
      this.projectiles.delete(id);
    }
    if (this.projectiles.size === 0 && this.actionState?.phase === "projectile") {
      this.actionState = advanceArcheryPhase(this.actionState, "recovered");
      this.presentation.sync(this.inventory, this.actionState);
    }
    return events;
  }

  public cancel(): ArcheryActionState {
    if (!this.actionState) throw new Error("No archery action is active.");
    this.actionState = cancelArcheryAction(this.actionState);
    this.presentation.sync(this.inventory, this.actionState);
    return { ...this.actionState };
  }

  public state(): ArcheryActionState | undefined {
    return cloneActionState(this.actionState);
  }

  public activeProjectiles(): readonly ArrowProjectile[] {
    return [...this.projectiles.values()].map(({ simulation }) => structuredClone(simulation));
  }
}
