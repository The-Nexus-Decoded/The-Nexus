import Phaser from "phaser";
import { CombatEngine } from "./combat";
import { gridKey, isoToScreen, manhattan, screenToIso, TILE_HEIGHT, TILE_WIDTH } from "./iso";
import { levelOne } from "./levelOne";
import { findPath } from "./pathfinding";
import type {
  ActorState,
  CombatStyle,
  GridPoint,
  TileDefinition,
  TileKind,
  WorldObjectDefinition,
} from "./types";
import { GameUI, type ActionName } from "./ui";

const ORIGIN_X = 540;
const ORIGIN_Y = -40;

const TILE_COLORS: Record<TileKind, { top: number; edge: number; line: number }> = {
  chamber: { top: 0x36464a, edge: 0x172226, line: 0x577074 },
  rune: { top: 0x28464b, edge: 0x13272b, line: 0x4aa6a2 },
  corridor: { top: 0x3f3b34, edge: 0x211d19, line: 0x746550 },
  arena: { top: 0x4b4132, edge: 0x2a2118, line: 0x806b49 },
  threshold: { top: 0x3b4c4a, edge: 0x1b2827, line: 0x68b8ad },
  void: { top: 0x0a0d0e, edge: 0x050708, line: 0x0f1416 },
};

interface ActorVisual {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

export class WorldScene extends Phaser.Scene {
  private readonly ui = new GameUI();
  private readonly inventory: string[] = [];
  private readonly openedObjects = new Set<string>();
  private readonly tileMap = new Map<string, TileDefinition>();
  private readonly objectVisuals = new Map<string, Phaser.GameObjects.Container>();
  private readonly player: ActorState = {
    id: "player",
    name: "Kael",
    x: levelOne.playerStart.x,
    y: levelOne.playerStart.y,
    maxHp: 32,
    hp: 32,
    movement: 4,
    guard: false,
    alive: true,
  };
  private readonly sentinel: ActorState = {
    id: "sentinel",
    name: "Sentinel Construct",
    x: levelOne.sentinelStart.x,
    y: levelOne.sentinelStart.y,
    maxHp: 28,
    hp: 28,
    movement: 2,
    guard: false,
    alive: true,
  };
  private readonly combat = new CombatEngine(this.player, this.sentinel);
  private worldRoot!: Phaser.GameObjects.Container;
  private hoverCursor!: Phaser.GameObjects.Graphics;
  private playerVisual!: ActorVisual;
  private sentinelVisual!: ActorVisual;
  private selectedAction: ActionName | null = null;
  private combatStyle: CombatStyle = "turn-based";
  private combatStarted = false;
  private movedThisTurn = false;
  private playerMoving = false;
  private enemyBusy = false;
  private combatSpeed = 1;
  private fury = 0;
  private stability = 100;
  private realTimeLoop?: Phaser.Time.TimerEvent;
  private slashReadyAt = 0;
  private guardReadyAt = 0;

  public constructor() {
    super("WorldScene");
  }

  public create(): void {
    for (const tile of levelOne.tiles) this.tileMap.set(gridKey(tile), tile);

    this.drawBackdrop();
    this.worldRoot = this.add.container(ORIGIN_X, ORIGIN_Y);
    this.renderTiles();
    this.renderObjects();
    this.playerVisual = this.createActorVisual(this.player, "player");
    this.sentinelVisual = this.createActorVisual(this.sentinel, "sentinel");
    this.worldRoot.add([this.playerVisual.container, this.sentinelVisual.container]);
    this.placeActorVisual(this.player, this.playerVisual);
    this.placeActorVisual(this.sentinel, this.sentinelVisual);
    this.createHoverCursor();
    this.createAtmosphere();
    this.bindInput();
    this.bindUI();

    this.ui.setStats({ hp: this.player.hp, stability: this.stability, fury: this.fury });
    this.ui.setInventory(this.inventory);
    this.ui.setMode("exploration");
    this.ui.setObjective("Awaken at the Soul Well and recover your bearings.");
    this.ui.addLog("Click the glowing floor to walk the isometric world.");
  }

  private drawBackdrop(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x0c161a, 0x0c161a, 0x080a0b, 0x080a0b, 1);
    background.fillRect(0, 0, 1280, 720);

