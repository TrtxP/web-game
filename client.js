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

  setInterval(() => {
    if (elements.gameScreen.classList.contains('hidden')) return;
    sendInputToServer();
  }, 1000 / 30);

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'joined':
        state.myId = message.you;
        state.arenaSize = message.arena;
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
      case 'state':
        renderer.onState(message);
        break;
    }
  });
})();