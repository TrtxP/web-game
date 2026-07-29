/**
 * Arena Collector — Server
 * Single-room authoritative WebSocket server.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 4;
const ARENA_W = 900;
const ARENA_H = 600;
const PLAYER_SIZE = 28;
const PLAYER_SPEED = 220; // px/sec
const ROUND_SECONDS = 90;
const COIN_COUNT = 12;
const COIN_SIZE = 16;
const TICK_HZ = 30;

const COLORS = ['#ff5d73', '#4fc3f7', '#ffd166', '#9b5de5'];

// Static File Server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^[/\\]+/, '');
  const filePath = path.resolve(__dirname, relativePath);
  
  if (!filePath.startsWith(`${__dirname}${path.sep}`)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

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

const room = {
  players: new Map(), // ws -> playerObj
  leadWs: null,
  status: 'lobby',    // lobby | playing | paused | ended
  coins: freshCoins(),
  timeLeft: ROUND_SECONDS,
};

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of room.players.keys()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function publicPlayers() {
  return [...room.players.values()].map(p => ({
    id: p.id, name: p.name, color: p.color,
    x: p.x, y: p.y, score: p.score, isLead: p.isLead,
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
  for (const p of room.players.values()) {
    p.score = 0;
    p.x = 60 + Math.random() * (ARENA_W - 120);
    p.y = 60 + Math.random() * (ARENA_H - 120);
  }
}

// Authoritative Game Loop
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  if (room.status === 'playing') {
    room.timeLeft -= dt;

    // Movement
    for (const p of room.players.values()) {
      const len = Math.hypot(p.input.x, p.input.y) || 1;
      const isMoving = p.input.x !== 0 || p.input.y !== 0;
      const nx = p.x + (p.input.x / len) * PLAYER_SPEED * dt * (isMoving ? 1 : 0);
      const ny = p.y + (p.input.y / len) * PLAYER_SPEED * dt * (isMoving ? 1 : 0);
      p.x = Math.max(0, Math.min(ARENA_W - PLAYER_SIZE, nx));
      p.y = Math.max(0, Math.min(ARENA_H - PLAYER_SIZE, ny));
    }

    // Coin Collisions
    room.coins = room.coins.filter(coin => {
      for (const p of room.players.values()) {
        const dx = (p.x + PLAYER_SIZE / 2) - coin.x;
        const dy = (p.y + PLAYER_SIZE / 2) - coin.y;
        if (Math.hypot(dx, dy) < PLAYER_SIZE / 2 + COIN_SIZE / 2) {
          p.score += 10;
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
  }
}, 1000 / TICK_HZ);

function computeWinnerText() {
  const arr = [...room.players.values()].sort((a, b) => b.score - a.score);
  if (arr.length === 0) return 'Гру завершено.';
  const top = arr[0];
  const tied = arr.filter(p => p.score === top.score);
  if (tied.length > 1) return `Нічия між: ${tied.map(p => p.name).join(', ')}!`;
  return `${top.name} переміг з рахунком ${top.score}!`;
}

function handleQuit(ws) {
  const p = room.players.get(ws);
  if (!p) return;

  room.players.delete(ws);
  broadcast({ type: 'sfx', sound: 'loss' });
  broadcast({ type: 'message', text: `${p.name} покинув(ла) гру.` });

  if (p.isLead && room.players.size > 0) {
    const nextWs = room.players.keys().next().value;
    const nextP = room.players.get(nextWs);
    nextP.isLead = true;
    room.leadWs = nextWs;
    broadcast({ type: 'message', text: `${nextP.name} тепер лідер сесії.` });
  }

  if (room.players.size < 2 && room.status === 'playing') {
    room.status = 'lobby';
    broadcast({ type: 'message', text: 'Недостатньо гравців для продовження. Повернення в лобі.' });
  } else if (room.players.size === 0) {
    room.status = 'lobby';
  }

  sendState();
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, msg);
  });

  ws.on('close', () => handleQuit(ws));
});

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'join': {
      const name = (msg.name || '').trim().slice(0, 16);
      if (!name) return ws.send(JSON.stringify({ type: 'joinError', reason: 'Порожнє ім’я.' }));
      if (room.players.size >= MAX_PLAYERS) return ws.send(JSON.stringify({ type: 'joinError', reason: 'Кімната заповнена (макс 4).' }));
      
      const nameTaken = [...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase());
      if (nameTaken) return ws.send(JSON.stringify({ type: 'joinError', reason: 'Це ім’я вже зайняте.' }));

      const isFirst = room.players.size === 0;
      const p = {
        id: 'p_' + Math.random().toString(36).slice(2, 9),
        ws, name,
        color: COLORS[room.players.size % COLORS.length],
        x: 60 + Math.random() * (ARENA_W - 120),
        y: 60 + Math.random() * (ARENA_H - 120),
        score: 0,
        input: { x: 0, y: 0 },
        isLead: isFirst,
      };

      if (isFirst) room.leadWs = ws;
      room.players.set(ws, p);

      ws.send(JSON.stringify({ 
        type: 'joined', 
        you: p.id, 
        arena: { w: ARENA_W, h: ARENA_H, playerSize: PLAYER_SIZE, coinSize: COIN_SIZE } 
      }));

      broadcast({ type: 'message', text: `${p.name} приєднався(лась) до лобі.` });
      sendState();
      break;
    }

    case 'start':
    case 'startGame': {
      const p = room.players.get(ws);
      if (!p || !p.isLead || room.status !== 'lobby') return;
      if (room.players.size < 2) {
        return ws.send(JSON.stringify({ type: 'joinError', reason: 'Потрібно мінімум 2 гравці.' }));
      }
      resetGame();
      room.status = 'playing';
      broadcast({ type: 'sfx', sound: 'start' });
      broadcast({ type: 'message', text: `${p.name} розпочав(ла) гру!` });
      sendState();
      break;
    }

    case 'input': {
      const p = room.players.get(ws);
      if (!p || room.status !== 'playing') return;
      // Supports object input {up, down, left, right} or vector {x, y}
      if (typeof msg.up !== 'undefined') {
        p.input.x = (msg.right ? 1 : 0) - (msg.left ? 1 : 0);
        p.input.y = (msg.down ? 1 : 0) - (msg.up ? 1 : 0);
      } else {
        p.input.x = Math.max(-1, Math.min(1, msg.x || 0));
        p.input.y = Math.max(-1, Math.min(1, msg.y || 0));
      }
      break;
    }

    case 'menuAction':
    case 'pauseGame':
    case 'resumeGame':
    case 'quitGame': {
      const p = room.players.get(ws);
      if (!p) return;
      const act = msg.action || msg.type.replace('Game', '');

      if (act === 'pause' && room.status === 'playing') {
        room.status = 'paused';
        broadcast({ type: 'message', text: `${p.name} поставив(ла) гру на паузу.` });
      } else if (act === 'resume' && room.status === 'paused') {
        room.status = 'playing';
        broadcast({ type: 'message', text: `${p.name} відновив(ла) гру.` });
      } else if (act === 'quit') {
        handleQuit(ws);
        return;
      }
      sendState();
      break;
    }

    case 'playAgain': {
      const p = room.players.get(ws);
      if (!p || !p.isLead) return;
      room.status = 'lobby';
      sendState();
      break;
    }
  }
}

server.listen(PORT, () => console.log(`Arena Collector server running on http://localhost:${PORT}`));