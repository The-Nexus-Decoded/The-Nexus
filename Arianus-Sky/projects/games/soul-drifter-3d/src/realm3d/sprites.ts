import { shade } from './textures';

/**
 * Procedural billboard sprites drawn on offscreen canvas → dataURL.
 * Ultima-style: chunky shaded figures with dark outlines and a ground shadow.
 */

const cache = new Map<string, string>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function robe(ctx: CanvasRenderingContext2D, cx: number, top: number, bottom: number, wTop: number, wBottom: number, color: string) {
  const g = ctx.createLinearGradient(cx - wBottom, top, cx + wBottom, bottom);
  g.addColorStop(0, shade(color, 24));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -26));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - wTop, top);
  ctx.lineTo(cx + wTop, top);
  ctx.lineTo(cx + wBottom, bottom);
  ctx.lineTo(cx - wBottom, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(color, -48);
  ctx.lineWidth = 2;
  ctx.stroke();
  // fold lines
  ctx.strokeStyle = shade(color, -30);
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(cx - wTop * 0.4, top + 8); ctx.lineTo(cx - wBottom * 0.55, bottom - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + wTop * 0.4, top + 8); ctx.lineTo(cx + wBottom * 0.5, bottom - 6); ctx.stroke();
  ctx.globalAlpha = 1;
}

function head(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, skin: string) {
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
  g.addColorStop(0, shade(skin, 26));
  g.addColorStop(1, shade(skin, -14));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shade(skin, -40);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function hood(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = shade(color, -8);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(cx + r * 0.7, cy + r * 0.75);
  ctx.lineTo(cx - r * 0.7, cy + r * 0.75);
  ctx.closePath();
  ctx.fill();
  // shadowed face
  ctx.fillStyle = '#14100c';
  ctx.beginPath(); ctx.arc(cx, cy + 1, r - 3, 0, Math.PI * 2); ctx.fill();
}

function eyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, spread: number, color = '#1a1a3e', glow = false) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx - spread, cy, glow ? 2.6 : 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + spread, cy, glow ? 2.6 : 1.8, 0, Math.PI * 2); ctx.fill();
  if (!glow) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(cx - spread + 0.6, cy - 0.6, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + spread + 0.6, cy - 0.6, 0.6, 0, Math.PI * 2); ctx.fill();
  }
}

