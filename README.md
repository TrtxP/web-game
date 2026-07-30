# Arena Collector

A real-time browser-based multiplayer game (2–4 players) implemented **exclusively using DOM elements**
(no canvas). Players move simultaneously around an arena and collect coins;
the player with the highest score when the timer ends wins.

## Project Overview

- **Server**: Node.js + `ws` — authoritative game logic, room (lobby), player movement,
  coin collision detection, score tracking, timer, pause/resume/exit with action attribution.
- **Client**: pure HTML/CSS/JS. Characters and coins are `<div>` elements that move via
  `transform: translate(...)` (without reflow). Render loop uses `requestAnimationFrame`
  with interpolation between server states for smooth 60 FPS regardless of
  server network frequency (30 Hz).
- **Controls**: WASD / arrow keys, key state stored in a map (no glitches with
  long key presses).
- **Sound**: generated via Web Audio API (oscillators) — no external files needed.

## Installation

```bash
npm install
npm start
```

The server will start on `http://localhost:8080`.

## Usage

1. Each player opens the server URL in a browser, enters a unique name, clicks
   "Join" and enters the lobby.
2. The first player to join becomes the **session leader** — only they see the
   "Start Game" button (available with 2+ players).
3. After starting, all players move simultaneously (WASD/arrow keys) and collect coins.
4. The "☰ Menu" button allows pausing, resuming, or leaving the lobby —
   all players see a message showing who performed each action.
5. Timer (90 seconds by default, `ROUND_SECONDS` in `server.js`) counts down;
   score updates in real-time for everyone.
6. After completion, the winner is shown; the leader can click "Play Again".

## Deploying to the Internet (not local network)

For players to access from different locations, you need a public tunnel or hosting, for example:

- **ngrok**: `ngrok http 8080` → provides a public URL that proxies to your local server.
- **Railway / Render / Fly.io**: deploy the repository directly (Node.js buildpack,
  start command `npm start`, port from `process.env.PORT`, already handled in code).

## Requirements Compliance

- 2–4 players, characters are equal (same speed, same starting conditions).
- The game is real-time, not turn-based: movement and coin collection happen simultaneously for all.
- Each player sees positions and scores of all other players constantly.
- Joining via URL + unique name; session leader controls the start.
- DOM rendering, `requestAnimationFrame`, minimal repaints (only `transform`, no
  changes to `top/left` that cause reflow) — for stable 60 FPS.
- Menu: pause / resume / exit with message showing "who did it".
- Score updates in real-time, winner shown at the end.
- Countdown timer.
- Keyboard controls without delays/glitches (key state map + fixed input send interval,
  decoupled from render loop).
- Sound effects: game start, coin collection, game end.

## Bonus Ideas for Future Team Expansion

- Power-ups (speed boost, double points) — add to `server.js` in collision loop.
- Chat — new WS message type `chat`, separate UI block.
- Colorblind mode — alternative color palette `COLORS`, toggle in lobby.

## Known Limitations / What to Test Further

- Real load testing (Chrome Performance tool, FPS, network latency on actual player Wi-Fi)
  should be done by the team — this development environment has no network access, so
  server startup and WebSocket connections are verified only syntactically (`node -c`),
  not live through an actual client.
- It is recommended to test with 2, 3, and 4 simultaneous tabs/devices before submission.
