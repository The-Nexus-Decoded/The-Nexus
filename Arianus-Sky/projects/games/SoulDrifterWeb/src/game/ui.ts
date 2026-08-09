import type { CombatStyle, RuntimeState } from "./types";
import { STAT_KEYS, STAT_LABELS, callingById, raceById, type CharacterProfile, type Stats } from "./character";
import {
  backpackItems,
  backpackSlotsUsed,
  equippedItem,
  totalBackpackSlots,
  type BackpackCapacity,
  type EquipmentSlot,
  type InventoryItem,
} from "./equipment";
import type { DialogueChoice, DialogueScene } from "./npc";
import { prologuePages } from "./prologue";
import { callingPerkOptions, type ImprintOption, type StarterImprintSelection } from "./tutorialChoices";
import { resolveCharacterIdentity } from "./avatarIdentity";
import type { LocomotionPreference } from "./avatarMotionController";

export type ActionName = "move" | "basic" | "signature" | "guard" | "wait";

export function nextHudDrawer(current: string | null, requested: string): string | null {
  return current === requested ? null : requested;
}

interface StatSnapshot {
  hp: number;
  stability: number;
  fury: number;
}

export interface BuffSnapshot {
  id: string;
  icon: string;
  label: string;
  stacks?: number;
  duration: string;
  help: string;
  tone?: "buff" | "debuff";
}

export interface InteractionPromptSnapshot {
  label: string;
  detail: string;
  disabledReason?: string;
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
  private readonly paperPack = requiredElement<HTMLUListElement>("paper-pack-list");
  private readonly paperPackCount = requiredElement<HTMLSpanElement>("paper-pack-count");
  private readonly equipmentPanel = requiredElement<HTMLElement>("equipment-panel");
  private readonly buffStrip = requiredElement<HTMLElement>("buff-strip");
  private readonly interactionPrompt = requiredElement<HTMLElement>("interaction-prompt");
  private readonly interactionConfirm = requiredElement<HTMLButtonElement>("interaction-confirm");
  private readonly locomotionPreference = requiredElement<HTMLElement>("locomotion-preference");
  private readonly eventLog = requiredElement<HTMLOListElement>("event-log");
  private readonly combatControls = requiredElement<HTMLDivElement>("combat-controls");
  private readonly imprintSkillAction = requiredElement<HTMLButtonElement>("imprint-skill-action");
  private readonly combatStyle = requiredElement<HTMLSelectElement>("combat-style");
  private readonly speedToggle = requiredElement<HTMLButtonElement>("speed-toggle");
  private readonly speedValue = requiredElement<HTMLElement>("speed-value");
  private readonly voiceToggle = requiredElement<HTMLButtonElement>("voice-toggle");
  private readonly reactionPrompt = requiredElement<HTMLDivElement>("reaction-prompt");
  private readonly reactionTitle = requiredElement<HTMLElement>("reaction-title");
  private readonly reactionDetail = requiredElement<HTMLElement>("reaction-detail");
  private readonly reactionFill = requiredElement<HTMLElement>("reaction-fill");
  private readonly mechanicTooltip = requiredElement<HTMLDivElement>("mechanic-tooltip");
  private actionHandler: ((action: ActionName) => void) | null = null;
  private speedHandler: ((speed: number) => void) | null = null;
  private combatStyleHandler: ((style: CombatStyle) => void) | null = null;
  private equipmentHandler: ((itemId: string) => void) | null = null;
  private equipmentVisibilityHandler: ((visible: boolean) => void) | null = null;
  private locomotionPreferenceHandler: ((preference: LocomotionPreference) => void) | null = null;
  private interactionConfirmHandler: (() => void) | null = null;
  private activeReactionCancel: (() => void) | null = null;
  private currentCallingId = "";
  private combatSpeed = 1;
  private dialogueVisible = false;
  private imprintVisible = false;
  private equipmentVisible = false;
  private storybookVisible = false;
  private storybookCloseHandler: (() => void) | null = null;
  private voiceEnabled = true;
  private locomotionMode: LocomotionPreference = this.savedLocomotionPreference();
  private currentProfile: CharacterProfile | null = null;

  private setScreenHudInert(inert: boolean): void {
    const screenHud = document.querySelector<HTMLElement>(".screen-hud-layer");
    if (!screenHud) return;
    screenHud.inert = inert;
    screenHud.classList.toggle("is-modal-obscured", inert);
  }

