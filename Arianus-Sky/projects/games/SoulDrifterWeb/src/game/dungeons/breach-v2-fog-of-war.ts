import * as THREE from "three";

import type { BreachV2LogicalEdge } from "./breach-v2-generator.ts";
import type { BreachV2Layout } from "./breach-v2-layout.ts";

export type BreachV2FogState = "current" | "discovered" | "adjacent" | "hidden";

interface RoomBounds {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
}

export function findBreachV2RoomAt(
  rooms: readonly RoomBounds[],
  x: number,
  z: number,
): string | null {
  return rooms.find((room) => (
    x >= room.x && x <= room.x + room.w
    && z >= room.z && z <= room.z + room.h
  ))?.id ?? null;
}

export function resolveBreachV2FogState(
  roomId: string,
  currentRoomId: string | null,
  discoveredRoomIds: ReadonlySet<string>,
  edges: readonly BreachV2LogicalEdge[],
): BreachV2FogState {
  if (roomId === currentRoomId) return "current";
  if (discoveredRoomIds.has(roomId)) return "discovered";
  const adjacent = currentRoomId !== null && edges.some((edge) => (
    (edge.sourceNode === currentRoomId && edge.destinationNode === roomId)
    || (edge.destinationNode === currentRoomId && edge.sourceNode === roomId)
  ));
  return adjacent ? "adjacent" : "hidden";
}

export interface BreachV2FogOfWarController {
  update(x: number, z: number): void;
  snapshot(): {
    currentRoomId: string | null;
    discoveredRoomIds: string[];
    roomStates: Record<string, BreachV2FogState>;
  };
  destroy(): void;
}

export const BREACH_V2_FOG_STYLE: Record<
  Exclude<BreachV2FogState, "current">, { color: number; opacity: number }
> = {
  discovered: { color: 0x08191d, opacity: 0.34 },
  adjacent: { color: 0x050d12, opacity: 1 },
  hidden: { color: 0x020407, opacity: 1 },
};

function createFogTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      const wave = Math.sin(x * 0.23) + Math.cos(y * 0.19) + Math.sin((x + y) * 0.11);
      const value = Math.round(20 + (wave + 3) * 7);
      image.data[offset] = Math.round(value * 0.35);
      image.data[offset + 1] = Math.round(value * 0.7);
      image.data[offset + 2] = value;
      // Undiscovered and merely adjacent rooms must be visually unknowable,
      // not just dimmed. State opacity controls the discovered-room fade.
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function setupBreachV2FogOfWar(options: {
  scene: THREE.Scene;
  layout: BreachV2Layout;
  initialX: number;
  initialZ: number;
}): BreachV2FogOfWarController {
  const { scene, layout, initialX, initialZ } = options;
  const group = new THREE.Group();
  group.name = "breach-v2-fog-of-war";
  group.userData.spatialAuditExcluded = "nonphysical-discovery-fog";
  const texture = createFogTexture();
  const overlays = new Map<string, { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }>();

  for (const room of layout.rooms) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: BREACH_V2_FOG_STYLE.hidden.color,
      opacity: BREACH_V2_FOG_STYLE.hidden.opacity,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(room.w + 0.7, room.h + 0.7);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    const wallHeight = room.kind === "boss" ? 4.5 : room.kind === "start" ? 4 : 3.2;
    mesh.position.set(
      room.x + room.w / 2,
      Math.max(room.floorElevation, room.endElevation) + wallHeight + 0.38,
      room.z + room.h / 2,
    );
    mesh.renderOrder = 18;
    mesh.name = `discovery-fog-${room.id}`;
    mesh.userData.spatialAuditExcluded = "nonphysical-discovery-fog";
    group.add(mesh);
    overlays.set(room.id, { mesh, material });
  }
  scene.add(group);

  let currentRoomId = findBreachV2RoomAt(layout.rooms, initialX, initialZ);
  const discoveredRoomIds = new Set<string>(currentRoomId ? [currentRoomId] : []);
  const roomStates: Record<string, BreachV2FogState> = {};
  const sync = (): void => {
    for (const room of layout.rooms) {
      const state = resolveBreachV2FogState(
        room.id,
        currentRoomId,
        discoveredRoomIds,
        layout.logicalGraph.edges,
      );
      roomStates[room.id] = state;
      const overlay = overlays.get(room.id)!;
      overlay.mesh.visible = state !== "current";
      if (state !== "current") {
        overlay.material.color.setHex(BREACH_V2_FOG_STYLE[state].color);
        overlay.material.opacity = BREACH_V2_FOG_STYLE[state].opacity;
      }
    }
  };
  sync();

  return {
    update: (x, z) => {
      const nextRoomId = findBreachV2RoomAt(layout.rooms, x, z);
      // Preserve the source room's reveal while the player is inside a narrow
      // connector; discovery advances only after they actually cross into the
      // next authored room bounds.
      if (!nextRoomId || nextRoomId === currentRoomId) return;
      currentRoomId = nextRoomId;
      discoveredRoomIds.add(currentRoomId);
      sync();
    },
    snapshot: () => ({
      currentRoomId,
      discoveredRoomIds: [...discoveredRoomIds],
      roomStates: { ...roomStates },
    }),
    destroy: () => {
      scene.remove(group);
      for (const { mesh, material } of overlays.values()) {
        mesh.geometry.dispose();
        material.dispose();
      }
      texture.dispose();
    },
  };
}
