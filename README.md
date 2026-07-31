# Arena Collector

A real-time browser-based multiplayer game (2–4 players) implemented **exclusively using DOM elements** (no canvas). Players move simultaneously around a dynamic arena, collect coins, steal points from opponents, and avoid shrinking arena borders; the player with the highest score when the timer ends wins.

---

## Project Overview & Features

- **Server**: Node.js + `ws` — authoritative game loop (30 Hz), lobby management, player movement, coin collisions, star coin warning/spawns, dynamic arena shrinking, player-to-player theft with immunity cooldowns, match timer, and pause/resume/quit actions.
- **Client**: Pure HTML/CSS/JS (Vanilla). Player avatars and coins are `<div>` elements animated using `transform: translate(...)` (zero layout reflows). Render loop uses `requestAnimationFrame` with linear state interpolation for smooth 60 FPS rendering.
- **Controls**: WASD / Arrow keys mapped via key state tracking (eliminates long-press input delay).
- **Sound System**: Procedural audio synthesized entirely via the browser's **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`) — zero external `.mp3`/`.wav` dependencies required.
  - **Game Start**: Sawtooth tone sweep.
  - **Coin Collection**: Bright triangle beep.
  - **Star Coin Warning & Spawn**: Pulsating warning tone followed by a 5-note magical ascending chime (`star_spawn`).
  - **Player Collision**: Low-frequency impact thud (`hit`).
  - **Point Theft**: Dual-oscillator pitch glide (`steal`).
  - **Player Disconnect**: Descending loss slide.
  - **Match End**: Low square wave tone.
- **Visual Effects**: Screen shake and red HUD flash when points are stolen from a player (`stolenFrom`).

---

## Installation & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Local Server
```bash
npm start
```
The server will start on `http://localhost:8080`. Players on the local machine can open `http://localhost:8080` in multiple browser tabs or windows to join the lobby.

---

## Running via ngrok Proxy (Internet / Multi-Computer Access)

To allow players from different computers, networks, or locations anywhere in the world to join:

### Step 1: Ensure Local Server is Running
In your first terminal window:
```bash
npm start
```

### Step 2: Launch the ngrok Tunnel
In a **second terminal window**, run:
```bash
npm run tunnel
```
*(Or directly: `ngrok http 8080`)*

### Step 3: Share the Public URL
- `ngrok` will output a public HTTPS URL, for example:
  `https://a1b2-34-56-78-90.ngrok-free.app`
- Share this URL with any player.
- **Note for players**: When opening an `ngrok-free.app` link for the first time in a browser, click the **"Visit Site"** button on the ngrok warning landing page.
- The client automatically detects the `https://` protocol and establishes a secure WebSocket connection (`wss://`).

---

## How to Play

1. **Join Lobby**: Each player enters a unique name and clicks **"Join"**.
2. **Session Leader**: The first player to join becomes the leader and controls the **"Start Game"** button (active when 2+ players are in the lobby).
3. **Gameplay**:
   - Move around using WASD or Arrow keys.
   - Collect **Standard Coins** (+10 points) and **Star Coins** (+50 points).
   - **Steal Mechanics**: Bumping into a player with a higher score steals 30% of their points. Both players gain a temporary 2-second immunity from counter-steals.
   - **Arena Shrinking**: Every 20 seconds, the arena borders contract, pushing coins and players inward.
4. **In-Game Menu**: Click **"☰ Menu"** to pause, resume, or quit. All actions broadcast notifications to all players.
5. **Game Over**: When the 90-second match timer reaches zero, the final score and winner announcement are displayed. The leader can click **"Play Again"** to return to the lobby.

---

## Requirements Compliance Summary

- **2–4 Players**: Equal starting conditions and character capabilities.
- **Real-Time Gameplay**: Simultaneous player movement, coin collection, and collisions over WebSockets.
- **Remote Access Requirements**:
  - Each player can join from their own computer/browser anywhere on the Internet via ngrok URL.
  - No domain or fixed IP needed; works over temporary ngrok URLs on any browser.
- **Performance**: 60 FPS DOM rendering using CSS `transform` without layout reflows.
- **Sound**: Full procedural sound effects for start, collect, hit, steal, star spawn, loss, and match end.

---

## Running Tests

To verify JavaScript syntax across all client and server files:
```bash
npm test
```
