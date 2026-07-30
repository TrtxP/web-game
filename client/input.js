(function (namespace) {
  const movementKeys = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
  ];

  namespace.attachKeyboardInput = function attachKeyboardInput(sendInputToServer) {
    const pressedKeys = {};

    function isTypingInInput() {
      return document.activeElement && document.activeElement.tagName === 'INPUT';
    }

    window.addEventListener('keydown', (event) => {
      if (isTypingInInput()) return;
      if (movementKeys.includes(event.key) || movementKeys.includes(event.code)) {
        event.preventDefault();
        pressedKeys[event.code] = true;
        sendInputToServer();
      }
    });

    window.addEventListener('keyup', (event) => {
      if (isTypingInInput()) return;
      if (movementKeys.includes(event.key) || movementKeys.includes(event.code)) {
        pressedKeys[event.code] = false;
        sendInputToServer();
      }
    });

    return pressedKeys;
  };
})(window.ArenaClient = window.ArenaClient || {});
