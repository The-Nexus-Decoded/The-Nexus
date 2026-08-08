import { DynamicTexture, Scene } from '@babylonjs/core';

/** Lighten (amt>0) or darken (amt<0) a #rrggbb color. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rng(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Ctx = CanvasRenderingContext2D;

export type GroundKind =
  | 'plain' | 'flagstone' | 'cracked' | 'planks' | 'grass'
  | 'sand' | 'kelp' | 'water' | 'deepwater' | 'glow' | 'lava' | 'soulwell';

const TEX_SIZE = 256;

/** Fill base + VGA-style two-tone dither patches (the U7 ground-tile look). */
function dither(ctx: Ctx, base: string, rand: () => number, count = 150) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = i % 2 === 0 ? shade(base, 18) : shade(base, -18);
    ctx.globalAlpha = 0.22 + rand() * 0.22;
    const s = 2 + rand() * 5;
    ctx.fillRect(rand() * TEX_SIZE, rand() * TEX_SIZE, s, Math.max(1.5, s - 1));
  }
  ctx.globalAlpha = 1;
}

export function makeGroundTexture(scene: Scene, key: string, base: string, detail: string, kind: GroundKind): DynamicTexture {
  const tex = new DynamicTexture(`gt-${key}`, TEX_SIZE, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const rand = rng(hashStr(key));

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  switch (kind) {
    case 'water': {
      const g = ctx.createLinearGradient(0, 0, 0, TEX_SIZE);
      g.addColorStop(0, shade(base, 22));
      g.addColorStop(1, shade(base, -24));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
      // wave crests
      for (let row = 0; row < 5; row++) {
        ctx.strokeStyle = row % 2 ? '#9adcf0' : '#5ec8e8';
        ctx.globalAlpha = 0.35 + rand() * 0.25;
        ctx.lineWidth = 2 + rand() * 1.5;
        ctx.beginPath();
        const y0 = 20 + row * 50 + rand() * 14;
        for (let x = -20; x < TEX_SIZE + 20; x += 8) {
          const y = y0 + Math.sin((x + row * 40) / 22) * 6;
          x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'deepwater': {
      const g = ctx.createLinearGradient(0, 0, 0, TEX_SIZE);
      g.addColorStop(0, shade(base, 8));
      g.addColorStop(1, shade(base, -40));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = shade(base, 26);
        ctx.globalAlpha = 0.1 + rand() * 0.15;
        ctx.beginPath();
        ctx.ellipse(rand() * TEX_SIZE, rand() * TEX_SIZE, 12 + rand() * 22, 3 + rand() * 4, rand(), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'flagstone': {
      dither(ctx, base, rand);
      ctx.strokeStyle = shade(base, -32);
      ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        const p = i * (TEX_SIZE / 4) + (rand() * 6 - 3);
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, TEX_SIZE); ctx.stroke();
        const q = i * (TEX_SIZE / 4) + (rand() * 6 - 3);
        ctx.beginPath(); ctx.moveTo(0, q); ctx.lineTo(TEX_SIZE, q); ctx.stroke();
      }
      ctx.strokeStyle = shade(base, 14);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const p = i * (TEX_SIZE / 4) + 2;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, TEX_SIZE); ctx.stroke();
      }
      break;
    }
    case 'cracked': {
      dither(ctx, base, rand);
      ctx.strokeStyle = shade(base, -36);
      ctx.lineWidth = 2;
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        let x = rand() * TEX_SIZE, y = rand() * TEX_SIZE * 0.4;
        ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += rand() * 60 - 20; y += 30 + rand() * 40;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'planks': {
      dither(ctx, base, rand, 90);
      ctx.strokeStyle = shade(base, -30);
      ctx.lineWidth = 3;
      const rows = 5;
      for (let r = 0; r <= rows; r++) {
        const y = r * (TEX_SIZE / rows);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX_SIZE, y); ctx.stroke();
        // staggered joints
        const joints = 2;
        for (let j = 0; j < joints; j++) {
          const x = ((j + (r % 2) * 0.5) / joints) * TEX_SIZE + rand() * 20;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + TEX_SIZE / rows); ctx.stroke();
        }
      }
      break;
    }
    case 'grass': {
      dither(ctx, base, rand);
      for (let i = 0; i < 90; i++) {
        const x = rand() * TEX_SIZE, y = rand() * TEX_SIZE;
        ctx.strokeStyle = shade(detail, Math.floor(rand() * 40) - 10);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand() * 6 - 3, y - 5 - rand() * 7);
        ctx.stroke();
      }
      if (rand() > 0.5) {
        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = rand() > 0.5 ? '#f5e663' : '#e8ecf1';
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(rand() * TEX_SIZE, rand() * TEX_SIZE, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'sand': {
      dither(ctx, base, rand);
      ctx.strokeStyle = shade(base, -14);
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        ctx.globalAlpha = 0.3 + rand() * 0.2;
        ctx.beginPath();
        const y0 = rand() * TEX_SIZE;
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(TEX_SIZE * 0.3, y0 - 14, TEX_SIZE * 0.6, y0 + 14, TEX_SIZE, y0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'kelp': {
      dither(ctx, base, rand, 100);
      for (let i = 0; i < 14; i++) {
        const x = rand() * TEX_SIZE;
        ctx.strokeStyle = shade(detail, Math.floor(rand() * 30) - 15);
        ctx.lineWidth = 3 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(x, TEX_SIZE);
        ctx.bezierCurveTo(x - 12, TEX_SIZE * 0.66, x + 12, TEX_SIZE * 0.33, x - 6, rand() * TEX_SIZE * 0.3);
        ctx.stroke();
      }
      break;
    }
    case 'glow': {
      dither(ctx, base, rand, 100);
      const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 130);
      g.addColorStop(0, detail);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
      ctx.globalAlpha = 1;
      break;
    }
    case 'lava': {
      const g = ctx.createLinearGradient(0, 0, TEX_SIZE, TEX_SIZE);
      g.addColorStop(0, shade(base, -30));
      g.addColorStop(0.5, base);
      g.addColorStop(1, shade(base, -40));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
      for (let i = 0; i < 10; i++) {
        ctx.strokeStyle = i % 2 ? '#FFB347' : '#FFE29A';
        ctx.globalAlpha = 0.4 + rand() * 0.3;
        ctx.lineWidth = 2 + rand() * 3;
        ctx.beginPath();
        let x = rand() * TEX_SIZE, y = rand() * TEX_SIZE;
        ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) { x += rand() * 70 - 35; y += rand() * 70 - 35; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'soulwell': {
      dither(ctx, base, rand, 110);
      ctx.strokeStyle = detail;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(128, 128, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60);
        ctx.lineTo(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    default:
      dither(ctx, base, rand);
  }

  tex.update();
  return tex;
}

/** Brick-coursed wall texture (tall U7 block walls). */
export function makeBrickTexture(scene: Scene, key: string, base: string, detail: string): DynamicTexture {
  const tex = new DynamicTexture(`bt-${key}`, TEX_SIZE, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const rand = rng(hashStr(`wall-${key}`));

  const g = ctx.createLinearGradient(0, 0, 0, TEX_SIZE);
  g.addColorStop(0, base);
  g.addColorStop(1, shade(base, -26));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  dither(ctx, base, rand, 110);

  const courses = 5;
  const ch = TEX_SIZE / courses;
  ctx.strokeStyle = shade(base, -42);
  ctx.lineWidth = 3;
  for (let r = 0; r <= courses; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(TEX_SIZE, r * ch); ctx.stroke();
    const bricks = 3;
    for (let b = 0; b < bricks; b++) {
      const x = ((b + (r % 2) * 0.5) / bricks) * TEX_SIZE;
      ctx.beginPath(); ctx.moveTo(x, r * ch); ctx.lineTo(x, (r + 1) * ch); ctx.stroke();
    }
  }
  // top highlight + moss/grime streaks
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, TEX_SIZE, 6);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = shade(detail, -20);
    ctx.globalAlpha = 0.12 + rand() * 0.12;
    const x = rand() * TEX_SIZE;
    ctx.fillRect(x, rand() * TEX_SIZE * 0.4, 4 + rand() * 6, 40 + rand() * 80);
  }
  ctx.globalAlpha = 1;
  tex.update();
  return tex;
}
