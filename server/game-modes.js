/**
 * Game mode presets for Arena Collector.
 * Each mode overrides default config values for a single match.
 */

const GAME_MODES = {
  classic: {
    label: 'Classic',
    description: 'Стандартна гра — 90 секунд',
    roundSeconds: 90,
    coinCount: 12,
    shrinkIntervalMs: 20000,
    powerupIntervalMin: 8000,
    powerupIntervalMax: 15000,
    theftMultiplier: 1.0,
  },
  blitz: {
    label: 'Blitz',
    description: 'Швидка гра — 45 секунд, менша арена, більше монет',
    roundSeconds: 45,
    coinCount: 18,
    shrinkIntervalMs: 12000,
    powerupIntervalMin: 5000,
    powerupIntervalMax: 10000,
    theftMultiplier: 1.0,
    arenaScale: 0.75,
  },
  chaos: {
    label: 'Chaos',
    description: '120 секунд, подвійні power-ups, крадіжка ×2',
    roundSeconds: 120,
    coinCount: 12,
    shrinkIntervalMs: 25000,
    powerupIntervalMin: 4000,
    powerupIntervalMax: 8000,
    theftMultiplier: 2.0,
  },
};

function getModeConfig(modeName) {
  return GAME_MODES[modeName] || GAME_MODES.classic;
}

module.exports = { GAME_MODES, getModeConfig };
