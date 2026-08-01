/** Arena Collector client bootstrap. */
(() => {
  const app = window.ArenaClient;
  const elements = app.getElements();
  const state = {
    myId: null,
    arenaSize: { w: 900, h: 600, playerSize: 28, coinSize: 16 },
    isLead: false,
    selectedMode: 'classic',
    selectedClass: 'none',
    classIcons: {},
    prediction: null,
    predictionSpeed: 220,
    baseSpeed: 220,
  };
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  const playSfx = app.createAudioPlayer();
  const renderer = app.createRenderer(elements, state, app.showScreen);

  let toastTimer = null;
  function showToast(text) {
    elements.toast.textContent = text;
    elements.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2600);
  }

  // Theft damage feedback (Screen Shake & Red HUD Flash)
  function triggerDamageFx(amount) {
    elements.gameScreen.classList.add('shake', 'damage-flash');
    showToast(`💔 У вас викрадено ${amount} балів!`);
    setTimeout(() => elements.gameScreen.classList.remove('shake', 'damage-flash'), 400);
  }

  // Render 3-second Star Coin Spawn Warning Ring
  function renderStarWarning({ x, y, duration }) {
    const warnEl = document.createElement('div');
    warnEl.className = 'star-warning';
    warnEl.style.transform = `translate(${x - 20}px, ${y - 20}px)`;
    elements.arena.appendChild(warnEl);

    setTimeout(() => {
      warnEl.remove();
    }, duration);
  }

  // Build class selector buttons from server data
  function buildClassSelector(classes) {
    if (!elements.classButtons || !Array.isArray(classes)) return;
    elements.classButtons.innerHTML = '';

    // Add "none" option
    const noneBtn = document.createElement('button');
    noneBtn.className = 'selector-btn active';
    noneBtn.textContent = 'Без класу';
    noneBtn.dataset.value = 'none';
    noneBtn.addEventListener('click', () => selectClass('none'));
    elements.classButtons.appendChild(noneBtn);

    classes.forEach((cls) => {
      const btn = document.createElement('button');
      btn.className = 'selector-btn';
      btn.textContent = `${cls.icon} ${cls.label}`;
      btn.dataset.value = cls.key;
      btn.addEventListener('click', () => selectClass(cls.key));
      elements.classButtons.appendChild(btn);

      // Store class icons for scoreboard display
      state.classIcons[cls.key] = cls.icon;
    });
  }

  function selectClass(classKey) {
    state.selectedClass = classKey;
    ws.send(JSON.stringify({ type: 'selectClass', playerClass: classKey }));

    // Update active button
    if (elements.classButtons) {
      [...elements.classButtons.children].forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === classKey);
      });
    }
  }

  // Build mode selector buttons from server data
  function buildModeSelector(modes) {
    if (!elements.modeButtons || !Array.isArray(modes)) return;
    elements.modeButtons.innerHTML = '';

    modes.forEach((mode) => {
      const btn = document.createElement('button');
      btn.className = `selector-btn${mode.key === 'classic' ? ' active' : ''}`;
      btn.textContent = mode.label;
      btn.title = mode.description;
      btn.dataset.value = mode.key;
      btn.addEventListener('click', () => {
        state.selectedMode = mode.key;
        [...elements.modeButtons.children].forEach((b) => {
          b.classList.toggle('active', b.dataset.value === mode.key);
        });
      });
      elements.modeButtons.appendChild(btn);
    });
  }

  function doJoin() {
    const name = elements.nameInput.value.trim();
    if (!name) {
      elements.joinError.textContent = "Введіть ім'я.";
      return;
    }
    ws.send(JSON.stringify({ type: 'join', name }));
  }

  elements.joinBtn.addEventListener('click', doJoin);
  elements.nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') doJoin();
  });
  elements.startBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'start', mode: state.selectedMode }));
  });

  elements.menuBtn.addEventListener('click', () => elements.menuOverlay.classList.remove('hidden'));
  elements.closeMenuBtn.addEventListener('click', () => elements.menuOverlay.classList.add('hidden'));
  elements.pauseBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'menuAction', action: 'pause' })));
  elements.resumeBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'menuAction', action: 'resume' })));
  elements.colorblindBtn?.addEventListener('click', () => {
    document.body.classList.toggle('colorblind-mode');
    const isActive = document.body.classList.contains('colorblind-mode');
    showToast(isActive ? '👁️ Режим для дальтоніків увімкнено' : '👁️ Режим для дальтоніків вимкнено');
  });
  elements.quitBtn.addEventListener('click', () => {
    playSfx('quit');
    ws.send(JSON.stringify({ type: 'menuAction', action: 'quit' }));
    elements.menuOverlay.classList.add('hidden');
  });
  elements.playAgainBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'playAgain' }));
    elements.winnerOverlay.classList.add('hidden');
  });

  let lastInputKey = null;
  const pressedKeys = app.attachKeyboardInput(sendInputToServer);
  function sendInputToServer() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const up = !!(pressedKeys.KeyW || pressedKeys.ArrowUp);
    const down = !!(pressedKeys.KeyS || pressedKeys.ArrowDown);
    const left = !!(pressedKeys.KeyA || pressedKeys.ArrowLeft);
    const right = !!(pressedKeys.KeyD || pressedKeys.ArrowRight);
    const inputKey = `${up ? 1 : 0}${down ? 1 : 0}${left ? 1 : 0}${right ? 1 : 0}`;
    if (inputKey !== lastInputKey) {
      lastInputKey = inputKey;
      ws.send(JSON.stringify({ type: 'input', up, down, left, right }));
    }
  }



  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'joined':
        state.myId = message.you;
        state.arenaSize = message.arena;
        state.baseSpeed = message.arena.playerSpeed || 220;
        elements.joinError.textContent = '';
        app.showScreen(elements, elements.lobby);
        showToast('Приєднано до лобі!');
        // Build class and mode selectors from server data
        if (message.playerClasses) buildClassSelector(message.playerClasses);
        if (message.gameModes) buildModeSelector(message.gameModes);
        break;
      case 'joinError':
        elements.joinError.textContent = message.reason;
        break;
      case 'starWarning':
        renderStarWarning(message);
        break;
      case 'stolenFrom':
        triggerDamageFx(message.amount);
        break;
      case 'message':
        showToast(message.text);
        break;
      case 'sfx':
        playSfx(message.sound);
        break;
      case 'powerupSpawned':
        // Handled via state powerups array; sfx is separate
        break;
      case 'left':
        state.prediction = null;
        renderer.onState(message);
        break;
      case 'state':
        if (Array.isArray(message.sfx)) message.sfx.forEach((s) => playSfx(s));
        if (state.myId && Array.isArray(message.players) && message.status === 'playing') {
          const me = message.players.find((p) => p.id === state.myId);
          if (me) {
            state.predictionSpeed = (state.baseSpeed || 220) * (me.speedMul || 1);
            if (!state.prediction) {
              state.prediction = { x: me.x, y: me.y };
            } else {
              const dx = me.x - state.prediction.x;
              const dy = me.y - state.prediction.y;
              if (Math.abs(dx) > 80 || Math.abs(dy) > 80) {
                state.prediction.x = me.x;
                state.prediction.y = me.y;
              } else {
                state.prediction.x += dx * 0.3;
                state.prediction.y += dy * 0.3;
              }
            }
          }
        } else {
          state.prediction = null;
        }
        renderer.onState(message);
        break;
    }
  });

  // Client-side prediction loop
  let lastPredTime = performance.now();
  (function predictionLoop() {
    const now = performance.now();
    const dt = Math.min((now - lastPredTime) / 1000, 0.05);
    lastPredTime = now;

    if (state.prediction) {
      const up = !!(pressedKeys.KeyW || pressedKeys.ArrowUp);
      const down = !!(pressedKeys.KeyS || pressedKeys.ArrowDown);
      const left = !!(pressedKeys.KeyA || pressedKeys.ArrowLeft);
      const right = !!(pressedKeys.KeyD || pressedKeys.ArrowRight);
      const ix = (right ? 1 : 0) - (left ? 1 : 0);
      const iy = (down ? 1 : 0) - (up ? 1 : 0);

      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy);
        const speed = state.predictionSpeed || state.baseSpeed || 220;
        state.prediction.x += (ix / len) * speed * dt;
        state.prediction.y += (iy / len) * speed * dt;
        const a = state.arenaSize;
        state.prediction.x = Math.max(0, Math.min(a.w - a.playerSize, state.prediction.x));
        state.prediction.y = Math.max(0, Math.min(a.h - a.playerSize, state.prediction.y));
      }
    }

    requestAnimationFrame(predictionLoop);
  })();
})();