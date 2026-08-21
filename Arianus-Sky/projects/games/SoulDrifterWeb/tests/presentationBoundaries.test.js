import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const html = read("../index.html");
const styles = read("../src/styles.css");
const ui = read("../src/game/ui.ts");
const world = read("../src/game/World3D.ts");
const avatarIdentity = read("../src/game/avatarIdentity.ts");
const tutorialChoices = read("../src/game/tutorialChoices.ts");
const creation = read("../src/characterCreation.ts");
const main = read("../src/main.ts");
const persistence = read("../src/game/persistence.ts");

describe("screen-space HUD and live paper-doll boundaries", () => {
  it("keeps combat controls in a dedicated screen-space layer outside the clipped viewport", () => {
    expect(html).toMatch(/<\/div>\s*<div class="screen-hud-layer"[^>]*>[\s\S]*?<div id="combat-controls"/s);
    expect(styles).toMatch(/\.screen-hud-layer\s*\{[^}]*position:\s*(?:relative|absolute|fixed)/s);
    expect(styles).toMatch(/@media[^{}]*\(max-width:\s*820px\)[\s\S]*?\.combat-controls\s*\{[^}]*bottom:\s*max\(43px,/s);
  });

  it("uses a render canvas for the exact live avatar instead of copying the generic portrait", () => {
    expect(html).toContain('<canvas id="paper-doll-canvas"');
    expect(html).not.toContain('id="paper-doll-image"');
    expect(ui).not.toContain('requiredElement<HTMLImageElement>("paper-doll-image").src');
  });

  it("persists the live idle paper-doll snapshot for the saved-soul selector", () => {
    expect(persistence).toContain('"avatarPreviews"');
    expect(persistence).toContain("loadAvatarPreview()");
    expect(persistence).toContain("saveAvatarPreview(dataUrl: string)");
    expect(world).toContain("persistAvatarPreview");
    expect(world).toMatch(/renderPaperDoll\(240, 320\)[\s\S]*toDataURL\("image\/webp"/s);
    expect(main).toMatch(/loadAvatarPreview\(\)[\s\S]*new CharacterCreation\([\s\S]*savedAvatarPreview/s);
    expect(creation).toMatch(/savedAvatarPreview[\s\S]*continue-character[\s\S]*savedAvatarPreview \?\? characterPortraitPath/s);
  });

  it("maps browser and in-app Back through the same character-creation history", () => {
    expect(creation).toContain('window.addEventListener("popstate", this.onPopState)');
    expect(creation).toContain('window.history.pushState(this.creationHistoryState()');
    expect(creation).toMatch(/private navigate\([\s\S]*this\.render\(\)/s);
    expect(creation).toMatch(/private navigateBack\([\s\S]*window\.history\.back\(\)/s);
  });

  it("provides a persistent, explained Auto/Walk/Run screen-space control", () => {
    expect(html).toMatch(/class="locomotion-preference"[^>]*data-mechanic[^>]*data-mechanic-help=/);
    expect(html).toContain('data-locomotion-preference="auto"');
    expect(html).toContain('data-locomotion-preference="walk"');
    expect(html).toContain('data-locomotion-preference="run"');
    expect(ui).toContain('localStorage.setItem("souldrifter-locomotion-preference"');
    expect(styles).toMatch(/\.locomotion-preference button\.is-selected/);
  });

  it("exposes an appearance revisit without replacing the saved character", () => {
    expect(html).toContain('id="appearance-edit"');
    expect(ui).toContain('souldrifter:edit-appearance');
  });

  it("registers low corridor walls and checks occlusion against visible enemies", () => {
    expect(world).toMatch(/wall\.userData\.occluder = true;\s*this\.occluders\.push\(wall\);/s);
    expect(world).toMatch(/const occlusionTargets[\s\S]*this\.player\.root[\s\S]*this\.enemies\.values\(\)/s);
  });

  it("shares whole-object interaction proxies and occlusion with nearby NPCs and story objects", () => {
    expect(world).toMatch(/createSemanticProxy\([\s\S]*dataKey: "enemyId" \| "interactId"/s);
    expect(world).toMatch(/createSemanticProxy\(actor\.root, actor\.model, "enemyId", enemy\.id\)/s);
    expect(world).toMatch(/createSemanticProxy\([\s\S]*"interactId"/s);
    expect(world).toMatch(/occlusionTargets[\s\S]*this\.npcs\.values\(\)[\s\S]*this\.storyObjects\.values\(\)/s);
    expect(world).toMatch(/resolvePointerHitIntent\(hits\.map\(\(hit\) => \(\{[\s\S]*findUserData<string>\(hit\.object, "interactId"\)[\s\S]*tile:/s);
    expect(world).toMatch(/intent\?\.kind === "enemy"[\s\S]*intent\?\.kind === "interact"[\s\S]*intent\?\.kind === "ground"/s);
    expect(html).toContain('id="interaction-prompt"');
    expect(ui).toContain("setInteractionPrompt(");
  });

  it("preserves every named NPC's authored materials instead of applying generic skill tint", () => {
    expect(world).toMatch(/const preserveAuthoredPalette = id === "player"[\s\S]*Object\.hasOwn\(NPC_MODEL_PATHS, id\)[\s\S]*cloneActorMaterial\(source, tint, preserveAuthoredPalette, skinTone\)/s);
  });

  it("opens the selected trial gate as a vertical portcullis only after confirmation", () => {
    expect(world).toContain('getObjectByName("trial-portcullis")');
    expect(world).toMatch(/portcullis\.position\.y\s*=/);
    expect(world).not.toMatch(/gate\.root\.scale\.setScalar/);
    expect(world).toMatch(/if \(selectedGate\) await this\.liftTrialPortcullis\(selectedGate\)/);
    expect(world).toMatch(/private async liftTrialPortcullis\(object[\s\S]*portcullis\.position\.y = frame\.y;[\s\S]*object\.blocksMovement = false/s);
    expect(html).toContain('id="trial-gate-guidance"');
  });

  it("protects target, telegraph, buffs, and essential status in the screen HUD layer", () => {
    expect(html).toMatch(/<div class="screen-hud-layer"[^>]*>[\s\S]*id="compact-status"[\s\S]*id="buff-strip"[\s\S]*id="target-frame"[\s\S]*id="combat-controls"/s);
    expect(html).toContain('id="buff-strip"');
    expect(html).toContain('id="hud-drawer-status"');
    expect(html).toContain('id="hud-drawer-guide"');
    expect(html).toContain('id="hud-drawer-controls"');
    expect(html).toContain('id="hud-drawer-camera"');
    expect(html).toMatch(/id="equipment-toggle-mobile"[^>]*aria-label="Open equipment and pack"/);
    expect(ui).toContain("setBuffs(");
    expect(styles).toMatch(/@media[^{}]*\(max-width:\s*820px\)[\s\S]*?\.hud-drawer:not\(\.is-open\)\s*\{[^}]*display:\s*none/s);
  });

  it("publishes the ancestry boon as a passive buff and the class discipline as an action placeholder", () => {
    expect(html).toContain('id="imprint-skill-action"');
    expect(ui).toMatch(/callingPerkOptions\(profile\.callingId\)[\s\S]*imprintSkillAction\.hidden = !callingPerk/s);
    expect(ui).toContain("skill-awakening placeholder");
    expect(world).toMatch(/raceBoonOptions\(this\.profile\.raceId\)[\s\S]*duration: "passive"[\s\S]*Permanent ancestry boon sealed by Ilyra/s);
  });

  it("keeps the drawer toggle strip above every open drawer", () => {
    expect(styles).toMatch(/\.screen-hud-layer\s*\{[^}]*z-index:\s*40/s);
    expect(styles).toMatch(/\.party-panel[\s\S]*z-index:\s*35/s);
  });

  it("keeps modal choices above the protected HUD and suspends background controls", () => {
    expect(styles).toMatch(/\.dialogue-panel\s*\{[^}]*z-index:\s*60/s);
    expect(ui).toMatch(/openDialogue\([\s\S]*this\.setScreenHudInert\(true\)/s);
    expect(ui).toMatch(/continueButton\.addEventListener\("click"[\s\S]*this\.setScreenHudInert\(false\)/s);
    expect(ui).toMatch(/openStorybook\([\s\S]*this\.storybookVisible = true;[\s\S]*this\.setScreenHudInert\(true\)/s);
    expect(ui).toMatch(/openStarterImprint\([\s\S]*this\.imprintVisible = true;[\s\S]*this\.setScreenHudInert\(true\)/s);
    expect(ui).toMatch(/const dismiss = \(\): void => \{[\s\S]*this\.imprintVisible = false;[\s\S]*this\.setScreenHudInert\(false\)/s);
    expect(ui).toMatch(/screenHud\.classList\.toggle\("is-modal-obscured",\s*inert\)/s);
    expect(styles).toMatch(/\.screen-hud-layer\.is-modal-obscured\s*\{[^}]*visibility:\s*hidden/s);
  });

  it("exposes a deterministic DEV imprint entry for mobile modal acceptance", () => {
    expect(world).toMatch(/prepareImprint:\s*\(\) => \{[\s\S]*storybookCompleted: true[\s\S]*delete this\.profile\.starterImprint;[\s\S]*this\.openImprintRefinement\(\)/s);
  });

  it("shows the complete storyboard artwork above readable copy on mobile", () => {
    expect(styles).toMatch(/@media[^{}]*\(max-width:\s*820px\)[\s\S]*?\.storybook-scene\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:/s);
    expect(styles).toMatch(/@media[^{}]*\(max-width:\s*820px\)[\s\S]*?\.storybook-scene\s*>\s*img\s*\{[^}]*object-fit:\s*contain[^}]*transform:\s*none/s);
    expect(styles).toMatch(/@media[^{}]*\(max-width:\s*820px\)[\s\S]*?\.storybook-scene figcaption\s*\{[^}]*position:\s*relative[^}]*overflow-y:\s*auto/s);
  });

  it("routes the inventory keyboard shortcut and small bag button through the same panel writer", () => {
    expect(ui).toMatch(/event\.key\.toLowerCase\(\) === "i"[\s\S]*this\.showEquipment\(!this\.equipmentVisible\)/s);
    expect(ui).toMatch(/"equipment-toggle-mobile"\)\.addEventListener\("click", openEquipment\)/);
  });

  it("routes fatal damage through same-run Soulwell recall instead of reload instructions", () => {
    expect(world).toContain("await this.resolvePlayerDefeat()");
    expect(world).toContain("private async respawnAtSoulwellCheckpoint()");
    expect(world).not.toContain("Reload to generate another Soulwell crawl");
  });

  it("clears transient targeting and telegraph ownership across defeat and recall", () => {
    expect(ui).toContain("public clearCombatPresentation(): void");
    expect(world).toMatch(/enterPlayerDefeatHold\(\)[\s\S]*this\.selectEnemyTarget\(null\)[\s\S]*this\.ui\.clearCombatPresentation\(\)/s);
    expect(world).toMatch(/respawnAtSoulwellCheckpoint\(\)[\s\S]*this\.selectEnemyTarget\(null\)[\s\S]*this\.ui\.clearCombatPresentation\(\)[\s\S]*this\.playMotionDecision/s);
  });

  it("separates the DEV death hold from recall so terminal pose can be proven", () => {
    expect(world).toMatch(/interface DebugBridge[\s\S]*defeatHold\(\): void;[\s\S]*respawn\(\): Promise<void>;/s);
    expect(world).toMatch(/defeatHold:\s*\(\)\s*=>\s*\{[\s\S]*this\.enterPlayerDefeatHold\(\)/s);
    expect(world).toMatch(/respawn:\s*async\s*\(\)\s*=>\s*this\.respawnAtSoulwellCheckpoint\(\)/s);
    expect(world).toMatch(/createTerminalDeathClip\([\s\S]*clips\.set\("DeathBaseline"/s);
    expect(world).toMatch(/groundActor\(actor[\s\S]*actor\.motion\.current\(\)\.phase === "death"[\s\S]*actorBodyBounds\(actor\.model\)/s);
    expect(world).toMatch(/playerBounds: \{ minY: number; maxY: number; height: number; width: number; depth: number; horizontalSpan: number \}/);
    expect(world).toMatch(/updateActorDeathPresentation\(actor[\s\S]*deathBodyTilt\(normalized\)[\s\S]*actor\.model\.quaternion/s);
    expect(world).toMatch(/mixer\.update\(animationDelta\)[\s\S]*updateActorDeathPresentation[\s\S]*groundActor/s);
    expect(world).toMatch(/const deathDurationMs = this\.enterPlayerDefeatHold\(\)[\s\S]*while \(this\.combatState === "defeat"[\s\S]*action\.time < terminalSeconds[\s\S]*await this\.delay\(40\)[\s\S]*await this\.delay\(650\)/s);
  });

  it("clears trial guidance and camera drift at the corridor proof boundary", () => {
    expect(world).toMatch(/prepareDebugCorridor\(\)[\s\S]*this\.clearTrialGateGuidance\(\)[\s\S]*this\.cameraFollow\.manualOffset\.set\(0, 0\)[\s\S]*this\.cameraFollowInitialized\s*=\s*false/s);
  });

  it("exposes deterministic low-wall, ray-target, and enemy-phase visual proof", () => {
    expect(world).toMatch(/occlusion:\s*\{[\s\S]*?fadedLowWalls: number;[\s\S]*?lowWallMinOpacity: number;[\s\S]*?proofWall: string \| null;[\s\S]*?proofWallOpacity: number \| null;/s);
    expect(world).toMatch(/enemies:\s*Array<GridPoint & \{[\s\S]*screen:\s*\{ x: number; y: number \}/s);
    expect(world).toMatch(/interface DebugBridge[\s\S]*clearTarget\(\): void;[\s\S]*enemyPose\(id: string, phase: "telegraph" \| "contact" \| "recovery"\): void;/s);
    expect(world).toMatch(/interface DebugBridge[\s\S]*prepareOcclusion\(\): string;/s);
    expect(world).toMatch(/prepareDebugLowWallOcclusion\(\)[\s\S]*height > 1\.8[\s\S]*this\.cameraAzimuth = Math\.atan2\(placement\.outward\.x, placement\.outward\.y\)/s);
    expect(world).toMatch(/positionDebugCameraOnActors\(first[\s\S]*lerp\(second\.root\.position, 0\.5\)[\s\S]*this\.camera\.lookAt\(this\.cameraTarget\)/s);
    expect(world).toMatch(/centerDebugCameraOnActors\(first[\s\S]*this\.camera\.zoom = 1[\s\S]*this\.debugCameraFocus = \{ first, second \}[\s\S]*positionDebugCameraOnActors\(first, second\)/s);
    expect(world).toMatch(/prepareDebugLowWallOcclusion\(\)[\s\S]*this\.centerDebugCameraOnActors\(this\.player, enemy\)/s);
    expect(world).toMatch(/private debugCameraFocus:[\s\S]*first: AnimatedActor; second: AnimatedActor[\s\S]*= null/s);
    expect(world).toMatch(/updateCamera\(immediate: boolean, deltaSeconds: number\)[\s\S]*if \(this\.debugCameraFocus\)[\s\S]*positionDebugCameraOnActors[\s\S]*return;/s);
    expect(world).toMatch(/respawnAtSoulwellCheckpoint\(\)[\s\S]*this\.debugCameraFocus = null/s);
    expect(world).toMatch(/occlusionSampleHeights\(actor\.height\)[\s\S]*intersectObjects\(this\.occluders, false\)/s);
    expect(world).toMatch(/interface DebugBridge[\s\S]*gatePose\(id: string, progress: number\): void;/s);
    expect(world).toMatch(/gatePose:\s*\(id, progress\)\s*=>\s*\{[\s\S]*portcullisFrame\(\{ progress, closedY, liftHeight: 3\.5 \}\)/s);
  });

  it("applies enemy damage at the declared contact marker and preserves recovery", () => {
    expect(world).toMatch(/const motion = this\.playMotionArchetype\(enemy, ENEMY_MELEE_MOTION\);[\s\S]*await this\.delay\(motion\.eventMs\);[\s\S]*this\.hp = Math\.max\(0, this\.hp - damage\);/s);
    expect(world).toMatch(/this\.hp = Math\.max\(0, this\.hp - damage\);[\s\S]*const recoveryDuration = Math\.max\(0, motion\.durationMs - motion\.eventMs\);[\s\S]*await this\.delay\(contactHold\);[\s\S]*showEnemyAttackPhase\(enemy, "recovery"\);[\s\S]*await this\.delay\(Math\.max\(0, recoveryDuration - contactHold\)\)/s);
    expect(world).toMatch(/winds up a melee strike[\s\S]*connects for \$\{damage\}[\s\S]*recovers its guard/s);
  });

  it("keeps animation playback synchronized with wall-clock action markers at low frame rates", () => {
    expect(world).toMatch(/const animationDelta = this\.clock\.getDelta\(\);\s*const delta = Math\.min\(animationDelta, 0\.05\);/s);
    expect(world).toMatch(/this\.player\?\.mixer\.update\(animationDelta\);[\s\S]*this\.enemies\.forEach\(\(actor\) => actor\.mixer\.update\(animationDelta\)\)/s);
    expect(world).not.toMatch(/mixer\.update\(delta\)/);
  });

  it("presents readable enemy anticipation, contact, and recovery in runtime and proof poses", () => {
    expect(world).toMatch(/showEnemyAttackPhase\(enemy, "telegraph"\)[\s\S]*await this\.delay\(motion\.eventMs\)[\s\S]*showEnemyAttackPhase\(enemy, "contact"\)[\s\S]*showEnemyAttackPhase\(enemy, "recovery"\)/s);
    expect(world).toMatch(/enemyPose:[\s\S]*showEnemyAttackPhase\(enemy, phase\)/s);
    expect(world).toContain("enemy-telegraph-ring");
    expect(world).toContain("enemy-contact-flash");
    expect(world).toContain("enemy-recovery-guard");
    expect(world).toContain('type EnemyAttackPhase = "telegraph" | "contact" | "recovery";');
    expect(world).toContain("enemyAttackPhase: EnemyAttackPhase | null;");
    expect(world).toMatch(/prepareDebugLowWallOcclusion\(\)[\s\S]*this\.player\.label[\s\S]*visible = false[\s\S]*this\.npcs\.forEach/s);
  });

  it("sanitizes every imported semantic sword attack at the shared in-place boundary", () => {
    expect(world).toMatch(/IN_PLACE_ANIMATION_NAMES[\s\S]*"weaponstrikebaseline"/s);
    expect(world).toMatch(/IN_PLACE_ANIMATION_NAMES[\s\S]*"swordshieldslashcandidate"/s);
    expect(world).toMatch(/IN_PLACE_ANIMATION_NAMES[\s\S]*"weaponstrikecontrolledcandidate"/s);
    expect(world).toMatch(/IN_PLACE_ANIMATION_NAMES[\s\S]*"weaponstrikecontrolledcandidatev2"/s);
    expect(world).toMatch(/IN_PLACE_ANIMATION_NAMES[\s\S]*"siphoncleavebaselinecandidate"/s);
    expect(world).toMatch(/IN_PLACE_ANIMATION_NAMES[\s\S]*"siphoncleavebaseline"/s);
  });

  it("exposes the animated hand-socket world transform for raw motion diagnostics", () => {
    expect(world).toContain("playerHandSocket?:");
    expect(world).toMatch(/playerHandSocket:[\s\S]*handSocket\.getWorldPosition\([\s\S]*handSocket\.getWorldQuaternion\(/s);
  });

  it("exposes exact animated rig bones even when a raw diagnostic asset has no sword mesh", () => {
    expect(world).toContain("playerRigProbe:");
    expect(world).toMatch(/probePlayerBone = \(name: string\)[\s\S]*this\.player\.model\.getObjectByName\(name\)[\s\S]*hand_r: probePlayerBone\("hand_r"\)/s);
  });

  it("routes optional same-rig animation packs through the canonical avatar manifest", () => {
    expect(avatarIdentity).toContain("SIPHON_CLEAVE_PACK");
    expect(avatarIdentity).toContain("WEAPON_STRIKE_PACK");
    expect(avatarIdentity).toContain("PLAYER_AVATAR_BY_IDENTITY");
    expect(world).toContain("animationPackCache");
    expect(world).toMatch(/loadExternalAnimationPack[\s\S]*loadCachedAnimationPack[\s\S]*bindOptionalCompatibleAnimationClip/s);
    expect(world).toMatch(/const boundRootNode = bound\.tracks[\s\S]*spec\.rootNodeName/);
    expect(world).toMatch(/normalizeAnimationPackRootMotion\(bound, boundRootNode\)/);
    expect(world).not.toMatch(/sanitizeAttackClip\(bound\)/);
    expect(world).toMatch(/resolvePlayerAvatarManifest\(this\.profile\)[\s\S]*playerAvatar\.animationPacks/s);
    expect(world).toMatch(/Promise\.all\(animationPacks\.map\(async \(spec\)[\s\S]*await this\.loadExternalAnimationPack\(spec, model\)[\s\S]*if \(externalClip\) clips\.set\(externalClip\.name/s);
  });

  it("resolves every played clip through the versioned animation tuning boundary", () => {
    expect(main).toMatch(/loadAnimationTuningDocument\(tuningUrl\)[\s\S]*animationTuningRegistry\.replace\(animationTuning\)/s);
    expect(world).toMatch(/private playAnimation\([\s\S]*animationTuningRegistry\.resolve\(this\.combatSpeed \* speedMultiplier, tuningScope\)/s);
  });

  it("routes exposure, fog, shadows, and local lights through one versioned lighting profile", () => {
    expect(main).toMatch(/loadLightingTuningDocument\(lightingUrl\)[\s\S]*lightingTuningRegistry\.replace\(lightingTuning\)/s);
    expect(world).toContain("private readonly lighting = lightingTuningRegistry.snapshot()");
    expect(world).toMatch(/toneMappingExposure = this\.lighting\.exposure/);
    expect(world).toMatch(/new THREE\.FogExp2\(0x071015, this\.lighting\.fogDensity\)/);
    expect(world).toMatch(/shadow\.mapSize\.set\(this\.lighting\.shadowMapSize, this\.lighting\.shadowMapSize\)/);
    expect(world).toMatch(/roomOverrides\[roomId\][\s\S]*localLightMultiplier/s);
  });

  it("transitions weapon state before sword-channel and hands-free casting animations", () => {
    expect(world).toMatch(/activateGuard\([\s\S]*ensurePlayerWeaponDrawn\(\)[\s\S]*playMotionArchetype\(this\.player, CINDER_GUARD_MOTION\)/s);
    expect(world).toMatch(/recover\([\s\S]*ensurePlayerWeaponSheathed\(\)[\s\S]*playMotionArchetype\(this\.player, RECOVER_MOTION\)/s);
  });

  it("isolates one mixer action before sampling a visual-proof pose", () => {
    expect(world).toMatch(/pose: \(animation, normalizedTime\)[\s\S]*this\.player\.mixer\.stopAllAction\(\);[\s\S]*this\.player\.mixer\.clipAction\(clip\)/s);
  });

  it("keeps enemy and story-object targeting mutually exclusive at one shared boundary", () => {
    expect(world).toMatch(/private selectStoryObjectTarget\(id: string \| null\)[\s\S]*this\.selectedStoryObjectId = id;[\s\S]*this\.selectEnemyTarget\(null\);/s);
    expect(world).toMatch(/private selectEnemyTarget\(id: string \| null\)[\s\S]*this\.selectedTargetId = selected\?\.alive[\s\S]*this\.selectedStoryObjectId = null;/s);
    expect(world).toMatch(/updateNearbyInteractionPrompt\(\)[\s\S]*manhattan\(this\.player\.grid, selectedObject\.grid\) > 1[\s\S]*this\.selectStoryObjectTarget\(null\)/s);
  });

  it("keeps model-independent combat feedback attached to the shared runtime boundaries", () => {
    expect(world).toMatch(/targetRing\.name = "selected-target-ring"[\s\S]*actor\.root\.userData\.targeted = false/s);
    expect(world).toMatch(/private selectEnemyTarget\(id: string \| null\)[\s\S]*this\.faceActorTowards\(this\.player, selected!\.root\.position\)/s);
    expect(world).toMatch(/private defeatEnemy\(enemy: EnemyRuntime\)[\s\S]*child\.userData\.interactId = enemy\.id[\s\S]*remains available to loot/s);
    expect(world).toMatch(/!enemy\.alive && !this\.lootedEnemyIds\.has\(enemy\.id\) && enemy\.root\.visible/s);
    expect(world).toMatch(/Loot \$\{corpse\.definition\.name\}[\s\S]*this\.lootedEnemyIds\.add\(id\)[\s\S]*corpse\.root\.visible = false/s);
    expect(world).not.toMatch(/enemyDefeatVisibilityMs\([\s\S]*enemy\.root\.visible = false/s);
    expect(world).not.toContain("420 / this.combatSpeed");
    expect(world).toMatch(/weaponEnchant\.name = "cinder-guard-weapon-enchant"[\s\S]*weaponSocket\.add\(weaponEnchant\)/s);
  });

  it("uses encoding-safe separators for trial and imprint copy", () => {
    expect(world).not.toContain("\u00c2");
    expect(world).toContain("Chronicle of Returning completed / Ilyra's charge accepted.");
    expect(world).toContain("Enter Wayfarer / standard");
    expect(world).toContain("Enter Oathbreaker / severe");
  });

  it("keeps HUD icon source encoding-safe and accessible", () => {
    expect(html).not.toMatch(/[ÂÃâ]/);
    expect(world).not.toMatch(/[ÂÃâ]/);
    expect(html).toMatch(/data-hud-drawer="status"[^>]*aria-label="Character details"[^>]*>&#9671;<\/button>/);
    expect(html).toMatch(/data-hud-drawer="controls"[^>]*aria-label="Controls"[^>]*>&#8984;<\/button>/);
    expect(html).toMatch(/data-hud-drawer="camera"[^>]*aria-label="Camera pad"[^>]*>&#9678;<\/button>/);
    expect(html).toMatch(/<link rel="icon"[^>]*href="\/assets\/generated\/action-icons\/basic-weapon-strike\.svg"/);
  });

  it("uses gate and portcullis language for the physical trial threshold", () => {
    expect(tutorialChoices).not.toContain("Wayfarer Door");
    expect(tutorialChoices).not.toContain("Oathbreaker Door");
    expect(world).not.toContain("The Twin Trial Doors");
    expect(world).not.toMatch(/trial doors|paired doors|chosen door|second door|Both doors/i);
  });
});
