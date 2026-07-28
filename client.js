/**
 * Arena Collector — client
 * DOM-only rendering (no canvas). Interpolates between server states
 * and drives visuals via requestAnimationFrame for a smooth 60fps feel,
 * independent of the server's network tick rate.
 */

(() => {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);

  // ---------- DOM refs ----------
  const joinScreen = document.getElementById('joinScreen');
  const gameScreen = document.getElementById('gameScreen');
  const nameInput = document.getElementById('nameInput');
  const joinBtn = document.getElementById('joinBtn');
  const joinError = document.getElementById('joinError');
  const lobby = document.getElementById('lobby');
  const lobbyList = document.getElementById('lobbyList');
  const startBtn = document.getElementById('startBtn');
  const lobbyHint = document.getElementById('lobbyHint');
  const arena = document.getElementById('arena');
  const scoreboard = document.getElementById('scoreboard');
  const timerEl = document.getElementById('timer');
  const toast = document.getElementById('toast');
  const menuBtn = document.getElementById('menuBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const quitBtn = document.getElementById('quitBtn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const winnerOverlay = document.getElementById('winnerOverlay');
  const winnerText = document.getElementById('winnerText');
  const playAgainBtn = document.getElementById('playAgainBtn');

  let myId = null;
  let arenaSize = { w: 900, h: 600, playerSize: 28, coinSize: 16 };
  let isLead = false;

  // Rendering state: last two server snapshots for interpolation
  let prevPlayers = new Map();
  let curPlayers = new Map();
  let lastServerTime = performance.now();
  let serverIntervalEstimate = 1000 / 30;

  const playerEls = new Map(); // id -> DOM element
  const coinEls = new Map();   // id -> DOM element

  // ---------- audio (WebAudio, no external files) ----------
  const actx = new (window.AudioContext || window.webkitAudioContext)();
  function beep(freq, dur, type = 'sine', vol = 0.15) {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain).connect(actx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    osc.stop(actx.currentTime + dur);
  }
  function playSfx(name) {
    if (actx.state === 'suspended') actx.resume();
    if (name === 'collect') beep(880, 0.12, 'triangle', 0.12);
    else if (name === 'start') beep(440, 0.25, 'sawtooth', 0.15);
    else if (name === 'end') beep(220, 0.4, 'square', 0.15);
  }

  // ---------- toast messages ----------
  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ---------- join flow ----------
  joinBtn.addEventListener('click', doJoin);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });
  function doJoin() {
    const name = nameInput.value.trim();
    if (!name) { joinError.textContent = "Введіть ім'я."; return; }
    ws.send(JSON.stringify({ type: 'join', name }));
  }
  startBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'start' })));

  // ---------- menu ----------
  menuBtn.addEventListener('click', () => menuOverlay.classList.remove('hidden'));
  closeMenuBtn.addEventListener('click', () => menuOverlay.classList.add('hidden'));
  pauseBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'menuAction', action: 'pause' })));
  resumeBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'menuAction', action: 'resume' })));
  quitBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'menuAction', action: 'quit' }));
    menuOverlay.classList.add('hidden');
  });
  playAgainBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'playAgain' }));
    winnerOverlay.classList.add('hidden');
  });

  // ---------- keyboard input (state map => no long-press glitches) ----------
  const keys = { up: false, down: false, left: false, right: false };
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) { keys[k] = false; e.preventDefault(); }
  });

  // Send input at a fixed small interval — decoupled from render loop,
  // so key state changes are captured immediately without flooding the socket.
  setInterval(() => {
    if (gameScreen.classList.contains('hidden')) return;
    const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    ws.send(JSON.stringify({ type: 'input', x, y }));
  }, 1000 / 30);

  // ---------- websocket message handling ----------
  ws.addEventListener('message', (evt) => {
    const msg = JSON.parse(evt.data);
    switch (msg.type) {
      case 'joined':
        myId = msg.you;
        arenaSize = msg.arena;
        joinError.textContent = '';
        lobby.classList.remove('hidden');
        break;
      case 'joinError':
        joinError.textContent = msg.reason;
        break;
      case 'message':
        showToast(msg.text);
        break;
      case 'sfx':
        playSfx(msg.sound);
        break;
      case 'state':
        onState(msg);
        break;
    }
  });

  function onState(msg) {
    // lobby list + lead controls
    if (msg.status === 'lobby') {
      joinScreen.classList.remove('hidden');
      gameScreen.classList.add('hidden');
      winnerOverlay.classList.add('hidden');
      lobbyList.innerHTML = '';
      msg.players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.name}${p.isLead ? ' 👑 (лідер)' : ''}`;
        lobbyList.appendChild(li);
      });
      const me = msg.players.find(p => p.id === myId);
      isLead = !!(me && me.isLead);
      startBtn.classList.toggle('hidden', !isLead);
      lobbyHint.textContent = isLead
        ? (msg.players.length >= 2 ? 'Ви можете почати гру.' : 'Потрібно мінімум 2 гравці.')
        : 'Очікуємо, поки лідер розпочне гру...';
      return;
    }

    joinScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    if (msg.status === 'ended') {
      const sorted = [...msg.players].sort((a, b) => b.score - a.score);
      winnerText.textContent = sorted.length
        ? `🏆 ${sorted[0].name} переміг з рахунком ${sorted[0].score}!`
        : 'Гру завершено.';
      winnerOverlay.classList.remove('hidden');
    }

    timerEl.textContent = msg.timeLeft;
    renderScoreboard(msg.players);
    renderCoins(msg.coins);

    // shift interpolation buffers
    prevPlayers = curPlayers;
    curPlayers = new Map(msg.players.map(p => [p.id, p]));
    const now = performance.now();
    serverIntervalEstimate = now - lastServerTime || serverIntervalEstimate;
    lastServerTime = now;
  }

  function renderScoreboard(players) {
    scoreboard.innerHTML = '';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'score-chip';
      chip.innerHTML = `<span class="dot" style="background:${p.color}"></span>${p.name}: ${p.score}`;
      scoreboard.appendChild(chip);
    });
  }

  function renderCoins(coins) {
    const seen = new Set();
    coins.forEach(c => {
      seen.add(c.id);
      let el = coinEls.get(c.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'coin';
        arena.appendChild(el);
        coinEls.set(c.id, el);
      }
      el.style.transform = `translate(${c.x - arenaSize.coinSize / 2}px, ${c.y - arenaSize.coinSize / 2}px)`;
    });
    for (const [id, el] of coinEls) {
      if (!seen.has(id)) { el.remove(); coinEls.delete(id); }
    }
  }

  function ensurePlayerEl(p) {
    let el = playerEls.get(p.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'player';
      el.style.background = p.color;
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = p.name;
      el.appendChild(label);
      arena.appendChild(el);
      playerEls.set(p.id, el);
    }
    return el;
  }

  // ---------- requestAnimationFrame render loop with interpolation ----------
  function frame() {
    const t = Math.min(1, (performance.now() - lastServerTime) / serverIntervalEstimate);
    for (const [id, cur] of curPlayers) {
      const prev = prevPlayers.get(id) || cur;
      const x = prev.x + (cur.x - prev.x) * t;
      const y = prev.y + (cur.y - prev.y) * t;
      const el = ensurePlayerEl(cur);
      el.style.transform = `translate(${x}px, ${y}px)`;
    }
    // remove players who left
    for (const [id, el] of playerEls) {
      if (!curPlayers.has(id)) { el.remove(); playerEls.delete(id); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
