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

function createGameRoom() {
  const room = {
    players: new Map(),
    leadWs: null,
    status: 'lobby',
    coins: freshCoins(),
    timeLeft: ROUND_SECONDS,
  };

  function freshCoins() {
    const coins = [];
    for (let i = 0; i < COIN_COUNT; i++) {
      coins.push({
        id: 'c' + i + '_' + Math.random().toString(36).slice(2, 6),
        x: 40 + Math.random() * (ARENA_W - 80),
        y: 40 + Math.random() * (ARENA_H - 80),
      });
    }
    return coins;
  }

  function broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of room.players.keys()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }

  function publicPlayers() {
    return [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      x: player.x,
      y: player.y,
      score: player.score,
      isLead: player.isLead,
    }));
  }

  function sendState() {
    broadcast({
      type: 'state',
      status: room.status,
      timeLeft: Math.ceil(room.timeLeft),
      players: publicPlayers(),
      coins: room.coins,
    });
  }

  function resetGame() {
    room.coins = freshCoins();
    room.timeLeft = ROUND_SECONDS;
    for (const player of room.players.values()) {
      player.score = 0;
      player.x = 60 + Math.random() * (ARENA_W - 120);
      player.y = 60 + Math.random() * (ARENA_H - 120);
    }
  }

  function computeWinnerText() {
    const players = [...room.players.values()].sort((a, b) => b.score - a.score);
    if (players.length === 0) return 'Гру завершено.';

    const top = players[0];
    const tied = players.filter((player) => player.score === top.score);
    if (tied.length > 1) return `Нічия між: ${tied.map((player) => player.name).join(', ')}!`;
    return `${top.name} переміг з рахунком ${top.score}!`;
  }

  function createPlayer(ws, name) {
    const isFirst = room.players.size === 0;
    const player = {
      id: 'p_' + Math.random().toString(36).slice(2, 9),
      ws,
      name,
      color: COLORS[room.players.size % COLORS.length],
      x: 60 + Math.random() * (ARENA_W - 120),
      y: 60 + Math.random() * (ARENA_H - 120),
      score: 0,
      input: { x: 0, y: 0 },
      isLead: isFirst,
    };

    if (isFirst) room.leadWs = ws;
    room.players.set(ws, player);
    return player;
  }

  function handleQuit(ws) {
    const player = room.players.get(ws);
    if (!player) return;

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
      room.status = 'lobby';
      broadcast({ type: 'message', text: 'Недостатньо гравців для продовження. Повернення в лобі.' });
    } else if (room.players.size === 0) {
      room.status = 'lobby';
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
    computeWinnerText,
    handleQuit,
  };
}

module.exports = { createGameRoom };
