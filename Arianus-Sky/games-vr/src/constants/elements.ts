// Elemental realm configurations from wireframe
export const ELEMENTS = {
  ARIANUS: {
    name: 'Arianus',
    color: '#FF3333',
    particleColor: '#FF3333',
    direction: 'upward',
    speed: 'fast',
    effect: 'heat_shimmer',
    decayRate: 0.003,
    pulseInterval: 45,
  },
  PRYAN: {
    name: 'Pryan',
    color: '#3333FF',
    particleColor: '#3333FF',
    direction: 'spiral_down',
    speed: 'medium',
    effect: 'droplet_trail',
    decayRate: 0.0015,
    pulseInterval: 80,
  },
  CHELESTRA: {
    name: 'Chelestra',
    color: '#33FF33',
    particleColor: '#33FF33',
    direction: 'downward',
    speed: 'slow',
    effect: 'ground_vibration',
    decayRate: 0.002,
    pulseInterval: 60,
  },
  ABARRACH: {
    name: 'Abarrach',
    color: '#000000',
    particleColor: '#1a1a2e',
    direction: 'static',
    speed: 'none',
    effect: 'subtle_glow_flicker',
    decayRate: 0.002,
    pulseInterval: 60,
  },
} as const;

// Elemental reaction combinations
export const ELEMENTAL_REACTIONS = {
  'FIRE+WATER': { result: 'steam', color: '#FFFFFF', effect: 'fast_rise' },
  'FIRE+EARTH': { result: 'magma', color: '#FF6600', effect: 'slow_drip' },
  'WATER+EARTH': { result: 'life_bloom', color: '#00FF66', effect: 'expansion' },
  'VOID+ANY': { result: 'dimension_tear', color: '#660066', effect: 'spiral' },
} as const;

// Game configuration
export const GAME_CONFIG = {
  GRID_SIZE_DESKTOP: 8,
  GRID_SIZE_MOBILE: 6,
  TILE_SIZE_MIN_MOBILE: 48,
  TILE_SIZE_MIN_DESKTOP: 60,
  MATCH_THRESHOLD: 3,
  SOUL_GAUGE_MAX: 1.0,
  SOUL_DECAY_BASE: 0.002,
  MATCH_RESTORE: 0.05,
  MISS_PENALTY: 0.001,
} as const;

// Performance targets from wireframe
export const PERFORMANCE_TARGETS = {
  MOBILE_HIGH: { fps: 60, maxParticles: 200, latency: 100 },
  MOBILE_LOW: { fps: 30, maxParticles: 50, latency: 200 },
} as const;
