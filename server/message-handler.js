const { MAX_PLAYERS, ARENA_W, ARENA_H, PLAYER_SIZE, COIN_SIZE, PLAYER_CLASSES } = require('./config');
const { GAME_MODES } = require('./game-modes');

function send(ws, message) {
  ws.send(JSON.stringify(message));
}

function createMessageHandler(gameRoom) {
  const { room, broadcast, createPlayer, handleQuit, resetGame, startGame, sendState } = gameRoom;

  return function handleMessage(ws, msg) {
    switch (msg.type) {
      case 'join': {
        const name = (msg.name || '').trim().slice(0, 16);
        if (!name) return send(ws, { type: 'joinError', reason: 'Порожнє ім\'я.' });
        if (room.players.size >= MAX_PLAYERS) return send(ws, { type: 'joinError', reason: 'Кімната заповнена (макс 4).' });

        const nameTaken = [...room.players.values()].some((player) => player.name.toLowerCase() === name.toLowerCase());
        if (nameTaken) return send(ws, { type: 'joinError', reason: 'Це ім\'я вже зайняте.' });

        const player = createPlayer(ws, name);
        send(ws, {
          type: 'joined',
          you: player.id,
          arena: { w: room.arenaW || ARENA_W, h: room.arenaH || ARENA_H, playerSize: PLAYER_SIZE, coinSize: COIN_SIZE },
          gameModes: Object.entries(GAME_MODES).map(([key, m]) => ({ key, label: m.label, description: m.description })),
          playerClasses: Object.entries(PLAYER_CLASSES).filter(([k]) => k !== 'none').map(([key, c]) => ({ key, label: c.label, icon: c.icon })),
        });
        broadcast({ type: 'message', text: `${player.name} приєднався(лась) до лобі.` });
        sendState();
        break;
      }

      case 'selectClass': {
        const player = room.players.get(ws);
        if (!player || room.status !== 'lobby') return;
        const cls = msg.playerClass;
        if (cls && PLAYER_CLASSES[cls]) {
          player.playerClass = cls;
          const classDef = PLAYER_CLASSES[cls];
          broadcast({ type: 'message', text: `${player.name} обрав клас: ${classDef.icon} ${classDef.label}` });
          sendState();
        }
        break;
      }

      case 'start': {
        const player = room.players.get(ws);
        if (!player || !player.isLead || room.status !== 'lobby') return;
        if (room.players.size < 2) {
          return send(ws, { type: 'joinError', reason: 'Потрібно мінімум 2 гравці.' });
        }
        const mode = msg.mode && GAME_MODES[msg.mode] ? msg.mode : 'classic';
        startGame(mode);
        const modeLabel = GAME_MODES[mode].label;
        broadcast({ type: 'message', text: `${player.name} розпочав(ла) гру! Режим: ${modeLabel}` });
        break;
      }

      case 'input': {
        const player = room.players.get(ws);
        if (!player || room.status !== 'playing') return;
        player.input.x = (msg.right ? 1 : 0) - (msg.left ? 1 : 0);
        player.input.y = (msg.down ? 1 : 0) - (msg.up ? 1 : 0);
        break;
      }

      case 'menuAction': {
        const player = room.players.get(ws);
        if (!player) return;
        const action = msg.action;

        if (action === 'pause' && room.status === 'playing') {
          room.status = 'paused';
          broadcast({ type: 'message', text: `${player.name} поставив(ла) гру на паузу.` });
        } else if (action === 'resume' && room.status === 'paused') {
          room.status = 'playing';
          broadcast({ type: 'message', text: `${player.name} відновив(ла) гру.` });
        } else if (action === 'quit') {
          handleQuit(ws);
          return;
        }
        sendState();
        break;
      }

      case 'playAgain': {
        const player = room.players.get(ws);
        if (!player || !player.isLead) return;
        if (room.players.size < 2) {
          room.status = 'lobby';
          sendState();
          return send(ws, { type: 'message', text: 'Потрібно мінімум 2 гравці для нової гри.' });
        }
        startGame();
        broadcast({ type: 'message', text: `${player.name} розпочав(ла) нову гру!` });
        break;
      }
    }
  };
}

module.exports = { createMessageHandler };