  public constructor() {
    this.setLocomotionPreference(this.locomotionMode, false);
    this.imprintSkillAction.addEventListener("click", () => {
      const name = requiredElement<HTMLElement>("imprint-skill-name").textContent || "This class discipline";
      this.setMessage(`${name} is sealed into this character. Its dedicated active effect is a visible POC placeholder until the class skill pass.`);
    });
    this.locomotionPreference.querySelectorAll<HTMLButtonElement>("button[data-locomotion-preference]").forEach((button) => {
      button.addEventListener("click", () => {
        const preference = button.dataset.locomotionPreference as LocomotionPreference | undefined;
        if (preference) this.setLocomotionPreference(preference);
      });
    });

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

    this.combatStyle.addEventListener("change", () => {
      this.combatStyleHandler?.(this.selectedCombatStyle());
    });

    this.voiceToggle.addEventListener("click", () => {
      this.voiceEnabled = !this.voiceEnabled;
      this.voiceToggle.textContent = `Voice-over: ${this.voiceEnabled ? "on" : "off"}`;
      this.voiceToggle.setAttribute("aria-pressed", String(this.voiceEnabled));
      if (!this.voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    });

    const openEquipment = (): void => this.showEquipment(true);
    requiredElement<HTMLButtonElement>("equipment-toggle").addEventListener("click", openEquipment);
    requiredElement<HTMLButtonElement>("equipment-toggle-mobile").addEventListener("click", openEquipment);
    requiredElement<HTMLButtonElement>("equipment-close").addEventListener("click", () => this.showEquipment(false));
    this.interactionConfirm.addEventListener("click", () => this.interactionConfirmHandler?.());
    document.querySelectorAll<HTMLButtonElement>("[data-hud-drawer]").forEach((button) => {
      button.addEventListener("click", () => {
        const requested = button.dataset.hudDrawer;
        if (!requested) return;
        const current = document.querySelector<HTMLElement>(".hud-drawer.is-open")?.id.replace("hud-drawer-", "") ?? null;
        const next = nextHudDrawer(current, requested);
        document.querySelectorAll<HTMLElement>(".hud-drawer.is-open").forEach((item) => item.classList.remove("is-open"));
        document.querySelectorAll<HTMLButtonElement>("[data-hud-drawer]").forEach((item) => item.setAttribute("aria-expanded", "false"));
        if (!next) return;
        requiredElement<HTMLElement>(`hud-drawer-${next}`).classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      });
    });
    requiredElement<HTMLButtonElement>("appearance-edit").addEventListener("click", () => {
      if (!this.currentProfile) return;
      window.dispatchEvent(new CustomEvent("souldrifter:edit-appearance", { detail: { profile: this.currentProfile } }));
    });
    this.equipmentPanel.addEventListener("click", (event) => {
      const control = (event.target as HTMLElement).closest<HTMLElement>("[data-equipment-item]");
      if (control?.dataset.equipmentItem) this.equipmentHandler?.(control.dataset.equipmentItem);
    });
    this.equipmentPanel.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const control = (event.target as HTMLElement).closest<HTMLElement>("[data-equipment-item]");
      if (!control?.dataset.equipmentItem) return;
      event.preventDefault();
      this.equipmentHandler?.(control.dataset.equipmentItem);
    });