function humanoid(robeColor: string, skin: string, opts: { hooded?: boolean; beard?: boolean; hat?: string; staff?: string; glowOrb?: string } = {}): string {
  const key = `hum-${robeColor}-${skin}-${JSON.stringify(opts)}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = makeCanvas(96, 128);
  groundShadow(ctx, 48, 118, 26, 7);
  robe(ctx, 48, 40, 118, 15, 26, robeColor);
  // belt
  ctx.fillStyle = shade(robeColor, -44);
  ctx.fillRect(30, 74, 36, 5);
  if (opts.staff) {
    ctx.strokeStyle = opts.staff;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(74, 30); ctx.lineTo(78, 118); ctx.stroke();
  }
  if (opts.glowOrb) {
    const g = ctx.createRadialGradient(74, 26, 2, 74, 26, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, opts.glowOrb);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(74, 26, 12, 0, Math.PI * 2); ctx.fill();
  }
  head(ctx, 48, 30, 13, skin);
  if (opts.hooded) {
    hood(ctx, 48, 30, 13, robeColor);
    eyes(ctx, 48, 31, 5, opts.glowOrb || '#d8f0ff', true);
  } else {
    // hair
    ctx.fillStyle = shade(robeColor, -30);
    ctx.beginPath(); ctx.arc(48, 26, 13, Math.PI, Math.PI * 2); ctx.fill();
    eyes(ctx, 48, 31, 5);
    if (opts.beard) {
      ctx.fillStyle = '#d8e4e8';
      ctx.beginPath();
      ctx.moveTo(38, 34); ctx.quadraticCurveTo(48, 58, 58, 34);
      ctx.quadraticCurveTo(48, 44, 38, 34);
      ctx.fill();
    }
  }
  if (opts.hat) {
    ctx.fillStyle = opts.hat;
    ctx.fillRect(33, 14, 30, 8);
    ctx.beginPath(); ctx.ellipse(48, 22, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

function portal(color: string, glow: string): string {
  const key = `gate-${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = makeCanvas(96, 128);
  groundShadow(ctx, 48, 118, 26, 7);
  // stone arch
  ctx.strokeStyle = shade(color, -10);
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(24, 118); ctx.lineTo(24, 50); ctx.quadraticCurveTo(48, 18, 72, 50); ctx.lineTo(72, 118); ctx.stroke();
  ctx.strokeStyle = shade(color, 30);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(24, 118); ctx.lineTo(24, 50); ctx.quadraticCurveTo(48, 18, 72, 50); ctx.lineTo(72, 118); ctx.stroke();
  // swirling void
  const g = ctx.createRadialGradient(48, 76, 4, 48, 76, 36);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, glow);
  g.addColorStop(1, 'rgba(6,4,16,0.95)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(30, 118); ctx.lineTo(30, 52); ctx.quadraticCurveTo(48, 28, 66, 52); ctx.lineTo(66, 118); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = glow;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(48, 76, 8 + i * 7, 4 + i * 4, i * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

function crystal(color: string): string {
  const key = `crys-${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = makeCanvas(96, 128);
  groundShadow(ctx, 48, 112, 18, 5);
  const g = ctx.createLinearGradient(30, 30, 66, 110);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, color);
  g.addColorStop(1, shade(color, -40));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(48, 26); ctx.lineTo(66, 62); ctx.lineTo(48, 110); ctx.lineTo(30, 62);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(color, 30);
  ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(48, 34); ctx.lineTo(56, 62); ctx.lineTo(48, 96); ctx.lineTo(40, 62); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

function chest(): string {
  if (cache.has('chest')) return cache.get('chest')!;
  const [c, ctx] = makeCanvas(96, 128);
  groundShadow(ctx, 48, 110, 26, 6);
  ctx.fillStyle = '#5a4a2e';
  ctx.fillRect(22, 66, 52, 42);
  ctx.fillStyle = '#6e5e3e';
  ctx.beginPath(); ctx.moveTo(22, 66); ctx.quadraticCurveTo(48, 44, 74, 66); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a7a4e'; ctx.lineWidth = 3;
  ctx.strokeRect(22, 66, 52, 42);
  ctx.beginPath(); ctx.moveTo(22, 66); ctx.quadraticCurveTo(48, 44, 74, 66); ctx.stroke();
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(43, 72, 10, 14);
  ctx.strokeStyle = '#9a7a0a'; ctx.lineWidth = 1.5; ctx.strokeRect(43, 72, 10, 14);
  const url = c.toDataURL();
  cache.set('chest', url);
  return url;
}

function monster(kind: string): string {
  const key = `mon-${kind}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = makeCanvas(96, 128);

  switch (kind) {
    case 'lurker': {
      groundShadow(ctx, 48, 112, 28, 6);
      const g = ctx.createLinearGradient(20, 60, 76, 112);
      g.addColorStop(0, '#d8e4e8'); g.addColorStop(1, '#7e98a0');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(48, 88, 30, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9fb4ba';
      ctx.beginPath(); ctx.ellipse(48, 82, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#04101e';
      ctx.beginPath(); ctx.arc(34, 76, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(62, 76, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8aa4aa'; ctx.lineWidth = 4;
      for (const [x1, y1, x2, y2] of [[24, 100, 16, 116], [40, 106, 36, 120], [56, 106, 60, 120], [72, 100, 80, 116]]) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      break;
    }
    case 'stalker': {
      groundShadow(ctx, 48, 110, 28, 6);
      const g = ctx.createLinearGradient(16, 70, 80, 104);
      g.addColorStop(0, '#4a9abe'); g.addColorStop(1, '#1e4a5e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(14, 88); ctx.quadraticCurveTo(48, 56, 78, 84); ctx.quadraticCurveTo(50, 104, 14, 88);
      ctx.fill();
      ctx.fillStyle = '#4a9abe';
      ctx.beginPath(); ctx.moveTo(74, 84); ctx.lineTo(88, 72); ctx.lineTo(86, 92); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, 66); ctx.lineTo(48, 48); ctx.lineTo(54, 66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#04101e';
      ctx.beginPath(); ctx.arc(32, 82, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5eead4';
      ctx.beginPath(); ctx.arc(32, 82, 1.8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'acolyte':
      return humanoid('#2e5a6e', '#2e5a6e', { hooded: true, glowOrb: '#5eead4' });
    case 'warden': {
      groundShadow(ctx, 48, 116, 28, 7);
      const g = ctx.createLinearGradient(24, 30, 72, 118);
      g.addColorStop(0, '#3e5a7e'); g.addColorStop(1, '#16222e');
      ctx.fillStyle = g;
      ctx.fillRect(26, 44, 44, 72);
      ctx.strokeStyle = '#4682B4'; ctx.lineWidth = 3; ctx.strokeRect(26, 44, 44, 72);
      ctx.fillStyle = '#2e3e4e';
      ctx.fillRect(32, 16, 32, 26);
      ctx.strokeRect(32, 16, 32, 26);
      ctx.fillStyle = '#5eead4';
      ctx.fillRect(38, 24, 7, 6); ctx.fillRect(51, 24, 7, 6);
      ctx.fillStyle = '#c8d4d8';
      ctx.beginPath(); ctx.arc(32, 60, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(64, 84, 4, 0, Math.PI * 2); ctx.fill();
      // spear
      ctx.strokeStyle = '#5a7a8e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(80, 24); ctx.lineTo(80, 118); ctx.stroke();
      ctx.fillStyle = '#5eead4';
      ctx.beginPath(); ctx.moveTo(80, 10); ctx.lineTo(88, 26); ctx.lineTo(72, 26); ctx.closePath(); ctx.fill();
      break;
    }
    case 'sentinel': {
      groundShadow(ctx, 48, 116, 28, 7);
      const g = ctx.createLinearGradient(24, 20, 72, 118);
      g.addColorStop(0, '#4a4a6e'); g.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = g;
      ctx.fillRect(26, 40, 44, 76);
      ctx.strokeStyle = '#5a5a8e'; ctx.lineWidth = 3; ctx.strokeRect(26, 40, 44, 76);
      ctx.fillStyle = '#2a2a3e';
      ctx.beginPath(); ctx.moveTo(48, 6); ctx.lineTo(70, 36); ctx.lineTo(26, 36); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a5a8e'; ctx.stroke();
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(34, 48, 9, 9); ctx.fillRect(53, 48, 9, 9);
      ctx.fillStyle = '#3a3a4e';
      ctx.fillRect(18, 56, 10, 44); ctx.fillRect(68, 56, 10, 44);
      break;
    }
    case 'imp': {
      groundShadow(ctx, 48, 112, 22, 6);
      const g = ctx.createRadialGradient(40, 60, 6, 48, 84, 34);
      g.addColorStop(0, '#c86a2a'); g.addColorStop(1, '#6e2a08');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(48, 86, 22, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c86a2a';
      ctx.beginPath(); ctx.arc(48, 46, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath(); ctx.moveTo(38, 38); ctx.lineTo(32, 20); ctx.lineTo(44, 32); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(58, 38); ctx.lineTo(64, 20); ctx.lineTo(52, 32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE29A';
      ctx.beginPath(); ctx.arc(43, 46, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(53, 46, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'beetle': {
      groundShadow(ctx, 48, 110, 30, 6);
      const g = ctx.createRadialGradient(40, 70, 8, 48, 88, 36);
      g.addColorStop(0, '#6e3a14'); g.addColorStop(1, '#2a1206');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(48, 88, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a4a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(48, 88, 34, 24, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#FF6B35'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(30, 80); ctx.quadraticCurveTo(48, 68, 66, 80); ctx.stroke();
      ctx.fillStyle = '#FFB347';
      ctx.beginPath(); ctx.arc(20, 84, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'golem': {
      groundShadow(ctx, 48, 116, 30, 7);
      const g = ctx.createLinearGradient(20, 20, 76, 118);
      g.addColorStop(0, '#4a1e0c'); g.addColorStop(1, '#1e0a04');
      ctx.fillStyle = g;
      ctx.fillRect(24, 42, 48, 74);
      ctx.strokeStyle = '#8a3a12'; ctx.lineWidth = 3; ctx.strokeRect(24, 42, 48, 74);
      ctx.fillStyle = '#3a1408';
      ctx.fillRect(30, 12, 36, 28);
      ctx.strokeRect(30, 12, 36, 28);
      ctx.fillStyle = '#FFB347';
      ctx.fillRect(36, 22, 9, 7); ctx.fillRect(51, 22, 9, 7);
      ctx.strokeStyle = '#FF6B35'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(32, 52); ctx.lineTo(64, 100); ctx.moveTo(64, 52); ctx.lineTo(32, 100); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'dummy':
    case 'dummy_red': {
      const red = kind === 'dummy_red';
      const body = red ? '#7a4444' : '#8b8b5a';
      groundShadow(ctx, 48, 112, 22, 6);
      const g = ctx.createLinearGradient(28, 40, 68, 112);
      g.addColorStop(0, shade(body, 20)); g.addColorStop(1, shade(body, -30));
      ctx.fillStyle = g;
      ctx.fillRect(30, 46, 36, 66);
      ctx.strokeStyle = shade(body, -44); ctx.lineWidth = 2.5; ctx.strokeRect(30, 46, 36, 66);
      ctx.fillStyle = shade(body, 30);
      ctx.beginPath(); ctx.arc(48, 32, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = red ? '#ff4444' : '#3a3a1a';
      ctx.beginPath(); ctx.arc(48, 32, 6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default:
      return humanoid('#5a2a2a', '#7a3a3a', { hooded: true });
  }

  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

/** Sprite art for map entities and the player. */
export function entitySpriteURL(sprite: string): string {
  switch (sprite) {
    case 'keeper': return humanoid('#4a6a8e', '#c4d4e8', { glowOrb: '#00d4ff', staff: '#2e4a6e' });
    case 'scholar': return humanoid('#5a4a3a', '#c49a6c', { hat: '#2a1a0e' });
    case 'elder': return humanoid('#3e5a6e', '#c49a6c', { beard: true, staff: '#5a7a8e' });
    case 'merchant': return humanoid('#6e5a3e', '#c49a6c', { hat: '#4682B4' });
    case 'innkeeper': return humanoid('#5a4a5e', '#c49a6c');
    case 'priestess': return humanoid('#2e4a6e', '#e8c4a0', { glowOrb: '#5eead4' });
    case 'gate': return portal('#a855f7', '#c084fc');
    case 'gate_fire': return portal('#FF6B35', '#FFB347');
    case 'gate_sea': return portal('#4682B4', '#5eead4');
    case 'essence': return crystal('#00d4ff');
    case 'essence_fire': return crystal('#FF6B35');
    case 'essence_sea': return crystal('#4682B4');
    case 'cache': return chest();
    case 'memory': return crystal('#d8b4fe');
    default: return humanoid('#4a6a8e', '#c4d4e8', {});
  }
}

/** Player sprite — class-tinted drifter. */
export function playerSpriteURL(classId?: string): string {
  const robes: Record<string, string> = {
    warrior: '#a03434', mage: '#6e3a9e', priest: '#c0a038',
    sharpshooter: '#2e7a4e', paladin: '#c06820',
  };
  return humanoid(robes[classId || ''] || '#3e5a8e', '#e8c4a0', { staff: classId === 'mage' ? '#5e3a1e' : undefined, glowOrb: classId === 'mage' ? '#a855f7' : undefined });
}

/** Enemy sprite art. */
export function enemySpriteURL(sprite: string): string {
  return monster(sprite);
}
