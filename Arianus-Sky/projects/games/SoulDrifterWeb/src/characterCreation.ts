import {
  BODY_TYPES,
  CALLINGS,
  callingById,
  deriveCharacter,
  FACIAL_HAIR_STYLES,
  FACE_TYPES,
  HAIR_COLORS,
  HAIR_STYLES,
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
  type CreationPreviewAvailability,
} from "./creationPreview";

export function characterPortraitPath(raceId: string, callingId: string): string {
  if (callingId === "shadowknight") {
    return `/assets/generated/characters/${raceId}-shadowknight-highlevel.png`;
  }
  return `/assets/generated/characters/${raceId}-${callingId}.png`;
}

type CreationStep = "name" | "race" | "appearance" | "calling" | "memory" | "review";

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

export function isCreatorAppearanceSelectionAvailable(
  appearance: ResolvedCharacterAppearance,
  availability: CreationPreviewAvailability,
): boolean {
  return availability.hairStyles.includes(appearance.hairStyle)
    && availability.facialHair.includes(appearance.facialHair)
    && (appearance.age === 0 || availability.ageMorphsAvailable);
}

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
    this.render();
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
    this.step = "appearance";
    this.root.classList.remove("is-dissolving");
    this.root.hidden = false;
    window.history.pushState(this.creationHistoryState(), "");
    this.render();
  }

  private render(): void {
    this.error.textContent = "";
    this.appearancePreview?.dispose();
    this.appearancePreview = null;
    this.renderProgress();

    if (this.step === "name") this.renderName();
    else if (this.step === "race") this.renderRace();
    else if (this.step === "appearance") this.renderAppearance();
    else if (this.step === "calling") this.renderCalling();
    else if (this.step === "memory") this.renderMemory();
    else this.renderReview();
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
      this.navigate("appearance");
    });
  }

  private renderAppearance(): void {
    this.draft.appearance = resolveCharacterAppearance(this.draft.appearance);
    this.appearanceAvailability = EMPTY_CREATION_PREVIEW_AVAILABILITY;
    const appearance = resolveCharacterAppearance(this.draft.appearance);
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">The returned body · Human foundation</p>
        <h2>Which face did the Soul Well remember?</h2>
        <p>Set the living pattern now. Canonical hair modules are fitted to this rig; unavailable families remain sealed until their provider asset passes inspection.</p>
      </div>
      <div class="appearance-builder">
        <div class="appearance-preview">
          <div class="appearance-preview__viewport">
            <canvas id="appearance-preview-canvas" aria-label="Live preview of your returned body. Drag to rotate."></canvas>
            <span class="appearance-preview__sigil" aria-hidden="true">◇</span>
          </div>
          <div class="appearance-preview__readout" aria-live="polite">
            <span>Live soul assay · drag to turn</span>
            <strong id="appearance-preview-asset-status">Scalp-ready · provider scan in progress</strong>
            <small id="appearance-preview-age-status">Young Adult · 0% greying</small>
          </div>
        </div>
        <div class="appearance-builder__options">
        <section>
          <h3>Body type</h3>
          <div class="appearance-options">
            ${BODY_TYPES.map((body) => `
              <button class="appearance-option ${(this.draft.appearance.bodyType ?? "foundation") === body.id ? "is-selected" : ""}" data-body-type="${body.id}" type="button" aria-pressed="${(this.draft.appearance.bodyType ?? "foundation") === body.id}">
                <strong>${body.name}</strong><small>${body.description}</small>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Face</h3>
          <div class="appearance-options">
            ${FACE_TYPES.map((face) => `
              <button class="appearance-option ${(this.draft.appearance.faceType ?? "foundation") === face.id ? "is-selected" : ""}" data-face-type="${face.id}" type="button" aria-pressed="${(this.draft.appearance.faceType ?? "foundation") === face.id}">
                <strong>${face.name}</strong><small>${face.description}</small>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Skin tone</h3>
          <div class="appearance-options appearance-options--skin">
            ${Object.entries(SKIN_TONES).map(([id, tone]) => `
              <button class="appearance-option ${this.draft.appearance.skinTone === id ? "is-selected" : ""}" data-skin-tone="${id}" type="button" aria-pressed="${this.draft.appearance.skinTone === id}">
                <span class="appearance-swatch" style="--swatch:#${tone.color.toString(16).padStart(6, "0")}"></span>
                <strong>${tone.name}</strong>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Hair</h3>
          <div class="appearance-options appearance-options--hair">
            ${HAIR_STYLES.map((style) => `
              <button class="appearance-option ${appearance.hairStyle === style.id ? "is-selected" : ""} ${style.id === "shaved-buzzed" ? "is-provider-ready" : "is-provider-pending"}" data-hair-style="${style.id}" type="button" aria-pressed="${appearance.hairStyle === style.id}" ${style.id === "shaved-buzzed" ? "" : "disabled aria-disabled=\"true\""}>
                <strong>${style.name}</strong><small>${style.description}</small>
                <em class="appearance-option__availability">${style.id === "shaved-buzzed" ? "Scalp-ready" : "Awaiting canonical asset"}</em>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Natural hair color</h3>
          <div class="appearance-colors" role="group" aria-label="Natural hair color">
            ${(Object.entries(HAIR_COLORS) as [keyof typeof HAIR_COLORS, (typeof HAIR_COLORS)[keyof typeof HAIR_COLORS]][]).map(([id, color]) => `
              <button class="appearance-color ${appearance.hairColor === id ? "is-selected" : ""}" data-hair-color="${id}" type="button" aria-label="${color.name}" aria-pressed="${appearance.hairColor === id}" title="${color.name}">
                <span style="--hair-swatch:#${color.color.toString(16).padStart(6, "0")}"></span><small>${color.name}</small>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Facial hair</h3>
          <div class="appearance-options appearance-options--beard">
            ${FACIAL_HAIR_STYLES.map((style) => `
              <button class="appearance-option ${appearance.facialHair === style.id ? "is-selected" : ""} ${style.id === "none" ? "is-provider-ready" : "is-provider-pending"}" data-facial-hair="${style.id}" type="button" aria-pressed="${appearance.facialHair === style.id}" ${style.id === "none" ? "" : "disabled aria-disabled=\"true\""}>
                <strong>${style.name}</strong><small>${style.description}</small>
                <em class="appearance-option__availability">${style.id === "none" ? "Face-ready" : "Awaiting canonical asset"}</em>
              </button>`).join("")}
          </div>
        </section>
        <section class="appearance-assay" aria-labelledby="appearance-age-heading">
          <div class="appearance-assay__heading">
            <h3 id="appearance-age-heading">Age &amp; greying</h3>
            <span id="appearance-morph-status" class="appearance-provider-status">Age morph scan pending</span>
          </div>
          <label class="appearance-range">
            <span><strong>Adult age</strong><output id="appearance-age-output">${appearanceAgeStage(appearance.age)}</output></span>
            <input id="appearance-age" type="range" min="0" max="1" step="0.01" value="${appearance.age}" aria-describedby="appearance-age-stages appearance-morph-status" />
            <small id="appearance-age-stages"><span>Young Adult</span><span>Middle-Aged</span><span>Elder</span></small>
          </label>
          <label class="appearance-range">
            <span><strong>Hair greying</strong><output id="appearance-hair-greying-output">${appearanceControlPercent(appearance.hairGreying)}%</output></span>
            <input id="appearance-hair-greying" type="range" min="0" max="1" step="0.01" value="${appearance.hairGreying}" />
          </label>
          <label class="appearance-range">
            <span><strong>Facial-hair greying</strong><output id="appearance-facial-greying-output">${appearanceControlPercent(appearance.facialHairGreying)}%</output></span>
            <input id="appearance-facial-greying" type="range" min="0" max="1" step="0.01" value="${appearance.facialHairGreying}" />
          </label>
        </section>
        </div>
      </div>
      ${this.navigation(this.appearanceEditProfile ? "Cancel" : "Return to ancestry", this.appearanceEditProfile ? "Save appearance" : "Choose calling")}`;
    const previewCanvas = requiredElement<HTMLCanvasElement>("appearance-preview-canvas");
    this.appearancePreview = new CreationAvatarPreview(previewCanvas, {
      hairStyle: this.draft.appearance.hairStyle,
      skinTone: this.draft.appearance.skinTone,
      raceId: this.draft.raceId || "human",
      facialHair: this.draft.appearance.facialHair,
      hairColor: this.draft.appearance.hairColor,
      age: this.draft.appearance.age,
      hairGreying: this.draft.appearance.hairGreying,
      facialHairGreying: this.draft.appearance.facialHairGreying,
    }, (availability) => this.updateAppearanceAvailability(availability));
    this.bindChoices("button[data-body-type]", "bodyType", (id) => {
      this.draft.appearance.bodyType = id as CharacterDraft["appearance"]["bodyType"];
    });
    this.bindChoices("button[data-face-type]", "faceType", (id) => {
      this.draft.appearance.faceType = id as CharacterDraft["appearance"]["faceType"];
    });
    this.bindChoices("button[data-skin-tone]", "skinTone", (id) => {
      this.draft.appearance.skinTone = id as CharacterDraft["appearance"]["skinTone"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
    });
    this.bindChoices("button[data-hair-style]", "hairStyle", (id) => {
      this.draft.appearance.hairStyle = id as CharacterDraft["appearance"]["hairStyle"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
      this.updateAppearanceReadout();
    });
    this.bindChoices("button[data-hair-color]", "hairColor", (id) => {
      this.draft.appearance.hairColor = id as CharacterDraft["appearance"]["hairColor"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
      this.updateAppearanceReadout();
    });
    this.bindChoices("button[data-facial-hair]", "facialHair", (id) => {
      this.draft.appearance.facialHair = id as CharacterDraft["appearance"]["facialHair"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
      this.updateAppearanceReadout();
    });
    this.bindAppearanceRange("appearance-age", "age", "appearance-age-output", (value) => appearanceAgeStage(value));
    this.bindAppearanceRange("appearance-hair-greying", "hairGreying", "appearance-hair-greying-output", (value) => `${appearanceControlPercent(value)}%`);
    this.bindAppearanceRange("appearance-facial-greying", "facialHairGreying", "appearance-facial-greying-output", (value) => `${appearanceControlPercent(value)}%`);
    this.bindNavigation(() => {
      if (this.appearanceEditProfile) {
        this.appearanceEditProfile = null;
        this.root.hidden = true;
        return;
      }
      this.navigateBack("race");
    }, () => {
      const resolved = resolveCharacterAppearance(this.draft.appearance);
      if (!isCreatorAppearanceSelectionAvailable(resolved, this.appearanceAvailability)) {
        return this.fail(resolved.age > 0 && !this.appearanceAvailability.ageMorphsAvailable
          ? "This age pattern is awaiting the canonical facial morph asset. Return the age control to Young Adult or wait for provider approval."
          : "That hair pattern is awaiting its canonical provider asset. Choose a ready option before binding this body.");
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
    });
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

  private bindAppearanceRange(
    inputId: string,
    key: "age" | "hairGreying" | "facialHairGreying",
    outputId: string,
    format: (value: number) => string,
  ): void {
    const input = requiredElement<HTMLInputElement>(inputId);
    const output = requiredElement<HTMLOutputElement>(outputId);
    input.addEventListener("input", () => {
      const value = Math.min(1, Math.max(0, Number(input.value)));
      this.draft.appearance[key] = value;
      output.value = format(value);
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
      this.updateAppearanceReadout();
    });
  }

  private updateAppearanceAvailability(availability: CreationPreviewAvailability): void {
    this.appearanceAvailability = availability;
    const setAvailability = (selector: string, availableIds: readonly string[], dataKey: string): void => {
      this.stage.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
        const available = availableIds.includes(button.dataset[dataKey] ?? "");
        button.disabled = !available;
        button.setAttribute("aria-disabled", String(!available));
        button.classList.toggle("is-provider-ready", available);
        button.classList.toggle("is-provider-pending", !available);
        const status = button.querySelector<HTMLElement>(".appearance-option__availability");
        if (status) status.textContent = available
          ? button.dataset[dataKey] === "shaved-buzzed" ? "Scalp-ready" : "Canonical module ready"
          : "Awaiting canonical asset";
      });
    };
    setAvailability("button[data-hair-style]", availability.hairStyles, "hairStyle");
    setAvailability("button[data-facial-hair]", availability.facialHair, "facialHair");
    const morphStatus = this.stage.querySelector<HTMLElement>("#appearance-morph-status");
    if (morphStatus) {
      morphStatus.textContent = availability.ageMorphsAvailable ? "Canonical age morphs ready" : "Awaiting canonical facial morphs";
      morphStatus.classList.toggle("is-ready", availability.ageMorphsAvailable);
    }
    this.updateAppearanceReadout();
  }

  private updateAppearanceReadout(): void {
    const appearance = resolveCharacterAppearance(this.draft.appearance);
    const ready = isCreatorAppearanceSelectionAvailable(appearance, this.appearanceAvailability);
    const assetStatus = this.stage.querySelector<HTMLElement>("#appearance-preview-asset-status");
    const ageStatus = this.stage.querySelector<HTMLElement>("#appearance-preview-age-status");
    if (assetStatus) {
      assetStatus.textContent = ready ? "Selected pattern ready" : "Selected pattern awaiting canonical asset";
      assetStatus.classList.toggle("is-pending", !ready);
    }
    if (ageStatus) {
      ageStatus.textContent = `${appearanceAgeStage(appearance.age)} · ${appearanceControlPercent(appearance.hairGreying)}% hair greying · ${appearanceControlPercent(appearance.facialHairGreying)}% facial greying`;
    }
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
