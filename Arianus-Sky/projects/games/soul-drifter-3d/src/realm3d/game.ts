import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  ShadowGenerator, Vector3, Color3, Color4, PointerEventTypes, AbstractMesh,
  Texture, StandardMaterial, MeshBuilder, Mesh,
} from '@babylonjs/core';
import { MAPS, getMapEntities, spawnMapEnemies } from '../soul-drifter/data/maps';
import { REALMS } from '../soul-drifter/data/classes';
import type { GameMap, MapEntity, Vec2 } from '../soul-drifter/game/types';
import { buildWorld, tileToWorld, worldToTile, type BuiltWorld } from './world';
import { PlayerController, makeBillboard, nameTag, makeBlobShadow } from './player';
import { entitySpriteURL, enemySpriteURL } from './sprites';
import { decorateWorld, type Decor } from './props';
import { runCreationFlow, touchProfile, type Profile } from '../ui/creation';
import { shade } from './textures';

const DIALOGS: Record<string, string> = {
  keeper: 'Soul Keeper: "You have awakened at the Soul Well, drifter. When the Sundering split the worlds, two realities collided and merged badly — you are a fragment that remembers both. Beware the Naga: they were Sartan souls once, before corruption twisted them into seeders of entropy. Touch the Awakening Essence, then pass the Soul Gate. When the Sentinel falls, the Pryan gate will open. And should you find the Tide Gate... Chelestra remembers you too."',
  scholar: 'Realm Scholar: "These corridors teach cover, height, and line of sight. Notice the wind lanes — the Wind Walkers rode them before the Sundering, and Arianus gravity is still unpredictable here. The Tide Gate to the north descends to Chelestra — the sea realm. Down there, light is law: your vision will shrink to what the lumen coral touches. Find Lumenhollow; the Elder owes the drift a debt."',
  elder: 'Elder of Lumenhollow: "The drift brings you back to us, soul-fragment. The Drowned Chapel has fallen to the Naga-touched — acolytes who answer to a Warden now. Cleanse it, and Lumenhollow will owe you more than shelter. The Tide Market is open to you, and the Salty Drift keeps a dry bed."',
  merchant: 'Tide Market Trader: "Pearls, potions, and pressure-charms — all fair trade for gold. The trench-currents are hungry lately; buy a Pearl of Clarity before you wander."',
  innkeeper: 'Salty Drift Innkeeper: "Ten gold for the night — full rest, dry blankets, and the dreams stay your own. Chelestra does not give that away often."',
  priestess: 'Tide Priestess: "Light is law in the deep. The lumen coral keeps the Naga corruption at bay — where the glow fails, the trench takes souls. Walk the bright paths, drifter."',
};

const START_MAP = 'spawn_chamber';
void START_MAP; // creation flow owns the start map now

export class Game3D {
  private engine: Engine;
  private scene!: Scene;
  private camera!: ArcRotateCamera;
  private shadowGen!: ShadowGenerator;
  private world: BuiltWorld | null = null;
  private decor: Decor | null = null;
  private skyDome: Mesh | null = null;
  private map!: GameMap;
  private player: PlayerController | null = null;
  private profile: Profile | null = null;
  private entityMeshes: AbstractMesh[] = [];
  private idleMeshes: { mesh: AbstractMesh; baseY: number; phase: number }[] = [];
  private enemyTiles = new Set<string>();
  private completedObjectives = new Set<string>();
  private traveledOnce = false;
  private animT = 0;

