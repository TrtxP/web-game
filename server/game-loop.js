const {
  ARENA_W,
  ARENA_H,
  PLAYER_SIZE,
  PLAYER_SPEED,
  COIN_SIZE,
  TICK_HZ,
} = require('./config');

function startGameLoop(gameRoom) {
  const { room, broadcast, freshCoins, sendState, computeWinnerText } = gameRoom;
  let lastTick = Date.now();

  return setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    if (room.status !== 'playing') return;

    room.timeLeft -= dt;

    for (const player of room.players.values()) {
      const length = Math.hypot(player.input.x, player.input.y) || 1;
      const isMoving = player.input.x !== 0 || player.input.y !== 0;
      const nextX = player.x + (player.input.x / length) * PLAYER_SPEED * dt * (isMoving ? 1 : 0);
      const nextY = player.y + (player.input.y / length) * PLAYER_SPEED * dt * (isMoving ? 1 : 0);
      player.x = Math.max(0, Math.min(ARENA_W - PLAYER_SIZE, nextX));
      player.y = Math.max(0, Math.min(ARENA_H - PLAYER_SIZE, nextY));
    }

    room.coins = room.coins.filter((coin) => {
      for (const player of room.players.values()) {
        const dx = player.x + PLAYER_SIZE / 2 - coin.x;
        const dy = player.y + PLAYER_SIZE / 2 - coin.y;
        if (Math.hypot(dx, dy) < PLAYER_SIZE / 2 + COIN_SIZE / 2) {
          player.score += 10;
          broadcast({ type: 'sfx', sound: 'collect' });
          return false;
        }
      }
      return true;
    });

    if (room.coins.length === 0) room.coins = freshCoins();

    if (room.timeLeft <= 0) {
      room.timeLeft = 0;
      room.status = 'ended';
      broadcast({ type: 'sfx', sound: 'end' });
      broadcast({ type: 'message', text: computeWinnerText() });
    }
    sendState();
  }, 1000 / TICK_HZ);
}

module.exports = { startGameLoop };
