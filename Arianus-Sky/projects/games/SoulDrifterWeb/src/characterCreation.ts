import {
  CALLINGS,
  callingById,
  deriveCharacter,
  MEMORY_QUESTIONS,
  normalizeLegacyCharacterProfile,
  RACES,
  raceCallingBonus,
  raceCallingEligibility,
  resolveCharacterAppearance,
  SKIN_TONES,
  STAT_KEYS,
  STAT_LABELS,
  type CharacterDraft,
  type CharacterProfile,
  type ResolvedCharacterAppearance,
} from "./game/character";
import {
  CreationAvatarPreview,
  EMPTY_CREATION_PREVIEW_AVAILABILITY,
  type CreationLightState,
  type CreationPreviewAppearance,
  type CreationPreviewAvailability,
  type CreationPreviewView,
} from "./creationPreview";
import { CreationStageBackdrop } from "./creationStage";

export function characterPortraitPath(raceId: string, callingId: string): string {
  if (callingId === "shadowknight") {
    return `/assets/generated/characters/${raceId}-shadowknight-highlevel.png`;
  }
  return `/assets/generated/characters/${raceId}-${callingId}.png`;
}

type CreationStep = "name" | "race" | "appearance" | "calling" | "memory" | "review";

interface CreationStationPresentation {
  view: CreationPreviewView;
  /** Radians; the figure's authored facing for the station. */
  yaw: number;
  light: CreationLightState;
}

/**
 * How the one stage presents each station: the camera stop, the figure's yaw and the
 * light state. The appearance station's stop follows its body/face panel instead.
 */
export const STATION_PRESENTATION: Readonly<Record<CreationStep, CreationStationPresentation>> = Object.freeze({
  name: { view: "medium", yaw: 0, light: { key: 0.25, fill: 0, rim: 1, under: 1.6 } },
  race: { view: "body", yaw: 0, light: { key: 1, fill: 0.6, rim: 1, under: 1 } },
  appearance: { view: "body", yaw: 0, light: { key: 1, fill: 0.6, rim: 1, under: 1 } },
  calling: { view: "body", yaw: -0.35, light: { key: 1, fill: 0.6, rim: 1, under: 1 } },
  memory: { view: "medium", yaw: 0, light: { key: 0.9, fill: 0.5, rim: 1.1, under: 1 } },
  review: { view: "hero", yaw: -0.18, light: { key: 1, fill: 0.6, rim: 1.2, under: 1.1 } },
});

/** The key light rises as the name is typed: the first control on screen changes pixels. */
export function creatorNameLight(nameLength: number): Pick<CreationLightState, "key" | "fill"> {
  const progress = Math.min(1, Math.max(0, nameLength) / 6);
  return { key: 0.25 + 0.75 * progress, fill: 0.6 * progress };
}

/** Desktop stands the figure left of centre, clear of the folio; phones keep it centred. */
export function creatorViewOffset(viewportWidth: number, uiHidden: boolean): number {
  return uiHidden || viewportWidth <= 1079 ? 0 : 0.14;
}

interface CreationHistoryState {
  souldrifterCreation: true;
  step: CreationStep;
  memoryIndex: number;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required character-creation element #${id}`);
  return element as T;
}

export type AppearanceAgeStage = "Young Adult" | "Middle-Aged" | "Elder";

export function appearanceAgeStage(age: number): AppearanceAgeStage {
  const normalized = Math.min(1, Math.max(0, Number.isFinite(age) ? age : 0));
  if (normalized < 1 / 3) return "Young Adult";
  if (normalized < 2 / 3) return "Middle-Aged";
  return "Elder";
}

export function appearanceControlPercent(value: number): number {
  return Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100);
}

export function appearanceDependentControls(
  appearance: Pick<ResolvedCharacterAppearance, "hairStyle" | "facialHair">,
  availability: Pick<CreationPreviewAvailability, "hairStyles" | "facialHair">,
): { hairColor: boolean; hairGreying: boolean; facialHairGreying: boolean } {
  const hairReady = appearance.hairStyle !== "shaved-buzzed"
    && availability.hairStyles.includes(appearance.hairStyle);
  const facialHairReady = appearance.facialHair !== "none"
    && availability.facialHair.includes(appearance.facialHair);
  return {
    hairColor: hairReady,
    hairGreying: hairReady,
    facialHairGreying: facialHairReady,
  };
}

export function resetCreationStageScroll(stage: { scrollTop: number }): void {
  stage.scrollTop = 0;
}

export function isCreatorAppearanceSelectionAvailable(
  appearance: ResolvedCharacterAppearance,
  availability: CreationPreviewAvailability,
): boolean {
  return availability.hairStyles.includes(appearance.hairStyle)
    && availability.faceTypes.includes(appearance.faceType)
    && availability.facialHair.includes(appearance.facialHair)
    && (appearance.age === 0 || availability.ageMorphsAvailable);
}

