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
};
