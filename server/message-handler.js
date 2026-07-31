const { MAX_PLAYERS, ARENA_W, ARENA_H, PLAYER_SIZE, COIN_SIZE } = require('./config');

function send(ws, message) {
  ws.send(JSON.stringify(message));
}

function createMessageHandler(gameRoom) {
  const { room, broadcast, createPlayer, handleQuit, resetGame, startGame, sendState } = gameRoom;

  return function handleMessage(ws, msg) {
    switch (msg.type) {
      case 'join': {
        const name = (msg.name || '').trim().slice(0, 16);
        if (!name) return send(ws, { type: 'joinError', reason: 'Порожнє ім’я.' });
        if (room.players.size >= MAX_PLAYERS) return send(ws, { type: 'joinError', reason: 'Кімната заповнена (макс 4).' });

        const nameTaken = [...room.players.values()].some((player) => player.name.toLowerCase() === name.toLowerCase());
        if (nameTaken) return send(ws, { type: 'joinError', reason: 'Це ім’я вже зайняте.' });

        const player = createPlayer(ws, name);
        send(ws, {
          type: 'joined',
          you: player.id,
          arena: { w: room.arenaW || ARENA_W, h: room.arenaH || ARENA_H, playerSize: PLAYER_SIZE, coinSize: COIN_SIZE },
        });
        broadcast({ type: 'message', text: `${player.name} приєднався(лась) до лобі.` });
        sendState();
        break;
      }

      case 'start':
      case 'startGame': {
        const player = room.players.get(ws);
        if (!player || !player.isLead || room.status !== 'lobby') return;
        if (room.players.size < 2) {
          return send(ws, { type: 'joinError', reason: 'Потрібно мінімум 2 гравці.' });
        }

        if (typeof startGame === 'function') {
          startGame();
        } else {
          resetGame();
          room.status = 'playing';
          sendState();
        }
        broadcast({ type: 'message', text: `${player.name} розпочав(ла) гру!` });
        break;
      }

      case 'input': {
        const player = room.players.get(ws);
        if (!player || room.status !== 'playing') return;
        if (typeof msg.up !== 'undefined') {
          player.input.x = (msg.right ? 1 : 0) - (msg.left ? 1 : 0);
          player.input.y = (msg.down ? 1 : 0) - (msg.up ? 1 : 0);
        } else {
          player.input.x = Math.max(-1, Math.min(1, msg.x || 0));
          player.input.y = Math.max(-1, Math.min(1, msg.y || 0));
        }
        break;
      }

      case 'menuAction':
      case 'pauseGame':
      case 'resumeGame':
      case 'quitGame': {
        const player = room.players.get(ws);
        if (!player) return;
        const action = msg.action || msg.type.replace('Game', '');

        if (action === 'pause' && room.status === 'playing') {
          room.status = 'paused';
          broadcast({ type: 'message', text: `${player.name} поставив(ла) гру на паузу.` });
        } else if (action === 'resume' && room.status === 'paused') {
          room.status = 'playing';
          broadcast({ type: 'message', text: `${player.name} відновив(ла) гру.` });
        } else if (action === 'lobby' || action === 'quit' || action === 'reset') {
          // Resets game state and sends EVERYONE in room back to lobby screen
          resetGame();
          broadcast({ type: 'message', text: `${player.name} повернув(ла) усіх в лобі.` });
        } else if (action === 'leave' || action === 'leaveRoom') {
          // Fully disconnects player from room session
          handleQuit(ws);
          return;
        }
        sendState();
        break;
      }

      case 'playAgain': {
        const player = room.players.get(ws);
        if (!player || !player.isLead) return;

        resetGame();
        sendState();
        break;
      }
    }
  };
}

module.exports = { createMessageHandler };