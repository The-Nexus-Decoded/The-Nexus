import { PILOT_SKIN_PRESETS, type PilotSkinPresetId } from "./game/pilotSkinReview";

type ReviewDecision = "approved" | "rejected" | "needs-fix";

interface ReviewRecord {
  decision: ReviewDecision;
  note: string;
  updatedAt: string;
}

export interface PilotAnimationReviewBridge {
  reviewAnimations(): readonly string[];
  reviewAncestry(): string;
  playReview(animation: string, loop: boolean): number;
  pauseReview(paused: boolean): void;
  pose(animation: string, normalizedTime: number): void;
  setReviewSkin(preset: PilotSkinPresetId): Promise<{ applied: boolean; materialCount: number; reason?: string }>;
  snapshot(): {
    playerAnimation: string;
    playerAnimationTime: number;
    playerAnimationDuration: number;
    grounding?: {
      floorWorldY: number;
      lowerBoundWorldY: number;
      clearanceMeters: number;
      floorCorrectionMeters: number;
      baseGroundingOffsetMeters: number;
      appliedGroundingOffsetMeters: number;
      penetrationLiftMeters: number;
      pivotResponseMetersPerMeter: number;
      toleranceMeters: number;
      sourceRootBaselineY: number;
      targetRootRestY: number;
      normalizedRootStartY: number;
      currentRootY: number;
      authoredRootDeltaY: number;
      airborneClearanceAllowed: boolean;
      pass: boolean;
    };
  };
}

declare global {
  interface Window {
    __SOULDRIFTER_PILOT_REVIEW__?: PilotAnimationReviewBridge;
  }
}

const STORAGE_KEY = "souldrifter:issue-487:human-animation-review:v1";

function required<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing animation review control ${selector}`);
  return element;
}

function loadDecisions(): Record<string, ReviewRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, ReviewRecord>;
  } catch {
    return {};
  }
}

function saveDecisions(decisions: Record<string, ReviewRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

async function waitForReviewBridge(): Promise<PilotAnimationReviewBridge> {
  for (let attempt = 0; attempt < 1_200; attempt += 1) {
    const bridge = window.__SOULDRIFTER_PILOT_REVIEW__ ?? window.__SOULDRIFTER_DEBUG__;
    if (bridge && bridge.reviewAnimations().length > 0) return bridge;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  throw new Error("The issue #487 animation library did not become ready.");
}

function downloadReview(decisions: Record<string, ReviewRecord>, clips: readonly string[]): void {
  const body = JSON.stringify({
    schemaVersion: 1,
    issue: 487,
    generatedAt: new Date().toISOString(),
    clipCount: clips.length,
    reviewedCount: Object.keys(decisions).length,
    decisions,
  }, null, 2);
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([`${body}\n`], { type: "application/json" }));
  anchor.download = `issue-487-human-animation-review-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}

