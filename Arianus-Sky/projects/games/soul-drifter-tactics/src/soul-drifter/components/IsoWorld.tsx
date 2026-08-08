import { useMemo, useCallback } from 'react';
import type { Vec2, MapTile, Unit, Floater, ActionFx } from '../game/types';
import { TERRAIN_DEFS, REALMS, RACES } from '../data/classes';

const TILE_W = 64;
const TILE_H = 32;

function isoToScreen(x: number, y: number, z = 0): Vec2 {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) - z * (TILE_H / 2),
  };
}

function screenToIso(sx: number, sy: number): Vec2 {
  const x = (sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2;
  const y = (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

// ---------------- TEXTURE HELPERS ----------------

/** Deterministic pseudo-random in [0,1) from tile coords + salt. */
function hash01(x: number, y: number, salt: number): number {
  let h = x * 374761393 + y * 668265263 + salt * 1442695041;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 1000) / 1000;
}

/** Lighten (amt>0) or darken (amt<0) a #rrggbb color. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface IsoWorldProps {
  tiles: MapTile[][];
  units: Unit[];
  entities: { id: string; x: number; y: number; name: string; sprite: string; interactable: boolean }[];
  camera: Vec2;
  hoveredTile: Vec2 | null;
  selectedUnit: string | null;
  exploredTiles: Set<string>;
  floaters: Floater[];
  actionFx: ActionFx | null;
  realmId: string;
  combatActive: boolean;
  activeUnitId: string | null;
  moveRange: Vec2[];
  targetTiles: Vec2[];
  affectedPreview: Vec2[];
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number, y: number | null | undefined) => void;
  onEntityClick: (id: string) => void;
  onUnitClick: (id: string) => void;
  width: number;
  height: number;
}

// ---------------- TERRAIN RENDERER ----------------
function TerrainArt({ terrain, tx, ty, size = TILE_W }: { terrain: string; tx: number; ty: number; size?: number }) {
  const def = TERRAIN_DEFS[terrain];
  const base = def?.color || '#333';
  const detail = def?.detailColor || '#444';
  const light = shade(base, 22);
  const dark = shade(base, -20);
  const diamond = `${size / 2},0 ${size},${size / 4} ${size / 2},${size / 2} 0,${size / 4}`;
  const gid = `tg-${terrain}-${tx}-${ty}`;

  // Deterministic texture speckles for floor-type tiles
  const speckles = (
    <g>
      {[0, 1, 2].map(i => {
        const px = size * (0.25 + hash01(tx, ty, i * 7 + 1) * 0.5);
        const py = size * (0.12 + hash01(tx, ty, i * 7 + 2) * 0.26);
        const r = 0.7 + hash01(tx, ty, i * 7 + 3) * 1.3;
        const col = hash01(tx, ty, i * 7 + 4) > 0.5 ? detail : shade(detail, -14);
        return <circle key={i} cx={px} cy={py} r={r} fill={col} opacity={0.3 + hash01(tx, ty, i * 7 + 5) * 0.3} />;
      })}
      {hash01(tx, ty, 99) > 0.72 && (
        <path
          d={`M${size * (0.2 + hash01(tx, ty, 98) * 0.2)} ${size * (0.15 + hash01(tx, ty, 97) * 0.1)} L${size * (0.45 + hash01(tx, ty, 96) * 0.15)} ${size * (0.22 + hash01(tx, ty, 95) * 0.12)}`}
          stroke={dark} strokeWidth="0.8" fill="none" opacity="0.5" />
      )}
    </g>
  );

  const floorSvg = (extra?: React.ReactNode) => (
    <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <polygon points={diamond} fill={`url(#${gid})`} stroke={dark} strokeWidth="1" />
      {speckles}
      {extra}
      {/* top edge catch-light */}
      <polyline points={`${size * 0.08},${size / 4} ${size / 2},${size * 0.02} ${size * 0.92},${size / 4}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    </svg>
  );

  const wallSvg = (extra?: React.ReactNode) => (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: -size / 4, left: 0 }}>
      <defs>
        <linearGradient id={`${gid}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={base} />
        </linearGradient>
        <linearGradient id={`${gid}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={detail} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <polygon points={`0,${size / 4} ${size / 2},${size / 2} ${size / 2},${size * 0.75} 0,${size / 2}`} fill={`url(#${gid}-front)`} />
      <polygon points={`${size / 2},${size / 2} ${size},${size / 4} ${size},${size / 2} ${size / 2},${size * 0.75}`} fill={shade(detail, -26)} />
      <polygon points={diamond} fill={`url(#${gid}-top)`} stroke={shade(base, 34)} strokeWidth="1" />
      {/* brick seams */}
      <line x1={size * 0.12} y1={size * 0.4} x2={size * 0.42} y2={size * 0.55} stroke={dark} strokeWidth="0.7" opacity="0.6" />
      <line x1={size * 0.58} y1={size * 0.55} x2={size * 0.88} y2={size * 0.4} stroke={shade(detail, -40)} strokeWidth="0.7" opacity="0.6" />
      {extra}
    </svg>
  );

  switch (terrain) {
    case 'floor_soulwell':
      return floorSvg(
        <circle cx={size / 2} cy={size / 4} r="4" fill="#00d4ff" opacity="0.35">
          <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2s" repeatCount="indefinite" />
        </circle>
      );
    case 'floor_stone':
    case 'floor_stone_cracked':
      return floorSvg(
        terrain === 'floor_stone_cracked'
          ? <path d={`M${size * 0.3} ${size * 0.2} L${size * 0.5} ${size * 0.15} L${size * 0.6} ${size * 0.3}`} stroke={shade(base, -34)} strokeWidth="0.9" fill="none" opacity="0.5" />
          : undefined
      );
    case 'floor_grass':
      return floorSvg(
        <g opacity="0.5">
          {[0, 1, 2, 3].map(i => {
            const px = size * (0.3 + hash01(tx, ty, i + 11) * 0.4);
            const py = size * (0.12 + hash01(tx, ty, i + 21) * 0.2);
            return <line key={i} x1={px} y1={py + 5} x2={px + 2} y2={py} stroke={shade(detail, 14)} strokeWidth="1" />;
          })}
        </g>
      );
    case 'floor_dirt':
    case 'floor_wood':
    case 'floor_sand':
      return floorSvg(
        terrain === 'floor_sand'
          ? <path d={`M${size * 0.2} ${size * 0.2} Q${size * 0.35} ${size * 0.15} ${size * 0.5} ${size * 0.2} M${size * 0.4} ${size * 0.3} Q${size * 0.55} ${size * 0.25} ${size * 0.7} ${size * 0.3}`} stroke={detail} strokeWidth="0.7" fill="none" opacity="0.35" />
          : undefined
      );
    case 'floor_basalt':
      return floorSvg(
        <path d={`M${size * 0.25} ${size * 0.2} L${size * 0.45} ${size * 0.22} L${size * 0.55} ${size * 0.3}`} stroke="#FF6B35" strokeWidth="0.6" fill="none" opacity="0.25" />
      );
    case 'floor_obsidian':
      return floorSvg(
        <polygon points={`${size * 0.35},${size * 0.12} ${size * 0.55},${size * 0.18} ${size * 0.4},${size * 0.28}`} fill="#4a2a5e" opacity="0.35" />
      );
    case 'floor_ash':
      return floorSvg(
        <circle cx={size * 0.5} cy={size * 0.15} r="0.8" fill="#FF6B35" opacity="0.3" />
      );
    case 'floor_coral':
      return floorSvg(
        <circle cx={size * 0.5} cy={size * 0.15} r="0.8" fill="#5eead4" opacity="0.4" />
      );
    case 'floor_kelp':
      return floorSvg(
        <g opacity="0.65">
          <path d={`M${size * 0.35} ${size * 0.3} Q${size * 0.32} ${size * 0.15} ${size * 0.38} ${size * 0.05}`} stroke="#2e7a4e" strokeWidth="1.2" fill="none" />
          <path d={`M${size * 0.5} ${size * 0.32} Q${size * 0.48} ${size * 0.18} ${size * 0.54} ${size * 0.08}`} stroke="#3a9a5e" strokeWidth="1.2" fill="none" />
          <path d={`M${size * 0.65} ${size * 0.28} Q${size * 0.62} ${size * 0.16} ${size * 0.68} ${size * 0.06}`} stroke="#2e7a4e" strokeWidth="1" fill="none" />
        </g>
      );
    case 'lava':
      return (
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a83a12" />
              <stop offset="55%" stopColor={base} />
              <stop offset="100%" stopColor="#5a1a06" />
            </linearGradient>
          </defs>
          <polygon points={diamond} fill={`url(#${gid})`} stroke="#FF6B35" strokeWidth="1" />
          <polygon points={`${size * 0.3},${size * 0.15} ${size * 0.6},${size * 0.2} ${size * 0.5},${size * 0.35} ${size * 0.25},${size * 0.3}`} fill="#FFB347" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite" />
          </polygon>
          <circle cx={size * 0.45} cy={size * 0.22} r="2" fill="#FFE29A" opacity="0.6">
            <animate attributeName="r" values="1.5;3;1.5" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case 'wall_stone':
    case 'wall_rune':
    case 'wall_breach':
    case 'wall_basalt':
    case 'wall_coral':
      return wallSvg(
        terrain === 'wall_coral' ? (
          <g opacity="0.6">
            <circle cx={size * 0.35} cy={size * 0.35} r="2" fill="#5eead4" opacity="0.4" />
            <circle cx={size * 0.6} cy={size * 0.5} r="1.5" fill="#4682B4" opacity="0.5" />
          </g>
        ) : terrain === 'wall_basalt' ? (
          <line x1={size * 0.3} y1={size * 0.4} x2={size * 0.5} y2={size * 0.55} stroke="#FF6B35" strokeWidth="0.8" opacity="0.3" />
        ) : terrain === 'wall_rune' ? (
          <circle cx={size / 2} cy={size * 0.3} r="3" fill="#a855f7" opacity="0.4">
            <animate attributeName="opacity" values="0.25;0.55;0.25" dur="2.4s" repeatCount="indefinite" />
          </circle>
        ) : undefined
      );
    case 'conduit_active':
      return floorSvg(
        <g>
          <polygon points={diamond} fill="none" stroke="#9333ea" strokeWidth="2" />
          <circle cx={size / 2} cy={size / 4} r="5" fill="#a855f7" opacity="0.5">
            <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    case 'conduit_broken':
      return floorSvg(
        <polygon points={diamond} fill="none" stroke="#444" strokeWidth="1" strokeDasharray="4 2" />
      );
    case 'hazard_wind_lane':
      return floorSvg(
        <path d={`M${size * 0.2} ${size * 0.22} Q${size * 0.5} ${size * 0.18} ${size * 0.8} ${size * 0.22}`} stroke="#87CEEB" strokeWidth="1.2" fill="none" opacity="0.6">
          <animate attributeName="opacity" values="0.35;0.75;0.35" dur="1.6s" repeatCount="indefinite" />
        </path>
      );
    case 'hazard_heat':
      return floorSvg(
        <g>
          <path d={`M${size * 0.35} ${size * 0.3} Q${size * 0.4} ${size * 0.15} ${size * 0.45} ${size * 0.3}`} stroke="#FF6B35" strokeWidth="1" fill="none" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d={`M${size * 0.55} ${size * 0.32} Q${size * 0.6} ${size * 0.17} ${size * 0.65} ${size * 0.32}`} stroke="#FFB347" strokeWidth="1" fill="none" opacity="0.4" />
        </g>
      );
    case 'water_shallow':
      return (
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e5a7e" />
              <stop offset="100%" stopColor="#0e2e4a" />
            </linearGradient>
          </defs>
          <polygon points={diamond} fill={`url(#${gid})`} stroke={detail} strokeWidth="1" opacity="0.95" />
          <path d={`M${size * 0.25} ${size * 0.2} Q${size * 0.4} ${size * 0.16} ${size * 0.55} ${size * 0.2}`} stroke="#7ec8e3" strokeWidth="1" fill="none" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.4s" repeatCount="indefinite" />
          </path>
          <path d={`M${size * 0.45} ${size * 0.3} Q${size * 0.6} ${size * 0.26} ${size * 0.75} ${size * 0.3}`} stroke="#5eead4" strokeWidth="0.8" fill="none" opacity="0.4" />
        </svg>
      );
    case 'water_deep':
      return (
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e2e4a" />
              <stop offset="100%" stopColor="#020810" />
            </linearGradient>
          </defs>
          <polygon points={diamond} fill={`url(#${gid})`} stroke={detail} strokeWidth="1" />
          <circle cx={size * 0.4} cy={size * 0.2} r="1.5" fill="#4682B4" opacity="0.3">
            <animate attributeName="cy" values={`${size * 0.25};${size * 0.15};${size * 0.25}`} dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case 'current_lane':
      return (
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e5a7e" />
              <stop offset="100%" stopColor={base} />
            </linearGradient>
          </defs>
          <polygon points={diamond} fill={`url(#${gid})`} stroke={detail} strokeWidth="1" strokeDasharray="4 2" />
          <g opacity="0.7">
            <path d={`M${size * 0.7} ${size * 0.15} L${size * 0.4} ${size * 0.2} M${size * 0.5} ${size * 0.15} L${size * 0.4} ${size * 0.2} L${size * 0.5} ${size * 0.25}`} stroke="#5eead4" strokeWidth="1.2" fill="none">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.2s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>
      );
    case 'glow_coral':
      return (
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <radialGradient id={gid} cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="#2e5a6e" />
              <stop offset="100%" stopColor={base} />
            </radialGradient>
          </defs>
          <polygon points={diamond} fill={`url(#${gid})`} stroke="#5eead4" strokeWidth="1.5" />
          <circle cx={size / 2} cy={size / 4} r="5" fill="#5eead4" opacity="0.4">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={size / 2} cy={size / 4} r="2.5" fill="#99f6e4" opacity="0.85" />
        </svg>
      );
    case 'cover_half':
      return floorSvg(
        <g>
          <rect x={size * 0.34} y={size * 0.02} width={size * 0.32} height={size * 0.3} rx="2" fill={shade(detail, 10)} stroke={shade(detail, -20)} strokeWidth="1" />
          <rect x={size * 0.38} y={size * 0.06} width={size * 0.24} height={size * 0.08} rx="1" fill={shade(detail, 30)} opacity="0.7" />
        </g>
      );
    default:
      return floorSvg();
  }
}

// ---------------- ENEMY SPRITES ----------------
function EnemyArt({ sprite }: { sprite: string }) {
  switch (sprite) {
    case 'dummy':
      return (
        <svg width="26" height="32" viewBox="0 0 20 26" className="drop-shadow-lg">
          <defs><linearGradient id="ed1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b8b5a" /><stop offset="100%" stopColor="#5a5a32" /></linearGradient></defs>
          <rect x="6" y="10" width="8" height="12" rx="2" fill="url(#ed1)" stroke="#3a3a1a" strokeWidth="0.8" />
          <circle cx="10" cy="6" r="5" fill="#9b9b6a" stroke="#4a4a2a" strokeWidth="0.8" />
          <circle cx="10" cy="6" r="2" fill="#3a3a1a" />
          <line x1="10" y1="22" x2="10" y2="26" stroke="#4a4a2a" strokeWidth="2" />
        </svg>
      );
    case 'dummy_red':
      return (
        <svg width="26" height="32" viewBox="0 0 20 26" className="drop-shadow-lg">
          <rect x="6" y="10" width="8" height="12" rx="2" fill="#7a4444" stroke="#3a1a1a" strokeWidth="0.8" />
          <circle cx="10" cy="6" r="5" fill="#9b6a6a" stroke="#4a2a2a" strokeWidth="0.8" />
          <circle cx="10" cy="6" r="2" fill="#ff4444" opacity="0.8">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <line x1="10" y1="22" x2="10" y2="26" stroke="#4a2a2a" strokeWidth="2" />
        </svg>
      );
    case 'sentinel':
      return (
        <svg width="38" height="46" viewBox="0 0 32 40" className="drop-shadow-lg">
          <defs><linearGradient id="es1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a4a6e" /><stop offset="100%" stopColor="#1a1a2e" /></linearGradient></defs>
          <rect x="8" y="14" width="16" height="18" rx="3" fill="url(#es1)" stroke="#5a5a8e" strokeWidth="1.5" />
          <rect x="10" y="16" width="4" height="4" rx="1" fill="#ff4444" opacity="0.8">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
          </rect>
          <rect x="18" y="16" width="4" height="4" rx="1" fill="#ff4444" opacity="0.8">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" begin="0.5s" repeatCount="indefinite" />
          </rect>
          <polygon points="16,2 24,12 8,12" fill="#2a2a3e" stroke="#5a5a8e" strokeWidth="1.5" />
          <rect x="6" y="20" width="4" height="12" rx="1" fill="#3a3a4e" />
          <rect x="22" y="20" width="4" height="12" rx="1" fill="#3a3a4e" />
          <line x1="12" y1="24" x2="20" y2="24" stroke="#0a0a1a" strokeWidth="1" opacity="0.5" />
        </svg>
      );
    case 'imp':
      return (
        <svg width="26" height="30" viewBox="0 0 22 26" className="drop-shadow-lg">
          <defs><linearGradient id="ei1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b85a1a" /><stop offset="100%" stopColor="#6e2a08" /></linearGradient></defs>
          <ellipse cx="11" cy="16" rx="7" ry="8" fill="url(#ei1)" />
          <circle cx="11" cy="8" r="5" fill="#c86a2a" />
          <polygon points="7,4 5,0 9,3" fill="#FF6B35" />
          <polygon points="15,4 17,0 13,3" fill="#FF6B35" />
          <circle cx="9" cy="8" r="1.2" fill="#FFE29A" />
          <circle cx="13" cy="8" r="1.2" fill="#FFE29A" />
          <circle cx="11" cy="14" r="2.5" fill="#FFB347" opacity="0.7">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.1s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case 'beetle':
      return (
        <svg width="36" height="30" viewBox="0 0 32 26" className="drop-shadow-lg">
          <defs><linearGradient id="eb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6e3a14" /><stop offset="100%" stopColor="#2a1206" /></linearGradient></defs>
          <ellipse cx="16" cy="15" rx="13" ry="9" fill="url(#eb1)" stroke="#8a4a1a" strokeWidth="2" />
          <ellipse cx="16" cy="14" rx="9" ry="6" fill="#5a2a0a" opacity="0.8" />
          <path d="M10 12 Q16 8 22 12" stroke="#FF6B35" strokeWidth="1.5" fill="none" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </path>
          <circle cx="6" cy="13" r="2" fill="#FFB347" />
          <line x1="4" y1="20" x2="2" y2="25" stroke="#2a0a05" strokeWidth="2" />
          <line x1="28" y1="20" x2="30" y2="25" stroke="#2a0a05" strokeWidth="2" />
        </svg>
      );
    case 'golem':
      return (
        <svg width="44" height="52" viewBox="0 0 40 48" className="drop-shadow-xl">
          <defs><linearGradient id="eg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a1e0c" /><stop offset="100%" stopColor="#1e0a04" /></linearGradient></defs>
          <rect x="10" y="16" width="20" height="24" rx="4" fill="url(#eg1)" stroke="#8a3a12" strokeWidth="2" />
          <rect x="13" y="4" width="14" height="12" rx="3" fill="#3a1408" stroke="#8a3a12" strokeWidth="2" />
          <rect x="15" y="8" width="4" height="3" fill="#FFB347">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.3s" repeatCount="indefinite" />
          </rect>
          <rect x="21" y="8" width="4" height="3" fill="#FFB347">
            <animate attributeName="opacity" values="1;0.6;1" dur="1.3s" repeatCount="indefinite" />
          </rect>
          <path d="M14 20 L26 34 M26 20 L14 34" stroke="#FF6B35" strokeWidth="1.5" opacity="0.5" />
          <rect x="4" y="18" width="6" height="16" rx="2" fill="#3a1408" stroke="#5a240e" strokeWidth="1" />
          <rect x="30" y="18" width="6" height="16" rx="2" fill="#3a1408" stroke="#5a240e" strokeWidth="1" />
          <circle cx="20" cy="28" r="4" fill="#FF6B35" opacity="0.6">
            <animate attributeName="r" values="3;5;3" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case 'lurker':
      return (
        <svg width="34" height="28" viewBox="0 0 30 24" className="drop-shadow-lg">
          <defs><linearGradient id="el1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d8e4e8" /><stop offset="100%" stopColor="#7e98a0" /></linearGradient></defs>
          <ellipse cx="15" cy="14" rx="11" ry="7" fill="url(#el1)" opacity="0.95" />
          <ellipse cx="15" cy="13" rx="7" ry="4.5" fill="#9fb4ba" />
          <circle cx="8" cy="11" r="1.6" fill="#04101e" />
          <circle cx="22" cy="11" r="1.6" fill="#04101e" />
          <g stroke="#8aa4aa" strokeWidth="1.5" fill="none">
            <path d="M5 18 L2 23" /><path d="M11 20 L9 24" /><path d="M19 20 L21 24" /><path d="M25 18 L28 23" />
          </g>
          <path d="M12 8 Q15 4 18 8" stroke="#5eead4" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>
      );
    case 'acolyte':
      return (
        <svg width="28" height="36" viewBox="0 0 24 32" className="drop-shadow-lg">
          <defs><linearGradient id="ea1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2e5a6e" /><stop offset="100%" stopColor="#0e2430" /></linearGradient></defs>
          <path d="M6 30 L8 12 L16 12 L18 30 Z" fill="url(#ea1)" stroke="#3e6a7e" strokeWidth="1" />
          <circle cx="12" cy="8" r="6" fill="#2e5a6e" stroke="#1e4a5e" strokeWidth="1" />
          <circle cx="12" cy="8" r="3.5" fill="#04101e" />
          <circle cx="10.5" cy="7.5" r="1" fill="#5eead4" opacity="0.8">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="13.5" cy="7.5" r="1" fill="#5eead4" opacity="0.8" />
          <path d="M8 16 Q12 20 16 16" stroke="#4682B4" strokeWidth="1.2" fill="none" opacity="0.7" />
        </svg>
      );
    case 'stalker':
      return (
        <svg width="34" height="30" viewBox="0 0 30 26" className="drop-shadow-lg">
          <defs><linearGradient id="es2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a9abe" /><stop offset="100%" stopColor="#1e4a5e" /></linearGradient></defs>
          <path d="M4 14 Q15 4 26 14 Q15 20 4 14 Z" fill="url(#es2)" stroke="#6abade" strokeWidth="1.2" />
          <polygon points="24,14 29,10 28,16" fill="#4a9abe" />
          <circle cx="9" cy="12" r="1.8" fill="#04101e" />
          <circle cx="9" cy="12" r="0.8" fill="#5eead4" />
          <path d="M13 8 Q15 6 17 8 L15 12 Z" fill="#6abade" opacity="0.8" />
        </svg>
      );
    case 'warden':
      return (
        <svg width="40" height="48" viewBox="0 0 36 44" className="drop-shadow-xl">
          <defs><linearGradient id="ew1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3e5a7e" /><stop offset="100%" stopColor="#16222e" /></linearGradient></defs>
          <rect x="9" y="14" width="18" height="22" rx="4" fill="url(#ew1)" stroke="#4682B4" strokeWidth="2" />
          <rect x="12" y="4" width="12" height="10" rx="3" fill="#2e3e4e" stroke="#4682B4" strokeWidth="1.5" />
          <rect x="14" y="7" width="3" height="2.5" fill="#5eead4">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="19" y="7" width="3" height="2.5" fill="#5eead4">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <g fill="#c8d4d8" opacity="0.7">
            <circle cx="11" cy="18" r="2" /><circle cx="25" cy="24" r="1.6" /><circle cx="13" cy="30" r="1.4" />
          </g>
          <rect x="3" y="16" width="5" height="14" rx="2" fill="#2e3e4e" stroke="#1e2e3e" strokeWidth="1" />
          <rect x="28" y="10" width="3" height="20" rx="1" fill="#5a7a8e" />
          <polygon points="29.5,6 33,11 26,11" fill="#5eead4" opacity="0.8" />
        </svg>
      );
    default:
      return (
        <svg width="26" height="32" viewBox="0 0 20 26" className="drop-shadow-lg">
          <rect x="6" y="10" width="8" height="12" rx="2" fill="#5a2a2a" />
          <circle cx="10" cy="6" r="5" fill="#7a3a3a" />
        </svg>
      );
  }
}

// ---------------- PLAYER SPRITE ----------------
function PlayerArt({ classId, skin }: { classId?: string; skin: string }) {
  const colors: Record<string, [string, string]> = {
    warrior: ['#e05252', '#7a1e1e'],
    mage: ['#b06ad8', '#5e2a7a'],
    priest: ['#f7dc6f', '#9a7a0a'],
    sharpshooter: ['#52c77a', '#1a6e3a'],
    paladin: ['#f0a050', '#9a4e12'],
  };
  const [cLight, cDark] = colors[classId || ''] || ['#aaa', '#555'];
  const gid = `pc-${classId}-${skin.replace('#', '')}`;
  return (
    <svg width="34" height="42" viewBox="0 0 28 36" className="drop-shadow-lg">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cLight} />
          <stop offset="100%" stopColor={cDark} />
        </linearGradient>
        <radialGradient id={`${gid}-skin`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0%" stopColor={shade(skin, 26)} />
          <stop offset="100%" stopColor={shade(skin, -14)} />
        </radialGradient>
      </defs>
      {/* legs */}
      <rect x="10" y="26" width="3.5" height="8" rx="1" fill={shade(cDark, -14)} />
      <rect x="15" y="26" width="3.5" height="8" rx="1" fill={shade(cDark, -20)} />
      {/* torso */}
      <rect x="8" y="14" width="12" height="14" rx="2.5" fill={`url(#${gid})`} stroke={shade(cDark, -20)} strokeWidth="0.8" />
      {/* arms */}
      <rect x="5.5" y="15" width="3" height="10" rx="1.2" fill={shade(cDark, 4)} />
      <rect x="20" y="15" width="3" height="10" rx="1.2" fill={shade(cDark, -6)} />
      {/* head */}
      <circle cx="14" cy="10" r="7" fill={`url(#${gid}-skin)`} stroke={shade(skin, -34)} strokeWidth="0.7" />
      {/* hair/helm shadow */}
      <path d="M7 9 Q8 3 14 3 Q20 3 21 9 Q17 6 14 6 Q11 6 7 9 Z" fill={shade(cDark, -10)} opacity="0.85" />
      {/* eyes */}
      <circle cx="12" cy="9.5" r="1.4" fill="#1a1a3e" />
      <circle cx="16.5" cy="9.5" r="1.4" fill="#1a1a3e" />
      <circle cx="12.4" cy="9.1" r="0.45" fill="white" opacity="0.8" />
      <circle cx="16.9" cy="9.1" r="0.45" fill="white" opacity="0.8" />
      {/* chest emblem */}
      <rect x="11.5" y="18" width="5" height="5" rx="1" fill="white" opacity="0.25" />
      {/* class gear */}
      {classId === 'warrior' && <rect x="21" y="12" width="3" height="14" rx="1" fill="#c8c8d8" stroke="#888" strokeWidth="0.5" />}
      {classId === 'mage' && (
        <g>
          <line x1="23" y1="8" x2="23" y2="24" stroke="#5e3a1e" strokeWidth="1.6" />
          <circle cx="23" cy="7" r="3" fill="#a855f7" opacity="0.85">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {classId === 'priest' && (
        <g>
          <rect x="22" y="10" width="2" height="12" fill="#f1c40f" opacity="0.9" />
          <circle cx="23" cy="9" r="2.2" fill="#f7dc6f" opacity="0.8" />
        </g>
      )}
      {classId === 'sharpshooter' && <path d="M21 10 Q26 16 21 24" stroke="#8a5a2e" strokeWidth="1.8" fill="none" />}
      {classId === 'paladin' && <rect x="20" y="14" width="6" height="9" rx="1.5" fill="#e67e22" stroke="#f1c40f" strokeWidth="1" opacity="0.95" />}
    </svg>
  );
}

// ---------------- UNIT WRAPPER ----------------
function UnitSprite({ unit, isSelected, isActive, fx }: { unit: Unit; isSelected: boolean; isActive: boolean; fx: 'attack' | 'hit' | 'cast' | null }) {
  const fxClass = fx === 'attack' ? 'anim-lunge' : fx === 'cast' ? 'anim-cast' : fx === 'hit' ? 'anim-hit' : '';
  const skin = RACES[unit.raceId || '']?.color || '#e8c4a0';

  return (
    <div className={`absolute flex flex-col items-center ${fxClass}`}
      style={{ transform: 'translate(-50%, -85%)', zIndex: 10 }}>
      {isSelected && (
        <div className={`absolute -bottom-1 w-10 h-5 rounded-full border-2 ${unit.isPlayer ? 'border-white/80' : 'border-red-400/80'} animate-pulse`}
          style={{ transform: 'rotateX(60deg)' }} />
      )}
      {isActive && (
        <div className={`absolute -top-7 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap bg-black/70 ${unit.isPlayer ? 'text-cyan-300' : 'text-red-300'}`}>
          {unit.isPlayer ? 'YOUR TURN' : 'ACTIVE'}
        </div>
      )}
      <div className="unit-bob">
        {unit.isPlayer ? <PlayerArt classId={unit.classId} skin={skin} /> : <EnemyArt sprite={unit.sprite} />}
      </div>
      <div className={`text-[9px] font-bold whitespace-nowrap bg-black/60 px-1 rounded mt-0.5 ${unit.isPlayer ? 'text-white' : 'text-red-200'}`}
        style={{ textShadow: '0 1px 2px black' }}>
        {unit.name}
      </div>
      <div className="w-9 h-1.5 bg-black/60 rounded-full mt-0.5 overflow-hidden border border-black/40">
        <div className={`h-full rounded-full transition-all ${unit.isPlayer ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
          style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }} />
      </div>
    </div>
  );
}

// ---------------- ENTITY SPRITES ----------------
function EntitySprite({ entity }: { entity: { sprite: string; name: string } }) {
  const sprites: Record<string, React.ReactNode> = {
    keeper: (
      <svg width="28" height="34" viewBox="0 0 24 30">
        <rect x="6" y="12" width="12" height="12" rx="2" fill="#4a6a8e" stroke="#2e4a6e" strokeWidth="1" />
        <circle cx="12" cy="8" r="7" fill="#6a8aae" />
        <circle cx="12" cy="8" r="3" fill="#00d4ff" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    ),
    essence: (
      <svg width="20" height="24" viewBox="0 0 20 24">
        <polygon points="10,2 18,10 10,22 2,10" fill="#00d4ff" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
        </polygon>
        <polygon points="10,6 14,10 10,16 6,10" fill="#00ffff" opacity="0.8" />
      </svg>
    ),
    essence_fire: (
      <svg width="20" height="24" viewBox="0 0 20 24">
        <polygon points="10,2 18,10 10,22 2,10" fill="#FF6B35" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.3s" repeatCount="indefinite" />
        </polygon>
        <polygon points="10,6 14,10 10,16 6,10" fill="#FFB347" opacity="0.9" />
      </svg>
    ),
    essence_sea: (
      <svg width="20" height="24" viewBox="0 0 20 24">
        <polygon points="10,2 18,10 10,22 2,10" fill="#4682B4" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.6s" repeatCount="indefinite" />
        </polygon>
        <polygon points="10,6 14,10 10,16 6,10" fill="#5eead4" opacity="0.9" />
      </svg>
    ),
    gate: (
      <svg width="28" height="32" viewBox="0 0 28 32">
        <rect x="4" y="8" width="20" height="20" rx="2" fill="none" stroke="#a855f7" strokeWidth="2" />
        <rect x="8" y="12" width="12" height="12" rx="1" fill="#1a0a2e" stroke="#9333ea" strokeWidth="1" />
        <circle cx="14" cy="4" r="4" fill="#a855f7" opacity="0.5">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    ),
    gate_fire: (
      <svg width="28" height="32" viewBox="0 0 28 32">
        <rect x="4" y="8" width="20" height="20" rx="2" fill="none" stroke="#FF6B35" strokeWidth="2" />
        <rect x="8" y="12" width="12" height="12" rx="1" fill="#2a0a05" stroke="#FF6B35" strokeWidth="1" />
        <circle cx="14" cy="4" r="4" fill="#FFB347" opacity="0.6">
          <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    ),
    gate_sea: (
      <svg width="28" height="32" viewBox="0 0 28 32">
        <rect x="4" y="8" width="20" height="20" rx="2" fill="none" stroke="#4682B4" strokeWidth="2" />
        <rect x="8" y="12" width="12" height="12" rx="1" fill="#04101e" stroke="#5eead4" strokeWidth="1" />
        <circle cx="14" cy="4" r="4" fill="#5eead4" opacity="0.6">
          <animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <path d="M9 20 Q11.5 17 14 20 Q16.5 23 19 20" stroke="#4682B4" strokeWidth="1.2" fill="none" opacity="0.8" />
      </svg>
    ),
    scholar: (
      <svg width="24" height="30" viewBox="0 0 22 28">
        <rect x="5" y="12" width="12" height="10" rx="2" fill="#5a4a3a" stroke="#3a2e22" strokeWidth="0.8" />
        <circle cx="11" cy="8" r="6" fill="#c49a6c" />
        <rect x="7" y="4" width="8" height="4" rx="1" fill="#2a1a0e" />
      </svg>
    ),
    elder: (
      <svg width="24" height="30" viewBox="0 0 24 30">
        <path d="M7 28 L9 13 L15 13 L17 28 Z" fill="#3e5a6e" />
        <circle cx="12" cy="9" r="6" fill="#c49a6c" />
        <path d="M7 8 Q12 2 17 8 L17 5 Q12 0 7 5 Z" fill="#d8e4e8" />
        <path d="M9 14 Q12 18 15 14" stroke="#d8e4e8" strokeWidth="2" fill="none" />
        <line x1="18" y1="12" x2="18" y2="28" stroke="#5a7a8e" strokeWidth="2" />
      </svg>
    ),
    merchant: (
      <svg width="24" height="28" viewBox="0 0 24 28">
        <rect x="6" y="12" width="12" height="12" rx="2" fill="#6e5a3e" stroke="#4e3e28" strokeWidth="0.8" />
        <circle cx="12" cy="8" r="6" fill="#c49a6c" />
        <rect x="6" y="3" width="12" height="4" rx="2" fill="#4682B4" />
        <circle cx="12" cy="18" r="2.5" fill="#f1c40f" opacity="0.9">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    ),
    innkeeper: (
      <svg width="24" height="28" viewBox="0 0 24 28">
        <rect x="6" y="12" width="12" height="12" rx="2" fill="#5a4a5e" stroke="#3e3244" strokeWidth="0.8" />
        <circle cx="12" cy="8" r="6" fill="#c49a6c" />
        <rect x="7" y="12" width="10" height="6" rx="1" fill="#d8e4e8" opacity="0.8" />
        <circle cx="9" cy="8" r="1" fill="#1a1a3e" />
        <circle cx="15" cy="8" r="1" fill="#1a1a3e" />
      </svg>
    ),
    priestess: (
      <svg width="22" height="30" viewBox="0 0 22 30">
        <path d="M6 28 L8 12 L14 12 L16 28 Z" fill="#2e4a6e" />
        <circle cx="11" cy="8" r="6" fill="#e8c4a0" />
        <path d="M5 8 Q11 1 17 8" stroke="#5eead4" strokeWidth="2" fill="none" />
        <circle cx="11" cy="16" r="2" fill="#5eead4" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </svg>
    ),
    cache: (
      <svg width="24" height="20" viewBox="0 0 24 20">
        <rect x="3" y="6" width="18" height="12" rx="2" fill="#5a4a2e" stroke="#8a7a4e" strokeWidth="1.5" />
        <rect x="3" y="6" width="18" height="4" rx="2" fill="#6e5e3e" />
        <rect x="10" y="8" width="4" height="5" rx="1" fill="#f1c40f" opacity="0.9" />
        <circle cx="6" cy="4" r="2" fill="#c8d4d8" opacity="0.6" />
        <circle cx="19" cy="3" r="1.5" fill="#c8d4d8" opacity="0.5" />
      </svg>
    ),
    memory: (
      <svg width="16" height="20" viewBox="0 0 16 20">
        <polygon points="8,2 14,8 8,18 2,8" fill="#d8b4fe" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
        </polygon>
        <circle cx="8" cy="10" r="2" fill="#e9d5ff" />
      </svg>
    ),
  };

  return (
    <div className="absolute flex flex-col items-center unit-bob" style={{ transform: 'translate(-50%, -70%)', zIndex: 5 }}>
      {sprites[entity.sprite] || sprites['keeper']}
    </div>
  );
}

// ---------------- AMBIENT PARTICLES ----------------
function AmbientParticles({ realmId }: { realmId: string }) {
  const particles = useMemo(() => {
    const conf: Record<string, { color: string; count: number; size: number }> = {
      arianus: { color: 'rgba(135,206,235,0.5)', count: 14, size: 2 },
      pryan: { color: 'rgba(255,107,53,0.55)', count: 18, size: 2.5 },
      chelestra: { color: 'rgba(94,234,212,0.4)', count: 16, size: 3 },
      abarrach: { color: 'rgba(139,115,85,0.4)', count: 12, size: 2 },
    };
    const c = conf[realmId] || conf.arianus;
    return Array.from({ length: c.count }, (_, i) => ({
      id: i,
      left: (hash01(i, 7, 3) * 100),
      delay: hash01(i, 13, 5) * 8,
      duration: 6 + hash01(i, 17, 9) * 8,
      size: c.size * (0.6 + hash01(i, 23, 11) * 0.9),
      color: c.color,
      drift: realmId === 'chelestra' ? 'particleRise' : realmId === 'pryan' ? 'particleRise' : 'particleDrift',
    }));
  }, [realmId]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 60 }}>
      {particles.map(p => (
        <div key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: '-4%',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `${p.drift} ${p.duration}s linear ${p.delay}s infinite`,
          }} />
      ))}
    </div>
  );
}

// ---------------- MAIN RENDERER ----------------
export default function IsoWorld({
  tiles, units, entities, camera, hoveredTile, selectedUnit, exploredTiles,
  floaters, actionFx, realmId, combatActive, activeUnitId, moveRange, targetTiles, affectedPreview,
  onTileClick, onTileHover, onEntityClick, onUnitClick, width, height,
}: IsoWorldProps) {
  const sortedTiles = useMemo(() => {
    const flat: MapTile[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (tiles[y] && tiles[y][x]) flat.push(tiles[y][x]);
      }
    }
    return flat.sort((a, b) => {
      const depthA = a.x + a.y;
      const depthB = b.x + b.y;
      if (depthA !== depthB) return depthA - depthB;
      return a.x - b.x;
    });
  }, [tiles, width, height]);

  const entityPositions = useMemo(() => {
    const map: Record<string, typeof entities[0]> = {};
    entities.forEach(e => { map[`${e.x},${e.y}`] = e; });
    return map;
  }, [entities]);

  const moveSet = useMemo(() => new Set(moveRange.map(t => `${t.x},${t.y}`)), [moveRange]);
  const targetSet = useMemo(() => new Set(targetTiles.map(t => `${t.x},${t.y}`)), [targetTiles]);
  const affectedSet = useMemo(() => new Set(affectedPreview.map(t => `${t.x},${t.y}`)), [affectedPreview]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2 - camera.x;
    const my = e.clientY - rect.top - rect.height / 2 - camera.y;
    const iso = screenToIso(mx, my);
    if (iso.x >= 0 && iso.x < width && iso.y >= 0 && iso.y < height) {
      onTileHover(iso.x, iso.y);
    } else {
      onTileHover(-1, null);
    }
  }, [camera, width, height, onTileHover]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2 - camera.x;
    const my = e.clientY - rect.top - rect.height / 2 - camera.y;
    const iso = screenToIso(mx, my);
    if (iso.x >= 0 && iso.x < width && iso.y >= 0 && iso.y < height) {
      onTileClick(iso.x, iso.y);
    }
  }, [camera, width, height, onTileClick]);

  const realm = REALMS[realmId];
  const bgGradient = realm
    ? `radial-gradient(ellipse at center, ${realm.bgColor} 0%, ${shade(realm.bgColor, -10)} 55%, #000000 100%)`
    : 'radial-gradient(ellipse at center, #0a0a1a, #000000)';

  const aliveUnits = units.filter(u => u.hp > 0);

  return (
    <div
      className="absolute inset-0 overflow-hidden cursor-crosshair"
      style={{ background: bgGradient }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={() => onTileHover(-1, null)}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px)`,
            transition: 'transform 0.18s ease-out',
            width: 0,
            height: 0,
          }}
        >
          {/* ---- TILE LAYER ---- */}
          {sortedTiles.map(tile => {
            const pos = isoToScreen(tile.x, tile.y, tile.elevation);
            const key = `${tile.x},${tile.y}`;
            const isHovered = hoveredTile?.x === tile.x && hoveredTile?.y === tile.y;
            const isExplored = exploredTiles.has(key);
            const entity = entityPositions[key];
            const inMove = moveSet.has(key);
            const inTarget = targetSet.has(key);
            const inAffected = affectedSet.has(key);

            return (
              <div
                key={`${tile.x}-${tile.y}`}
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: TILE_W,
                  height: TILE_H,
                  zIndex: tile.x + tile.y,
                }}
              >
                <TerrainArt terrain={tile.terrain} tx={tile.x} ty={tile.y} />

                {inMove && (
                  <div className="absolute inset-0 animate-pulse"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      background: 'rgba(34, 211, 238, 0.25)',
                      boxShadow: 'inset 0 0 8px rgba(34, 211, 238, 0.6)',
                    }} />
                )}
                {inTarget && (
                  <div className="absolute inset-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      background: 'rgba(248, 113, 113, 0.15)',
                      boxShadow: 'inset 0 0 6px rgba(248, 113, 113, 0.4)',
                    }} />
                )}
                {inAffected && (
                  <div className="absolute inset-0 animate-pulse"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      background: 'rgba(251, 146, 60, 0.35)',
                      boxShadow: 'inset 0 0 10px rgba(251, 146, 60, 0.7)',
                    }} />
                )}
                {!isExplored && (
                  <div className="absolute inset-0 bg-black/75"
                    style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                )}
                {isHovered && !inMove && !inAffected && (
                  <div className="absolute inset-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      background: 'rgba(255,255,255,0.15)',
                      boxShadow: 'inset 0 0 10px rgba(0,212,255,0.5)',
                    }} />
                )}

                {entity && isExplored && (
                  <div className="absolute" style={{ left: TILE_W / 2, top: TILE_H / 2 }}
                    onClick={(e) => { e.stopPropagation(); if (!combatActive) onEntityClick(entity.id); }}>
                    <EntitySprite entity={entity} />
                  </div>
                )}
              </div>
            );
          })}

          {/* ---- UNIT LAYER (smooth sliding) ---- */}
          {aliveUnits.map(unit => {
            const pos = isoToScreen(unit.position.x, unit.position.y);
            return (
              <div
                key={unit.id}
                className="absolute"
                style={{
                  left: pos.x + TILE_W / 2,
                  top: pos.y + TILE_H / 2,
                  zIndex: unit.position.x + unit.position.y + 1,
                  transition: 'left 0.16s linear, top 0.16s linear',
                }}
                onClick={(e) => { e.stopPropagation(); onUnitClick(unit.id); }}
              >
                <UnitSprite
                  unit={unit}
                  isSelected={selectedUnit === unit.id}
                  isActive={activeUnitId === unit.id}
                  fx={actionFx?.unitId === unit.id ? actionFx.kind : null}
                />
              </div>
            );
          })}

          {/* ---- FLOATER LAYER ---- */}
          {floaters.map(f => {
            const pos = isoToScreen(f.x, f.y);
            return (
              <div
                key={f.id}
                className="absolute pointer-events-none font-bold text-sm"
                style={{
                  left: pos.x + TILE_W / 2,
                  top: pos.y - 10,
                  color: f.color,
                  textShadow: '0 1px 3px black, 0 0 8px rgba(0,0,0,0.8)',
                  animation: 'damageFloat 1.2s ease-out forwards',
                  zIndex: 100,
                }}
              >
                {f.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ambient realm particles */}
      <AmbientParticles realmId={realmId} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 55, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.55)' }} />

      {/* Tile info tooltip */}
      {hoveredTile && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 border border-slate-600/50 text-xs z-20">
          <div className="text-slate-400">Tile ({hoveredTile.x}, {hoveredTile.y})</div>
          {tiles[hoveredTile.y]?.[hoveredTile.x] && (
            <div className="text-slate-200 font-bold">
              {TERRAIN_DEFS[tiles[hoveredTile.y][hoveredTile.x].terrain]?.label || 'Unknown'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { isoToScreen, screenToIso, TILE_W, TILE_H };