    for (let index = 0; index < 90; index += 1) {
      const x = Phaser.Math.Between(0, 1280);
      const y = Phaser.Math.Between(0, 720);
      const alpha = Phaser.Math.FloatBetween(0.04, 0.16);
      background.fillStyle(index % 4 === 0 ? 0x62e6db : 0xc58d47, alpha);
      background.fillCircle(x, y, Phaser.Math.Between(1, 2));
    }
  }

  private renderTiles(): void {
    const sorted = [...levelOne.tiles].sort((a, b) => a.x + a.y - (b.x + b.y));
    for (const tile of sorted) {
      const screen = isoToScreen(tile);
      const colors = TILE_COLORS[tile.kind];
      const graphics = this.add.graphics({ x: screen.x, y: screen.y });
      this.drawDiamondTile(graphics, colors.top, colors.edge, colors.line);
      graphics.setDepth(tile.x + tile.y);
      this.worldRoot.add(graphics);

      if (tile.kind === "rune" && (tile.x + tile.y) % 2 === 0) {
        const rune = this.add.graphics({ x: screen.x, y: screen.y - 2 });
        rune.lineStyle(1, 0x62e6db, 0.25);
        rune.strokeCircle(0, 0, 8);
        rune.lineBetween(-7, 0, 7, 0);
        rune.lineBetween(0, -5, 0, 5);
        rune.setDepth(tile.x + tile.y + 0.02);
        this.worldRoot.add(rune);
      }
    }
  }

