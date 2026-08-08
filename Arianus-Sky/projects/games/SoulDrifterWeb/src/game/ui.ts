import type { CombatStyle, RuntimeState } from "./types";

export type ActionName = "move" | "rune-slash" | "guard" | "wait";

interface StatSnapshot {
  hp: number;
  stability: number;
  fury: number;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required UI element #${id}`);
  return element as T;
}

export class GameUI {
  private readonly message = requiredElement<HTMLParagraphElement>("message-text");
  private readonly mode = requiredElement<HTMLSpanElement>("mode-indicator");
  private readonly objective = requiredElement<HTMLParagraphElement>("objective-text");
  private readonly hp = requiredElement<HTMLSpanElement>("hp-value");
  private readonly stability = requiredElement<HTMLSpanElement>("stability-value");
  private readonly fury = requiredElement<HTMLSpanElement>("fury-value");
  private readonly inventory = requiredElement<HTMLUListElement>("inventory-list");
  private readonly inventoryCount = requiredElement<HTMLSpanElement>("inventory-count");
  private readonly eventLog = requiredElement<HTMLOListElement>("event-log");
  private readonly combatControls = requiredElement<HTMLDivElement>("combat-controls");
  private readonly combatStyle = requiredElement<HTMLSelectElement>("combat-style");
  private readonly speedToggle = requiredElement<HTMLButtonElement>("speed-toggle");
  private readonly speedValue = requiredElement<HTMLElement>("speed-value");
  private readonly reactionPrompt = requiredElement<HTMLDivElement>("reaction-prompt");
  private readonly reactionTitle = requiredElement<HTMLElement>("reaction-title");
  private readonly reactionDetail = requiredElement<HTMLElement>("reaction-detail");
  private readonly reactionFill = requiredElement<HTMLElement>("reaction-fill");
  private actionHandler: ((action: ActionName) => void) | null = null;
  private speedHandler: ((speed: number) => void) | null = null;
  private combatSpeed = 1;

  public constructor() {
    this.combatControls.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action as ActionName | undefined;
        if (action) this.actionHandler?.(action);
      });
    });

    this.speedToggle.addEventListener("click", () => {
      this.combatSpeed = this.combatSpeed === 1 ? 2 : 1;
      this.speedValue.textContent = `${this.combatSpeed}×`;
      this.speedHandler?.(this.combatSpeed);
    });
  }

  public onAction(handler: (action: ActionName) => void): void {
    this.actionHandler = handler;
  }

  public onSpeedChange(handler: (speed: number) => void): void {
    this.speedHandler = handler;
  }

  public selectedCombatStyle(): CombatStyle {
    return this.combatStyle.value === "real-time" ? "real-time" : "turn-based";
  }

  public lockCombatStyle(locked: boolean): void {
    this.combatStyle.disabled = locked;
  }

  public setMessage(text: string): void {
    this.message.textContent = text;
  }

  public setObjective(text: string): void {
    this.objective.textContent = text;
  }

  public setMode(state: RuntimeState, style?: CombatStyle): void {
    const labels: Record<RuntimeState, string> = {
      exploration: "EXPLORATION",
      orders: "YOUR TURN",
      resolution: style === "real-time" ? "REAL-TIME COMBAT" : "RESOLVING",
      victory: "VICTORY",
      defeat: "SOUL FRACTURED",
    };
    this.mode.textContent = labels[state];
  }

  public setStats(snapshot: StatSnapshot): void {
    this.hp.textContent = String(snapshot.hp);
    this.stability.textContent = String(snapshot.stability);
    this.fury.textContent = String(snapshot.fury);
  }

  public setInventory(items: string[]): void {
    this.inventory.replaceChildren();
    this.inventoryCount.textContent = `${items.length} / 8`;
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "inventory-empty";
      empty.textContent = "Nothing carried";
      this.inventory.append(empty);
      return;
    }

    for (const item of items) {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      this.inventory.append(listItem);
    }
  }

  public addLog(text: string): void {
    const item = document.createElement("li");
    item.textContent = text;
    this.eventLog.prepend(item);
    while (this.eventLog.children.length > 7) {
      this.eventLog.lastElementChild?.remove();
    }
  }

  public showCombatControls(visible: boolean): void {
    this.combatControls.hidden = !visible;
  }

  public setActionEnabled(action: ActionName, enabled: boolean): void {
    const button = this.combatControls.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);
    if (button) button.disabled = !enabled;
  }

  public async requestReaction(
    title: string,
    detail: string,
    durationMs: number,
  ): Promise<boolean> {
    this.reactionTitle.textContent = title;
    this.reactionDetail.textContent = detail;
    this.reactionFill.style.transition = "none";
    this.reactionFill.style.width = "100%";
    this.reactionPrompt.hidden = false;

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    this.reactionFill.style.transition = `width ${durationMs}ms linear`;
    this.reactionFill.style.width = "0%";

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (success: boolean): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        window.removeEventListener("keydown", onKeyDown);
        this.reactionPrompt.removeEventListener("pointerdown", onPointerDown);
        this.reactionPrompt.hidden = true;
        resolve(success);
      };
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.code === "Space") {
          event.preventDefault();
          finish(true);
        }
      };
      const onPointerDown = (): void => finish(true);
      const timeout = window.setTimeout(() => finish(false), durationMs);

      window.addEventListener("keydown", onKeyDown);
      this.reactionPrompt.addEventListener("pointerdown", onPointerDown, { once: true });
    });
  }
}
