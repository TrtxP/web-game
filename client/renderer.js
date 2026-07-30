(function (namespace) {
  namespace.createRenderer = function createRenderer(elements, state, showScreen) {
    let previousPlayers = new Map();
    let currentPlayers = new Map();
    let lastServerTime = performance.now();
    let serverIntervalEstimate = 1000 / 30;
    const playerElements = new Map();
    const coinElements = new Map();

    function renderScoreboard(players) {
      elements.scoreboard.innerHTML = '';
      players.forEach((player) => {
        const chip = document.createElement('div');
        chip.className = 'score-chip';
        chip.innerHTML = `<span class="dot" style="background:${player.color}"></span>${player.name}: ${player.score}`;
        elements.scoreboard.appendChild(chip);
      });
    }

    function renderCoins(coins) {
      const seen = new Set();
      coins.forEach((coin) => {
        seen.add(coin.id);
        let element = coinElements.get(coin.id);
        if (!element) {
          element = document.createElement('div');
          element.className = 'coin';
          elements.arena.appendChild(element);
          coinElements.set(coin.id, element);
        }
        element.style.transform = `translate(${coin.x - state.arenaSize.coinSize / 2}px, ${coin.y - state.arenaSize.coinSize / 2}px)`;
      });
      for (const [id, element] of coinElements) {
        if (!seen.has(id)) {
          element.remove();
          coinElements.delete(id);
        }
      }
    }

    function ensurePlayerElement(player) {
      let element = playerElements.get(player.id);
      if (!element) {
        element = document.createElement('div');
        element.className = 'player';
        element.style.background = player.color;
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = player.name;
        element.appendChild(label);
        elements.arena.appendChild(element);
        playerElements.set(player.id, element);
      }
      return element;
    }

    function onState(message) {
      if (message.status === 'lobby') {
        showScreen(elements, state.myId ? elements.lobby : elements.joinScreen);
        elements.winnerOverlay.classList.add('hidden');
        elements.lobbyList.innerHTML = '';
        message.players.forEach((player) => {
          const item = document.createElement('li');
          item.textContent = `${player.name}${player.isLead ? ' 👑 (лідер)' : ''}`;
          elements.lobbyList.appendChild(item);
        });
        const me = message.players.find((player) => player.id === state.myId);
        state.isLead = !!(me && me.isLead);
        elements.startBtn.classList.toggle('hidden', !state.isLead);
        elements.lobbyHint.textContent = state.isLead
          ? (message.players.length >= 2 ? 'Ви можете почати гру.' : 'Потрібно мінімум 2 гравці.')
          : 'Очікуємо, поки лідер розпочне гру...';
        return;
      }

      showScreen(elements, elements.gameScreen);
      if (message.status === 'ended') {
        const sorted = [...message.players].sort((a, b) => b.score - a.score);
        elements.winnerText.textContent = sorted.length
          ? `🏆 ${sorted[0].name} переміг з рахунком ${sorted[0].score}!`
          : 'Гру завершено.';
        elements.winnerOverlay.classList.remove('hidden');
      } else {
        elements.winnerOverlay.classList.add('hidden');
      }

      elements.timer.textContent = message.timeLeft;
      renderScoreboard(message.players);
      renderCoins(message.coins);
      previousPlayers = currentPlayers;
      currentPlayers = new Map(message.players.map((player) => [player.id, player]));
      const now = performance.now();
      serverIntervalEstimate = now - lastServerTime || serverIntervalEstimate;
      lastServerTime = now;
    }

    function frame() {
      const progress = Math.min(1, (performance.now() - lastServerTime) / serverIntervalEstimate);
      for (const [id, current] of currentPlayers) {
        const previous = previousPlayers.get(id) || current;
        const x = previous.x + (current.x - previous.x) * progress;
        const y = previous.y + (current.y - previous.y) * progress;
        ensurePlayerElement(current).style.transform = `translate(${x}px, ${y}px)`;
      }
      for (const [id, element] of playerElements) {
        if (!currentPlayers.has(id)) {
          element.remove();
          playerElements.delete(id);
        }
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return { onState };
  };
})(window.ArenaClient = window.ArenaClient || {});
