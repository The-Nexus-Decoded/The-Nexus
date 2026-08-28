import {
  CALLINGS,
  callingById,
  deriveCharacter,
  FACIAL_HAIR_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MEMORY_QUESTIONS,
  normalizeLegacyCharacterProfile,
  RACES,
  raceCallingBonus,
  raceCallingEligibility,
  SKIN_TONES,
  STAT_KEYS,
  STAT_LABELS,
  type CharacterDraft,
  type CharacterProfile,
} from "./game/character";
import { CreationAvatarPreview } from "./creationPreview";

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

export class CharacterCreation {
  private readonly root = requiredElement<HTMLElement>("character-creation");
  private readonly stage = requiredElement<HTMLElement>("creation-stage");
  private readonly progress = requiredElement<HTMLOListElement>("creation-progress");
  private readonly error = requiredElement<HTMLParagraphElement>("creation-error");
  private readonly draft: CharacterDraft = {
    name: "",
    raceId: "",
    callingId: "",
    appearance: { hairStyle: "shaved", hairColor: "silver-white", skinTone: "ashen", facialHair: "none" },
    answers: {},
  };
  private step: CreationStep = "name";
  private memoryIndex = 0;
  private appearanceEditProfile: CharacterProfile | null = null;
  private appearancePreview: CreationAvatarPreview | null = null;

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
        ${RACES.map((race) => `
          <button class="choice-card ${this.draft.raceId === race.id ? "is-selected" : ""}" data-race="${race.id}" type="button">
            <img class="choice-card__portrait" src="/assets/generated/characters/${race.id}-warrior.png" alt="" />
            <span class="choice-card__glyph">${race.glyph}</span>
            <span class="choice-card__title">${race.name}</span>
            <span class="choice-card__body">${race.identity}</span>
            <span class="choice-card__affinity">${race.talent}</span>
          </button>`).join("")}
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
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">The returned body</p>
        <h2>Which face did the Soul Well remember?</h2>
        <p>Hair and skin are modular appearance choices. Armor and weapons attach to the same rig later.</p>
      </div>
      <div class="appearance-builder">
        <div class="appearance-preview">
          <canvas id="appearance-preview-canvas" aria-label="Live preview of your returned body. Drag to rotate."></canvas>
          <small>Live preview · drag to turn</small>
        </div>
        <div class="appearance-builder__options">
        <section>
          <h3>Skin tone</h3>
          <div class="appearance-options appearance-options--skin">
            ${Object.entries(SKIN_TONES).map(([id, tone]) => `
              <button class="appearance-option ${this.draft.appearance.skinTone === id ? "is-selected" : ""}" data-skin-tone="${id}" type="button">
                <span class="appearance-swatch" style="--swatch:#${tone.color.toString(16).padStart(6, "0")}"></span>
                <strong>${tone.name}</strong>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Hair</h3>
          <div class="appearance-options appearance-options--hair">
            ${HAIR_STYLES.map((style) => `
              <button class="appearance-option ${this.draft.appearance.hairStyle === style.id ? "is-selected" : ""}" data-hair-style="${style.id}" type="button">
                <strong>${style.name}</strong><small>${style.description}</small>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Hair color</h3>
          <div class="appearance-options appearance-options--hair-color">
            ${Object.entries(HAIR_COLORS).map(([id, hairColor]) => `
              <button class="appearance-option ${this.draft.appearance.hairColor === id ? "is-selected" : ""}" data-hair-color="${id}" type="button">
                <span class="appearance-swatch" style="--swatch:#${hairColor.color.toString(16).padStart(6, "0")}"></span>
                <strong>${hairColor.name}</strong>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h3>Facial hair</h3>
          <div class="appearance-options appearance-options--beard">
            ${FACIAL_HAIR_STYLES.map((style) => `
              <button class="appearance-option ${(this.draft.appearance.facialHair ?? "none") === style.id ? "is-selected" : ""}" data-facial-hair="${style.id}" type="button">
                <strong>${style.name}</strong><small>${style.description}</small>
              </button>`).join("")}
          </div>
        </section>
        </div>
      </div>
      ${this.navigation(this.appearanceEditProfile ? "Cancel" : "Return to ancestry", this.appearanceEditProfile ? "Save appearance" : "Choose calling")}`;
    const previewCanvas = requiredElement<HTMLCanvasElement>("appearance-preview-canvas");
    this.appearancePreview = new CreationAvatarPreview(previewCanvas, {
      hairStyle: this.draft.appearance.hairStyle,
      hairColor: this.draft.appearance.hairColor,
      skinTone: this.draft.appearance.skinTone,
      raceId: this.draft.raceId || "human",
      facialHair: this.draft.appearance.facialHair,
    });
    this.bindChoices("button[data-skin-tone]", "skinTone", (id) => {
      this.draft.appearance.skinTone = id as CharacterDraft["appearance"]["skinTone"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
    });
    this.bindChoices("button[data-hair-style]", "hairStyle", (id) => {
      this.draft.appearance.hairStyle = id as CharacterDraft["appearance"]["hairStyle"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
    });
    this.bindChoices("button[data-hair-color]", "hairColor", (id) => {
      this.draft.appearance.hairColor = id as CharacterDraft["appearance"]["hairColor"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
    });
    this.bindChoices("button[data-facial-hair]", "facialHair", (id) => {
      this.draft.appearance.facialHair = id as CharacterDraft["appearance"]["facialHair"];
      this.appearancePreview?.setAppearance({ ...this.draft.appearance, raceId: this.draft.raceId || "human" });
    });
    this.bindNavigation(() => {
      if (this.appearanceEditProfile) {
        this.appearanceEditProfile = null;
        this.root.hidden = true;
        return;
      }
      this.navigateBack("race");
    }, () => {
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
    profile.appearance ??= { hairStyle: "shaved", hairColor: "silver-white", skinTone: "ashen", facialHair: "none" };
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
        this.stage.querySelectorAll(selector).forEach((candidate) => candidate.classList.remove("is-selected"));
        button.classList.add("is-selected");
      });
    });
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
