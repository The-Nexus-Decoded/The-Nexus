import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../hooks/GameContext';
import { Avatar } from './Avatar';
import { findPath } from '../engine/pathfinding';
import { TILE_DEFS, WORLD_MAPS } from '../engine/tilemap';
import type { TileType, MapEntity } from '../engine/tilemap';
import { Heart, Zap, Coins, Backpack, MapPin, MessageCircle, Sword, Skull } from 'lucide-react';

const TILE_SIZE = 48;
const VIEW_W = 15;
const VIEW_H = 11;

function TerrainSVG({ type, size = TILE_SIZE }: { type: TileType; size?: number }) {
  const s = size;
  const half = s / 2;
  const d = TILE_DEFS[type];

  switch (type) {
    case 'grass':
    case 'grass_dark':
    case 'grass_tall':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.3">
            <rect x={2} y={s - 4} width="3" height="4" rx="1" fill={d.detailColor} />
            <rect x={8} y={s - 6} width="2" height="6" rx="1" fill={d.detailColor} />
            <rect x={14} y={s - 3} width="3" height="3" rx="1" fill={d.detailColor} />
            <rect x={22} y={s - 5} width="2" height="5" rx="1" fill={d.detailColor} />
            <rect x={30} y={s - 4} width="3" height="4" rx="1" fill={d.detailColor} />
            <rect x={38} y={s - 6} width="2" height="6" rx="1" fill={d.detailColor} />
          </g>
          <circle cx={s - 6} cy={6} r="2" fill={d.detailColor} opacity="0.2" />
        </svg>
      );
    case 'flower':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={TILE_DEFS.grass.color} />
          <circle cx={half} cy={half - 2} r="4" fill="#e8a4d0" opacity="0.8" />
          <circle cx={half - 2} cy={half + 2} r="3" fill="#f0c4e0" opacity="0.7" />
        </svg>
      );
    case 'dirt':
    case 'dirt_path':
    case 'sand':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.2">
            <circle cx="8" cy="10" r="2" fill={d.detailColor} />
            <circle cx="25" cy="18" r="1.5" fill={d.detailColor} />
            <circle cx="40" cy="8" r="2.5" fill={d.detailColor} />
            <circle cx="15" cy="35" r="1.5" fill={d.detailColor} />
          </g>
        </svg>
      );
    case 'stone':
    case 'stone_floor':
    case 'stone_cracked':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.25">
            <path d={`M5 8 L15 8 M20 15 L35 15 M10 25 L25 25`} stroke={d.detailColor} strokeWidth="1" />
          </g>
        </svg>
      );
    case 'stone_wall':
    case 'cave_wall':
    case 'wall':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.3">
            <rect x="0" y="12" width={s} height="2" fill={d.detailColor} />
            <rect x="0" y="24" width={s} height="2" fill={d.detailColor} />
            <rect x="0" y="36" width={s} height="2" fill={d.detailColor} />
            <rect x="16" y="0" width="2" height="12" fill={d.detailColor} />
            <rect x="32" y="0" width="2" height="12" fill={d.detailColor} />
          </g>
        </svg>
      );
    case 'water':
    case 'water_deep':
    case 'water_shallow':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.3">
            <path d={`M5 ${half} Q15 ${half - 3} 25 ${half} Q35 ${half + 3} 45 ${half}`} stroke={d.detailColor} strokeWidth="1.5" fill="none" />
          </g>
        </svg>
      );
    case 'lava':
    case 'lava_cracked':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.4">
            <path d={`M8 10 L20 8 L35 12 L42 10`} stroke="#ff6600" strokeWidth="2" fill="none" />
            <path d={`M12 25 L25 22 L38 26`} stroke="#ff8800" strokeWidth="1.5" fill="none" />
          </g>
          <circle cx={half + 5} cy={half - 5} r="3" fill="#ffaa00" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case 'cloud':
    case 'cloud_dark':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.2">
            <ellipse cx={half - 5} cy={half} rx="12" ry="6" fill={d.detailColor} />
            <ellipse cx={half + 8} cy={half + 3} rx="10" ry="5" fill={d.detailColor} />
          </g>
        </svg>
      );
    case 'void':
    case 'void_wall':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <circle cx={s / 3} cy={s / 3} r="1" fill="#333" opacity="0.3" />
        </svg>
      );
    case 'void_floor':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.15">
            <circle cx="10" cy="12" r="1.5" fill="#9B59B6" />
            <circle cx="35" cy="8" r="1" fill="#9B59B6" />
            <circle cx="20" cy="38" r="1.5" fill="#9B59B6" />
          </g>
        </svg>
      );
    case 'wood_floor':
    case 'bridge':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.3">
            <rect x="0" y="8" width={s} height="1" fill={d.detailColor} />
            <rect x="0" y="16" width={s} height="1" fill={d.detailColor} />
            <rect x="0" y="24" width={s} height="1" fill={d.detailColor} />
            <rect x="0" y="32" width={s} height="1" fill={d.detailColor} />
            <rect x="0" y="40" width={s} height="1" fill={d.detailColor} />
          </g>
        </svg>
      );
    case 'cave_floor':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.2">
            <circle cx="12" cy="10" r="2" fill="#5a5040" />
            <circle cx="30" cy="20" r="1.5" fill="#5a5040" />
            <circle cx="18" cy="35" r="2.5" fill="#5a5040" />
          </g>
        </svg>
      );
    case 'ice':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.3">
            <path d={`M10 10 L20 20 M25 8 L35 18`} stroke="white" strokeWidth="1.5" />
            <polygon points={`${half},5 ${half+3},${half} ${half},${half+3} ${half-3},${half}`} fill="white" opacity="0.2" />
          </g>
        </svg>
      );
    case 'swamp':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.3">
            <ellipse cx={half} cy={half + 8} rx="8" ry="3" fill="#1a2a0e" />
            <ellipse cx={half - 10} cy={half - 5} rx="6" ry="2" fill="#1a2a0e" />
          </g>
        </svg>
      );
    case 'tree':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={TILE_DEFS.grass.color} />
          <rect x={half - 3} y={half + 4} width="6" height="12" rx="1" fill="#4a3018" />
          <circle cx={half} cy={half - 2} r="10" fill="#1a5a1a" opacity="0.9" />
          <circle cx={half - 4} cy={half - 6} r="7" fill="#2a6a2a" opacity="0.8" />
          <circle cx={half + 5} cy={half - 4} r="6" fill="#1a4a1a" opacity="0.8" />
        </svg>
      );
    case 'bush':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={TILE_DEFS.grass.color} />
          <circle cx={half} cy={half + 4} r="8" fill="#2a4a1a" opacity="0.85" />
          <circle cx={half - 6} cy={half + 2} r="5" fill="#1a3a1a" opacity="0.8" />
          <circle cx={half + 6} cy={half + 2} r="5" fill="#1a3a1a" opacity="0.8" />
        </svg>
      );
    case 'rock':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <ellipse cx={half} cy={half + 6} rx="10" ry="8" fill="#4a4a4a" />
          <ellipse cx={half - 2} cy={half + 4} rx="6" ry="5" fill="#5a5a5a" />
        </svg>
      );
    case 'crystal':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill="#3a3020" />
          <polygon points={`${half},6 ${half+8},${half+4} ${half},${half+16} ${half-8},${half+4}`} fill="#5aaaff" opacity="0.7" />
          <polygon points={`${half},8 ${half+5},${half+5} ${half},${half+12} ${half-5},${half+5}`} fill="#88ccff" opacity="0.5" />
        </svg>
      );
    case 'mushroom':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill="#3a3020" />
          <rect x={half - 1} y={half + 2} width="2" height="8" fill="#e0d0c0" />
          <ellipse cx={half} cy={half + 2} rx="6" ry="4" fill="#cc4444" opacity="0.8" />
          <circle cx={half - 2} cy={half} r="1" fill="white" opacity="0.5" />
        </svg>
      );
    case 'bone':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.6">
            <ellipse cx={half + 4} cy={half + 2} rx="8" ry="2" fill="#c4b8a0" transform={`rotate(30 ${half + 4} ${half + 2})`} />
            <ellipse cx={half - 2} cy={half + 6} rx="6" ry="1.5" fill="#c4b8a0" transform={`rotate(-20 ${half - 2} ${half + 6})`} />
          </g>
        </svg>
      );
    case 'ash':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <g opacity="0.15">
            <circle cx="10" cy="15" r="2" fill="#2a2a2a" />
            <circle cx="30" cy="8" r="1.5" fill="#2a2a2a" />
            <circle cx="20" cy="35" r="2" fill="#2a2a2a" />
          </g>
        </svg>
      );
    case 'obsidian':
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill={d.color} />
          <polygon points={`${half},4 ${half+10},${half+2} ${half+6},${half+14} ${half-6},${half+12} ${half-10},${half+2}`} fill="#1a0a1a" opacity="0.6" />
          <polygon points={`${half},6 ${half+6},${half+4} ${half+4},${half+10} ${half-4},${half+10} ${half-6},${half+4}`} fill="#2a152a" opacity="0.4" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <rect width={s} height={s} fill="#333" />
        </svg>
      );
  }
}

