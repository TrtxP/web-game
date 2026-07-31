const WebSocket = require('ws');
const {
  ARENA_W,
  ARENA_H,
  PLAYER_SIZE,
  ROUND_SECONDS,
  COIN_COUNT,
  COIN_SIZE,
  COLORS,
} = require('./config');

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

function createGameRoom() {
  const room = {
    players: new Map(),
    leadWs: null,
    status: 'lobby',
    coins: [],
    timeLeft: ROUND_SECONDS,
    arenaW: ARENA_W,
    arenaH: ARENA_H,
    starWarningTimer: null,
    starSpawnTimer: null,
    shrinkInterval: null,
  };

  const randPos = (max, margin = 40) => margin + Math.random() * (max - margin * 2);

  const createCoin = (type = 'standard', value = 10, x, y) => ({
    id: uid(type === 'star' ? 'star' : 'c'),
    type,
    value,
    x: x ?? randPos(room.arenaW),
    y: y ?? randPos(room.arenaH),
  });

  function freshCoins() {
    return Array.from({ length: COIN_COUNT }, () => createCoin());
  }

  room.coins = freshCoins();

  function stopTimers() {
    clearTimeout(room.starWarningTimer);
    clearTimeout(room.starSpawnTimer);
    clearInterval(room.shrinkInterval);
    room.starWarningTimer = room.starSpawnTimer = room.shrinkInterval = null;
  }

  function startTimers() {
    stopTimers();
    room.shrinkInterval = setInterval(() => {
      if (room.status === 'playing') shrinkArena();
    }, 20000);

    scheduleStarCoin();
  }

  function shrinkArena() {
    room.arenaW = Math.max(400, Math.floor(room.arenaW * 0.9));
    room.arenaH = Math.max(300, Math.floor(room.arenaH * 0.9));

    for (const player of room.players.values()) {
      player.x = Math.max(0, Math.min(room.arenaW - PLAYER_SIZE, player.x));
      player.y = Math.max(0, Math.min(room.arenaH - PLAYER_SIZE, player.y));
    }

    const margin = 30;
    room.coins = room.coins.filter((c) => c.x <= room.arenaW - margin && c.y <= room.arenaH - margin);

    const standardCoins = room.coins.filter((c) => c.type === 'standard' || !c.type);
    while (standardCoins.length < COIN_COUNT) {
      const newCoin = createCoin('standard', 10, randPos(room.arenaW, margin), randPos(room.arenaH, margin));
      room.coins.push(newCoin);
      standardCoins.push(newCoin);
    }

    broadcast({ type: 'message', text: '⚠️ Арена звужується!' });
  }

  function scheduleStarCoin() {
    if (room.status !== 'playing') return;

    room.starWarningTimer = setTimeout(() => {
      if (room.status !== 'playing') return;

      const x = randPos(room.arenaW);
      const y = randPos(room.arenaH);
      const warnId = uid('warn');

      broadcast({ type: 'starWarning', id: warnId, x, y, duration: 3000 });
      broadcast({ type: 'sfx', sound: 'star_warning' });

      room.starSpawnTimer = setTimeout(() => {
        if (room.status === 'playing') {
          room.coins.push(createCoin('star', 50, x, y));
          broadcast({ type: 'sfx', sound: 'star_spawn' });
        }
        scheduleStarCoin();
      }, 3000);
    }, 12000);
  }

  function handleTheft(now) {
    if (room.status !== 'playing') return;
    const players = [...room.players.values()];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];

        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < PLAYER_SIZE) {
          if (now - (p1.lastHitFx || 0) > 600 && now - (p2.lastHitFx || 0) > 600) {
            p1.lastHitFx = now;
            p2.lastHitFx = now;
            broadcast({ type: 'sfx', sound: 'hit' });
          }

          const p1Immune = now < (p1.immuneUntil || 0);
          const p2Immune = now < (p2.immuneUntil || 0);

          let attacker = null;
          let victim = null;

          if (p1.score > p2.score && !p1Immune) {
            attacker = p2;
            victim = p1;
          } else if (p2.score > p1.score && !p2Immune) {
            attacker = p1;
            victim = p2;
          }

          if (attacker && victim && victim.score > 0) {
            const stolen = Math.floor(victim.score * 0.30);
            if (stolen > 0) {
              victim.score -= stolen;
              attacker.score += stolen;

              // Both players receive 2s immunity to prevent instant counter-steals
              victim.immuneUntil = now + 2000;
              attacker.immuneUntil = now + 2000;

              if (victim.ws?.readyState === WebSocket.OPEN) {
                victim.ws.send(JSON.stringify({ type: 'stolenFrom', amount: stolen }));
              }
              broadcast({ type: 'sfx', sound: 'steal' });
            }
          }
        }
      }
    }
  }

  function broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of room.players.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        if (msg.type === 'state' && ws.bufferedAmount > 0) continue;
        ws.send(data);
      }
    }
  }

  function publicPlayers() {
    const now = Date.now();
    return [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: p.x,
      y: p.y,
      score: p.score,
      isLead: p.isLead,
      isImmune: now < (p.immuneUntil || 0),
    }));
  }

  function sendState() {
    broadcast({
      type: 'state',
      status: room.status,
      timeLeft: Math.ceil(room.timeLeft),
      arena: {
        w: room.arenaW,
        h: room.arenaH,
        playerSize: PLAYER_SIZE,
        coinSize: COIN_SIZE,
      },
      players: publicPlayers(),
      coins: room.coins,
    });
  }

  function resetGame() {
    stopTimers();
    room.arenaW = ARENA_W;
    room.arenaH = ARENA_H;
    room.coins = freshCoins();
    room.timeLeft = ROUND_SECONDS;
    room.status = 'lobby';

    for (const player of room.players.values()) {
      player.score = 0;
      player.x = randPos(ARENA_W, 60);
      player.y = randPos(ARENA_H, 60);
      player.immuneUntil = 0;
    }
  }

  function startGame() {
    resetGame();
    room.status = 'playing';
    startTimers();
    broadcast({ type: 'sfx', sound: 'start' });
    sendState();
  }

  function computeWinnerText() {
    const players = [...room.players.values()].sort((a, b) => b.score - a.score);
    if (!players.length) return 'Гру завершено.';

    const top = players[0];
    const tied = players.filter((p) => p.score === top.score);
    if (tied.length > 1) return `Нічия між: ${tied.map((p) => p.name).join(', ')}!`;
    return `${top.name} переміг з рахунком ${top.score}!`;
  }

  function createPlayer(ws, name) {
    const isFirst = room.players.size === 0;
    const player = {
      id: uid('p'),
      ws,
      name,
      color: COLORS[room.players.size % COLORS.length],
      x: randPos(ARENA_W, 60),
      y: randPos(ARENA_H, 60),
      score: 0,
      input: { x: 0, y: 0 },
      isLead: isFirst,
      immuneUntil: 0,
    };

    if (isFirst) room.leadWs = ws;
    room.players.set(ws, player);
    return player;
  }

  function handleQuit(ws) {
    const player = room.players.get(ws);
    if (!player) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'left' }));
    }

    room.players.delete(ws);
    broadcast({ type: 'sfx', sound: 'loss' });
    broadcast({ type: 'message', text: `${player.name} покинув(ла) гру.` });

    if (player.isLead && room.players.size > 0) {
      const nextWs = room.players.keys().next().value;
      const nextPlayer = room.players.get(nextWs);
      nextPlayer.isLead = true;
      room.leadWs = nextWs;
      broadcast({ type: 'message', text: `${nextPlayer.name} тепер лідер сесії.` });
    }

    if (room.players.size < 2 && room.status === 'playing') {
      stopTimers();
      resetGame();
      broadcast({ type: 'message', text: 'Недостатньо гравців для продовження. Повернення в лобі.' });
    } else if (room.players.size === 0) {
      stopTimers();
      resetGame();
    }

    sendState();
  }

  return {
    room,
    broadcast,
    createPlayer,
    freshCoins,
    publicPlayers,
    sendState,
    resetGame,
    startGame,
    stopTimers,
    startTimers,
    handleTheft,
    computeWinnerText,
    handleQuit,
  };
}

module.exports = { createGameRoom };