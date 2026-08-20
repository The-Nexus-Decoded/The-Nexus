/**
 * Heartvale zone preview — walk mode player (#453 swimmable water).
 *
 * A capsule the reviewer drives with WASD through the zone: terrain-clamped
 * walking, wade/swim transition by REAL depth (WaterBody), current drift,
 * buoyant swimming with a dive key (C / hold to submerge), splash rings on
 * entry and movement, and a third-person follow camera that goes underwater.
 * Placeholder capsule per docs/HEARTVALE_PLACEHOLDER_TICKETS.md (HV-PH-01
 * lineage) — the point of this ticket is the water, not the avatar.
 */

import * as THREE from "three";
import type { TerrainField } from "./data";
import { BreathMeter, WaterBody } from "./swim";
import { WATER_TUNING, type WaterTuning } from "./waterTuning";

export interface PlayerFrameState {
  contact: "dry" | "wade" | "swim";
  submerged: boolean;
  breath: number;
  health: number;
  speed: number;
}

interface Splash {
  mesh: THREE.Mesh;
  age: number;
}

export class ZonePlayer {
  readonly root: THREE.Group;
  readonly meter: BreathMeter;
  private readonly tuning: WaterTuning;
  private readonly velocity = new THREE.Vector3();
  private readonly splashes: Splash[] = [];
  private readonly splashPool: THREE.Mesh[] = [];
  private lastSplashAt = 0;
  private wasDry = true;
  private diving = false;
  private swimBob = 0;

  constructor(private readonly scene: THREE.Scene, tuning: WaterTuning = WATER_TUNING) {
    this.tuning = tuning;
    this.meter = new BreathMeter(tuning);
    this.root = new THREE.Group();
    this.root.name = "ZonePlayer";

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(tuning.playerRadius, tuning.playerHeight - tuning.playerRadius * 2, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x546a7b, roughness: 0.7 }),
    );
    body.position.y = tuning.playerHeight / 2;
    body.castShadow = true;
    this.root.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9b28c, roughness: 0.8 }),
    );
    head.position.y = tuning.playerHeight + 0.1;
    head.castShadow = true;
    this.root.add(head);
    scene.add(this.root);
  }

  place(x: number, z: number, field: TerrainField): void {
    this.root.position.set(x, field.height(x, z), z);
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  private splashAt(x: number, z: number, y: number, now: number): void {
    let mesh = this.splashPool.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.42, 20),
        new THREE.MeshBasicMaterial({ color: 0xdff3f0, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.rotation.x = -Math.PI / 2;
      this.scene.add(mesh);
    }
    mesh.position.set(x, y + 0.04, z);
    mesh.visible = true;
    mesh.scale.setScalar(0.4);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
    this.splashes.push({ mesh, age: 0 });
    this.lastSplashAt = now;
  }

  /**
   * Advance one frame. `move` is a normalized camera-relative input vector,
   * `run` = shift sprint, `dive` = hold to submerge while swimming.
   */
  update(
    dt: number,
    move: { x: number; z: number },
    run: boolean,
    dive: boolean,
    field: TerrainField,
    water: WaterBody,
    now: number,
  ): PlayerFrameState {
    const pos = this.root.position;
    const contact = water.classifyAt(pos.x, pos.z);
    const surface = water.waterSurfaceAt(pos.x, pos.z);
    const groundY = field.height(pos.x, pos.z);
    const depth = water.depthAt(pos.x, pos.z);

    // Speed by contact (tunable), sprint on dry land only.
    let speed: number = this.tuning.walkSpeed;
    if (contact === "wade") speed = this.tuning.wadeSpeed;
    if (contact === "swim") speed = this.tuning.swimSpeed;
    if (run && contact === "dry") speed *= 1.45;

    // Input + current drift.
    const drift = water.currentAt(pos.x, pos.z);
    const vx = move.x * speed + drift.x;
    const vz = move.z * speed + drift.z;
    pos.x += vx * dt;
    pos.z += vz * dt;

    // Vertical: terrain-clamped walking; buoyant swimming at the surface with
    // a slow bob; dive holds you under toward the bed.
    this.swimBob += dt * 2.2;
    if (contact === "swim" && surface !== null) {
      this.diving = dive;
      const floatY = surface - 1.15 + Math.sin(this.swimBob) * 0.05; // chest-high float
      const diveY = field.height(pos.x, pos.z) + 0.35; // near the bed
      const targetY = this.diving ? diveY : floatY;
      pos.y += (targetY - pos.y) * Math.min(1, dt * (this.diving ? 4.5 : 3.0));
    } else {
      this.diving = false;
      const wadeY = groundY;
      pos.y += (wadeY - pos.y) * Math.min(1, dt * 10);
    }

    // Splash feedback: entry splash + movement ripples while in water.
    const inWater = contact !== "dry";
    const speedNow = Math.hypot(vx, vz);
    if (inWater && surface !== null) {
      if (this.wasDry) {
        this.splashAt(pos.x, pos.z, surface, now);
      } else if (
        speedNow > this.tuning.splashMinSpeed &&
        now - this.lastSplashAt > this.tuning.splashIntervalSeconds
      ) {
        this.splashAt(pos.x, pos.z, surface, now);
      }
    }
    this.wasDry = !inWater;

    // Age splashes: expand + fade, then recycle.
    for (let i = this.splashes.length - 1; i >= 0; i -= 1) {
      const splash = this.splashes[i]!;
      splash.age += dt;
      const t = splash.age / this.tuning.splashLifetimeSeconds;
      if (t >= 1) {
        splash.mesh.visible = false;
        this.splashPool.push(splash.mesh);
        this.splashes.splice(i, 1);
        continue;
      }
      splash.mesh.scale.setScalar(0.4 + t * this.tuning.splashMaxRadius);
      (splash.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
    }

    // Breath: head submerged when diving, or when the water is over the head.
    const headY = pos.y + this.tuning.playerHeight;
    const headSubmerged = surface !== null && (this.diving ? pos.y + 0.3 < surface : headY < surface);
    this.meter.update(dt, headSubmerged);

    // Face travel direction.
    if (Math.hypot(move.x, move.z) > 0.01) {
      this.root.rotation.y = Math.atan2(move.x, move.z);
    }

    return {
      contact,
      submerged: headSubmerged,
      breath: this.meter.breathFraction,
      health: this.meter.healthFraction,
      speed: speedNow,
    };
  }
}
