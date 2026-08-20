/**
 * Heartvale zone preview — data layer.
 *
 * Loads the Houdini-exported runtime artifacts (heightmap f32, 7-channel
 * splat u8, tint rgb, scatter/village/npcs JSON) plus the layout authority
 * (layout.json). All zone-local coordinates are soulwell-relative meters;
 * add `plateOffset` for plate-world meters (the frame in server/sections.mjs).
 *
 * Data-authored per ZONE_BUILD_RUNBOOK.md §4 — no hardcoded geometry here,
 * only loaders + samplers over the exported artifacts.
 */

export interface TerrainMeta {
  schemaVersion: number;
  frame: string;
  plateOffset: [number, number];
  originLocal: [number, number];
  samples: { x: number; z: number };
  metersPerSample: number;
  heightmap: { file: string; dtype: string; units: string; order: string };
  splat: { file: string; dtype: string; order: string; channels: string[] };
  tint: { file: string; dtype: string; order: string };
  zones: ZoneRect[];
}

export interface ZoneRect {
  id: string;
  name: string;
  rect: { x0: number; z0: number; x1: number; z1: number };
  adjacent: string[];
}

export interface LayoutAnchor {
  id: string;
  name: string;
  type: string;
  zone: string;
  world: { x: number; z: number };
}

export interface LayoutRiver {
  id: string;
  samples: [number, number][];
}

export interface LayoutRoad {
  id: string;
  samples: [number, number][];
}

export interface LayoutData {
  schemaVersion: number;
  anchors: LayoutAnchor[];
  rivers: LayoutRiver[];
  roads: LayoutRoad[];
}

export interface ScatterAssets {
  trees: Record<string, string>;
  shrubs: string[];
  rocks: Record<string, string>;
  sedge: string;
  grassTuft: string;
}

export interface ScatterData {
  schemaVersion: number;
  assets: ScatterAssets;
  trees: [number, number, string, number][];
  shrubs: [number, number, number, number][];
  rocks: [number, number, number][];
  sedges: [number, number, number][];
  grassClumps: [number, number, number, number, number][];
}

export interface VillageHouse {
  name: string;
  kind: "reeve" | "hall" | "smithy" | "apothecary" | "vendor" | "cottage" | "barn";
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  roof: "thatch" | "slate";
  wash: [number, number, number];
  timber: [number, number, number];
  roofTint: [number, number, number];
  chimney: boolean;
  yawDeg: number;
}

export interface VillageGarden {
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface VillageJetty {
  x0: number; // bank end (dry)
  x1: number; // T-head end (over water)
  z: number;
  deckY: number;
}

export interface VillageBoat {
  x: number;
  z: number;
  yawDeg: number;
}

export interface VillageStable {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface VillageHorse {
  id: string;
  x: number;
  z: number;
  yawDeg: number;
}

export interface VillageData {
  schemaVersion: number;
  anchor: { x: number; z: number };
  plaza: { x: number; z: number };
  streetX: number;
  houses: VillageHouse[];
  gardens: VillageGarden[];
  well: { x: number; z: number };
  jetty: VillageJetty;
  boats: VillageBoat[];
  stable?: VillageStable;
  paddock?: VillageGarden;
  horses?: VillageHorse[];
}

export interface NpcEntry {
  id: string;
  x: number;
  z: number;
  yawDeg: number;
  tunic: [number, number, number];
}

export interface NpcData {
  schemaVersion: number;
  npcs: NpcEntry[];
}

/** Bilinear-sampled view over the exported terrain rasters. */
export class TerrainField {
  readonly nx: number;
  readonly nz: number;
  readonly originX: number;
  readonly originZ: number;
  readonly step: number;
  readonly heights: Float32Array;
  /** 7 channels, channel-major, each nz×nx u8 normalized to 0..1 on read. */
  readonly splat: Uint8Array;
  readonly splatChannels: string[];
  /** rgb planes, channel-major nz×nx. */
  readonly tint: Uint8Array;

  constructor(meta: TerrainMeta, heights: Float32Array, splat: Uint8Array, tint: Uint8Array) {
    this.nx = meta.samples.x;
    this.nz = meta.samples.z;
    this.originX = meta.originLocal[0];
    this.originZ = meta.originLocal[1];
    this.step = meta.metersPerSample;
    this.heights = heights;
    this.splat = splat;
    this.splatChannels = meta.splat.channels;
    this.tint = tint;
  }

