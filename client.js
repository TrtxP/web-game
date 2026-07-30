/** Arena Collector client bootstrap. */
(() => {
  const app = window.ArenaClient;
  const elements = app.getElements();
  const state = {
    myId: null,
    arenaSize: { w: 900, h: 600, playerSize: 28, coinSize: 16 },
    isLead: false,
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
  elements.startBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'start' })));

  elements.menuBtn.addEventListener('click', () => elements.menuOverlay.classList.remove('hidden'));
  elements.closeMenuBtn.addEventListener('click', () => elements.menuOverlay.classList.add('hidden'));
  elements.pauseBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'menuAction', action: 'pause' })));
  elements.resumeBtn.addEventListener('click', () => ws.send(JSON.stringify({ type: 'menuAction', action: 'resume' })));
  elements.quitBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'menuAction', action: 'quit' }));
    elements.menuOverlay.classList.add('hidden');
  });
  elements.playAgainBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'playAgain' }));
    elements.winnerOverlay.classList.add('hidden');
  });

  const pressedKeys = app.attachKeyboardInput(sendInputToServer);
  function sendInputToServer() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const up = !!(pressedKeys.KeyW || pressedKeys.ArrowUp);
    const down = !!(pressedKeys.KeyS || pressedKeys.ArrowDown);
    const left = !!(pressedKeys.KeyA || pressedKeys.ArrowLeft);
    const right = !!(pressedKeys.KeyD || pressedKeys.ArrowRight);
    ws.send(JSON.stringify({ type: 'input', up, down, left, right }));
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
        break;
      case 'joinError':
        elements.joinError.textContent = message.reason;
        break;
      case 'message':
        showToast(message.text);
        break;
      case 'sfx':
        playSfx(message.sound);
        break;
      case 'state':
        renderer.onState(message);
        break;
    }
  });
})();
