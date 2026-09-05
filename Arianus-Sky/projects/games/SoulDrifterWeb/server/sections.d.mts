/** Declarations for server/sections.mjs — the Heartvale zone registry.
 * Keep in sync with the .mjs source of truth. */
export const CELL_WORLD_METERS: number;
export const CELL_CANON_KM: number;
export const DISTANCE_COMPRESSION: number;
export const PLATE_WORLD_WIDTH_M: number;
export const PLATE_WORLD_HEIGHT_M: number;

export interface HeartvaleZoneRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface HeartvaleZone {
  id: string;
  name: string;
  rect: HeartvaleZoneRect;
  adjacent: string[];
}

export interface HeartvalePoi {
  id: string;
  name: string;
  zone: string;
  plate: [number, number];
  world: [number, number];
}

export const HEARTVALE_ZONES: HeartvaleZone[];
export const HEARTVALE_POIS: HeartvalePoi[];
export function getZone(id: string): HeartvaleZone | undefined;
export function zoneAt(x: number, z: number): HeartvaleZone | undefined;
export const HEARTVALE_SECTIONS: HeartvaleZone[];
export const getSection: typeof getZone;
export const sectionAt: typeof zoneAt;