  private gridCoords(x: number, z: number): [number, number] {
    return [(x - this.originX) / this.step, (z - this.originZ) / this.step];
  }

  /** Bilinear height in meters at soulwell-local (x, z). Edges clamp. */
  height(x: number, z: number): number {
    const [gx, gz] = this.gridCoords(x, z);
    const cx = Math.min(Math.max(gx, 0), this.nx - 1.001);
    const cz = Math.min(Math.max(gz, 0), this.nz - 1.001);
    const x0 = Math.floor(cx);
    const z0 = Math.floor(cz);
    const fx = cx - x0;
    const fz = cz - z0;
    const i00 = z0 * this.nx + x0;
    const i10 = i00 + 1;
    const i01 = i00 + this.nx;
    const i11 = i01 + 1;
    const a = (this.heights[i00] ?? 0) * (1 - fx) + (this.heights[i10] ?? 0) * fx;
    const b = (this.heights[i01] ?? 0) * (1 - fx) + (this.heights[i11] ?? 0) * fx;
    return a * (1 - fz) + b * fz;
  }

  /** Bilinear splat channel weight 0..1 at soulwell-local (x, z). */
  splatWeight(channel: string, x: number, z: number): number {
    const ci = this.splatChannels.indexOf(channel);
    if (ci < 0) return 0;
    const [gx, gz] = this.gridCoords(x, z);
    const cx = Math.min(Math.max(gx, 0), this.nx - 1.001);
    const cz = Math.min(Math.max(gz, 0), this.nz - 1.001);
    const x0 = Math.floor(cx);
    const z0 = Math.floor(cz);
    const fx = cx - x0;
    const fz = cz - z0;
    const plane = ci * this.nx * this.nz;
    const i00 = plane + z0 * this.nx + x0;
    const i10 = i00 + 1;
    const i01 = i00 + this.nx;
    const i11 = i01 + 1;
    const a = (this.splat[i00] ?? 0) * (1 - fx) + (this.splat[i10] ?? 0) * fx;
    const b = (this.splat[i01] ?? 0) * (1 - fx) + (this.splat[i11] ?? 0) * fx;
    return (a * (1 - fz) + b * fz) / 255;
  }
}

export interface ZoneData {
  meta: TerrainMeta;
  field: TerrainField;
  layout: LayoutData;
  scatter: ScatterData;
  village: VillageData;
  npcs: NpcData;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
  return (await response.json()) as T;
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
  return response.arrayBuffer();
}

export async function loadZoneData(base: string): Promise<ZoneData> {
  const meta = await fetchJson<TerrainMeta>(`${base}/heartvale-terrain-export.json`);
  const [heightBuf, splatBuf, tintBuf, layout, scatter, village, npcs] = await Promise.all([
    fetchBytes(`${base}/${meta.heightmap.file}`),
    fetchBytes(`${base}/${meta.splat.file}`),
    fetchBytes(`${base}/${meta.tint.file}`),
    fetchJson<LayoutData>(`${base}/layout.json`),
    fetchJson<ScatterData>(`${base}/heartvale-scatter.json`),
    fetchJson<VillageData>(`${base}/heartvale-village.json`),
    fetchJson<NpcData>(`${base}/heartvale-npcs.json`),
  ]);
  const heights = new Float32Array(heightBuf);
  const expected = meta.samples.x * meta.samples.z;
  if (heights.length !== expected) {
    throw new Error(`heightmap sample mismatch: got ${heights.length}, want ${expected}`);
  }
  const field = new TerrainField(meta, heights, new Uint8Array(splatBuf), new Uint8Array(tintBuf));
  return { meta, field, layout, scatter, village, npcs };
}

/** Rect lookup in plate-world meters (runbook §4.6 multiplayer hook). */
export function zoneAt(meta: TerrainMeta, worldX: number, worldZ: number): ZoneRect | null {
  for (const zone of meta.zones) {
    const { x0, z0, x1, z1 } = zone.rect;
    if (worldX >= x0 && worldX <= x1 && worldZ >= z0 && worldZ <= z1) return zone;
  }
  return null;
}