const APPEARANCE_PANEL_COPY = {
  body: {
    eyebrow: "The returned body · Human foundation · Body",
    title: "Which body did the Soul Well return?",
    lede: "The Well returned one body. Turn it and look it over; the face waits in its own close-up.",
    canvas: "Full-body preview of the returned body. Drag to rotate manually.",
    mode: "Body · relaxed idle · drag to turn",
  },
  face: {
    eyebrow: "The returned body · Human foundation · Face & features",
    title: "Shape the face the world will meet.",
    lede: "Inspect the head at conversation distance and choose a complexion. Further features are offered only once their canonical assets pass review.",
    canvas: "Close-up preview of your face. Drag to rotate manually.",
    mode: "Face inspection · relaxed idle · drag to turn",
  },
} as const;

export class CharacterCreation {
  private readonly root = requiredElement<HTMLElement>("character-creation");
  private readonly stage = requiredElement<HTMLElement>("creation-stage");
  private readonly progress = requiredElement<HTMLOListElement>("creation-progress");
  private readonly error = requiredElement<HTMLParagraphElement>("creation-error");
  private readonly draft: CharacterDraft = {
    name: "",
    raceId: "human",
    callingId: "",
    appearance: {
      bodyType: "foundation",
      faceType: "foundation",
      hairStyle: "shaved-buzzed",
      skinTone: "ashen",
      facialHair: "none",
      hairColor: "dark-brown",
      age: 0,
      hairGreying: 0,
      facialHairGreying: 0,
    },
    answers: {},
  };
  private step: CreationStep = "name";
  private memoryIndex = 0;
  private appearanceEditProfile: CharacterProfile | null = null;
  private appearancePreview: CreationAvatarPreview | null = null;
  private appearanceAvailability: CreationPreviewAvailability = EMPTY_CREATION_PREVIEW_AVAILABILITY;
  private appearancePanel: "body" | "face" = "body";
  private appearanceAutoRotate = false;
  private readonly stageViewport = requiredElement<HTMLElement>("creation-stage-viewport");
  private readonly stageStatus = requiredElement<HTMLElement>("creation-stage-status");
  private readonly stageFallback = requiredElement<HTMLImageElement>("creation-stage-fallback");
  private readonly previewControls = requiredElement<HTMLElement>("appearance-preview-controls");
  private readonly reducedMotion = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private backdrop: CreationStageBackdrop | null = null;
  private uiHidden = false;

  public constructor(
    private readonly onComplete: (profile: CharacterProfile, resumeSavedSoul: boolean) => void,
    private readonly savedProfile: CharacterProfile | null = null,
    private readonly savedAvatarPreview: string | null = null,
  ) {
    window.addEventListener("souldrifter:edit-appearance", (event) => {
      const profile = (event as CustomEvent<{ profile?: CharacterProfile }>).detail?.profile;
      if (profile) this.editAppearance(profile);
    });
    window.addEventListener("popstate", this.onPopState);
    window.history.replaceState(this.creationHistoryState(), "");
    this.mountStage();
    this.render();
  }