function EntitySprite({ entity, size = TILE_SIZE }: { entity: MapEntity; size?: number }) {
  const s = size;

  if (entity.type === 'enemy') {
    const isBoss = entity.data?.startsWith('boss');
    const colors: Record<string, string> = {
      air: '#87CEEB', fire: '#FF6B35', stone: '#8B7355', water: '#4682B4', labyrinth: '#9B59B6',
    };
    const c = colors[entity.data?.split('_')[1] || 'void'] || '#666';
    return (
      <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
        <div className={`flex items-center justify-center ${isBoss ? 'animate-pulse' : ''}`}
          style={{ width: s - 8, height: s - 8, borderRadius: '50%', background: `radial-gradient(circle, ${c}44, ${c}22)`, border: `2px solid ${c}` }}>
          {isBoss ? <Skull className="w-5 h-5" style={{ color: c }} /> : <Sword className="w-4 h-4" style={{ color: c }} />}
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] text-slate-200 whitespace-nowrap bg-black/60 px-1 rounded" style={{ textShadow: '0 1px 2px black' }}>
          {entity.name}
        </div>
      </div>
    );
  }

  if (entity.type === 'portal') {
    return (
      <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center animate-pulse"
          style={{ background: 'radial-gradient(circle, #9333ea66, #6b21a833)', border: '2px solid #a855f7' }}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="none" stroke="#d8b4fe" strokeWidth="1.5" opacity="0.8">
              <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] text-purple-200 whitespace-nowrap bg-black/60 px-1 rounded" style={{ textShadow: '0 1px 2px black' }}>
          {entity.name}
        </div>
      </div>
    );
  }

  if (entity.type === 'item') {
    return (
      <div className="relative flex items-center justify-center animate-bounce" style={{ width: s, height: s }}>
        <div className="w-7 h-7 rounded flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, #fbbf2466, #f59e0b33)', border: '1px solid #fbbf24' }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect x="3" y="3" width="8" height="8" rx="1" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x="5" y="5" width="4" height="4" fill="#fbbf24" opacity="0.5" />
          </svg>
        </div>
      </div>
    );
  }

  if (entity.type === 'structure') {
    const sc: Record<string, { main: string; accent: string }> = {
      town: { main: '#b45309', accent: '#fbbf24' },
      dungeon: { main: '#7c2d12', accent: '#dc2626' },
      cave: { main: '#374151', accent: '#6b7280' },
    };
    const style = sc[entity.data || 'town'] || sc.town;
    return (
      <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
        <div className="flex items-center justify-center text-lg"
          style={{ width: s - 4, height: s - 4, borderRadius: 4, background: `radial-gradient(circle, ${style.main}44, ${style.main}22)`, border: `1px solid ${style.accent}66` }}>
          {entity.data === 'town' ? '🏘️' : entity.data === 'dungeon' ? '🏰' : '🕳️'}
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] whitespace-nowrap bg-black/70 px-1.5 py-0.5 rounded font-bold"
          style={{ color: style.accent, textShadow: '0 1px 2px black' }}>
          {entity.name}
        </div>
      </div>
    );
  }

  if (entity.type === 'npc') {
    return (
      <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, #22c55e44, #16a34a22)', border: '2px solid #4ade80' }}>
          <MessageCircle className="w-4 h-4 text-green-400" />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] text-green-200 whitespace-nowrap bg-black/60 px-1 rounded" style={{ textShadow: '0 1px 2px black' }}>
          {entity.name}
        </div>
      </div>
    );
  }

  return null;
}

