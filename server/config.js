const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 4;
const ARENA_W = 900;
const ARENA_H = 600;
const PLAYER_SIZE = 28;
const PLAYER_SPEED = 220;
const ROUND_SECONDS = 90;
const COIN_COUNT = 12;
const COIN_SIZE = 16;
const TICK_HZ = 30;
const COLORS = ['#ff5d73', '#4fc3f7', '#ffd166', '#9b5de5'];

/** Player class definitions with passive modifiers. */
const PLAYER_CLASSES = {
  none:     { label: 'Без класу',  icon: '',  speedMul: 1.0, collectRadiusMul: 1.0, theftStealMul: 1.0, theftDefenseMul: 1.0 },
  sprinter: { label: 'Спринтер',  icon: '🏃', speedMul: 1.2, collectRadiusMul: 1.0, theftStealMul: 1.0, theftDefenseMul: 1.0 },
  tank:     { label: 'Танк',      icon: '🛡️', speedMul: 1.0, collectRadiusMul: 1.0, theftStealMul: 1.0, theftDefenseMul: 0.5 },
  magnet:   { label: 'Магніт',    icon: '🧲', speedMul: 1.0, collectRadiusMul: 1.5, theftStealMul: 1.0, theftDefenseMul: 1.0 },
  thief:    { label: 'Злодій',    icon: '🗡️', speedMul: 1.0, collectRadiusMul: 1.0, theftStealMul: 1.5, theftDefenseMul: 1.0 },
};

module.exports = {
  PORT,
  MAX_PLAYERS,
  ARENA_W,
  ARENA_H,
  PLAYER_SIZE,
  PLAYER_SPEED,
  ROUND_SECONDS,
  COIN_COUNT,
  COIN_SIZE,
  TICK_HZ,
  COLORS,
  PLAYER_CLASSES,
};