    document.querySelectorAll<HTMLElement>("[data-mechanic]").forEach((element) => {
      element.setAttribute("aria-describedby", "mechanic-tooltip");
      element.addEventListener("pointerenter", () => this.showMechanicTooltip(element));
      element.addEventListener("pointerleave", () => this.hideMechanicTooltip());
      element.addEventListener("focus", () => this.showMechanicTooltip(element));
      element.addEventListener("blur", () => this.hideMechanicTooltip());
      element.addEventListener("click", () => {
        this.showMechanicTooltip(element);
        window.setTimeout(() => this.hideMechanicTooltip(), 4200);
      });
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.hideMechanicTooltip();
        if (this.storybookVisible) this.storybookCloseHandler?.();
        else if (this.equipmentVisible) this.showEquipment(false);
      } else if (event.key.toLowerCase() === "i" && !(event.target as HTMLElement | null)?.matches("input, textarea, select")) {
        this.showEquipment(!this.equipmentVisible);
      }
    });
  }

  public onAction(handler: (action: ActionName) => void): void {
    this.actionHandler = handler;
  }

  public onSpeedChange(handler: (speed: number) => void): void {
    this.speedHandler = handler;
  }

  public onCombatStyleChange(handler: (style: CombatStyle) => void): void {
    this.combatStyleHandler = handler;
  }

  public onEquipmentToggle(handler: (itemId: string) => void): void {
    this.equipmentHandler = handler;
  }

  public onEquipmentVisibilityChange(handler: (visible: boolean) => void): void {
    this.equipmentVisibilityHandler = handler;
  }

  public onLocomotionPreferenceChange(handler: (preference: LocomotionPreference) => void): void {
    this.locomotionPreferenceHandler = handler;
    handler(this.locomotionMode);
  }

  public onInteractionConfirm(handler: () => void): void {
    this.interactionConfirmHandler = handler;
  }

  public setCharacter(profile: CharacterProfile): void {
    this.currentProfile = profile;
    const identity = resolveCharacterIdentity(profile);
    const calling = callingById(identity.callingId);
    const race = raceById(identity.raceId);
    this.currentCallingId = calling.id;
    requiredElement<HTMLElement>("character-name").textContent = profile.name;
    requiredElement<HTMLElement>("race-name").textContent = identity.raceName;
    requiredElement<HTMLElement>("calling-name").textContent = identity.callingName;
    requiredElement<HTMLElement>("portrait-rune").textContent = identity.raceGlyph;
    requiredElement<HTMLImageElement>("portrait-image").src = `/assets/generated/characters/${identity.raceId}-${identity.callingId}.png`;
    requiredElement<HTMLElement>("paper-identity").textContent = `${identity.raceName} · ${identity.callingName}`;
    const paperStats = requiredElement<HTMLElement>("paper-stats");
    paperStats.replaceChildren(...STAT_KEYS.map((key) => {
      const stat = document.createElement("span");
      stat.innerHTML = `<small>${STAT_LABELS[key]}</small><strong>${profile.stats[key]}</strong>`;
      return stat;
    }));
    const paperTraits = requiredElement<HTMLElement>("paper-traits");
    const traits = [
      race.talent,
      profile.ancestryCallingBonus?.name,
      profile.starterImprint?.raceBoonName,
      profile.starterImprint?.callingPerkName,
    ].filter((trait): trait is string => Boolean(trait));
    paperTraits.replaceChildren(...traits.map((trait) => {
      const badge = document.createElement("span");
      badge.textContent = trait;
      return badge;
    }));
    const callingPerk = profile.starterImprint
      ? callingPerkOptions(profile.callingId).find((option) => option.id === profile.starterImprint?.callingPerkId)
      : undefined;
    this.imprintSkillAction.hidden = !callingPerk;
    this.combatControls.classList.toggle("has-imprint-skill", Boolean(callingPerk));
    if (callingPerk) {
      requiredElement<HTMLElement>("imprint-skill-name").textContent = callingPerk.name;
      const help = `${callingPerk.description} This class-discipline action is displayed now as a POC skill-awakening placeholder; its authored combat effect is pending.`;
      this.imprintSkillAction.dataset.mechanicHelp = help;
      this.imprintSkillAction.title = help;
      this.imprintSkillAction.setAttribute("aria-label", `${callingPerk.name}, skill awakening placeholder. ${callingPerk.description}`);
    }
    requiredElement<HTMLElement>("hp-max").textContent = String(profile.maxHp);
    requiredElement<HTMLElement>("resource-label").textContent = calling.resourceName;
    const resourceStat = requiredElement<HTMLElement>("resource-stat");
    const basicAction = requiredElement<HTMLElement>("basic-action");
    const signatureAction = requiredElement<HTMLElement>("signature-action");
    const defenseAction = requiredElement<HTMLElement>("defense-action");
    signatureAction.querySelector("b")!.textContent = calling.signatureSkill;
    defenseAction.querySelector("b")!.textContent = calling.defensiveSkill;
    requiredElement<HTMLImageElement>("signature-icon").src = `/assets/generated/action-icons/${calling.id}-signature.png`;
    requiredElement<HTMLImageElement>("defense-icon").src = `/assets/generated/action-icons/${calling.id}-defense.png`;
    requiredElement<HTMLElement>("recover-action").querySelector("small")!.textContent = "2 recovery bands";
    basicAction.dataset.mechanicHelp = "Weapon Strike is a one-tile mundane attack. It costs no Stability and generates or consumes no class resource, so it remains available when your powers are exhausted.";
    if (calling.id === "shadowknight") {
      resourceStat.dataset.mechanicHelp = "Gravefire is the Shadowknight's class resource. Successful life drains and guarded impacts generate it. Reinforced defenses and later Fire/Death skills spend it; dry casts generate none.";
      signatureAction.querySelector("small")!.textContent = "12 Stability · +15 Gravefire";
      signatureAction.dataset.mechanicHelp = `${calling.signatureSkill} is a ${calling.signatureRange}-tile life-draining weapon attack. A valid hit costs 12 Stability and generates 15 Gravefire. With no valid target or range, it still animates but costs nothing and deals no damage.`;
      defenseAction.querySelector("small")!.textContent = "8 Stability · self buff";
      defenseAction.dataset.mechanicHelp = `${calling.defensiveSkill} is a self-buff usable in or out of combat. It costs 8 Stability; if at least 20 Gravefire is stored, it spends 20 to reinforce the guard.`;
    } else {
      resourceStat.dataset.mechanicHelp = `${calling.resourceName} is the ${calling.name}'s class resource. Class actions generate it and stronger techniques spend it.`;
      signatureAction.dataset.mechanicHelp = `${calling.signatureSkill} is the level-one signature action. A dry activation without a valid target plays its animation but spends no resource and causes no damage.`;
      defenseAction.dataset.mechanicHelp = `${calling.defensiveSkill} is the level-one defensive action and may be used as a self-buff when its requirements are met.`;
    }
    requiredElement<HTMLElement>("recover-action").dataset.mechanicHelp = "Recover consumes a Woven Recovery Band when Vitality or Stability is missing. With no bands left, Center Soul slowly restores a smaller amount of Stability on cooldown.";

    const skillList = requiredElement<HTMLUListElement>("skill-list");
    skillList.replaceChildren();
    profile.skills.forEach((skill) => {
      const item = document.createElement("li");
      item.textContent = skill;
      skillList.append(item);
    });
  }

  public setRunSeed(seed: number): void {
    requiredElement<HTMLElement>("run-seed").textContent = seed.toString(16).toUpperCase().padStart(8, "0");
  }

  public setZone(name: string, kicker: string): void {
    requiredElement<HTMLElement>("zone-name").textContent = name;
    requiredElement<HTMLElement>("zone-kicker").textContent = kicker;
  }

  public setRealmPressure(value: number): void {
    const pressure = Math.max(0, Math.min(100, Math.round(value)));
    const state = pressure < 25 ? "STABLE" : pressure < 50 ? "STRAINED" : pressure < 75 ? "SEVERE" : "BREACHING";
    const stateElement = requiredElement<HTMLElement>("realm-pressure");
    const fill = requiredElement<HTMLElement>("pressure-fill");
    const track = fill.parentElement;
    stateElement.textContent = `${state} ${pressure}`;
    fill.style.width = `${Math.max(4, pressure)}%`;
    fill.style.background = pressure < 25
      ? "linear-gradient(90deg, #246d68, #62e6db)"
      : pressure < 50
        ? "linear-gradient(90deg, #8a6b33, #e0b35d)"
        : "linear-gradient(90deg, #8c342c, #ec694e)";
    if (track) track.setAttribute("aria-label", `Realm pressure: ${state.toLowerCase()}, ${pressure} out of 100`);
  }

  public revealRoute(room: "training" | "skirmish" | "boss", label: string): void {
    const ids = ["training", "skirmish", "boss"] as const;
    const currentIndex = ids.indexOf(room);
    ids.forEach((id, index) => {
      const item = requiredElement<HTMLElement>(`route-${id}`);
      item.classList.toggle("is-current", index === currentIndex);
      item.classList.toggle("is-complete", index < currentIndex);
      item.classList.toggle("is-hidden", index > currentIndex);
      if (index === currentIndex) {
        item.querySelector("strong")!.textContent = label;
        item.querySelector("small")!.textContent = "Revealed";
      } else if (index < currentIndex) {
        item.querySelector("small")!.textContent = "Explored";
      }
    });
  }

  public setTarget(name: string, hp: number, maxHp: number, isBoss = false): void {
    const frame = requiredElement<HTMLElement>("target-frame");
    frame.hidden = false;
    frame.classList.toggle("is-boss", isBoss);
    requiredElement<HTMLElement>("target-name").textContent = name;
    requiredElement<HTMLElement>("target-level").textContent = isBoss ? "Miniboss" : "Level 1";
    requiredElement<HTMLElement>("target-health-text").textContent = `${hp} / ${maxHp}`;
    requiredElement<HTMLElement>("target-health-fill").style.width = `${Math.max(0, hp / maxHp) * 100}%`;
  }

  public clearTarget(): void {
    requiredElement<HTMLElement>("target-frame").hidden = true;
  }

  public clearCombatPresentation(): void {
    this.clearTarget();
    this.activeReactionCancel?.();
    this.activeReactionCancel = null;
    this.reactionPrompt.hidden = true;
  }

  public setRecoveryCharges(charges: number): void {
    requiredElement<HTMLElement>("recover-action").querySelector("small")!.textContent = charges > 0
      ? `${charges} recovery band${charges === 1 ? "" : "s"}`
      : "Restore stability";
  }

  public isDialogueOpen(): boolean {
    return this.dialogueVisible || this.imprintVisible || this.equipmentVisible || this.storybookVisible;
  }

  public openStorybook(
    profile: CharacterProfile,
    onProgress: (pageIndex: number) => void,
    onComplete: () => void,
  ): void {
    const pages = prologuePages(profile);
    const panel = requiredElement<HTMLElement>("storybook-panel");
    const image = requiredElement<HTMLImageElement>("storybook-image");
    const era = requiredElement<HTMLElement>("storybook-era");
    const kicker = requiredElement<HTMLElement>("storybook-kicker");
    const number = requiredElement<HTMLElement>("storybook-number");
    const title = requiredElement<HTMLElement>("storybook-title");
    const copy = requiredElement<HTMLElement>("storybook-copy");
    const pageLabel = requiredElement<HTMLElement>("storybook-page-label");
    const progress = requiredElement<HTMLElement>("storybook-progress-fill");
    const back = requiredElement<HTMLButtonElement>("storybook-back");
    const next = requiredElement<HTMLButtonElement>("storybook-next");
    const close = requiredElement<HTMLButtonElement>("storybook-close");
    let pageIndex = profile.onboarding?.storybookCompleted
      ? 0
      : Math.min(pages.length - 1, Math.max(0, profile.onboarding?.storybookPage ?? 0));
    let recordedNarration: HTMLAudioElement | null = null;

    const roman = (value: number): string => {
      const numerals: Array<[number, string]> = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
      let result = "";
      let remaining = value;
      numerals.forEach(([amount, glyph]) => {
        while (remaining >= amount) {
          result += glyph;
          remaining -= amount;
        }
      });
      return result;
    };
    const dismiss = (): void => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      recordedNarration?.pause();
      recordedNarration = null;
      panel.hidden = true;
      this.storybookVisible = false;
      this.storybookCloseHandler = null;
      this.setScreenHudInert(false);
    };
    const render = (): void => {
      const page = pages[pageIndex]!;
      panel.classList.remove("is-turning");
      void panel.offsetWidth;
      panel.classList.add("is-turning");
      era.textContent = page.era;
      era.dataset.era = page.era;
      kicker.textContent = page.kicker;
      number.textContent = roman(pageIndex + 1);
      title.textContent = page.title;
      image.src = page.image;
      image.alt = page.alt;
      image.style.objectPosition = page.imagePosition ?? "center";
      copy.replaceChildren(...page.narration.map((line) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        return paragraph;
      }));
      pageLabel.textContent = `Board ${pageIndex + 1} of ${pages.length}`;
      progress.style.width = `${((pageIndex + 1) / pages.length) * 100}%`;
      back.disabled = pageIndex === 0;
      next.textContent = pageIndex === pages.length - 1 ? "Accept Ilyra's charge" : "Next board · skip voice";
      close.textContent = profile.onboarding?.storybookCompleted ? "Close Chronicle" : "Pause Chronicle";
      recordedNarration?.pause();
      recordedNarration = null;
      if (page.audioSrc) {
        recordedNarration = new Audio(page.audioSrc);
        recordedNarration.addEventListener("error", () => this.speak(`${page.title}. ${page.narration.join(" ")}`, "ilyra"), { once: true });
        void recordedNarration.play().catch(() => this.speak(`${page.title}. ${page.narration.join(" ")}`, "ilyra"));
      } else {
        this.speak(`${page.title}. ${page.narration.join(" ")}`, "ilyra");
      }
      onProgress(pageIndex);
    };
    back.onclick = () => {
      if (pageIndex === 0) return;
      pageIndex -= 1;
      render();
    };
    next.onclick = () => {
      if (pageIndex < pages.length - 1) {
        pageIndex += 1;
        render();
        return;
      }
      dismiss();
      onComplete();
    };
    close.onclick = dismiss;
    this.storybookCloseHandler = dismiss;
    this.storybookVisible = true;
    this.setScreenHudInert(true);
    panel.hidden = false;
    render();
    next.focus();
  }

  public openStarterImprint(
    profile: CharacterProfile,
    raceOptions: readonly ImprintOption[],
    callingOptions: readonly ImprintOption[],
    onConfirm: (selection: StarterImprintSelection) => void,
  ): void {
    const panel = requiredElement<HTMLElement>("imprint-panel");
    const statGrid = requiredElement<HTMLElement>("imprint-stat-grid");
    const raceGrid = requiredElement<HTMLElement>("imprint-race-options");
    const callingGrid = requiredElement<HTMLElement>("imprint-calling-options");
    const pointsLabel = requiredElement<HTMLElement>("imprint-points");
    const error = requiredElement<HTMLElement>("imprint-error");
    const confirm = requiredElement<HTMLButtonElement>("imprint-confirm");
    const close = requiredElement<HTMLButtonElement>("imprint-close");
    requiredElement<HTMLElement>("imprint-race-title").textContent = `${profile.raceName} ancestry boon`;
    requiredElement<HTMLElement>("imprint-calling-title").textContent = `${profile.callingName} base discipline`;
    const allocations: Partial<Stats> = Object.fromEntries(STAT_KEYS.map((key) => [key, 0])) as Partial<Stats>;
    let raceBoonId = "";
    let callingPerkId = "";

    const modifierText = (option: ImprintOption): string => STAT_KEYS
      .filter((key) => (option.modifiers[key] ?? 0) > 0)
      .map((key) => `+${option.modifiers[key]} ${STAT_LABELS[key]}`)
      .join(" · ");
    const remaining = (): number => 3 - STAT_KEYS.reduce((total, key) => total + (allocations[key] ?? 0), 0);
    const refreshConfirm = (): void => {
      const points = remaining();
      pointsLabel.textContent = `${points} point${points === 1 ? "" : "s"} remain`;
      confirm.disabled = points !== 0 || !raceBoonId || !callingPerkId;
    };
    const renderStats = (): void => {
      statGrid.replaceChildren();
      for (const key of STAT_KEYS) {
        const row = document.createElement("div");
        row.className = "imprint-stat-row";
        const label = document.createElement("span");
        label.textContent = STAT_LABELS[key];
        const subtract = document.createElement("button");
        subtract.type = "button";
        subtract.textContent = "−";
        subtract.disabled = (allocations[key] ?? 0) === 0;
        subtract.setAttribute("aria-label", `Remove one ${STAT_LABELS[key]} point`);
        const value = document.createElement("strong");
        value.textContent = `${profile.stats[key]} + ${allocations[key] ?? 0}`;
        const add = document.createElement("button");
        add.type = "button";
        add.textContent = "+";
        add.disabled = remaining() === 0;
        add.setAttribute("aria-label", `Add one ${STAT_LABELS[key]} point`);
        subtract.addEventListener("click", () => {
          allocations[key] = Math.max(0, (allocations[key] ?? 0) - 1);
          renderStats();
        });
        add.addEventListener("click", () => {
          if (remaining() <= 0) return;
          allocations[key] = (allocations[key] ?? 0) + 1;
          renderStats();
        });
        row.append(label, subtract, value, add);
        statGrid.append(row);
      }
      refreshConfirm();
    };
    const renderOptions = (
      root: HTMLElement,
      options: readonly ImprintOption[],
      selected: () => string,
      choose: (id: string) => void,
    ): void => {
      root.replaceChildren();
      for (const option of options) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "imprint-option";
        button.setAttribute("aria-pressed", String(selected() === option.id));
        const name = document.createElement("strong");
        name.textContent = option.name;
        const description = document.createElement("span");
        description.textContent = option.description;
        const modifiers = document.createElement("small");
        modifiers.textContent = modifierText(option);
        button.append(name, description, modifiers);
        button.addEventListener("click", () => {
          choose(option.id);
          renderOptions(root, options, selected, choose);
          refreshConfirm();
        });
        root.append(button);
      }
    };
    const dismiss = (): void => {
      panel.hidden = true;
      this.imprintVisible = false;
      this.setScreenHudInert(false);
    };
    close.onclick = dismiss;
    confirm.onclick = () => {
      error.textContent = "";
      try {
        onConfirm({ allocations, raceBoonId, callingPerkId });
        dismiss();
      } catch (caught) {
        error.textContent = caught instanceof Error ? caught.message : "The Soul Imprint would not hold.";
      }
    };
    error.textContent = "";
    renderStats();
    renderOptions(raceGrid, raceOptions, () => raceBoonId, (id) => { raceBoonId = id; });
    renderOptions(callingGrid, callingOptions, () => callingPerkId, (id) => { callingPerkId = id; });
    this.imprintVisible = true;
    this.setScreenHudInert(true);
    panel.hidden = false;
  }

  public setTutorial(step: number, total: number, title: string, text: string): void {
    requiredElement<HTMLElement>("tutorial-step").textContent = `${String(step).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    requiredElement<HTMLElement>("tutorial-title").textContent = title;
    requiredElement<HTMLElement>("tutorial-text").textContent = text;
  }

  public openDialogue(
    scene: DialogueScene,
    onChoice: (choice: DialogueChoice) => void,
    onContinue?: (choice: DialogueChoice) => void,
  ): void {
    const panel = requiredElement<HTMLElement>("dialogue-panel");
    const body = requiredElement<HTMLElement>("dialogue-body");
    const choices = requiredElement<HTMLElement>("dialogue-choices");
    requiredElement<HTMLImageElement>("dialogue-portrait").src = scene.sprite;
    requiredElement<HTMLElement>("dialogue-speaker").textContent = scene.speaker;
    requiredElement<HTMLElement>("dialogue-role").textContent = scene.role;
    body.replaceChildren(...scene.lines.map((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      return paragraph;
    }));
    choices.replaceChildren();
    this.dialogueVisible = true;
    this.setScreenHudInert(true);
    panel.hidden = false;
    this.speak(scene.lines.join(" "), scene.npcId);

    scene.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        onChoice(choice);
        body.replaceChildren();
        const response = document.createElement("p");
        response.textContent = choice.response;
        body.append(response);
        this.speak(choice.response, scene.npcId);
        const continueButton = document.createElement("button");
        continueButton.type = "button";
        continueButton.textContent = "Continue";
        continueButton.addEventListener("click", () => {
          if ("speechSynthesis" in window) window.speechSynthesis.cancel();
          panel.hidden = true;
          this.dialogueVisible = false;
          this.setScreenHudInert(false);
          onContinue?.(choice);
        });
        choices.replaceChildren(continueButton);
      });
      choices.append(button);
    });
  }

  private speak(text: string, npcId: string): void {
    if (!this.voiceEnabled || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const performance = npcId === "ilyra"
      ? { rate: 0.88, pitch: 0.95 }
      : npcId === "brannoc"
        ? { rate: 0.84, pitch: 0.72 }
        : { rate: 1, pitch: 1.02 };
    utterance.rate = performance.rate;
    utterance.pitch = performance.pitch;
    utterance.volume = 0.86;
    window.speechSynthesis.speak(utterance);
  }

  public selectedCombatStyle(): CombatStyle {
    return this.combatStyle.value === "real-time" ? "real-time" : "turn-based";
  }

  public setSelectedCombatStyle(style: CombatStyle): void {
    this.combatStyle.value = style;
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
    requiredElement<HTMLElement>("compact-hp").textContent = String(snapshot.hp);
    requiredElement<HTMLElement>("compact-stability").textContent = String(snapshot.stability);
    requiredElement<HTMLElement>("compact-resource").textContent = String(snapshot.fury);
  }

  public setBuffs(buffs: readonly BuffSnapshot[]): void {
    this.buffStrip.replaceChildren(...buffs.map((buff) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `buff-chip buff-chip--${buff.tone ?? "buff"}`;
      item.dataset.mechanic = "";
      item.dataset.mechanicHelp = buff.help;
      item.title = buff.help;
      item.setAttribute("aria-label", `${buff.label}${buff.stacks && buff.stacks > 1 ? `, ${buff.stacks} stacks` : ""}, ${buff.duration}. ${buff.help}`);
      item.innerHTML = `<span aria-hidden="true">${buff.icon}</span><b>${buff.stacks && buff.stacks > 1 ? buff.stacks : ""}</b><small>${buff.duration}</small>`;
      return item;
    }));
    this.buffStrip.hidden = buffs.length === 0;
  }

  public setInteractionPrompt(prompt: InteractionPromptSnapshot | null): void {
    this.interactionPrompt.hidden = !prompt;
    if (!prompt) return;
    requiredElement<HTMLElement>("interaction-label").textContent = prompt.label;
    requiredElement<HTMLElement>("interaction-detail").textContent = prompt.disabledReason ?? prompt.detail;
    this.interactionConfirm.disabled = Boolean(prompt.disabledReason);
    this.interactionConfirm.title = prompt.disabledReason ?? prompt.detail;
  }

  public setTrialGateGuidance(entries: ReadonlyArray<{ label: string; detail: string }> | null): void {
    const guidance = requiredElement<HTMLElement>("trial-gate-guidance");
    guidance.hidden = !entries?.length;
    guidance.replaceChildren(...(entries ?? []).map((entry) => {
      const item = document.createElement("span");
      item.innerHTML = `<strong>${entry.label}</strong><small>${entry.detail}</small>`;
      return item;
    }));
  }

  public setInventory(items: readonly InventoryItem[], capacity: BackpackCapacity): void {
    this.inventory.replaceChildren();
    this.paperPack.replaceChildren();
    const carriedItems = backpackItems(items);
    const usedSlots = backpackSlotsUsed(items);
    const totalSlots = totalBackpackSlots(capacity);
    this.inventoryCount.textContent = `${usedSlots} / ${totalSlots}`;
    this.paperPackCount.textContent = `${usedSlots} / ${totalSlots} slots`;
    if (carriedItems.length === 0) {
      const empty = document.createElement("li");
      empty.className = "inventory-empty";
      empty.textContent = "Pack empty · equipped gear is on the paper doll";
      this.inventory.append(empty);
    }

    for (const item of carriedItems) {
      const quantity = item.quantity ?? 1;
      const quantityLabel = quantity > 1 ? ` ×${quantity}` : "";
      const listItem = document.createElement("li");
      listItem.textContent = `${item.name}${quantityLabel}`;
      this.inventory.append(listItem);

      const packItem = document.createElement("li");
      packItem.className = "paper-pack-item";
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = `${item.name}${quantityLabel}`;
      const detail = document.createElement("small");
      const durability = item.maxDurability === undefined
        ? item.kind
        : `${item.durability ?? 0} / ${item.maxDurability} durability`;
      detail.textContent = durability;
      copy.append(name, detail);
      packItem.append(copy);
      packItem.title = item.description;
      if (item.slot) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.dataset.equipmentItem = item.id;
        toggle.textContent = item.equipped ? "Unequip" : "Equip";
        toggle.setAttribute("aria-label", `${toggle.textContent} ${item.name}`);
        packItem.append(toggle);
      }
      this.paperPack.append(packItem);
    }

    for (let index = usedSlots; index < totalSlots; index += 1) {
      const emptySlot = document.createElement("li");
      emptySlot.className = "paper-pack-slot-empty";
      emptySlot.textContent = String(index + 1).padStart(2, "0");
      emptySlot.setAttribute("aria-label", `Empty backpack slot ${index + 1}`);
      this.paperPack.append(emptySlot);
    }

    const slots: EquipmentSlot[] = ["head", "body", "legs", "feet", "mainHand", "offHand"];
    slots.forEach((slot) => {
      const equipped = equippedItem(items, slot);
      const container = requiredElement<HTMLElement>(`slot-${slot}`);
      container.classList.toggle("is-equipped", Boolean(equipped));
      container.querySelector("strong")!.textContent = equipped?.name ?? "Empty";
      container.title = equipped?.description ?? `${slot} slot is empty`;
      if (equipped) {
        container.dataset.equipmentItem = equipped.id;
        container.tabIndex = 0;
        container.setAttribute("role", "button");
        container.setAttribute("aria-label", `Unequip ${equipped.name} to the backpack`);
      } else {
        delete container.dataset.equipmentItem;
        container.removeAttribute("tabindex");
        container.removeAttribute("role");
        container.removeAttribute("aria-label");
      }
    });
  }

  public setWeaponAvailability(weaponName: string | null): void {
    const basic = requiredElement<HTMLButtonElement>("basic-action");
    const signature = requiredElement<HTMLButtonElement>("signature-action");
    basic.querySelector("b")!.textContent = weaponName ? "Weapon Strike" : "Unarmed Strike";
    basic.querySelector("small")!.textContent = weaponName ? "Free basic attack" : "Punch / kick · free";
    basic.dataset.mechanicHelp = weaponName
      ? `${weaponName} is equipped. Weapon Strike costs no Stability and draws the equipped weapon automatically.`
      : "No usable main-hand weapon is equipped. The free basic attack falls back to punch and kick motions.";
    if (this.currentCallingId === "shadowknight") {
      signature.dataset.equipmentLocked = String(!weaponName);
      signature.disabled = !weaponName;
      signature.classList.toggle("is-equipment-locked", !weaponName);
      signature.dataset.mechanicHelp = weaponName
        ? "Siphon Cleave requires the equipped sword, costs 12 Stability on a valid hit, generates Gravefire, and drains vitality."
        : "Siphon Cleave requires a usable main-hand weapon. Equip one in the paper doll; broken or unequipped weapons disable this skill.";
      signature.title = weaponName ? "" : "Requires an equipped weapon";
    }
  }

  private showEquipment(visible: boolean): void {
    this.equipmentVisible = visible;
    this.equipmentPanel.hidden = !visible;
    this.equipmentVisibilityHandler?.(visible);
    if (visible) requiredElement<HTMLButtonElement>("equipment-close").focus();
  }

  private savedLocomotionPreference(): LocomotionPreference {
    try {
      const stored = localStorage.getItem("souldrifter-locomotion-preference");
      if (stored === "walk" || stored === "run") return stored;
    } catch {
      // Privacy modes may reject storage; Auto remains a complete fallback.
    }
    return "auto";
  }

  private setLocomotionPreference(preference: LocomotionPreference, persist = true): void {
    this.locomotionMode = preference;
    this.locomotionPreference.querySelectorAll<HTMLButtonElement>("button[data-locomotion-preference]").forEach((button) => {
      const selected = button.dataset.locomotionPreference === preference;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (persist) {
      try {
        localStorage.setItem("souldrifter-locomotion-preference", preference);
      } catch {
        // Keep the in-memory selection if persistent storage is unavailable.
      }
    }
    this.locomotionPreferenceHandler?.(preference);
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
    if (button) button.disabled = !enabled || button.dataset.equipmentLocked === "true";
  }

  private showMechanicTooltip(source: HTMLElement): void {
    const help = source.dataset.mechanicHelp;
    if (!help) return;
    this.mechanicTooltip.textContent = help;
    this.mechanicTooltip.hidden = false;
    this.mechanicTooltip.classList.add("is-visible");
    const sourceRect = source.getBoundingClientRect();
    const tooltipRect = this.mechanicTooltip.getBoundingClientRect();
    const left = Math.max(10, Math.min(window.innerWidth - tooltipRect.width - 10, sourceRect.left + sourceRect.width / 2 - tooltipRect.width / 2));
    const above = sourceRect.top - tooltipRect.height - 10;
    const top = above >= 10 ? above : Math.min(window.innerHeight - tooltipRect.height - 10, sourceRect.bottom + 10);
    this.mechanicTooltip.style.left = `${left}px`;
    this.mechanicTooltip.style.top = `${Math.max(10, top)}px`;
  }

  private hideMechanicTooltip(): void {
    this.mechanicTooltip.classList.remove("is-visible");
    this.mechanicTooltip.hidden = true;
  }

  public animateAction(action: ActionName, durationMs: number): void {
    const button = this.combatControls.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);
    if (!button) return;
    button.style.setProperty("--action-duration", `${durationMs}ms`);
    button.classList.remove("is-triggered");
    void button.offsetWidth;
    button.classList.add("is-triggered");
    window.setTimeout(() => button.classList.remove("is-triggered"), durationMs);
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
        if (this.activeReactionCancel === cancel) this.activeReactionCancel = null;
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
      const cancel = (): void => finish(false);
      this.activeReactionCancel = cancel;

      window.addEventListener("keydown", onKeyDown);
      this.reactionPrompt.addEventListener("pointerdown", onPointerDown, { once: true });
    });
  }
}
