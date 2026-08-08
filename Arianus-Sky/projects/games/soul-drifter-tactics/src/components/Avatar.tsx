import { useState, useEffect } from 'react';

interface AvatarProps {
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  onClick?: () => void;
  size?: number;
}

export function Avatar({ direction, isMoving, onClick, size = 40 }: AvatarProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isMoving) {
      setFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 6);
    }, 120);
    return () => clearInterval(interval);
  }, [isMoving]);

  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  const legSwing = isMoving ? Math.sin((frame / 6) * Math.PI * 2) * (s * 0.12) : 0;
  const armSwing = isMoving ? Math.sin((frame / 6) * Math.PI * 2 + Math.PI) * (s * 0.1) : 0;
  const bodyBounce = isMoving ? Math.abs(Math.sin((frame / 6) * Math.PI * 2)) * (s * 0.04) : 0;

  const facingUp = direction === 'up';
  const facingDown = direction === 'down';
  const facingLeft = direction === 'left';
  const facingRight = direction === 'right';

  const headOffsetX = facingLeft ? -s * 0.02 : facingRight ? s * 0.02 : 0;

  return (
    <div
      onClick={onClick}
      className={`relative ${onClick ? 'cursor-pointer hover:brightness-125' : ''}`}
      style={{ width: s, height: s }}
      title="Click for inventory"
    >
      <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} className="drop-shadow-lg">
        <defs>
          <linearGradient id={`skin-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8c4a0" />
            <stop offset="100%" stopColor="#c49a6c" />
          </linearGradient>
          <linearGradient id={`armor-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a1a6e" />
            <stop offset="100%" stopColor="#2a0a3e" />
          </linearGradient>
          <linearGradient id={`armorLight-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a2a7e" />
            <stop offset="100%" stopColor="#3a1a4e" />
          </linearGradient>
          <radialGradient id={`runeGlow-${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00ffff" stopOpacity="1" />
            <stop offset="50%" stopColor="#00aaff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0088ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`hair-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          <filter id={`shadow-${s}`}>
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="black" floodOpacity="0.4" />
          </filter>
        </defs>

        <ellipse cx={cx} cy={s - 3} rx={s * 0.28} ry={s * 0.08} fill="rgba(0,0,0,0.35)" />

        {facingUp && (
          <g>
            <path d={`M${cx - s * 0.18} ${cy - s * 0.12} Q${cx} ${cy - s * 0.28} ${cx + s * 0.18} ${cy - s * 0.12} L${cx + s * 0.15} ${cy + s * 0.1} Q${cx} ${cy + s * 0.15} ${cx - s * 0.15} ${cy + s * 0.1} Z`} fill={`url(#hair-${s})`} />
            <rect x={cx - s * 0.12 - legSwing} y={cy + s * 0.12 - bodyBounce} width={s * 0.1} height={s * 0.28} rx={s * 0.03} fill="#1a0a2e" />
            <rect x={cx - s * 0.2 + armSwing} y={cy - s * 0.02 - bodyBounce} width={s * 0.09} height={s * 0.22} rx={s * 0.03} fill="#2a1a3e" />
            <rect x={cx - s * 0.14} y={cy - s * 0.08 - bodyBounce} width={s * 0.28} height={s * 0.24} rx={s * 0.04} fill={`url(#armor-${s})`} />
            <circle cx={cx} cy={cy + s * 0.02 - bodyBounce} r={s * 0.04} fill="url(#runeGlow-0)" opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <rect x={cx + s * 0.02 + legSwing} y={cy + s * 0.12 - bodyBounce} width={s * 0.1} height={s * 0.28} rx={s * 0.03} fill="#1a0a2e" />
            <rect x={cx + s * 0.11 - armSwing} y={cy - s * 0.02 - bodyBounce} width={s * 0.09} height={s * 0.22} rx={s * 0.03} fill="#2a1a3e" />
            <circle cx={cx} cy={cy - s * 0.14 - bodyBounce} r={s * 0.14} fill={`url(#skin-${s})`} />
          </g>
        )}

        {!facingUp && (
          <g>
            <rect
              x={facingLeft ? cx - s * 0.08 - legSwing : facingRight ? cx - s * 0.02 + legSwing : cx - s * 0.12 - legSwing}
              y={cy + s * 0.12 - bodyBounce}
              width={s * 0.1}
              height={s * 0.28}
              rx={s * 0.03}
              fill="#1a0a2e"
            />
            <rect
              x={facingLeft ? cx - s * 0.18 + armSwing : facingRight ? cx + s * 0.09 - armSwing : cx - s * 0.2 + armSwing}
              y={cy - s * 0.02 - bodyBounce}
              width={s * 0.09}
              height={s * 0.22}
              rx={s * 0.03}
              fill="#2a1a3e"
            />
            <rect x={cx - s * 0.14} y={cy - s * 0.08 - bodyBounce} width={s * 0.28} height={s * 0.24} rx={s * 0.04} fill={`url(#armor-${s})`} />
            <rect x={cx - s * 0.08} y={cy - s * 0.04 - bodyBounce} width={s * 0.16} height={s * 0.16} rx={s * 0.02} fill={`url(#armorLight-${s})`} opacity="0.5" />
            <circle cx={cx} cy={cy + s * 0.02 - bodyBounce} r={s * 0.035} fill={`url(#runeGlow-${s})`} opacity="0.8">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy + s * 0.02 - bodyBounce} r={s * 0.015} fill="#00ffff" opacity="0.9" />
            <rect
              x={facingLeft ? cx + s * 0.02 + legSwing : facingRight ? cx - s * 0.08 - legSwing : cx + s * 0.02 + legSwing}
              y={cy + s * 0.12 - bodyBounce}
              width={s * 0.1}
              height={s * 0.28}
              rx={s * 0.03}
              fill="#1a0a2e"
            />
            <rect
              x={facingLeft ? cx + s * 0.09 - armSwing : facingRight ? cx - s * 0.18 + armSwing : cx + s * 0.11 - armSwing}
              y={cy - s * 0.02 - bodyBounce}
              width={s * 0.09}
              height={s * 0.22}
              rx={s * 0.03}
              fill="#2a1a3e"
            />
            <ellipse cx={cx - s * 0.16} cy={cy - s * 0.04 - bodyBounce} rx={s * 0.06} ry={s * 0.05} fill="#3a1a5e" />
            <ellipse cx={cx + s * 0.16} cy={cy - s * 0.04 - bodyBounce} rx={s * 0.06} ry={s * 0.05} fill="#3a1a5e" />
            <circle cx={cx + headOffsetX} cy={cy - s * 0.14 - bodyBounce} r={s * 0.14} fill={`url(#skin-${s})`} />
            {(facingDown || facingLeft || facingRight) && (
              <>
                <ellipse cx={cx + headOffsetX - s * 0.05} cy={cy - s * 0.16 - bodyBounce} rx={s * 0.035} ry={s * 0.03} fill="#f0e6d6" />
                <ellipse cx={cx + headOffsetX + s * 0.05} cy={cy - s * 0.16 - bodyBounce} rx={s * 0.035} ry={s * 0.03} fill="#f0e6d6" />
                <circle cx={cx + headOffsetX - s * 0.05} cy={cy - s * 0.16 - bodyBounce} r={s * 0.02} fill={`url(#runeGlow-${s})`} />
                <circle cx={cx + headOffsetX + s * 0.05} cy={cy - s * 0.16 - bodyBounce} r={s * 0.02} fill={`url(#runeGlow-${s})`} />
                <circle cx={cx + headOffsetX - s * 0.05 + (facingLeft ? -s * 0.01 : facingRight ? s * 0.01 : 0)} cy={cy - s * 0.16 - bodyBounce} r={s * 0.012} fill="#1a1a3e" />
                <circle cx={cx + headOffsetX + s * 0.05 + (facingLeft ? -s * 0.01 : facingRight ? s * 0.01 : 0)} cy={cy - s * 0.16 - bodyBounce} r={s * 0.012} fill="#1a1a3e" />
              </>
            )}
            {facingDown && (
              <path d={`M${cx - s * 0.02} ${cy - s * 0.12 - bodyBounce} L${cx} ${cy - s * 0.1 - bodyBounce} L${cx + s * 0.02} ${cy - s * 0.12 - bodyBounce}`} fill="none" stroke="#b08950" strokeWidth="0.5" />
            )}
            {facingDown && (
              <path d={`M${cx - s * 0.03} ${cy - s * 0.08 - bodyBounce} Q${cx} ${cy - s * 0.07 - bodyBounce} ${cx + s * 0.03} ${cy - s * 0.08 - bodyBounce}`} fill="none" stroke="#a07840" strokeWidth="0.5" />
            )}
            {facingDown ? (
              <path d={`M${cx - s * 0.16} ${cy - s * 0.16 - bodyBounce} Q${cx} ${cy - s * 0.28 - bodyBounce} ${cx + s * 0.16} ${cy - s * 0.16 - bodyBounce} L${cx + s * 0.14} ${cy - s * 0.04 - bodyBounce} Q${cx} ${cy - s * 0.02 - bodyBounce} ${cx - s * 0.14} ${cy - s * 0.04 - bodyBounce} Z`} fill={`url(#hair-${s})`} />
            ) : facingLeft ? (
              <path d={`M${cx + s * 0.02} ${cy - s * 0.24 - bodyBounce} Q${cx - s * 0.12} ${cy - s * 0.26 - bodyBounce} ${cx - s * 0.16} ${cy - s * 0.12 - bodyBounce} L${cx - s * 0.14} ${cy + s * 0.02 - bodyBounce} L${cx + s * 0.06} ${cy - s * 0.02 - bodyBounce} Z`} fill={`url(#hair-${s})`} />
            ) : facingRight ? (
              <path d={`M${cx - s * 0.02} ${cy - s * 0.24 - bodyBounce} Q${cx + s * 0.12} ${cy - s * 0.26 - bodyBounce} ${cx + s * 0.16} ${cy - s * 0.12 - bodyBounce} L${cx + s * 0.14} ${cy + s * 0.02 - bodyBounce} L${cx - s * 0.06} ${cy - s * 0.02 - bodyBounce} Z`} fill={`url(#hair-${s})`} />
            ) : null}
            {(facingLeft || facingRight) && (
              <path
                d={facingLeft ? `M${cx - s * 0.08} ${cy - s * 0.12 - bodyBounce} L${cx - s * 0.06} ${cy - s * 0.1 - bodyBounce}` : `M${cx + s * 0.08} ${cy - s * 0.12 - bodyBounce} L${cx + s * 0.06} ${cy - s * 0.1 - bodyBounce}`}
                stroke="#00d4ff"
                strokeWidth="0.8"
                opacity="0.6"
              />
            )}
            <rect x={cx - s * 0.12} y={cy + s * 0.12 - bodyBounce} width={s * 0.24} height={s * 0.04} rx={s * 0.01} fill="#3a1a0a" />
            <rect x={cx - s * 0.02} y={cy + s * 0.11 - bodyBounce} width={s * 0.04} height={s * 0.06} rx={s * 0.01} fill="#5a3a1a" />
          </g>
        )}
      </svg>
    </div>
  );
}
