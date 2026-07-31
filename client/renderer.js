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
      if (!Array.isArray(players)) return;
      players.forEach((player) => {
        const chip = document.createElement('div');
        chip.className = 'score-chip';
        chip.innerHTML = `<span class="dot" style="background:${player.color}"></span>${player.name}: ${player.score}`;
        elements.scoreboard.appendChild(chip);
      });
    }

    function renderCoins(coins) {
      if (!Array.isArray(coins)) return;
      const seen = new Set();
      coins.forEach((coin) => {
        seen.add(coin.id);
        let element = coinElements.get(coin.id);
        if (!element) {
          element = document.createElement('div');
          elements.arena.appendChild(element);
          coinElements.set(coin.id, element);
        }
        element.className = `coin ${coin.type || 'standard'}`;
        const coinSize = coin.type === 'star' ? 24 : ((state.arenaSize && state.arenaSize.coinSize) || 16);
        element.style.transform = `translate(${coin.x - coinSize / 2}px, ${coin.y - coinSize / 2}px)`;
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
      element.classList.toggle('immune', !!player.isImmune);
      return element;
    }

    function clearArenaElements() {
      coinElements.forEach((el) => el.remove());
      coinElements.clear();
      playerElements.forEach((el) => el.remove());
      playerElements.clear();
    }

    function hideOverlays() {
      ['winnerOverlay', 'menuOverlay', 'pauseOverlay', 'settingsOverlay'].forEach((key) => {
        if (elements[key] && elements[key].classList) {
          elements[key].classList.add('hidden');
        }
      });
    }

    function onState(message) {
      if (!message) return;

      if (message.type === 'left') {
        state.myId = null;
        state.isLead = false;
        clearArenaElements();
        hideOverlays();
        showScreen(elements, elements.joinScreen);
        return;
      }

      if (message.type === 'starWarning') {
        const warn = document.createElement('div');
        warn.className = 'star-warning';
        const indicatorSize = 44;
        warn.style.transform = `translate(${message.x - indicatorSize / 2}px, ${message.y - indicatorSize / 2}px)`;
        elements.arena.appendChild(warn);
        setTimeout(() => warn.remove(), message.duration || 3000);
        return;
      }

      if (message.type === 'stolenFrom') {
        if (elements.gameScreen) {
          elements.gameScreen.classList.add('shake', 'damage-flash');
          setTimeout(() => {
            elements.gameScreen.classList.remove('shake', 'damage-flash');
          }, 350);
        }
        return;
      }

      if (message.type === 'sfx' || message.type === 'message') {
        return;
      }

      if (message.arena) {
        state.arenaSize = message.arena;
        elements.arena.style.width = `${message.arena.w}px`;
        elements.arena.style.height = `${message.arena.h}px`;
      }

      if (message.status === 'lobby') {
        clearArenaElements();
        hideOverlays();
        showScreen(elements, state.myId ? elements.lobby : elements.joinScreen);
        elements.lobbyList.innerHTML = '';
        if (Array.isArray(message.players)) {
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
        }
        return;
      }

      showScreen(elements, elements.gameScreen);
      if (message.status === 'ended') {
        const sorted = Array.isArray(message.players) ? [...message.players].sort((a, b) => b.score - a.score) : [];
        elements.winnerText.textContent = sorted.length
          ? `🏆 ${sorted[0].name} переміг з рахунком ${sorted[0].score}!`
          : 'Гру завершено.';
        elements.winnerOverlay.classList.remove('hidden');
      } else {
        elements.winnerOverlay.classList.add('hidden');
      }

      elements.timer.textContent = message.timeLeft ?? 0;
      renderScoreboard(message.players);
      renderCoins(message.coins);

      if (Array.isArray(message.players)) {
        previousPlayers = currentPlayers;
        currentPlayers = new Map(message.players.map((player) => [player.id, player]));
      }
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