export function installPilotAnimationReview(): void {
  if (!import.meta.env.DEV || new URL(window.location.href).searchParams.get("animationReview") !== "1") return;
  void waitForReviewBridge().then((bridge) => {
    const clips = bridge.reviewAnimations();
    const ancestry = bridge.reviewAncestry();
    const decisions = loadDecisions();
    const panel = document.createElement("aside");
    panel.id = "pilot-animation-review";
    panel.innerHTML = `
      <style>
        #pilot-animation-review{position:fixed;right:14px;top:14px;z-index:500;width:min(390px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;padding:14px;border:1px solid #d6a84c;border-radius:12px;background:rgba(3,12,13,.96);color:#f3dfb4;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 18px 50px #000b}
        #pilot-animation-review h2{margin:0 0 4px;font:700 18px Georgia,serif;color:#fff2cf}
        #pilot-animation-review p{margin:0 0 10px;color:#b9c9c7}
        #pilot-animation-review label{display:grid;gap:4px;margin:8px 0}
        #pilot-animation-review select,#pilot-animation-review input,#pilot-animation-review textarea,#pilot-animation-review button{font:inherit;color:#f7ead0;background:#102122;border:1px solid #426664;border-radius:7px;padding:7px}
        #pilot-animation-review select[size]{min-height:180px}
        #pilot-animation-review textarea{min-height:58px;resize:vertical}
        #pilot-animation-review button{cursor:pointer;background:#173536}
        #pilot-animation-review button:hover{border-color:#d6a84c}
        #pilot-animation-review .collapse{float:right;position:sticky;top:0;z-index:1;width:auto;padding:5px 9px}
        #pilot-animation-review .row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
        #pilot-animation-review .row>*{flex:1}
        #pilot-animation-review .decision button[data-decision="approved"]{border-color:#3e9c72}
        #pilot-animation-review .decision button[data-decision="rejected"]{border-color:#be5f5f}
        #pilot-animation-review .decision button[data-decision="needs-fix"]{border-color:#d2a64b}
        #pilot-animation-review .status{padding:8px;border-radius:7px;background:#0a191a;color:#9fe8dd}
        #pilot-animation-review .meter{display:flex;justify-content:space-between;color:#b9c9c7}
        #pilot-animation-review.is-collapsed{width:auto;max-height:none;overflow:hidden}
        #pilot-animation-review.is-collapsed>*:not(style):not(h2):not(.collapse){display:none}
      </style>
      <button class="collapse" data-collapse>Minimize</button>
      <h2>Human Animation Pilot</h2>
      <p>Issue #487 · BREACH-V2 dungeon · ${clips.length} same-rig candidates</p>
      <div class="status" data-review-status>Ready</div>
      <output class="status" data-testid="pilot-grounding-status" data-pass="pending">Grounding pending</output>
      <label>Category<select data-category></select></label>
      <label>Find animation<input data-search type="search" placeholder="walk, sword, death…"></label>
      <label>Animation<select data-clips size="9"></select></label>
      <div class="row"><button data-prev>Previous</button><button data-play>Play</button><button data-pause>Pause</button><button data-next>Next</button></div>
      <label>Scrub<input data-scrub type="range" min="0" max="1000" value="0"></label>
      <div class="meter"><span data-time>0.00 / 0.00s</span><span data-review-count></span></div>
      <div class="row"><label><input data-loop type="checkbox"> Loop</label><label><input data-auto type="checkbox"> Auto-cycle</label></div>
      <label>Skin material<select data-skin></select></label>
      <div class="row decision"><button data-decision="approved">Approve</button><button data-decision="needs-fix">Needs fix</button><button data-decision="rejected">Reject</button></div>
      <label>Review note<textarea data-note placeholder="Hands, feet, joint, timing, weapon contact…"></textarea></label>
      <div class="row"><button data-export>Export decisions</button></div>
    `;
    document.body.append(panel);

    const category = required<HTMLSelectElement>(panel, "[data-category]");
    const search = required<HTMLInputElement>(panel, "[data-search]");
    const clipList = required<HTMLSelectElement>(panel, "[data-clips]");
    const status = required<HTMLElement>(panel, "[data-review-status]");
    const groundingStatus = required<HTMLOutputElement>(panel, '[data-testid="pilot-grounding-status"]');
    const note = required<HTMLTextAreaElement>(panel, "[data-note]");
    const scrub = required<HTMLInputElement>(panel, "[data-scrub]");
    const time = required<HTMLElement>(panel, "[data-time]");
    const count = required<HTMLElement>(panel, "[data-review-count]");
    const loop = required<HTMLInputElement>(panel, "[data-loop]");
    const auto = required<HTMLInputElement>(panel, "[data-auto]");
    const skin = required<HTMLSelectElement>(panel, "[data-skin]");
    let active = clips[0] ?? "";
    let autoAdvancedClip = "";

    const categories = ["All", ...new Set(clips.map((clip) => clip.split("__")[0]!))];
    category.replaceChildren(...categories.map((name) => new Option(name, name)));
    skin.replaceChildren(...PILOT_SKIN_PRESETS.map((preset) => {
      const option = new Option(preset.name, preset.id);
      option.disabled = preset.allowedAncestries !== undefined && !preset.allowedAncestries.includes(ancestry);
      return option;
    }));

    const updateCount = (): void => {
      const values = Object.values(decisions);
      count.textContent = `${values.filter((item) => item.decision === "approved").length} approved · ${values.length}/${clips.length} reviewed`;
    };
    const select = (name: string, pose = true): void => {
      active = name;
      clipList.value = name;
      const saved = decisions[name];
      note.value = saved?.note ?? "";
      status.textContent = saved ? `${saved.decision}: ${name}` : `Unreviewed: ${name}`;
      scrub.value = "0";
      if (pose) bridge.pose(name, 0);
    };
    const refresh = (): void => {
      const query = search.value.trim().toLowerCase();
      const visible = clips.filter((clip) => (category.value === "All" || clip.startsWith(`${category.value}__`)) && clip.toLowerCase().includes(query));
      clipList.replaceChildren(...visible.map((clip) => new Option(clip.replace("__", " · "), clip)));
      select(visible.includes(active) ? active : visible[0] ?? "", Boolean(visible.length));
    };
    const move = (offset: number): void => {
      const options = [...clipList.options];
      if (!options.length) return;
      const index = Math.max(0, options.findIndex((option) => option.value === active));
      select(options[(index + offset + options.length) % options.length]!.value);
    };
    const play = (): void => {
      if (!active) return;
      const duration = bridge.playReview(active, loop.checked);
      autoAdvancedClip = "";
      status.textContent = `Playing ${active} · ${duration.toFixed(2)}s`;
    };

    category.addEventListener("change", refresh);
    search.addEventListener("input", refresh);
    clipList.addEventListener("change", () => select(clipList.value));
    required(panel, "[data-prev]").addEventListener("click", () => move(-1));
    required(panel, "[data-next]").addEventListener("click", () => move(1));
    required(panel, "[data-play]").addEventListener("click", play);
    required(panel, "[data-pause]").addEventListener("click", () => bridge.pauseReview(true));
    scrub.addEventListener("input", () => bridge.pose(active, Number(scrub.value) / 1000));
    skin.addEventListener("change", () => {
      status.textContent = `Applying ${skin.selectedOptions[0]?.textContent ?? "skin"}…`;
      void bridge.setReviewSkin(skin.value as PilotSkinPresetId).then((result) => {
        status.textContent = result.applied ? `${skin.selectedOptions[0]?.textContent} applied` : result.reason ?? "Skin preset blocked";
      });
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-decision]").forEach((button) => {
      button.addEventListener("click", () => {
        decisions[active] = {
          decision: button.dataset.decision as ReviewDecision,
          note: note.value.trim(),
          updatedAt: new Date().toISOString(),
        };
        saveDecisions(decisions);
        updateCount();
        select(active, false);
        if (auto.checked) { move(1); play(); }
      });
    });
    required(panel, "[data-export]").addEventListener("click", () => downloadReview(decisions, clips));
    const collapse = required<HTMLButtonElement>(panel, "[data-collapse]");
    collapse.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("is-collapsed");
      collapse.textContent = collapsed ? "Show review" : "Minimize";
    });

    window.setInterval(() => {
      const snapshot = bridge.snapshot();
      const grounding = snapshot.grounding;
      if (grounding) {
        groundingStatus.dataset.pass = String(grounding.pass);
        groundingStatus.dataset.snapshot = JSON.stringify({
          clip: snapshot.playerAnimation,
          timeSeconds: snapshot.playerAnimationTime,
          ...grounding,
        });
        groundingStatus.textContent = `Floor ${grounding.floorWorldY.toFixed(3)}m · lower ${grounding.lowerBoundWorldY.toFixed(3)}m · clearance ${grounding.clearanceMeters.toFixed(3)}m · correction ${grounding.floorCorrectionMeters.toFixed(3)}m · ${grounding.pass ? "PASS" : "FAIL"}`;
      }
      if (panel.classList.contains("is-collapsed")) return;
      time.textContent = `${snapshot.playerAnimationTime.toFixed(2)} / ${snapshot.playerAnimationDuration.toFixed(2)}s`;
      if (snapshot.playerAnimation.toLowerCase() === active.toLowerCase() && snapshot.playerAnimationDuration > 0) {
        scrub.value = String(Math.round(snapshot.playerAnimationTime / snapshot.playerAnimationDuration * 1000));
        if (auto.checked && !loop.checked && snapshot.playerAnimationTime >= snapshot.playerAnimationDuration - 0.03 && autoAdvancedClip !== active) {
          autoAdvancedClip = active;
          move(1);
          play();
        }
      }
    }, 100);
    updateCount();
    refresh();
  }).catch((error: unknown) => {
    console.error("Issue #487 animation review failed to start.", error);
  });
}
