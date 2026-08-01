const {
  ARENA_W,
  ARENA_H,
  PLAYER_SIZE,
  PLAYER_SPEED,
  COIN_SIZE,
  TICK_HZ,
  PLAYER_CLASSES,
} = require('./config');
const { POWERUP_SIZE, tickPowerups, collectPowerup } = require('./powerups');

function startGameLoop(gameRoom) {
  const {
    room,
    broadcast,
    freshCoins,
    sendState,
    computeWinnerText,
    handleTheft,
    stopTimers,
  } = gameRoom;

  let lastTick = Date.now();

  return setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    if (room.status !== 'playing') return;

    // 1. Update match timer
    room.timeLeft -= dt;

    // 2. Move players & clamp within dynamic arena bounds
    const arenaW = room.arenaW || ARENA_W;
    const arenaH = room.arenaH || ARENA_H;

    for (const player of room.players.values()) {
      // Apply class speed modifier + speed powerup
      const classDef = PLAYER_CLASSES[player.playerClass] || PLAYER_CLASSES.none;
      let speedMul = classDef.speedMul;
      if (player.activePowerup && player.activePowerup.kind === 'speed' && now < player.activePowerup.expiresAt) {
        speedMul *= 1.6;
      }

      const length = Math.hypot(player.input.x, player.input.y) || 1;
      const isMoving = player.input.x !== 0 || player.input.y !== 0;
      const speed = PLAYER_SPEED * speedMul;
      const nextX = player.x + (player.input.x / length) * speed * dt * (isMoving ? 1 : 0);
      const nextY = player.y + (player.input.y / length) * speed * dt * (isMoving ? 1 : 0);
      player.x = Math.max(0, Math.min(arenaW - PLAYER_SIZE, nextX));
      player.y = Math.max(0, Math.min(arenaH - PLAYER_SIZE, nextY));
    }

    // 3. Process player-to-player collision theft
    if (typeof handleTheft === 'function') {
      handleTheft(now);
    }

    // 4. Process coin collections (with class-based collection radius)
    const targetCoinCount = (room.modeConfig && room.modeConfig.coinCount) || 12;
    room.coins = room.coins.filter((coin) => {
      for (const player of room.players.values()) {
        const classDef = PLAYER_CLASSES[player.playerClass] || PLAYER_CLASSES.none;
        const dx = player.x + PLAYER_SIZE / 2 - coin.x;
        const dy = player.y + PLAYER_SIZE / 2 - coin.y;
        const coinRadius = coin.type === 'star' ? 12 : COIN_SIZE / 2;
        const collectRadius = (PLAYER_SIZE / 2 + coinRadius) * classDef.collectRadiusMul;

        if (Math.hypot(dx, dy) < collectRadius) {
          player.score += coin.value || 10;
          room.pendingSfx.push('collect');
          return false;
        }
      }
      return true;
    });

    if (room.coins.length === 0) {
      room.coins = freshCoins(targetCoinCount);
    }

    // 5. Process powerup collections
    if (room.powerups && room.powerups.length > 0) {
      room.powerups = room.powerups.filter((pu) => {
        for (const player of room.players.values()) {
          const dx = player.x + PLAYER_SIZE / 2 - pu.x;
          const dy = player.y + PLAYER_SIZE / 2 - pu.y;

          if (Math.hypot(dx, dy) < PLAYER_SIZE / 2 + POWERUP_SIZE / 2) {
            collectPowerup(player, pu);
            room.pendingSfx.push('powerup_collect');
            return false;
          }
        }
        return true;
      });
    }

    // 6. Tick active powerup effects (magnet pull, expiry)
    tickPowerups(room, dt, PLAYER_SIZE, COIN_SIZE);

    // 7. Handle game over
    if (room.timeLeft <= 0) {
      room.timeLeft = 0;
      room.status = 'ended';

      if (typeof stopTimers === 'function') {
        stopTimers();
      }

      room.pendingSfx.push('end');
      broadcast({ type: 'message', text: computeWinnerText() });
    }

    sendState();
  }, 1000 / TICK_HZ);
}

module.exports = { startGameLoop };