function Minimap({ map, playerPos, explored, size = 120 }: { map: typeof WORLD_MAPS[0]; playerPos: { x: number; y: number }; explored: Set<string>; size?: number }) {
  const scaleX = size / map.width;
  const scaleY = size / map.height;
  return (
    <div className="relative rounded overflow-hidden border border-slate-600/50 shadow-lg"
      style={{ width: size, height: size, background: '#0a0a0a' }}>
      {map.tiles.map((row, y) => row.map((tile, x) => {
        const key = `${x},${y}`;
        const isExplored = explored.has(key);
        const isPlayer = playerPos.x === x && playerPos.y === y;
        if (!isExplored && !isPlayer) return null;
        const def = TILE_DEFS[tile];
        const walkable = def.walkable;
        return (
          <div key={key} className="absolute"
            style={{ left: x * scaleX, top: y * scaleY, width: scaleX + 0.5, height: scaleY + 0.5,
              background: isPlayer ? '#00d4ff' : walkable ? def.color : '#1a1a1a',
              opacity: isPlayer ? 1 : 0.6,
              borderRadius: isPlayer ? '50%' : 0,
              boxShadow: isPlayer ? '0 0 4px #00d4ff' : 'none',
            }} />
        );
      }))}
    </div>
  );
}

export default function GameWorld() {
  const { gameState, setScreen, startEnemyCombat, enterWorld } = useGame();
  const char = gameState.character;
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [targetPath, setTargetPath] = useState<{ x: number; y: number }[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [facing, setFacing] = useState<'up' | 'down' | 'left' | 'right'>('down');
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [defeatedEntities, setDefeatedEntities] = useState<Set<string>>(new Set());
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [npcDialog, setNpcDialog] = useState<string | null>(null);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!char) return null;

  const worldMap = WORLD_MAPS.find(w => w.id === char.world) || WORLD_MAPS[0];

  useEffect(() => {
    setPlayerPos({ x: worldMap.spawnX, y: worldMap.spawnY });
    setTargetPath([]);
    setIsMoving(false);
    setNpcDialog(null);
    setExplored(new Set());
  }, [char.world, worldMap.spawnX, worldMap.spawnY]);

  useEffect(() => {
    const key = `${playerPos.x},${playerPos.y}`;
    setExplored(prev => new Set([...prev, key]));
  }, [playerPos]);

  const isWalkable = useCallback((x: number, y: number) => {
    if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) return false;
    return TILE_DEFS[worldMap.tiles[y][x]].walkable;
  }, [worldMap]);

  const getEntityAt = (x: number, y: number) => {
    return worldMap.entities.find(e =>
      e.x === x && e.y === y && !defeatedEntities.has(e.id) && !pickedItems.has(e.id)
    );
  };

  useEffect(() => {
    if (targetPath.length === 0 || isMoving) return;

    const next = targetPath[0];
    const dx = next.x - playerPos.x;
    const dy = next.y - playerPos.y;

    if (dx > 0) setFacing('right');
    else if (dx < 0) setFacing('left');
    else if (dy > 0) setFacing('down');
    else if (dy < 0) setFacing('up');

    setIsMoving(true);
    moveTimer.current = setTimeout(() => {
      setPlayerPos(next);
      setTargetPath(prev => prev.slice(1));
      setIsMoving(false);

      const entity = getEntityAt(next.x, next.y);
      if (entity) {
        if (entity.type === 'enemy') {
          setTargetPath([]);
          if (entity.data) startEnemyCombat(entity.data);
          setDefeatedEntities(prev => new Set([...prev, entity.id]));
        } else if (entity.type === 'portal') {
          setTargetPath([]);
          if (entity.data) enterWorld(entity.data);
        } else if (entity.type === 'item') {
          setPickedItems(prev => new Set([...prev, entity.id]));
        } else if (entity.type === 'npc') {
          setTargetPath([]);
          setNpcDialog(entity.data || '...');
        } else if (entity.type === 'structure') {
          setTargetPath([]);
          setNpcDialog(`You stand before ${entity.name}. ${entity.data === 'town' ? 'A bustling settlement.' : entity.data === 'dungeon' ? 'Darkness beckons from within.' : 'Mysteries lie inside.'}`);
        }
      }
    }, 180);

    return () => {
      if (moveTimer.current) clearTimeout(moveTimer.current);
    };
  }, [targetPath, isMoving, playerPos]);

  const handleTileClick = (tx: number, ty: number) => {
    if (isMoving) return;
    if (!isWalkable(tx, ty)) return;
    const path = findPath(playerPos, { x: tx, y: ty }, isWalkable, 60);
    setTargetPath(path);
    setNpcDialog(null);
  };

  let camX = playerPos.x - Math.floor(VIEW_W / 2);
  let camY = playerPos.y - Math.floor(VIEW_H / 2);
  camX = Math.max(0, Math.min(camX, worldMap.width - VIEW_W));
  camY = Math.max(0, Math.min(camY, worldMap.height - VIEW_H));

  const hpPct = Math.max(0, (char.hp / char.maxHp) * 100);
  const manaPct = Math.max(0, (char.mana / char.maxMana) * 100);
  const hoveredDef = hoveredTile ? TILE_DEFS[worldMap.tiles[hoveredTile.y]?.[hoveredTile.x]] : null;
  const hoveredEntity = hoveredTile ? getEntityAt(hoveredTile.x, hoveredTile.y) : null;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center p-2 relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center, ${worldMap.bgColor}dd, #050505)` }}>

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              backgroundColor: worldMap.ambient, opacity: 0.15,
              animationDuration: `${Math.random() * 4 + 3}s`,
            }} />
        ))}
      </div>

      {/* HUD */}
      <div className="w-full max-w-3xl z-20 mb-2">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-3 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-purple-800 to-slate-900 border-2 border-purple-500/40 flex items-center justify-center text-sm font-bold text-purple-300">
                {char.level}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-100">{char.name}</div>
                <div className="text-[10px] text-slate-400">Patryn Runemage</div>
              </div>
            </div>
            <button onClick={() => setScreen('inventory')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg flex items-center gap-1.5 text-xs transition-all border border-slate-600/30 hover:border-slate-500">
              <Backpack className="w-3.5 h-3.5" /> Inventory
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-400">HP</span>
                  <span className="font-bold text-red-300">{char.hp}/{char.maxHp}</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div className="h-full rounded-full transition-all duration-500 relative"
                    style={{ width: `${hpPct}%`, background: 'linear-gradient(90deg, #991b1b, #ef4444, #f87171)' }}>
                    {hpPct < 30 && <div className="absolute inset-0 bg-red-400 animate-pulse opacity-40" />}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-400">Mana</span>
                  <span className="font-bold text-blue-300">{char.mana}/{char.maxMana}</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${manaPct}%`, background: 'linear-gradient(90deg, #1e40af, #3b82f6, #60a5fa)' }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-400">Gold</span>
                  <span className="font-bold text-yellow-300">{char.gold}</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #92400e, #eab308)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-slate-700/30">
            <MapPin className="w-4 h-4" style={{ color: worldMap.ambient }} />
            <span className="font-bold text-sm" style={{ color: worldMap.ambient }}>{worldMap.name}</span>
            <span className="text-xs text-slate-500">— {worldMap.subtitle}</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative z-10">
        <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/50"
          style={{ width: VIEW_W * TILE_SIZE, height: VIEW_H * TILE_SIZE, background: '#0a0a0a' }}>

          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${worldMap.ambient}, transparent)` }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.7)' }} />

          <div className="absolute transition-transform duration-200 ease-out"
            style={{ transform: `translate(${-camX * TILE_SIZE}px, ${-camY * TILE_SIZE}px)` }}>

            {worldMap.tiles.map((row, y) => row.map((tile, x) => {
              const isVisible = x >= camX - 1 && x < camX + VIEW_W + 1 && y >= camY - 1 && y < camY + VIEW_H + 1;
              if (!isVisible) return null;
              const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
              const isPath = targetPath.some(p => p.x === x && p.y === y);
              const def = TILE_DEFS[tile];

              return (
                <div key={`${x}-${y}`}
                  className="absolute"
                  style={{ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, cursor: def.walkable ? 'pointer' : 'not-allowed' }}
                  onMouseEnter={() => setHoveredTile({ x, y })}
                  onMouseLeave={() => setHoveredTile(null)}
                  onClick={() => handleTileClick(x, y)}>
                  <TerrainSVG type={tile} size={TILE_SIZE} />
                  {isHovered && def.walkable && <div className="absolute inset-0 bg-white/10 rounded-sm" />}
                  {isPath && <div className="absolute inset-0 rounded-sm" style={{ boxShadow: 'inset 0 0 10px rgba(0,212,255,0.5)' }} />}
                  {!def.walkable && <div className="absolute inset-0 bg-black/20" />}
                </div>
              );
            }))}

            {worldMap.entities.map(entity => {
              if (defeatedEntities.has(entity.id) || pickedItems.has(entity.id)) return null;
              const isVisible = entity.x >= camX - 1 && entity.x < camX + VIEW_W + 1 && entity.y >= camY - 1 && entity.y < camY + VIEW_H + 1;
              if (!isVisible) return null;
              return (
                <div key={entity.id} className="absolute pointer-events-none z-[5]"
                  style={{ left: entity.x * TILE_SIZE, top: entity.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}>
                  <EntitySprite entity={entity} size={TILE_SIZE} />
                </div>
              );
            })}

            <div className="absolute z-10 transition-all duration-200 ease-out"
              style={{
                left: playerPos.x * TILE_SIZE + 4,
                top: playerPos.y * TILE_SIZE + 4,
                width: TILE_SIZE - 8,
                height: TILE_SIZE - 8,
              }}>
              <Avatar direction={facing} isMoving={isMoving} onClick={() => setScreen('inventory')} size={TILE_SIZE - 8} />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-cyan-300 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded"
                style={{ textShadow: '0 0 4px #00d4ff' }}>
                {char.name}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="absolute -right-[140px] top-0 flex flex-col gap-2">
          <Minimap map={worldMap} playerPos={playerPos} explored={explored} size={120} />
          <div className="w-[120px] bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50">
            {hoveredDef ? (
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Terrain</div>
                <div className="text-xs font-bold text-slate-200">{hoveredDef.label}</div>
                <div className={`text-[9px] mt-0.5 ${hoveredDef.walkable ? 'text-green-400' : 'text-red-400'}`}>
                  {hoveredDef.walkable ? 'Walkable' : 'Blocked'}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 italic">Hover a tile</div>
            )}
            {hoveredEntity && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700/50">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{hoveredEntity.type}</div>
                <div className="text-xs font-bold" style={{ color: hoveredEntity.type === 'enemy' ? '#ef4444' : hoveredEntity.type === 'portal' ? '#a855f7' : hoveredEntity.type === 'structure' ? '#fbbf24' : '#4ade80' }}>
                  {hoveredEntity.name}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      {npcDialog && (
        <div className="mt-3 z-20 max-w-lg w-full">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-600/50 shadow-xl animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-200 leading-relaxed">{npcDialog}</p>
              </div>
              <button onClick={() => setNpcDialog(null)}
                className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {gameState.message && !npcDialog && (
        <div className="mt-3 z-20">
          <div className="text-xs text-slate-400 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {gameState.message}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-3 z-20 flex items-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500/50 inline-block" /> Click tiles to move</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500/50 inline-block" /> Click avatar for inventory</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/50 inline-block" /> Walk into enemies to fight</span>
      </div>
    </div>
  );
}