  // HUD refs
  private el = (id: string) => document.getElementById(id)!;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true }, true);
    this.createScene();

    // character creation / profile select comes first; the world loads after
    runCreationFlow((p) => {
      this.profile = p;
      this.loadMap(p.mapId, true);
      const pname = document.querySelector('#hud-player .pname');
      if (pname) pname.textContent = p.name;
    });

    this.el('dialog-close').addEventListener('click', () => this.el('hud-dialog').classList.add('hidden'));

    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      this.animT += dt;
      if (this.player) {
        this.player.update(dt);
        // camera follows player
        const target = Vector3.Lerp(this.camera.target, this.player.worldPos, 1 - Math.pow(0.001, dt));
        this.camera.target = target;
      }
      // animate water
      if (this.world) {
        for (const tex of this.world.waterTextures) {
          tex.uOffset += dt * 0.03;
          tex.vOffset += dt * 0.011;
        }
      }
      // torch flicker + flame wobble
      if (this.decor) {
        this.decor.torchLights.forEach((l, i) => {
          l.intensity = 0.55 + Math.sin(this.animT * 11 + i * 1.7) * 0.07 + Math.sin(this.animT * 23 + i * 3.1) * 0.04;
        });
        this.decor.flames.forEach((f, i) => {
          const s = 1 + Math.sin(this.animT * 9 + i * 2.3) * 0.12;
          f.scaling.set(s, 1 + Math.sin(this.animT * 13 + i) * 0.15, 1);
        });
      }
      // idle motion for NPCs & enemies (breathing bob)
      for (const im of this.idleMeshes) {
        im.mesh.position.y = im.baseY + Math.sin(this.animT * 1.6 + im.phase) * 0.02;
        const s = 1 + Math.sin(this.animT * 2.1 + im.phase) * 0.015;
        im.mesh.scaling.set(s, 1 / s, 1);
      }
      this.scene.render();
    });

    window.addEventListener('resize', () => this.engine.resize());
  }

  private createScene() {
    this.scene = new Scene(this.engine);

    this.camera = new ArcRotateCamera('cam', -Math.PI * 0.75, 0.95, 12, Vector3.Zero(), this.scene);
    this.camera.attachControl(undefined, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 24;
    this.camera.lowerBetaLimit = 0.5;
    this.camera.upperBetaLimit = 1.25;
    this.camera.panningSensibility = 0;
    this.camera.wheelDeltaPercentage = 0.02;
    this.camera.inertia = 0.85;

    // pointer interactions: click ground to move, click entities to interact
    this.scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERPICK) return;
      const pick = pi.pickInfo;
      if (!pick?.hit || !pick.pickedMesh) return;
      const mesh = pick.pickedMesh;
      const md = mesh.metadata as { kind?: string; entityId?: string; tileX?: number; tileY?: number } | null;
      if (md?.kind === 'entity' && md.entityId) {
        this.interact(md.entityId);
      } else if (md?.kind === 'ground' && pick.pickedPoint && this.player) {
        const t = worldToTile(this.map, pick.pickedPoint.x, pick.pickedPoint.z);
        this.player.goTo({ x: t.x, y: t.y });
        this.tickObjective('awaken');
      }
    });
  }

  private applyRealmAmbience(map: GameMap) {
    const realm = REALMS[map.realm];
    const bg = realm?.bgColor || '#0a0a1a';
    const amb = realm?.ambientColor || '#3a3a5a';
    this.scene.clearColor = Color4.FromHexString(shade(bg, -12) + 'FF');
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = Color3.FromHexString(shade(bg, -8));
    this.scene.fogDensity = map.realm === 'chelestra' ? 0.035 : map.realm === 'pryan' ? 0.028 : map.realm === 'abarrach' ? 0.04 : 0.018;

    // realm sky dome (AI-generated panorama backdrop)
    this.skyDome?.dispose();
    const skyFile = map.realm === 'pryan' ? '/sky/pryan.jpg' : map.realm === 'chelestra' || map.realm === 'abarrach' ? '/sky/chelestra.jpg' : '/sky/arianus.jpg';
    const dome = MeshBuilder.CreateSphere('skydome', { diameter: 140, segments: 16, sideOrientation: Mesh.BACKSIDE }, this.scene);
    const domeMat = new StandardMaterial('skydome-mat', this.scene);
    const skyTex = new Texture(skyFile, this.scene, true, true);
    domeMat.emissiveTexture = skyTex;
    domeMat.diffuseColor = Color3.Black();
    domeMat.specularColor = Color3.Black();
    domeMat.disableLighting = true;
    domeMat.backFaceCulling = false;
    dome.material = domeMat;
    dome.infiniteDistance = true;
    dome.isPickable = false;
    dome.applyFog = false;
    this.skyDome = dome;

    // lights (recreate per map so colors follow the realm)
    for (const l of [...this.scene.lights]) l.dispose();

    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), this.scene);
    hemi.diffuse = Color3.FromHexString(shade(amb, 30));
    hemi.groundColor = Color3.FromHexString(shade(bg, 6));
    hemi.intensity = map.realm === 'chelestra' ? 0.75 : 0.9;

    const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, 0.35), this.scene);
    sun.position = new Vector3(8, 16, -6);
    sun.diffuse = Color3.FromHexString(map.realm === 'pryan' ? '#ffd0a0' : map.realm === 'chelestra' ? '#bfe8e0' : '#fff2dc');
    sun.intensity = map.realm === 'chelestra' ? 0.7 : 1.0;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 60;

    this.shadowGen = new ShadowGenerator(2048, sun);
    this.shadowGen.useBlurExponentialShadowMap = true;
    this.shadowGen.blurKernel = 16;
    this.shadowGen.darkness = 0.35;
  }

  private loadMap(mapId: string, first = false) {
    const map = MAPS[mapId];
    if (!map) return;
    this.map = map;

    // clear old
    this.world?.dispose();
    this.decor?.dispose();
    this.decor = null;
    for (const m of this.entityMeshes) m.dispose();
    this.entityMeshes = [];
    this.idleMeshes = [];
    this.enemyTiles.clear();

    this.applyRealmAmbience(map);
    this.world = buildWorld(this.scene, map, this.shadowGen);

    // entities (NPCs, gates, items) as billboards + invisible pick boxes
    const entities = getMapEntities(mapId);
    for (const e of entities) {
      this.spawnEntity(e);
    }

    // enemies as static hostiles (combat arrives in the combat milestone)
    for (const u of spawnMapEnemies(mapId, [])) {
      const wp = tileToWorld(map, u.position.x, u.position.y);
      const bb = makeBillboard(this.scene, `enemy-${u.id}`, enemySpriteURL(u.sprite), 0.85, 1.1);
      bb.position = new Vector3(wp.x, 0.55, wp.z);
      const tag = nameTag(this.scene, u.name, '#ff9a8a');
      tag.position = new Vector3(wp.x, 1.42, wp.z);
      const sh = makeBlobShadow(this.scene, `esh-${u.id}`);
      sh.position = new Vector3(wp.x, 0.02, wp.z);
      this.entityMeshes.push(bb, tag, sh);
      this.idleMeshes.push({ mesh: bb, baseY: 0.55, phase: Math.random() * Math.PI * 2 });
      this.enemyTiles.add(`${u.position.x},${u.position.y}`);
    }

    // dungeon dressing: trim, pillars, arches, torches, rubble, coral
    this.decor = decorateWorld(this.scene, map, entities, this.shadowGen);

    // player
    const start: Vec2 = map.spawnPoints[0] || { x: 1, y: 1 };
    if (!this.player) {
      this.player = new PlayerController(
        this.scene, map, start, () => this.enemyTiles,
        this.profile?.classId || 'mage',
        this.profile?.name || 'Drifter',
      );
    } else {
      this.player.teleport(map, start);
    }
    this.camera.target = this.player.worldPos.clone();

    // HUD
    const realm = REALMS[map.realm];
    this.el('map-name').textContent = map.name;
    this.el('realm-name').textContent = realm ? `${realm.name} · ${realm.law}` : map.realm;
    this.renderObjectives();

    if (!first) {
      this.toast(`You pass through the gate — ${map.name}.`);
      // persist where the drifter is, so a refresh resumes here
      if (this.profile) touchProfile(this.profile.name, { mapId });
    }
    if (this.traveledOnce) this.tickObjective('gate');
  }

  private spawnEntity(e: MapEntity) {
    const map = this.map;
    const wp = tileToWorld(map, e.x, e.y);
    const bb = makeBillboard(this.scene, `ent-${e.id}`, entitySpriteURL(e.sprite), e.type === 'door' ? 0.95 : 0.85, e.type === 'door' ? 1.3 : 1.1);
    bb.position = new Vector3(wp.x, e.type === 'door' ? 0.65 : 0.55, wp.z);
    const sh = makeBlobShadow(this.scene, `entsh-${e.id}`);
    sh.position = new Vector3(wp.x, 0.02, wp.z);
    const tag = nameTag(this.scene, e.name, e.type === 'door' ? '#c9a8ff' : '#b0e8c8');
    tag.position = new Vector3(wp.x, 1.5, wp.z);
    // invisible pick volume
    const pick = AbstractMesh.prototype; // placeholder to keep import
    void pick;
    const box = bb.clone(`entpick-${e.id}`);
    box.isVisible = false;
    box.isPickable = true;
    box.metadata = { kind: 'entity', entityId: e.id };
    box.position = bb.position.clone();
    // also make the visible billboard itself pickable
    bb.metadata = { kind: 'entity', entityId: e.id };
    bb.isPickable = true;
    this.entityMeshes.push(bb, sh, tag, box);
    if (e.type === 'npc') this.idleMeshes.push({ mesh: bb, baseY: bb.position.y, phase: Math.random() * Math.PI * 2 });
  }

  private interact(entityId: string) {
    const e = getMapEntities(this.map.id).find(x => x.id === entityId);
    if (!e) return;

    switch (e.type) {
      case 'door': {
        if (e.requiresObjective && !this.completedObjectives.has(e.requiresObjective)) {
          this.toast(`${e.name} is sealed — the Sentinel still stands.`);
          return;
        }
        if (e.data && MAPS[e.data]) {
          this.travel(e.data);
        }
        return;
      }
      case 'npc': {
        const text = DIALOGS[e.sprite] || `${e.name} regards you silently.`;
        this.el('dialog-text').textContent = text;
        this.el('hud-dialog').classList.remove('hidden');
        this.tickObjective('speak');
        return;
      }
      case 'soul_essence':
      case 'conduit': {
        this.toast(`${e.name} hums with soul-energy. It binds to your drift.`);
        this.tickObjective('essence');
        this.tickObjective('conduit');
        return;
      }
      case 'memory': {
        this.toast(`A memory surfaces: two worlds, one sky splitting like glass.`);
        this.tickObjective('memory');
        return;
      }
      case 'item': {
        this.toast(`You pry open the ${e.name}. (+45 gold)`);
        return;
      }
      default:
        this.toast(`${e.name}.`);
    }
  }

  private travel(mapId: string) {
    const fade = this.el('fade');
    fade.classList.add('on');
    this.traveledOnce = true;
    setTimeout(() => {
      this.loadMap(mapId);
      this.tickObjective('corridor');
      setTimeout(() => fade.classList.remove('on'), 120);
    }, 480);
  }

  private tickObjective(keyword: string) {
    for (const obj of this.map.objectives) {
      if (!this.completedObjectives.has(obj) && obj.toLowerCase().includes(keyword)) {
        this.completedObjectives.add(obj);
      }
    }
    this.renderObjectives();
  }

  private renderObjectives() {
    const ul = this.el('obj-list');
    ul.innerHTML = '';
    for (const obj of this.map.objectives) {
      const li = document.createElement('li');
      li.textContent = obj.replace(/_/g, ' ');
      if (this.completedObjectives.has(obj)) li.className = 'done';
      ul.appendChild(li);
    }
  }

  private toast(text: string) {
    const t = this.el('hud-toast');
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout((this as unknown as { toastTimer: number }).toastTimer);
    (this as unknown as { toastTimer: number }).toastTimer = window.setTimeout(() => t.classList.add('hidden'), 3600);
  }
}
