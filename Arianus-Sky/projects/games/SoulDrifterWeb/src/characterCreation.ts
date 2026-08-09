import {
  CALLINGS,
  callingById,
  deriveCharacter,
  HAIR_STYLES,
  MEMORY_QUESTIONS,
  normalizeLegacyCharacterProfile,
  RACES,
  raceCallingBonus,
  SKIN_TONES,
  STAT_KEYS,
  STAT_LABELS,
  type CharacterDraft,
  type CharacterProfile,
} from "./game/character";

function characterPortraitPath(raceId: string, callingId: string): string {
  return raceId === "elf" && callingId === "shadowknight"
    ? "/assets/3d/characters/elf-shadowknight/elf-shadowknight-preview-front.png"
    : `/assets/generated/characters/${raceId}-${callingId}.png`;
}

type CreationStep = "name" | "race" | "appearance" | "calling" | "memory" | "review";

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
    appearance: { hairStyle: "shaved", skinTone: "ashen" },
    answers: {},
  };
  private step: CreationStep = "name";
  private memoryIndex = 0;
  private appearanceEditProfile: CharacterProfile | null = null;

  public constructor(
    private readonly onComplete: (profile: CharacterProfile, resumeSavedSoul: boolean) => void,
    private readonly savedProfile: CharacterProfile | null = null,
  ) {
    window.addEventListener("souldrifter:edit-appearance", (event) => {
      const profile = (event as CustomEvent<{ profile?: CharacterProfile }>).detail?.profile;
      if (profile) this.editAppearance(profile);
    });
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
          <img src="${characterPortraitPath(this.savedProfile.raceId, this.savedProfile.callingId)}" alt="" />
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
      this.step = "race";
      this.render();
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
    this.bindChoices("button[data-race]", "race", (id) => { this.draft.raceId = id; });
    this.bindNavigation(() => { this.step = "name"; }, () => {
      if (!this.draft.raceId) return this.fail("Choose the ancestry carried by this soul.");
      this.step = "appearance";
      this.render();
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
      </div>
      ${this.navigation(this.appearanceEditProfile ? "Cancel" : "Return to ancestry", this.appearanceEditProfile ? "Save appearance" : "Choose calling")}`;
    this.bindChoices("button[data-skin-tone]", "skinTone", (id) => {
      this.draft.appearance.skinTone = id as CharacterDraft["appearance"]["skinTone"];
    });
    this.bindChoices("button[data-hair-style]", "hairStyle", (id) => {
      this.draft.appearance.hairStyle = id as CharacterDraft["appearance"]["hairStyle"];
    });
    this.bindNavigation(() => {
      if (this.appearanceEditProfile) {
        this.appearanceEditProfile = null;
        this.root.hidden = true;
        return;
      }
      this.step = "race";
      this.render();
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
      this.step = "calling";
      this.render();
    });
  }

  private renderCalling(): void {
    this.stage.innerHTML = `
      <div class="creation-heading">
        <p class="eyebrow">The soul's calling</p>
        <h2>How did you survive the broken worlds?</h2>
        <p>Your calling grants its signature and defensive skill. Race never restricts this choice.</p>
      </div>
      <div class="choice-grid choice-grid--callings">
        ${CALLINGS.map((calling) => {
          const resonance = raceCallingBonus(this.draft.raceId, calling.id);
          return `
          <button class="choice-card choice-card--calling ${this.draft.callingId === calling.id ? "is-selected" : ""} ${resonance ? "has-ancestry-bonus" : ""}" data-calling="${calling.id}" type="button">
            <img class="choice-card__portrait" src="${characterPortraitPath(this.draft.raceId, calling.id)}" alt="" />
            <span class="choice-card__glyph">${calling.glyph}</span>
            <span class="choice-card__title">${calling.name}</span>
            <span class="choice-card__body">${calling.identity}</span>
            <span class="choice-card__affinity">${calling.signatureSkill} · ${calling.defensiveSkill}</span>
            <span class="choice-card__job">${calling.tacticalJob}</span>
            <span class="choice-card__difficulty">${calling.learningCurve} start · ${calling.lateGameCeiling} ceiling</span>
            ${resonance ? `<span class="choice-card__resonance">Ancestry resonance · ${resonance.name}</span>` : ""}
          </button>`;
        }).join("")}
      </div>
      ${this.navigation("Return to appearance", "Enter the memories")}`;
    this.bindChoices("button[data-calling]", "calling", (id) => { this.draft.callingId = id; });
    this.bindNavigation(() => { this.step = "appearance"; }, () => {
      if (!this.draft.callingId) return this.fail("Choose the calling that first answered the breach.");
      this.memoryIndex = 0;
      this.step = "memory";
      this.render();
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
      if (this.memoryIndex === 0) this.step = "calling";
      else this.memoryIndex -= 1;
      this.render();
    }, () => {
      if (!this.draft.answers[question.id]) return this.fail("The Well waits for a truthful answer.");
      if (this.memoryIndex < MEMORY_QUESTIONS.length - 1) this.memoryIndex += 1;
      else this.step = "review";
      this.render();
    });
  }

  private renderReview(): void {
    let profile: CharacterProfile;
    try {
      profile = deriveCharacter(this.draft);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "The soul imprint is incomplete.");
      this.step = "name";
      this.render();
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
      this.memoryIndex = MEMORY_QUESTIONS.length - 1;
      this.step = "memory";
      this.render();
    });
    requiredElement<HTMLButtonElement>("creation-confirm").addEventListener("click", () => {
      this.complete(profile);
    });
  }

  private complete(profile: CharacterProfile, resumeSavedSoul = false): void {
    profile.appearance ??= { hairStyle: "shaved", skinTone: "ashen" };
    this.root.classList.add("is-dissolving");
    window.setTimeout(() => {
      this.root.hidden = true;
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
