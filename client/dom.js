(function (namespace) {
  namespace.getElements = function getElements() {
    return {
      joinScreen: document.getElementById('joinScreen'),
      gameScreen: document.getElementById('gameScreen'),
      nameInput: document.getElementById('nameInput'),
      joinBtn: document.getElementById('joinBtn'),
      joinError: document.getElementById('joinError'),
      lobby: document.getElementById('lobby'),
      lobbyList: document.getElementById('lobbyList'),
      startBtn: document.getElementById('startBtn'),
      lobbyHint: document.getElementById('lobbyHint'),
      arena: document.getElementById('arena'),
      scoreboard: document.getElementById('scoreboard'),
      timer: document.getElementById('timer'),
      toast: document.getElementById('toast'),
      menuBtn: document.getElementById('menuBtn'),
      menuOverlay: document.getElementById('menuOverlay'),
      pauseBtn: document.getElementById('pauseBtn'),
      resumeBtn: document.getElementById('resumeBtn'),
      quitBtn: document.getElementById('quitBtn'),
      colorblindBtn: document.getElementById('colorblindBtn'),
      closeMenuBtn: document.getElementById('closeMenuBtn'),
      winnerOverlay: document.getElementById('winnerOverlay'),
      winnerText: document.getElementById('winnerText'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      // New elements for classes, modes, powerups
      classSelector: document.getElementById('classSelector'),
      classButtons: document.getElementById('classButtons'),
      modeSelector: document.getElementById('modeSelector'),
      modeButtons: document.getElementById('modeButtons'),
      modeLabel: document.getElementById('modeLabel'),
    };
  };

  namespace.showScreen = function showScreen(elements, screenToShow) {
    elements.joinScreen.classList.add('hidden');
    elements.lobby.classList.add('hidden');
    elements.gameScreen.classList.add('hidden');

    if (screenToShow) screenToShow.classList.remove('hidden');
  };
})(window.ArenaClient = window.ArenaClient || {});
