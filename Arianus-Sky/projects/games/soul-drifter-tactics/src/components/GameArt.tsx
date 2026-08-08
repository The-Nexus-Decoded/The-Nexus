export function HaploPortrait({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className}>
      <defs>
        <linearGradient id="haploSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="haploHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0f0f1a" />
        </linearGradient>
        <radialGradient id="runeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#0088ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0088ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Background aura */}
      <circle cx="100" cy="100" r="95" fill="url(#runeGlow)" opacity="0.3">
        <animate attributeName="r" values="90;95;90" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
      </circle>
      
      {/* Body/Armor */}
      <path d="M60 180 L60 140 Q60 120 80 110 L120 110 Q140 120 140 140 L140 180 Z" fill="#2a1a3e" />
      <path d="M70 180 L70 150 Q70 130 85 120 L115 120 Q130 130 130 150 L130 180 Z" fill="#1a0a2e" />
      
      {/* Rune tattoos on chest */}
      <path d="M85 140 L100 130 L115 140 L100 150 Z" fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.8">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </path>
      <circle cx="100" cy="142" r="3" fill="#00d4ff" opacity="0.9">
        <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
      </circle>
      
      {/* Neck */}
      <rect x="85" y="95" width="30" height="20" fill="url(#haploSkin)" />
      
      {/* Head */}
      <ellipse cx="100" cy="75" rx="28" ry="32" fill="url(#haploSkin)" />
      
      {/* Hair */}
      <path d="M72 70 Q70 45 85 40 Q100 35 115 40 Q130 45 128 70 Q130 85 125 90 L120 85 Q125 60 115 50 Q100 45 85 50 Q75 60 80 85 L75 90 Q70 85 72 70 Z" fill="url(#haploHair)" />
      
      {/* Face features */}
      <path d="M92 68 Q100 72 108 68" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
      <path d="M96 78 Q100 82 104 78" fill="none" stroke="#8b6914" strokeWidth="1" />
      
      {/* Eyes with glow */}
      <ellipse cx="90" cy="62" rx="5" ry="4" fill="#1a1a3e" />
      <ellipse cx="110" cy="62" rx="5" ry="4" fill="#1a1a3e" />
      <circle cx="90" cy="62" r="3" fill="url(#eyeGlow)">
        <animate attributeName="r" values="2;3.5;2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="110" cy="62" r="3" fill="url(#eyeGlow)">
        <animate attributeName="r" values="2;3.5;2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      
      {/* Rune tattoos on face */}
      <path d="M82 55 L85 50 L88 55" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.7" />
      <path d="M112 55 L115 50 L118 55" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.7" />
      
      {/* Shoulders */}
      <ellipse cx="55" cy="115" rx="15" ry="12" fill="#2a1a3e" />
      <ellipse cx="145" cy="115" rx="15" ry="12" fill="#2a1a3e" />
      
      {/* Arm runes */}
      <path d="M45 125 L50 120 L55 125 L50 130 Z" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M145 125 L150 120 L155 125 L150 130 Z" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin="1.5s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export function EnemySprite({ element, isBoss }: { element: string; isBoss: boolean }) {
  const colors: Record<string, string> = {
    air: '#87CEEB',
    fire: '#FF6B35',
    stone: '#8B7355',
    water: '#4682B4',
    labyrinth: '#9B59B6',
  };
  const color = colors[element] || '#666';
  
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <radialGradient id={`enemyGlow-${element}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`glow-${element}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Aura */}
      <circle cx="100" cy="100" r="80" fill={`url(#enemyGlow-${element})`} opacity="0.5">
        <animate attributeName="r" values="75;85;75" dur="2s" repeatCount="indefinite" />
      </circle>
      
      {element === 'air' && (
        <>
          {/* Wind/Serpent shape */}
          <path d="M60 120 Q80 80 100 100 Q120 120 140 80" fill="none" stroke={color} strokeWidth="8" filter={`url(#glow-${element})`}>
            <animate attributeName="d" values="M60 120 Q80 80 100 100 Q120 120 140 80;M60 100 Q80 120 100 80 Q120 100 140 100;M60 120 Q80 80 100 100 Q120 120 140 80" dur="3s" repeatCount="indefinite" />
          </path>
          <circle cx="140" cy="80" r="10" fill={color} filter={`url(#glow-${element})`}>
            <animate attributeName="cy" values="80;70;80" dur="3s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      
      {element === 'fire' && (
        <>
          {/* Flame shape */}
          <path d="M100 160 Q70 120 80 90 Q90 60 100 40 Q110 60 120 90 Q130 120 100 160 Z" fill={color} opacity="0.8" filter={`url(#glow-${element})`}>
            <animate attributeName="d" values="M100 160 Q70 120 80 90 Q90 60 100 40 Q110 60 120 90 Q130 120 100 160 Z;M100 160 Q75 115 85 85 Q95 55 100 35 Q105 55 115 85 Q125 115 100 160 Z;M100 160 Q70 120 80 90 Q90 60 100 40 Q110 60 120 90 Q130 120 100 160 Z" dur="1.5s" repeatCount="indefinite" />
          </path>
          <ellipse cx="100" cy="100" rx="20" ry="30" fill="#FFD700" opacity="0.6">
            <animate attributeName="ry" values="30;35;30" dur="1s" repeatCount="indefinite" />
          </ellipse>
        </>
      )}
      
      {element === 'stone' && (
        <>
          {/* Golem shape */}
          <rect x="70" y="60" width="60" height="80" rx="10" fill={color} filter={`url(#glow-${element})`} />
          <rect x="80" y="75" width="15" height="12" rx="3" fill="#FFD700" opacity="0.8">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="105" y="75" width="15" height="12" rx="3" fill="#FFD700" opacity="0.8">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="1s" repeatCount="indefinite" />
          </rect>
          <rect x="85" y="100" width="30" height="8" rx="4" fill="#5a4a3a" />
        </>
      )}
      
      {element === 'water' && (
        <>
          {/* Water orb */}
          <circle cx="100" cy="100" r="50" fill={color} opacity="0.6" filter={`url(#glow-${element})`}>
            <animate attributeName="r" values="48;52;48" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="100" r="35" fill="#87CEEB" opacity="0.4" />
          <path d="M70 100 Q85 85 100 100 Q115 115 130 100" fill="none" stroke="white" strokeWidth="2" opacity="0.6">
            <animate attributeName="d" values="M70 100 Q85 85 100 100 Q115 115 130 100;M70 100 Q85 115 100 100 Q115 85 130 100;M70 100 Q85 85 100 100 Q115 115 130 100" dur="3s" repeatCount="indefinite" />
          </path>
        </>
      )}
      
      {element === 'labyrinth' && (
        <>
          {/* Chaos form */}
          <path d="M100 50 L120 80 L110 120 L130 150 L100 140 L70 150 L90 120 L80 80 Z" fill={color} opacity="0.7" filter={`url(#glow-${element})`}>
            <animate attributeName="d" values="M100 50 L120 80 L110 120 L130 150 L100 140 L70 150 L90 120 L80 80 Z;M100 45 L125 75 L115 125 L135 145 L100 135 L65 145 L85 125 L75 75 Z;M100 50 L120 80 L110 120 L130 150 L100 140 L70 150 L90 120 L80 80 Z" dur="4s" repeatCount="indefinite" />
          </path>
          <circle cx="100" cy="100" r="15" fill="#FF0000" opacity="0.8">
            <animate attributeName="r" values="12;18;12" dur="1s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      
      {/* Boss crown/indicator */}
      {isBoss && (
        <path d="M80 35 L85 20 L95 30 L100 15 L105 30 L115 20 L120 35 Z" fill="#FFD700" filter={`url(#glow-${element})`}>
          <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
        </path>
      )}
    </svg>
  );
}

export function WorldBackground({ element }: { element: string }) {
  const gradients: Record<string, { from: string; to: string; accent: string }> = {
    air: { from: '#1a1a3e', to: '#2d4a6e', accent: '#87CEEB' },
    fire: { from: '#2a1a0a', to: '#4a2a0a', accent: '#FF6B35' },
    stone: { from: '#1a1510', to: '#3a3020', accent: '#8B7355' },
    water: { from: '#0a1a2e', to: '#1a3a5e', accent: '#4682B4' },
    labyrinth: { from: '#1a0a2e', to: '#2e1a4e', accent: '#9B59B6' },
    title: { from: '#0a0a1a', to: '#1a0a2e', accent: '#8A2BE2' },
  };
  
  const g = gradients[element] || gradients.title;
  
  return (
    <svg className="absolute inset-0 w-full h-full -z-10" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${element}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </linearGradient>
        <radialGradient id={`stars-${element}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={g.accent} stopOpacity="0.1" />
          <stop offset="100%" stopColor={g.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#bg-${element})`} />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <circle
          key={i}
          cx={`${Math.random() * 100}%`}
          cy={`${Math.random() * 100}%`}
          r={Math.random() * 2 + 1}
          fill={g.accent}
          opacity={Math.random() * 0.5 + 0.1}
        >
          <animate
            attributeName="cy"
            values={`${Math.random() * 100}%;${Math.random() * 100}%`}
            dur={`${Math.random() * 10 + 10}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values={`${Math.random() * 0.5};${Math.random() * 0.5 + 0.3};${Math.random() * 0.5}`}
            dur={`${Math.random() * 3 + 2}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

export function RuneSymbol({ element, size = 40 }: { element: string; size?: number }) {
  const colors: Record<string, string> = {
    air: '#87CEEB',
    fire: '#FF6B35',
    stone: '#8B7355',
    water: '#4682B4',
    labyrinth: '#9B59B6',
    void: '#666',
  };
  const color = colors[element] || '#666';
  
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <filter id="runeGlow">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <circle cx="20" cy="20" r="14" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
      
      {element === 'air' && (
        <path d="M12 25 Q20 15 28 25 M15 20 Q20 12 25 20" fill="none" stroke={color} strokeWidth="2" filter="url(#runeGlow)">
          <animate attributeName="d" values="M12 25 Q20 15 28 25 M15 20 Q20 12 25 20;M12 23 Q20 13 28 23 M15 22 Q20 14 25 22;M12 25 Q20 15 28 25 M15 20 Q20 12 25 20" dur="2s" repeatCount="indefinite" />
        </path>
      )}
      {element === 'fire' && (
        <path d="M20 8 L24 20 L20 32 L16 20 Z M20 12 L20 28" fill="none" stroke={color} strokeWidth="2" filter="url(#runeGlow)">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
        </path>
      )}
      {element === 'stone' && (
        <path d="M12 28 L20 12 L28 28 Z M16 22 L24 22 M18 18 L22 18" fill="none" stroke={color} strokeWidth="2" filter="url(#runeGlow)" />
      )}
      {element === 'water' && (
        <path d="M20 8 Q28 16 20 32 Q12 16 20 8" fill="none" stroke={color} strokeWidth="2" filter="url(#runeGlow)">
          <animate attributeName="d" values="M20 8 Q28 16 20 32 Q12 16 20 8;M20 8 Q30 16 20 32 Q10 16 20 8;M20 8 Q28 16 20 32 Q12 16 20 8" dur="3s" repeatCount="indefinite" />
        </path>
      )}
      {element === 'labyrinth' && (
        <>
          <circle cx="20" cy="20" r="8" fill="none" stroke={color} strokeWidth="2" filter="url(#runeGlow)" />
          <path d="M20 12 L20 28 M12 20 L28 20" stroke={color} strokeWidth="1.5" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

export function DamageNumber({ value, x, y }: { value: number; x: number; y: number }) {
  return (
    <div
      className="absolute text-2xl font-bold text-red-400 pointer-events-none"
      style={{ left: x, top: y, animation: 'damageFloat 1s ease-out forwards' }}
    >
      -{value}
    </div>
  );
}
