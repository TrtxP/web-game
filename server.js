/** Arena Collector server entry point. */
const http = require('http');
const WebSocket = require('ws');
const { PORT } = require('./server/config');
const { serveStaticFiles } = require('./server/static-server');
const { createGameRoom } = require('./server/game-room');
const { startGameLoop } = require('./server/game-loop');
const { createMessageHandler } = require('./server/message-handler');

const server = http.createServer(serveStaticFiles(__dirname));
const wss = new WebSocket.Server({ server });
const gameRoom = createGameRoom();
const handleMessage = createMessageHandler(gameRoom);

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    handleMessage(ws, message);
  });
  ws.on('close', () => gameRoom.handleQuit(ws));
});

startGameLoop(gameRoom);
server.listen(PORT, () => console.log(`Arena Collector server running on http://localhost:${PORT}`));