  private drawDiamondTile(
    graphics: Phaser.GameObjects.Graphics,
    topColor: number,
    edgeColor: number,
    lineColor: number,
  ): void {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    graphics.fillStyle(edgeColor, 1);
    graphics.beginPath();
    graphics.moveTo(-halfW, 0);
    graphics.lineTo(0, halfH);
    graphics.lineTo(0, halfH + 8);
    graphics.lineTo(-halfW, 8);
    graphics.closePath();
    graphics.fillPath();
    graphics.beginPath();
    graphics.moveTo(halfW, 0);
    graphics.lineTo(0, halfH);
    graphics.lineTo(0, halfH + 8);
    graphics.lineTo(halfW, 8);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(topColor, 1);
    graphics.lineStyle(1, lineColor, 0.48);
    graphics.beginPath();
    graphics.moveTo(0, -halfH);
    graphics.lineTo(halfW, 0);
    graphics.lineTo(0, halfH);
    graphics.lineTo(-halfW, 0);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private renderObjects(): void {
    for (const object of levelOne.objects) {
      if (object.kind === "sentinel") continue;
      const visual = this.createObjectVisual(object);
      this.objectVisuals.set(object.id, visual);
      this.worldRoot.add(visual);
    }
  }

  private createObjectVisual(object: WorldObjectDefinition): Phaser.GameObjects.Container {
    const screen = isoToScreen(object);
    const container = this.add.container(screen.x, screen.y);
    const graphics = this.add.graphics();
    container.add(graphics);

    switch (object.kind) {
      case "soul-well": {
        graphics.fillStyle(0x11191b, 0.95);
        graphics.fillEllipse(0, 2, 82, 36);
        graphics.lineStyle(3, 0x9f7745, 1);
        graphics.strokeEllipse(0, 0, 78, 32);
        graphics.fillStyle(0x234f50, 0.85);
        graphics.fillEllipse(0, -3, 62, 23);
        graphics.lineStyle(2, 0x62e6db, 0.75);
        graphics.strokeEllipse(0, -4, 52, 18);
        const orb = this.add.graphics({ y: -30 });
        orb.fillStyle(0xbafff4, 0.95);
        orb.fillCircle(0, 0, 8);
        orb.lineStyle(2, 0x62e6db, 0.55);
        orb.strokeCircle(0, 0, 16);
        container.add(orb);
        this.tweens.add({ targets: orb, y: -39, alpha: 0.65, duration: 1400, yoyo: true, repeat: -1 });
        break;
      }
      case "chest": {
        graphics.fillStyle(0x2b2118, 1);
        graphics.fillRect(-22, -24, 44, 28);
        graphics.fillStyle(0x5d4126, 1);
        graphics.fillRoundedRect(-22, -36, 44, 18, 5);
        graphics.lineStyle(2, 0xc58d47, 0.9);
        graphics.strokeRoundedRect(-22, -36, 44, 40, 4);
        graphics.fillStyle(0x62e6db, 0.75);
        graphics.fillCircle(0, -17, 3);
        break;
      }
      case "torch": {
        graphics.fillStyle(0x33261b, 1);
        graphics.fillRect(-3, -38, 6, 42);
        graphics.fillStyle(0xc58d47, 1);
        graphics.fillTriangle(-9, -39, 9, -39, 0, -54);
        const flame = this.add.graphics({ y: -50 });
        flame.fillStyle(0x62e6db, 0.75);
        flame.fillCircle(0, 0, 8);
        container.add(flame);
        this.tweens.add({ targets: flame, scaleX: 0.72, scaleY: 1.3, alpha: 0.42, duration: 420, yoyo: true, repeat: -1 });
        break;
      }
      case "pillar": {
        graphics.fillStyle(0x1d282b, 1);
        graphics.fillRect(-13, -65, 26, 67);
        graphics.fillStyle(0x45575a, 1);
        graphics.fillTriangle(-13, -65, 13, -65, 0, -78);
        graphics.lineStyle(2, 0x62e6db, 0.32);
        graphics.lineBetween(-7, -48, 8, -32);
        graphics.lineBetween(8, -32, -4, -19);
        break;
      }
      case "dummy": {
        graphics.fillStyle(0x251c14, 1);
        graphics.fillRect(-4, -46, 8, 50);
        graphics.fillStyle(0x775333, 1);
        graphics.fillRect(-24, -38, 48, 8);
        graphics.fillCircle(0, -53, 11);
        graphics.lineStyle(2, 0xc58d47, 0.5);
        graphics.strokeCircle(0, -53, 6);
        break;
      }
      case "soul-essence": {
        graphics.fillStyle(0x62e6db, 0.13);
        graphics.fillCircle(0, -28, 22);
        graphics.lineStyle(2, 0xbafff4, 0.9);
        graphics.beginPath();
        graphics.moveTo(0, -52);
        graphics.lineTo(14, -28);
        graphics.lineTo(0, -4);
        graphics.lineTo(-14, -28);
        graphics.closePath();
        graphics.strokePath();
        graphics.fillStyle(0xbafff4, 0.95);
        graphics.fillCircle(0, -28, 6);
        container.setAlpha(0.22);
        this.tweens.add({ targets: container, y: screen.y - 8, duration: 1100, yoyo: true, repeat: -1 });
        break;
      }
      case "threshold": {
        graphics.lineStyle(3, 0x62e6db, 0.55);
        graphics.strokeEllipse(0, -5, 72, 26);
        graphics.lineStyle(1, 0xc58d47, 0.45);
        graphics.strokeEllipse(0, -5, 54, 18);
        break;
      }
      default:
        break;
    }

    container.setDepth(100 + object.x + object.y);
    return container;
  }

  private createActorVisual(actor: ActorState, kind: "player" | "sentinel"): ActorVisual {
    const container = this.add.container();
    const body = this.add.graphics();
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.42);
    shadow.fillEllipse(0, 4, 42, 17);
    container.add(shadow);

    if (kind === "player") {
      body.fillStyle(0x182022, 1);
      body.fillRect(-12, -25, 9, 28);
      body.fillRect(3, -25, 9, 28);
      body.fillStyle(0x233f54, 1);
      body.fillTriangle(-24, -27, 24, -27, 0, -69);
      body.fillStyle(0xc58d47, 1);
      body.fillRect(-19, -45, 38, 6);
      body.fillStyle(0x80532d, 1);
      body.fillTriangle(-28, -63, -4, -71, -9, -27);
      body.fillStyle(0x8d5e39, 1);
      body.fillCircle(0, -78, 13);
      body.lineStyle(3, 0x62e6db, 0.9);
      body.lineBetween(-9, -56, 8, -40);
      body.lineBetween(8, -40, -4, -28);
      body.lineStyle(5, 0x9a7240, 1);
      body.lineBetween(20, -58, 42, -6);
      body.lineStyle(2, 0x62e6db, 0.8);
      body.lineBetween(21, -55, 38, -12);
    } else {
      body.fillStyle(0x252b2b, 1);
      body.fillRect(-15, -27, 12, 30);
      body.fillRect(3, -27, 12, 30);
      body.fillStyle(0x5a5348, 1);
      body.fillTriangle(-29, -28, 29, -28, 0, -76);
      body.fillStyle(0x2b3333, 1);
      body.fillCircle(0, -86, 16);
      body.lineStyle(3, 0xdc6d55, 0.9);
      body.strokeCircle(0, -86, 7);
      body.lineStyle(2, 0xc58d47, 0.75);
      body.lineBetween(-20, -57, 20, -38);
      body.lineBetween(20, -57, -20, -38);
      body.lineStyle(6, 0x6c6251, 1);
      body.lineBetween(-24, -56, -44, -8);
    }

    container.add(body);
    const label = this.add.text(0, kind === "player" ? -108 : -120, actor.name, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "11px",
      color: kind === "player" ? "#bafff4" : "#efb09f",
      stroke: "#070a0d",
      strokeThickness: 4,
    });
    label.setOrigin(0.5, 0.5);
    container.add(label);
    this.tweens.add({ targets: body, y: -3, duration: kind === "player" ? 920 : 780, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    return { container, body, label };
  }

  private createHoverCursor(): void {
    this.hoverCursor = this.add.graphics();
    this.hoverCursor.lineStyle(2, 0xbafff4, 0.9);
    this.hoverCursor.beginPath();
    this.hoverCursor.moveTo(0, -TILE_HEIGHT / 2);
    this.hoverCursor.lineTo(TILE_WIDTH / 2, 0);
    this.hoverCursor.lineTo(0, TILE_HEIGHT / 2);
    this.hoverCursor.lineTo(-TILE_WIDTH / 2, 0);
    this.hoverCursor.closePath();
    this.hoverCursor.strokePath();
    this.hoverCursor.setVisible(false);
    this.hoverCursor.setDepth(10_000);
    this.worldRoot.add(this.hoverCursor);
  }

  private createAtmosphere(): void {
    for (let index = 0; index < 24; index += 1) {
      const mote = this.add.circle(
        Phaser.Math.Between(250, 1080),
        Phaser.Math.Between(80, 650),
        Phaser.Math.Between(1, 3),
        index % 3 === 0 ? 0xc58d47 : 0x62e6db,
        Phaser.Math.FloatBetween(0.08, 0.25),
      );
      mote.setDepth(9_000);
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(18, 48),
        alpha: 0,
        duration: Phaser.Math.Between(2200, 5200),
        delay: Phaser.Math.Between(0, 1800),
        repeat: -1,
      });
    }
  }

  private bindInput(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const point = screenToIso(pointer.x - ORIGIN_X, pointer.y - ORIGIN_Y);
      const tile = this.tileMap.get(gridKey(point));
      if (!tile) {
        this.hoverCursor.setVisible(false);
        return;
      }
      const screen = isoToScreen(tile);
      this.hoverCursor.setPosition(screen.x, screen.y - 1);
      this.hoverCursor.setVisible(true);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 || this.playerMoving || this.enemyBusy) return;
      const point = screenToIso(pointer.x - ORIGIN_X, pointer.y - ORIGIN_Y);
      void this.handleWorldClick(point);
    });

    this.input.keyboard?.on("keydown-ONE", () => this.handleAction("rune-slash"));
    this.input.keyboard?.on("keydown-TWO", () => this.handleAction("guard"));
    this.input.keyboard?.on("keydown-THREE", () => this.handleAction("wait"));
  }

  private bindUI(): void {
    this.ui.onAction((action) => this.handleAction(action));
    this.ui.onSpeedChange((speed) => {
      this.combatSpeed = speed;
      this.ui.setMessage(`Combat animation speed set to ${speed}×.`);
    });
  }

  private async handleWorldClick(point: GridPoint): Promise<void> {
    if (!this.tileMap.has(gridKey(point))) return;

    const object = this.objectAt(point);
    if (object) {
      if (object.kind === "sentinel" && this.combatStarted && this.selectedAction === "rune-slash") {
        await this.performRuneSlash();
        return;
      }
      await this.approachAndInteract(object);
      return;
    }

    if (this.combatStarted && this.combatStyle === "turn-based") {
      if (this.combat.currentActor !== "player" || this.combat.state !== "orders") return;
      if (this.selectedAction !== "move") {
        this.ui.setMessage("Choose Move before selecting a destination during tactical combat.");
        return;
      }
      if (this.movedThisTurn) {
        this.ui.setMessage("You have already moved this turn.");
        return;
      }
      await this.movePlayer(point, this.player.movement);
      this.movedThisTurn = true;
      this.selectedAction = null;
      this.ui.setActionEnabled("move", false);
      this.ui.setMessage("Movement resolved. Choose an action.");
      return;
    }

    await this.movePlayer(point);
  }

  private handleAction(action: ActionName): void {
    if (!this.combatStarted || !this.player.alive || !this.sentinel.alive) return;

    if (this.combatStyle === "turn-based") {
      if (this.combat.currentActor !== "player" || this.combat.state !== "orders") return;
      if (action === "move") {
        this.selectedAction = "move";
        this.ui.setMessage("Select a reachable tile. You may move up to four tiles.");
      } else if (action === "rune-slash") {
        this.selectedAction = "rune-slash";
        if (manhattan(this.player, this.sentinel) === 1) void this.performRuneSlash();
        else this.ui.setMessage("Rune Slash requires an adjacent target. Move closer, then strike.");
      } else if (action === "guard") {
        this.combat.setGuard("player", true);
        this.fury = Math.min(100, this.fury + 3);
        this.ui.addLog("Kael anchors body, weapon, armor, and carried runes into one guard circuit.");
        this.ui.setMessage("Anchor Guard will reduce the next incoming impact.");
        this.refreshStats();
        void this.finishPlayerTurn();
      } else {
        this.ui.addLog("Kael studies the Sentinel's rune cadence.");
        void this.finishPlayerTurn();
      }
      return;
    }

    if (action === "move") {
      this.ui.setMessage("Real-time movement is active. Click any reachable floor tile.");
    } else if (action === "rune-slash") {
      void this.performRuneSlash();
    } else if (action === "guard") {
      this.activateRealTimeGuard();
    } else {
      this.ui.setMessage("Real-time combat does not pause. Reposition or use a rune action.");
    }
  }

  private async movePlayer(destination: GridPoint, maxSteps = Number.POSITIVE_INFINITY): Promise<void> {
    const path = findPath(this.player, destination, (point) => this.isWalkable(point, "player"));
    if (path.length === 0) {
      this.ui.setMessage("No clear path. The world is dense—try another approach.");
      return;
    }
    const limitedPath = path.slice(0, maxSteps);
    this.playerMoving = true;
    await this.animatePath(this.player, this.playerVisual, limitedPath, 128);
    this.playerMoving = false;

    if (!this.combatStarted && this.player.x >= 12) {
      this.beginCombat();
    }
  }

  private async animatePath(
    actor: ActorState,
    visual: ActorVisual,
    path: GridPoint[],
    baseDuration: number,
  ): Promise<void> {
    for (const step of path) {
      const screen = isoToScreen(step);
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: visual.container,
          x: screen.x,
          y: screen.y,
          duration: baseDuration / this.combatSpeed,
          ease: "Sine.InOut",
          onComplete: () => resolve(),
        });
      });
      actor.x = step.x;
      actor.y = step.y;
      visual.container.setDepth(200 + actor.x + actor.y);
    }
  }

  private async approachAndInteract(object: WorldObjectDefinition): Promise<void> {
    if (object.kind === "sentinel" && this.combatStarted) {
      this.ui.setMessage("The Sentinel is hostile. Use your action bar.");
      return;
    }

    if (manhattan(this.player, object) > 1) {
      const adjacent = [
        { x: object.x + 1, y: object.y },
        { x: object.x - 1, y: object.y },
        { x: object.x, y: object.y + 1 },
        { x: object.x, y: object.y - 1 },
      ];
      const options = adjacent
        .filter((point) => this.isWalkable(point, "player"))
        .map((point) => ({ point, path: findPath(this.player, point, (next) => this.isWalkable(next, "player")) }))
        .filter((option) => option.path.length > 0)
        .sort((a, b) => a.path.length - b.path.length);
      const best = options[0];
      if (!best) {
        this.ui.setMessage(`You cannot reach the ${object.name}.`);
        return;
      }
      await this.movePlayer(best.point);
    }

    if (manhattan(this.player, object) === 1) this.interact(object);
  }

  private interact(object: WorldObjectDefinition): void {
    switch (object.kind) {
      case "soul-well":
        this.player.hp = this.player.maxHp;
        this.stability = 100;
        this.ui.setMessage("The Soul Well restores your body-rune circuit. A second life flickers beneath your own.");
        this.ui.setObjective("Search the Spawn Chamber, then follow the fractured corridor east.");
        this.ui.addLog("The well whispers: the worlds did not break—they merged badly.");
        this.refreshStats();
        break;
      case "chest":
        if (this.openedObjects.has(object.id)) {
          this.ui.setMessage("The Runebound Coffer is empty.");
          break;
        }
        this.openedObjects.add(object.id);
        this.inventory.push("Sigil of Anchoring", "Bronze Circuit Charm", "Woven Recovery Band");
        this.ui.setInventory(this.inventory);
        this.ui.setMessage("You recover the Sigil of Anchoring and two pieces of your old rune circuit.");
        this.ui.addLog("Found: Sigil of Anchoring, Bronze Circuit Charm, and Woven Recovery Band.");
        this.objectVisuals.get(object.id)?.setScale(1, 0.72);
        break;
      case "dummy":
        this.ui.setMessage(`${object.name}: its cuts mark guard, channel, and execution lines used by the lost classes.`);
        break;
      case "pillar":
        this.ui.setMessage("The pillar carries two incompatible geometries: survival runes beneath formal shaping commands.");
        break;
      case "torch":
        this.ui.setMessage("The brazier burns cold. Its flame responds to soul memory rather than fuel.");
        break;
      case "threshold":
        this.ui.setMessage("Beyond the threshold, a Sentinel wakes. Choose Tactical Turns or Real-Time Action Bar before entering.");
        this.ui.setObjective("Cross the threshold and recover the Soul Essence from the Training Arena.");
        break;
      case "soul-essence":
        if (this.sentinel.alive) {
          this.ui.setMessage("The Soul Essence is sealed inside the Sentinel's command field.");
          break;
        }
        if (!this.openedObjects.has(object.id)) {
          this.openedObjects.add(object.id);
          this.inventory.push("Soul Essence: First Memory");
          this.ui.setInventory(this.inventory);
          this.ui.setObjective("First level complete: the breach remembers your name.");
          this.ui.setMessage("The Soul Essence joins your memory. A sky realm opens beyond the chamber.");
          this.ui.addLog("Level complete — The First Breach stabilized.");
          this.objectVisuals.get(object.id)?.setVisible(false);
        }
        break;
      default:
        break;
    }
  }

  private beginCombat(): void {
    if (this.combatStarted) return;
    this.combatStarted = true;
    this.combatStyle = this.ui.selectedCombatStyle();
    this.combat.begin(this.combatStyle);
    this.ui.lockCombatStyle(true);
    this.ui.showCombatControls(true);
    this.ui.setMode(this.combat.state, this.combatStyle);
    this.ui.setObjective("Defeat the Sentinel Construct and recover the sealed Soul Essence.");
    this.ui.addLog(`Combat engaged in ${this.combatStyle === "turn-based" ? "Tactical Turns" : "Real-Time Action Bar"} mode.`);

    if (this.combatStyle === "turn-based") {
      this.ui.setMessage("Your turn. Move, strike with Rune Slash, or anchor your guard.");
      this.preparePlayerTurn();
    } else {
      this.ui.setMessage("Real-time combat active. Click to reposition; use Rune Slash and Anchor Guard from the action bar.");
      this.startRealTimeLoop();
    }
  }

  private preparePlayerTurn(): void {
    this.movedThisTurn = false;
    this.selectedAction = null;
    this.ui.setMode("orders", this.combatStyle);
    this.ui.setActionEnabled("move", true);
    this.ui.setActionEnabled("rune-slash", true);
    this.ui.setActionEnabled("guard", true);
    this.ui.setActionEnabled("wait", true);
  }

  private async performRuneSlash(): Promise<void> {
    if (!this.sentinel.alive || this.enemyBusy) return;
    if (manhattan(this.player, this.sentinel) !== 1) {
      this.ui.setMessage("Rune Slash requires an adjacent target.");
      return;
    }
    if (this.combatStyle === "real-time" && this.time.now < this.slashReadyAt) {
      this.ui.setMessage("Rune Slash is still rebuilding its weapon channel.");
      return;
    }

    this.enemyBusy = true;
    this.combat.beginResolution();
    this.ui.setMode("resolution", this.combatStyle);
    this.ui.setMessage("Body, armor, charm, and blade answer as one circuit—Rune Slash!");
    this.stability = Math.max(0, this.stability - 14);
    this.fury = Math.min(100, this.fury + 6);
    await this.animateStrike(this.playerVisual, this.sentinelVisual, 0x62e6db);
    const damage = this.combat.damage("sentinel", 11);
    this.ui.addLog(`Rune Slash cuts the Sentinel for ${damage} damage (${this.sentinel.hp}/${this.sentinel.maxHp}).`);
    this.refreshStats();
    this.enemyBusy = false;

    if (!this.sentinel.alive) {
      this.resolveVictory();
      return;
    }

    if (this.combatStyle === "turn-based") {
      await this.finishPlayerTurn();
    } else {
      this.slashReadyAt = this.time.now + 1250;
      this.ui.setMode("resolution", this.combatStyle);
    }
  }

  private async finishPlayerTurn(): Promise<void> {
    this.selectedAction = null;
    this.ui.setActionEnabled("move", false);
    this.ui.setActionEnabled("rune-slash", false);
    this.ui.setActionEnabled("guard", false);
    this.ui.setActionEnabled("wait", false);
    const next = this.combat.endTurn();
    if (next !== "sentinel" || !this.sentinel.alive) return;
    this.ui.setMode("resolution", this.combatStyle);
    await this.delay(260 / this.combatSpeed);
    await this.runSentinelTurn();
  }

  private async runSentinelTurn(): Promise<void> {
    if (!this.sentinel.alive || this.enemyBusy) return;
    this.enemyBusy = true;
    const path = findPath(this.sentinel, this.player, (point) => this.isWalkable(point, "sentinel"));
    const movement = path.slice(0, Math.max(0, this.sentinel.movement));
    if (movement.length > 0) {
      const destination = movement[movement.length - 1];
      if (destination && manhattan(destination, this.player) === 0) movement.pop();
      await this.animatePath(this.sentinel, this.sentinelVisual, movement, 150);
    }
    if (manhattan(this.sentinel, this.player) === 1) await this.sentinelAttack();
    else this.ui.addLog("The Sentinel advances, searching for a break in your circuit.");
    this.enemyBusy = false;

    if (!this.player.alive) {
      this.resolveDefeat();
      return;
    }
    this.combat.endTurn();
    this.preparePlayerTurn();
    this.ui.setMessage("Your turn. The Sentinel's core is exposed between its crossing attack lines.");
  }

  private startRealTimeLoop(): void {
    this.realTimeLoop = this.time.addEvent({
      // Leave a readable action window between decisions; the attack animation
      // and active-block prompt add their own time before this cadence resumes.
      delay: 1500,
      loop: true,
      callback: () => void this.realTimeSentinelStep(),
    });
  }

  private async realTimeSentinelStep(): Promise<void> {
    if (!this.sentinel.alive || !this.player.alive || this.enemyBusy || this.playerMoving) return;
    this.enemyBusy = true;
    if (manhattan(this.sentinel, this.player) === 1) {
      await this.sentinelAttack();
    } else {
      const path = findPath(this.sentinel, this.player, (point) => this.isWalkable(point, "sentinel"));
      const step = path[0];
      if (step) await this.animatePath(this.sentinel, this.sentinelVisual, [step], 180);
    }
    this.enemyBusy = false;
    if (!this.player.alive) this.resolveDefeat();
  }

  private activateRealTimeGuard(): void {
    if (this.time.now < this.guardReadyAt) {
      this.ui.setMessage("Anchor Guard is still cooling through the armor circuit.");
      return;
    }
    this.guardReadyAt = this.time.now + 2600;
    this.combat.setGuard("player", true);
    this.ui.setMessage("Anchor Guard active for one impact.");
    this.ui.addLog("Kael locks heel, breath, armor, and blade into an anchored rune stance.");
    this.time.delayedCall(1300, () => this.combat.setGuard("player", false));
  }

  private async sentinelAttack(): Promise<void> {
    this.ui.setMessage("The Sentinel crosses both arms into a shearing command. Brace!");
    await this.animateStrike(this.sentinelVisual, this.playerVisual, 0xdc6d55, 0.65);
    const alreadyGuarding = this.player.guard;
    const reacted = await this.ui.requestReaction("Active Block", "Meet the command strike", 900);
    if (reacted && !alreadyGuarding) this.combat.setGuard("player", true);
    const damage = this.combat.damage("player", 8);
    if (reacted && !alreadyGuarding) this.combat.setGuard("player", false);
    this.fury = Math.min(100, this.fury + (reacted ? 8 : 4));
    this.stability = Math.max(0, this.stability - (reacted ? 3 : 8));
    this.ui.addLog(
      reacted
        ? `Active Block catches the strike; ${damage} damage passes through.`
        : `The command strike lands for ${damage} damage.`,
    );
    this.refreshStats();
  }

  private async animateStrike(
    attacker: ActorVisual,
    target: ActorVisual,
    effectColor: number,
    reach = 0.45,
  ): Promise<void> {
    const startX = attacker.container.x;
    const startY = attacker.container.y;
    const deltaX = target.container.x - startX;
    const deltaY = target.container.y - startY;
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: attacker.container,
        x: startX + deltaX * reach,
        y: startY + deltaY * reach,
        duration: 130 / this.combatSpeed,
        yoyo: true,
        ease: "Quad.Out",
        onYoyo: () => this.flashImpact(target, effectColor),
        onComplete: () => resolve(),
      });
    });
  }

  private flashImpact(target: ActorVisual, color: number): void {
    const effect = this.add.graphics({ x: target.container.x, y: target.container.y - 46 });
    effect.lineStyle(4, color, 0.9);
    effect.strokeCircle(0, 0, 12);
    effect.lineBetween(-22, 0, 22, 0);
    effect.lineBetween(0, -22, 0, 22);
    effect.setDepth(11_000);
    this.worldRoot.add(effect);
    this.tweens.add({ targets: effect, scale: 1.8, alpha: 0, duration: 260 / this.combatSpeed, onComplete: () => effect.destroy() });
  }

  private resolveVictory(): void {
    this.realTimeLoop?.remove(false);
    this.sentinelVisual.body.setAlpha(0.28);
    this.sentinelVisual.label.setText("Sentinel silenced");
    this.sentinelVisual.label.setColor("#71817b");
    this.objectVisuals.get("essence")?.setAlpha(1);
    this.ui.showCombatControls(false);
    this.ui.lockCombatStyle(false);
    this.ui.setMode("victory", this.combatStyle);
    this.ui.setObjective("Claim the Soul Essence from the eastern side of the Training Arena.");
    this.ui.setMessage("The Sentinel's command geometry collapses. The Soul Essence is no longer sealed.");
    this.ui.addLog("Sentinel Construct defeated. Soul Essence released.");
  }

  private resolveDefeat(): void {
    this.realTimeLoop?.remove(false);
    this.ui.showCombatControls(false);
    this.ui.lockCombatStyle(false);
    this.ui.setMode("defeat", this.combatStyle);
    this.ui.setObjective("Your soul is fractured. Reload the prototype to awaken again at the Soul Well.");
    this.ui.setMessage("The Soul Well still remembers you, but this body can no longer hold the circuit.");
  }

  private objectAt(point: GridPoint): WorldObjectDefinition | undefined {
    if (this.sentinel.alive && point.x === this.sentinel.x && point.y === this.sentinel.y) {
      const definition = levelOne.objects.find((object) => object.kind === "sentinel");
      return definition ? { ...definition, x: this.sentinel.x, y: this.sentinel.y } : undefined;
    }
    return levelOne.objects.find(
      (object) => object.kind !== "sentinel" && object.x === point.x && object.y === point.y,
    );
  }

  private isWalkable(point: GridPoint, movingActor: "player" | "sentinel"): boolean {
    const tile = this.tileMap.get(gridKey(point));
    if (!tile?.walkable) return false;
    if (movingActor !== "player" && point.x === this.player.x && point.y === this.player.y) return true;
    if (movingActor !== "sentinel" && this.sentinel.alive && point.x === this.sentinel.x && point.y === this.sentinel.y) return false;
    return !levelOne.objects.some(
      (object) =>
        object.kind !== "sentinel" &&
        object.blocksMovement &&
        object.x === point.x &&
        object.y === point.y,
    );
  }

  private placeActorVisual(actor: ActorState, visual: ActorVisual): void {
    const screen = isoToScreen(actor);
    visual.container.setPosition(screen.x, screen.y);
    visual.container.setDepth(200 + actor.x + actor.y);
  }

  private refreshStats(): void {
    this.ui.setStats({ hp: this.player.hp, stability: this.stability, fury: this.fury });
  }

  private async delay(duration: number): Promise<void> {
    await new Promise<void>((resolve) => this.time.delayedCall(duration, () => resolve()));
  }
}