  /** Builds the persistent stage once: backdrop, preview and the controls that outlive stations. */
  private mountStage(): void {
    const backdrops = Array.from(this.stageViewport.querySelectorAll<HTMLCanvasElement>("canvas.stage-backdrop"));
    const [first, second] = backdrops;
    if (first && second) {
      this.backdrop = new CreationStageBackdrop([first, second], {
        reducedMotion: this.reducedMotion,
        resolutionDivisor: window.innerWidth <= 820 ? 3 : 4,
      });
    }
    this.mountPreview();
    requiredElement<HTMLInputElement>("appearance-auto-rotate").addEventListener("change", (event) => {
      this.appearanceAutoRotate = (event.currentTarget as HTMLInputElement).checked;
      this.appearancePreview?.setAutoRotate(this.appearanceAutoRotate);
    });
    requiredElement<HTMLButtonElement>("appearance-front-view").addEventListener("click", () => {
      this.appearancePreview?.resetFacing();
    });
    requiredElement<HTMLButtonElement>("creation-hide-ui").addEventListener("click", () => {
      this.setUiHidden(!this.uiHidden);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.uiHidden) this.setUiHidden(false);
    });
    requiredElement<HTMLCanvasElement>("appearance-preview-canvas").addEventListener("click", () => {
      if (this.uiHidden) this.setUiHidden(false);
    });
    window.addEventListener("resize", () => this.applyStationPresentation());
  }

  /**
   * One WebGL preview for the whole flow. When the context cannot be created the
   * stage shows the painted portrait plate instead and the creator still works as a form.
   */
  private mountPreview(): void {
    const canvas = requiredElement<HTMLCanvasElement>("appearance-preview-canvas");
    try {
      this.appearancePreview = new CreationAvatarPreview(
        canvas,
        this.previewAppearance(),
        (availability) => this.updateAppearanceAvailability(availability),
        {
          view: this.step === "appearance" ? this.appearancePanel : STATION_PRESENTATION[this.step].view,
          autoRotate: this.appearanceAutoRotate,
          onLoadFailure: (reason) => this.showAppearanceLoadFailure(reason),
          reducedMotion: this.reducedMotion,
        },
      );
      canvas.hidden = false;
      this.stageFallback.hidden = true;
      this.stageStatus.classList.remove("is-failed");
      this.stageStatus.textContent = "The Well is returning the body…";
      this.stageStatus.hidden = false;
    } catch (error) {
      console.warn("Creation stage could not start WebGL; showing the painted plate instead.", error);
      this.appearancePreview = null;
      canvas.hidden = true;
      this.stageFallback.src = characterPortraitPath(this.draft.raceId || "human", this.draft.callingId || "warrior");
      this.stageFallback.hidden = false;
      const reason = error instanceof Error ? error.message : "WebGL is unavailable";
      this.stageStatus.textContent = `Preview unavailable: ${reason}.`;
      this.stageStatus.classList.add("is-failed");
      this.stageStatus.hidden = false;
    }
    if (import.meta.env.DEV) {
      // Hands the live preview to the QA harness and to manual checks such as
      // `__souldrifterCreationPreview.playReaction("listen")` in DevTools.
      (window as Window & { __souldrifterCreationPreview?: CreationAvatarPreview | null })
        .__souldrifterCreationPreview = this.appearancePreview;
    }
  }

  private releasePreview(): void {
    this.appearancePreview?.dispose();
    this.appearancePreview = null;
  }

  private previewAppearance(): CreationPreviewAppearance {
    return {
      hairStyle: this.draft.appearance.hairStyle,
      skinTone: this.draft.appearance.skinTone,
      raceId: this.draft.raceId || "human",
      facialHair: this.draft.appearance.facialHair,
      hairColor: this.draft.appearance.hairColor,
      age: this.draft.appearance.age,
      hairGreying: this.draft.appearance.hairGreying,
      facialHairGreying: this.draft.appearance.facialHairGreying,
      faceType: this.draft.appearance.faceType,
    };
  }

  /** Points the one stage at the current station: backdrop crop, camera stop, yaw, light, chrome. */
  private applyStationPresentation(): void {
    const presentation = STATION_PRESENTATION[this.step];
    this.stageViewport.dataset.station = this.step;
    this.backdrop?.setStation(this.step);
    const preview = this.appearancePreview;
    if (preview) {
      const facePanel = this.step === "appearance" && this.appearancePanel === "face";
      preview.setView(this.step === "appearance" ? this.appearancePanel : presentation.view);
      preview.setPresentationYaw(presentation.yaw);
      const light: CreationLightState = this.step === "name"
        ? { ...presentation.light, ...creatorNameLight(this.draft.name.trim().length) }
        : facePanel ? { ...presentation.light, under: 1.3 } : presentation.light;
      preview.setLightState(light);
      preview.setViewOffset(creatorViewOffset(window.innerWidth, this.uiHidden));
    }
    this.previewControls.hidden = this.step !== "appearance";
    const copy = APPEARANCE_PANEL_COPY[this.appearancePanel];
    document.getElementById("appearance-preview-canvas")?.setAttribute(
      "aria-label",
      this.step === "appearance" ? copy.canvas : "The returned body on the Soul Well. Drag to rotate manually.",
    );
    const mode = document.getElementById("appearance-preview-mode");
    if (mode) mode.textContent = copy.mode;
  }

  private setUiHidden(hidden: boolean): void {
    this.uiHidden = hidden;
    this.root.classList.toggle("is-ui-hidden", hidden);
    const button = requiredElement<HTMLButtonElement>("creation-hide-ui");
    button.setAttribute("aria-pressed", String(hidden));
    button.textContent = hidden ? "Show UI" : "Hide UI";
    this.applyStationPresentation();
  }

  private creationHistoryState(): CreationHistoryState {
    return { souldrifterCreation: true, step: this.step, memoryIndex: this.memoryIndex };
  }

  private readonly onPopState = (event: PopStateEvent): void => {
    const state = event.state as Partial<CreationHistoryState> | null;
    if (!state?.souldrifterCreation || this.root.hidden || !state.step) return;
    this.step = state.step;
    this.memoryIndex = Number.isInteger(state.memoryIndex) ? Math.max(0, state.memoryIndex ?? 0) : 0;
    this.render();
  };

  private navigate(step: CreationStep, memoryIndex = this.memoryIndex): void {
    this.step = step;
    this.memoryIndex = memoryIndex;
    window.history.pushState(this.creationHistoryState(), "");
    this.render();
  }

  private navigateBack(fallbackStep: CreationStep, fallbackMemoryIndex = this.memoryIndex): void {
    const current = window.history.state as Partial<CreationHistoryState> | null;
    if (current?.souldrifterCreation) {
      window.history.back();
      return;
    }
    this.step = fallbackStep;
    this.memoryIndex = fallbackMemoryIndex;
    window.history.replaceState(this.creationHistoryState(), "");
    this.render();
  }

  public editAppearance(profile: CharacterProfile): void {
    const normalized = normalizeLegacyCharacterProfile(profile);
    this.appearanceEditProfile = normalized;
    this.draft.name = normalized.name;
    this.draft.raceId = normalized.raceId;
    this.draft.callingId = normalized.callingId;
    this.draft.appearance = { ...normalized.appearance };
    this.appearancePanel = "face";
    this.step = "appearance";
    this.root.classList.remove("is-dissolving");
    this.root.hidden = false;
    // The game owns its own context once it is running; the preview was released
    // at Awaken, so the edit path brings it back for the duration of the edit.
    if (!this.appearancePreview) this.mountPreview();
    window.history.pushState(this.creationHistoryState(), "");
    this.render();
  }

  private render(): void {
    this.error.textContent = "";
    this.renderProgress();

    if (this.step === "name") this.renderName();
    else if (this.step === "race") this.renderRace();
    else if (this.step === "appearance") this.renderAppearance();
    else if (this.step === "calling") this.renderCalling();
    else if (this.step === "memory") this.renderMemory();
    else this.renderReview();

    this.applyStationPresentation();
    resetCreationStageScroll(this.stage);
  }

  private renderProgress(): void {
    const entries = [
      { id: "name", label: "Name" },
      { id: "race", label: "Ancestry" },
      { id: "appearance", label: "Appearance" },
      { id: "calling", label: "Calling" },
      { id: "memory", label: `Memories ${this.memoryIndex + 1}/${MEMORY_QUESTIONS.length}` },
      { id: "review", label: "Soul imprint" },
    ];
    const currentIndex = entries.findIndex((entry) => entry.id === this.step);
    this.progress.replaceChildren();
    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = index === currentIndex ? "is-current" : index < currentIndex ? "is-complete" : "";
      item.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>${entry.label}`;
      this.progress.append(item);
    });
  }

  private renderName(): void {
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">The Well asks first</p>
        <h2>What name returned with you?</h2>
        <p>Not the name carved on a grave. The name this soul will answer to now.</p>
      </div>
      <label class="name-field">
        <span>Returned name</span>
        <input id="character-name-input" maxlength="24" autocomplete="off" value="${this.escape(this.draft.name)}" placeholder="Speak your name" autofocus />
      </label>
      ${this.savedProfile ? `
        <button class="continue-character" id="continue-character" type="button">
          <img src="${this.savedAvatarPreview ?? characterPortraitPath(this.savedProfile.raceId, this.savedProfile.callingId)}" alt="Current in-game ${this.escape(this.savedProfile.raceName)} ${this.escape(this.savedProfile.callingName)}" />
          <span><small>Continue saved soul</small><strong>${this.escape(this.savedProfile.name)}</strong><em>${this.savedProfile.raceName} · ${this.savedProfile.callingName}</em></span>
          <b>Return →</b>
        </button>` : ""}
      <div class="creation-actions creation-actions--end">
        <button class="ritual-button ritual-button--primary" id="creation-next" type="button">Bind the name <span>→</span></button>
      </div>`;

    const input = requiredElement<HTMLInputElement>("character-name-input");
    input.addEventListener("input", () => {
      this.appearancePreview?.setLightState(creatorNameLight(input.value.trim().length));
    });
    const advance = (): void => {
      this.draft.name = input.value.trim();
      if (this.draft.name.length < 2) return this.fail("The Well cannot hold a name shorter than two characters.");
      this.navigate("race");
    };
    requiredElement<HTMLButtonElement>("creation-next").addEventListener("click", advance);
    document.getElementById("continue-character")?.addEventListener("click", () => {
      if (this.savedProfile) this.complete(this.savedProfile, true);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") advance();
    });
    input.focus();
  }

  private renderRace(): void {
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">Ancestral echo</p>
        <h2>Which people shaped your first memory?</h2>
        <p>Ancestry grants an affinity, never a class or morality.</p>
      </div>
      <div class="choice-grid choice-grid--races">
        ${RACES.map((race) => {
          const available = race.id === "human";
          return `
          <button class="choice-card ${this.draft.raceId === race.id ? "is-selected" : ""} ${available ? "" : "is-forbidden"}" data-race="${race.id}" type="button" ${available ? "" : "disabled aria-disabled=\"true\""}>
            <img class="choice-card__portrait" src="/assets/generated/characters/${race.id}-warrior.png" alt="" />
            <span class="choice-card__glyph">${race.glyph}</span>
            <span class="choice-card__title">${race.name}</span>
            <span class="choice-card__body">${race.identity}</span>
            <span class="choice-card__affinity">${race.talent}</span>
            ${available ? "" : "<span class=\"choice-card__eligibility choice-card__eligibility--forbidden\"><strong>Foundation pending</strong>Existing saves remain preserved.</span>"}
          </button>`;
        }).join("")}
      </div>
      ${this.navigation("Return to name", "Choose ancestry")}`;
    this.bindChoices("button[data-race]", "race", (id) => {
      this.draft.raceId = id;
      if (this.draft.callingId && raceCallingEligibility(id, this.draft.callingId).status === "forbidden") {
        this.draft.callingId = "";
      }
    });
    this.bindNavigation(() => this.navigateBack("name"), () => {
      if (!this.draft.raceId) return this.fail("Choose the ancestry carried by this soul.");
      this.appearancePanel = "body";
      this.navigate("appearance");
    });
  }

  private renderAppearance(): void {
    this.draft.appearance = resolveCharacterAppearance(this.draft.appearance);
    // The availability was cached when the persistent preview loaded on the name
    // station; resetting it here would silence the readout for the whole session.
    const appearance = resolveCharacterAppearance(this.draft.appearance);
    const facePanel = this.appearancePanel === "face";
    const copy = APPEARANCE_PANEL_COPY[this.appearancePanel];
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow" id="appearance-eyebrow">${copy.eyebrow}</p>
        <h2 id="appearance-title">${copy.title}</h2>
        <p id="appearance-lede">${copy.lede}</p>
      </div>
      <div class="appearance-workflow" role="tablist" aria-label="Appearance setup">
        <button class="appearance-workflow__tab ${facePanel ? "" : "is-selected"}" data-appearance-panel="body" type="button" role="tab" aria-selected="${!facePanel}">
          <span>01</span><strong>Body</strong><small>Full-body view</small>
        </button>
        <span class="appearance-workflow__path" aria-hidden="true">→</span>
        <button class="appearance-workflow__tab ${facePanel ? "is-selected" : ""}" data-appearance-panel="face" type="button" role="tab" aria-selected="${facePanel}">
          <span>02</span><strong>Face &amp; features</strong><small>Conversation close-up</small>
        </button>
      </div>
      <div class="appearance-builder appearance-builder--${this.appearancePanel}">
        <div class="appearance-builder__options">
        <section data-appearance-section="body" ${facePanel ? "hidden" : ""}>
          <h3>Body</h3>
          <p class="appearance-note">The Human foundation, athletic build. Other builds arrive with their own canonical bodies; none is offered here before it exists.</p>
        </section>
        <section data-appearance-section="face" ${facePanel ? "" : "hidden"}>
          <h3>Skin tone</h3>
          <div class="appearance-options appearance-options--skin">
            ${Object.entries(SKIN_TONES).map(([id, tone]) => `
              <button class="appearance-option ${this.draft.appearance.skinTone === id ? "is-selected" : ""}" data-skin-tone="${id}" type="button" aria-pressed="${this.draft.appearance.skinTone === id}">
                <span class="appearance-swatch" style="--swatch:#${tone.color.toString(16).padStart(6, "0")}"></span>
                <strong>${tone.name}</strong>
              </button>`).join("")}
          </div>
        </section>
        <section data-appearance-section="face" ${facePanel ? "" : "hidden"}>
          <h3>Withheld</h3>
          <p class="appearance-note">Face shape, hair, facial hair, complexion detail and age are withheld until their canonical assets pass review. The creator never offers a control that cannot change what you see.</p>
        </section>
        </div>
      </div>
      ${this.navigation(
        this.appearanceEditProfile ? "Cancel" : facePanel ? "Return to body" : "Return to ancestry",
        this.appearanceEditProfile
          ? facePanel ? "Save appearance" : "Review face & features"
          : facePanel ? "Choose calling" : "Continue to face & features",
      )}`;
    // The preview has been alive since the name station; this station only points it.
    this.appearancePreview?.setAppearance(this.previewAppearance());
    this.updateAppearanceReadout();
    this.stage.querySelectorAll<HTMLButtonElement>("button[data-appearance-panel]").forEach((button) => {
      button.addEventListener("click", () => {
        const panel = button.dataset.appearancePanel;
        if (panel !== "body" && panel !== "face") return;
        this.switchAppearancePanel(panel);
      });
    });
    this.bindChoices("button[data-skin-tone]", "skinTone", (id) => {
      this.draft.appearance.skinTone = id as CharacterDraft["appearance"]["skinTone"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
      this.updateAppearanceReadout();
    });
    const leaveAppearance = (): void => {
      if (this.appearanceEditProfile) {
        this.appearanceEditProfile = null;
        this.releasePreview();
        this.root.hidden = true;
        return;
      }
      this.navigateBack("race");
    };
    const acceptAppearance = (): void => {
      const resolved = resolveCharacterAppearance(this.draft.appearance);
      // Every offered control resolves to an accepted asset, so this only trips
      // on a stale or hand-edited draft. It stays because the creator must never
      // bind an appearance the runtime cannot honour.
      if (!isCreatorAppearanceSelectionAvailable(resolved, this.appearanceAvailability)) {
        return this.fail("This appearance depends on an asset that has not passed review. Choose from what is offered.");
      }
      if (this.appearanceEditProfile) {
        const updated: CharacterProfile = {
          ...this.appearanceEditProfile,
          appearance: { ...this.draft.appearance },
          appearanceNeedsReview: false,
        };
        this.appearanceEditProfile = null;
        this.complete(updated, true);
        return;
      }
      this.navigate("calling");
    };
    // The handlers read the live panel so a body<->face switch can update the
    // labels in place without re-binding (and stacking) listeners.
    this.bindNavigation(
      () => {
        if (this.appearancePanel === "face" && !this.appearanceEditProfile) this.switchAppearancePanel("body");
        else leaveAppearance();
      },
      () => {
        if (this.appearancePanel === "face") acceptAppearance();
        else this.switchAppearancePanel("face");
      },
    );
  }

  /**
   * Switches between the body and face stations without rebuilding the stage.
   * Rebuilding destroyed the canvas and its WebGL context on every tab click,
   * re-fetched the idle pack, and painted the bind pose until it rebound - the
   * pose snap the owner saw. The preview instance, its context and its
   * animation survive; only the copy, the section visibility and the camera
   * station change.
   */
  private switchAppearancePanel(panel: "body" | "face"): void {
    if (this.appearancePanel === panel) return;
    this.appearancePanel = panel;
    const copy = APPEARANCE_PANEL_COPY[panel];
    const facePanel = panel === "face";
    this.error.textContent = "";
    this.stage.querySelectorAll<HTMLButtonElement>("button[data-appearance-panel]").forEach((button) => {
      const selected = button.dataset.appearancePanel === panel;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    const builder = this.stage.querySelector<HTMLElement>(".appearance-builder");
    if (builder) {
      builder.classList.remove("appearance-builder--body", "appearance-builder--face");
      builder.classList.add(`appearance-builder--${panel}`);
    }
    this.stage.querySelectorAll<HTMLElement>("[data-appearance-section]").forEach((section) => {
      section.hidden = section.dataset.appearanceSection !== panel;
    });
    const setText = (id: string, text: string): void => {
      const element = this.stage.querySelector<HTMLElement>(`#${id}`);
      if (element) element.textContent = text;
    };
    setText("appearance-eyebrow", copy.eyebrow);
    setText("appearance-title", copy.title);
    setText("appearance-lede", copy.lede);
    const back = this.stage.querySelector<HTMLButtonElement>("#creation-back");
    const next = this.stage.querySelector<HTMLButtonElement>("#creation-next");
    if (back) back.innerHTML = `← ${this.escape(this.appearanceEditProfile ? "Cancel" : facePanel ? "Return to body" : "Return to ancestry")}`;
    if (next) {
      next.innerHTML = `${this.escape(this.appearanceEditProfile
        ? facePanel ? "Save appearance" : "Review face & features"
        : facePanel ? "Choose calling" : "Continue to face & features")} <span>→</span>`;
    }
    this.applyStationPresentation();
    this.updateAppearanceReadout();
    resetCreationStageScroll(this.stage);
  }

  private showAppearanceLoadFailure(reason: string): void {
    const message = `Preview unavailable: ${reason}.`;
    this.stageStatus.textContent = message;
    this.stageStatus.classList.add("is-failed");
    this.stageStatus.hidden = false;
    const status = document.getElementById("appearance-preview-status");
    if (!status) return;
    status.textContent = message;
    status.classList.add("is-failed");
  }

  private renderCalling(): void {
    if (this.draft.callingId && raceCallingEligibility(this.draft.raceId, this.draft.callingId).status === "forbidden") {
      this.draft.callingId = "";
    }
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">The soul's calling</p>
        <h2>How did you survive the broken worlds?</h2>
        <p>Ancestry shapes the paths available to this returned body. Rare callings remain possible and carry cultural context.</p>
      </div>
      <div class="choice-grid choice-grid--callings">
        ${CALLINGS.map((calling) => {
          const resonance = raceCallingBonus(this.draft.raceId, calling.id);
          const eligibility = raceCallingEligibility(this.draft.raceId, calling.id);
          const forbidden = eligibility.status === "forbidden";
          return `
          <button class="choice-card choice-card--calling ${this.draft.callingId === calling.id ? "is-selected" : ""} ${resonance ? "has-ancestry-bonus" : ""} ${eligibility.status === "rare" ? "is-rare" : ""} ${forbidden ? "is-forbidden" : ""}" data-calling="${calling.id}" type="button" ${forbidden ? "disabled aria-disabled=\"true\"" : ""}>
            <img class="choice-card__portrait" src="${characterPortraitPath(this.draft.raceId, calling.id)}" alt="" />
            <span class="choice-card__glyph">${calling.glyph}</span>
            <span class="choice-card__title">${calling.name}</span>
            <span class="choice-card__body">${calling.identity}</span>
            <span class="choice-card__affinity">${calling.signatureSkill} · ${calling.defensiveSkill}</span>
            <span class="choice-card__job">${calling.tacticalJob}</span>
            <span class="choice-card__difficulty">${calling.learningCurve} start · ${calling.lateGameCeiling} ceiling</span>
            ${eligibility.status !== "allowed" ? `<span class="choice-card__eligibility choice-card__eligibility--${eligibility.status}"><strong>${eligibility.status}</strong>${this.escape(eligibility.reason ?? "")}</span>` : ""}
            ${resonance ? `<span class="choice-card__resonance">Ancestry resonance · ${resonance.name}</span>` : ""}
          </button>`;
        }).join("")}
      </div>
      ${this.navigation("Return to appearance", "Enter the memories")}`;
    this.bindChoices("button[data-calling]", "calling", (id) => { this.draft.callingId = id; });
    this.bindNavigation(() => this.navigateBack("appearance"), () => {
      if (!this.draft.callingId) return this.fail("Choose the calling that first answered the breach.");
      if (raceCallingEligibility(this.draft.raceId, this.draft.callingId).status === "forbidden") {
        this.draft.callingId = "";
        return this.fail("That ancestry cannot bind to this calling. Choose another path.");
      }
      this.navigate("memory", 0);
    });
  }

  private renderMemory(): void {
    const question = MEMORY_QUESTIONS[this.memoryIndex];
    if (!question) throw new Error("Character memory index is out of bounds.");
    const selected = this.draft.answers[question.id] ?? "";
    this.stage.innerHTML = `
      <div class="memory-number">Memory ${String(this.memoryIndex + 1).padStart(2, "0")}</div>
      <div class="creation-heading creation-heading--memory">
        <p class="eyebrow">Unstable recollection</p>
        <h2>${question.prompt}</h2>
        <p>${question.context}</p>
      </div>
      <div class="memory-answers">
        ${question.answers.map((answer, index) => `
          <button class="memory-answer ${selected === answer.id ? "is-selected" : ""}" data-answer="${answer.id}" type="button">
            <span>${String.fromCharCode(65 + index)}</span>
            <strong>${answer.text}</strong>
            <small>Awakens ${answer.skill}</small>
          </button>`).join("")}
      </div>
      ${this.navigation(this.memoryIndex === 0 ? "Return to calling" : "Previous memory", this.memoryIndex === MEMORY_QUESTIONS.length - 1 ? "Read the soul imprint" : "Accept this memory")}`;
    this.bindChoices("button[data-answer]", "answer", (id) => { this.draft.answers[question.id] = id; });
    this.bindNavigation(() => {
      this.navigateBack(this.memoryIndex === 0 ? "calling" : "memory", Math.max(0, this.memoryIndex - 1));
    }, () => {
      if (!this.draft.answers[question.id]) return this.fail("The Well waits for a truthful answer.");
      if (this.memoryIndex < MEMORY_QUESTIONS.length - 1) this.navigate("memory", this.memoryIndex + 1);
      else this.navigate("review");
    });
  }

  private renderReview(): void {
    let profile: CharacterProfile;
    try {
      profile = deriveCharacter(this.draft);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "The soul imprint is incomplete.");
      this.navigate("name");
      return;
    }
    const calling = callingById(profile.callingId);

    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">Soul imprint resolved</p>
        <h2>${this.escape(profile.name)}</h2>
        <p>${profile.raceName} · ${profile.callingName} · The Well recognizes this pattern.</p>
      </div>
      <div class="imprint-review">
        <section class="imprint-seal">
          <img src="${characterPortraitPath(profile.raceId, profile.callingId)}" alt="${this.escape(profile.raceName)} ${this.escape(profile.callingName)}" />
          <span>${profile.raceGlyph}</span>
          <strong>${profile.callingName}</strong>
          <small>${profile.raceName} soul</small>
        </section>
        <section>
          <h3>Derived attributes</h3>
          <div class="stat-weave">
            ${STAT_KEYS.map((key) => `<div><span>${STAT_LABELS[key]}</span><strong>${profile.stats[key]}</strong></div>`).join("")}
          </div>
          <div class="derived-vitals">
            <span>Vitality <strong>${profile.maxHp}</strong></span>
            <span>Armor <strong>${calling.startingArmor}</strong></span>
            <span>Soul stability <strong>${profile.maxStability}%</strong></span>
            <span>Movement <strong>${profile.movement}</strong></span>
          </div>
          <p class="curve-note"><strong>${calling.learningCurve} starting curve</strong><span>${calling.lateGameCeiling} late-game ceiling</span></p>
        </section>
        <section class="imprint-skills">
          <h3>Initial skills</h3>
          <ul>${profile.skills.map((skill) => `<li>${skill}</li>`).join("")}</ul>
          ${profile.ancestryCallingBonus ? `<p class="resonance-note"><strong>${profile.ancestryCallingBonus.name}</strong>${profile.ancestryCallingBonus.description}</p>` : ""}
        </section>
        <section class="memory-consequences">
          <h3>Memory threads</h3>
          <ul>${profile.memoryConsequences.map((memory) => `<li>${memory}</li>`).join("")}</ul>
        </section>
      </div>
      <div class="creation-actions">
        <button class="ritual-button" id="creation-back" type="button">← Reconsider memories</button>
        <button class="ritual-button ritual-button--primary" id="creation-confirm" type="button">Awaken at the Soul Well <span>◇</span></button>
      </div>`;
    requiredElement<HTMLButtonElement>("creation-back").addEventListener("click", () => {
      this.navigateBack("memory", MEMORY_QUESTIONS.length - 1);
    });
    requiredElement<HTMLButtonElement>("creation-confirm").addEventListener("click", () => {
      this.complete(profile);
    });
  }

  private complete(profile: CharacterProfile, resumeSavedSoul = false): void {
    profile.appearance ??= {
      bodyType: "foundation",
      faceType: "foundation",
      hairStyle: "shaved-buzzed",
      skinTone: "ashen",
      facialHair: "none",
      hairColor: "dark-brown",
      age: 0,
      hairGreying: 0,
      facialHairGreying: 0,
    };
    this.root.classList.add("is-dissolving");
    window.setTimeout(() => {
      this.root.hidden = true;
      window.removeEventListener("popstate", this.onPopState);
      // Release the creator's context before the game can create its own: two live
      // contexts is the exact failure mobile Safari punishes with a blank canvas.
      this.releasePreview();
      this.onComplete(profile, resumeSavedSoul);
    }, 520);
  }

  private navigation(backLabel: string, nextLabel: string): string {
    return `<div class="creation-actions">
      <button class="ritual-button" id="creation-back" type="button">← ${backLabel}</button>
      <button class="ritual-button ritual-button--primary" id="creation-next" type="button">${nextLabel} <span>→</span></button>
    </div>`;
  }

  private bindNavigation(back: () => void, next: () => void): void {
    requiredElement<HTMLButtonElement>("creation-back").addEventListener("click", back);
    requiredElement<HTMLButtonElement>("creation-next").addEventListener("click", next);
  }

  private bindChoices(selector: string, dataKey: string, select: (id: string) => void): void {
    this.stage.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset[dataKey];
        if (!id) return;
        select(id);
        this.stage.querySelectorAll<HTMLElement>(selector).forEach((candidate) => {
          candidate.classList.remove("is-selected");
          candidate.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
      });
    });
  }

  private updateAppearanceAvailability(availability: CreationPreviewAvailability): void {
    // Fires once the canonical model has loaded and been inspected, so it doubles
    // as the honest "loaded" signal for the readout.
    this.appearanceAvailability = availability;
    if (availability !== EMPTY_CREATION_PREVIEW_AVAILABILITY) this.stageStatus.hidden = true;
    this.updateAppearanceReadout();
  }

  private updateAppearanceReadout(): void {
    const status = document.getElementById("appearance-preview-status");
    if (!status || status.classList.contains("is-failed")) return;
    if (this.appearanceAvailability === EMPTY_CREATION_PREVIEW_AVAILABILITY) return;
    const appearance = resolveCharacterAppearance(this.draft.appearance);
    const tone = SKIN_TONES[appearance.skinTone]?.name ?? appearance.skinTone;
    status.textContent = `Human foundation · ${tone}`;
  }

  private fail(message: string): void {
    this.error.textContent = message;
  }

  private escape(value: string): string {
    const span = document.createElement("span");
    span.textContent = value;
    return span.innerHTML;
  }
}
