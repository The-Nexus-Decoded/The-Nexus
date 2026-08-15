import type { ActorId, ActorState, CombatStyle, RuntimeState } from "./types";

export class CombatEngine {
  public state: RuntimeState = "exploration";
  public style: CombatStyle = "turn-based";
  public readonly actors: Record<ActorId, ActorState>;
  private readonly turnOrder: ActorId[] = ["player", "sentinel"];
  private turnIndex = 0;

  public constructor(player: ActorState, sentinel: ActorState) {
    this.actors = { player, sentinel };
  }

  public begin(style: CombatStyle): void {
    this.style = style;
    this.turnIndex = 0;
    this.state = style === "turn-based" ? "orders" : "resolution";
  }

  public get currentActor(): ActorId {
    return this.turnOrder[this.turnIndex] ?? "player";
  }

  public beginResolution(): void {
    if (this.state === "victory" || this.state === "defeat") return;
    this.state = "resolution";
  }

  public endTurn(): ActorId {
    if (this.style === "real-time") {
      this.state = "resolution";
      return "player";
    }

    do {
      this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
    } while (!this.actors[this.currentActor].alive);
    this.actors[this.currentActor].guard = false;
    this.state = "orders";
    return this.currentActor;
  }

  public damage(target: ActorId, amount: number): number {
    const actor = this.actors[target];
    const resolved = actor.guard ? Math.max(1, Math.ceil(amount * 0.45)) : amount;
    actor.hp = Math.max(0, actor.hp - resolved);
    if (actor.hp === 0) {
      actor.alive = false;
      this.state = target === "sentinel" ? "victory" : "defeat";
    }
    return resolved;
  }

  public setGuard(actorId: ActorId, enabled: boolean): void {
    this.actors[actorId].guard = enabled;
  }
}
