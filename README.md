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
  - **Power-up Spawn**: Soft ascending shimmer.
  - **Power-up Collect**: Bright 4-note ascending chime.
- **Visual Effects**: Screen shake and red HUD flash when points are stolen from a player (`stolenFrom`). Colored glow auras around players with active power-ups.

---

## Power-ups

Three types of power-up items randomly spawn on the arena during gameplay. When a player walks over a power-up, it activates a temporary effect on that player.

| Power-up | Icon | Effect | Duration |
|---|---|---|---|
| **Speed Boost** | ⚡ | Increases player movement speed by ×1.6 | 5 seconds |
| **Shield** | 🛡️ | Grants full immunity from point theft by other players | 6 seconds |
| **Magnet** | 🧲 | Automatically pulls nearby coins toward the player within an 80px radius | 5 seconds |

- Power-ups spawn at random positions on the arena at regular intervals (every 8–15 seconds in Classic mode; frequency varies by game mode).
- Each power-up appears as a glowing orb with a type-specific color gradient and a pulsing animation.
- When active, the player's avatar displays a colored glow aura matching the power-up type (yellow for Speed, blue for Shield, purple for Magnet).
- The active power-up icon is also shown next to the player's name in the scoreboard.
- Only one power-up can be active on a player at a time; picking up a new one replaces the current effect.

---

## Player Classes (Special Abilities)

Before each match starts, every player can choose one of four character classes in the lobby. Each class provides a unique passive ability that lasts for the entire match. If no class is selected, the player uses the default "No Class" option with no modifiers.

| Class | Icon | Passive Ability |
|---|---|---|
| **Sprinter** | 🏃 | +20% base movement speed |
| **Tank** | 🛡️ | Takes only 15% point loss from theft (instead of the default 30%) |
| **Magnet** | 🧲 | +50% coin collection radius |
| **Thief** | 🗡️ | Steals 45% of opponent's points on collision (instead of the default 30%) |

- Class selection buttons appear in the lobby below the player list.
- The selected class is displayed next to each player's name in the lobby list and in the in-game scoreboard.
- Class passive abilities **stack** with power-up effects. For example, a Sprinter who picks up a Speed Boost power-up moves at 1.2 × 1.6 = 1.92× normal speed.
- Class abilities are purely server-authoritative — no client-side modifiers.

---

## Custom Game Modes

The session leader can select one of three game modes in the lobby before starting a match. The selected mode determines match duration, arena size, coin count, power-up frequency, and theft intensity.

| Mode | Timer | Coins | Arena | Power-up Interval | Theft Rate | Shrink Interval |
|---|---|---|---|---|---|---|
| **Classic** | 90 sec | 12 | Full (900×600) | 8–15 sec | ×1.0 (30%) | 20 sec |
| **Blitz** | 45 sec | 18 | 75% (675×450) | 5–10 sec | ×1.0 (30%) | 12 sec |
| **Chaos** | 120 sec | 12 | Full (900×600) | 4–8 sec | ×2.0 (60%) | 25 sec |

- **Classic**: The standard game experience — balanced pacing and scoring.
- **Blitz**: A fast-paced, compressed match with a smaller arena, more coins, and faster arena shrinking. Ideal for quick rounds.
- **Chaos**: An extended match with double theft damage and power-ups spawning twice as frequently. High-risk, high-reward gameplay.

The mode selector is only visible to the session leader. A mode badge is displayed in the HUD during gameplay (e.g., "⚡ BLITZ" or "🔥 CHAOS").

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
2. **Choose a Class** *(optional)*: Select a character class (Sprinter, Tank, Magnet, or Thief) using the class selector buttons in the lobby.
3. **Session Leader**: The first player to join becomes the leader and controls the **"Start Game"** button (active when 2+ players are in the lobby). The leader can also select a **game mode** (Classic, Blitz, or Chaos).
4. **Gameplay**:
   - Move around using WASD or Arrow keys.
   - Collect **Standard Coins** (+10 points) and **Star Coins** (+50 points).
   - Pick up **Power-ups** (⚡ Speed, 🛡️ Shield, 🧲 Magnet) for temporary combat advantages.
   - **Steal Mechanics**: Bumping into a player with a higher score steals a percentage of their points (30% base, modified by class and game mode). Both players gain a temporary 2-second immunity from counter-steals. The Shield power-up grants full theft immunity while active.
   - **Arena Shrinking**: At regular intervals (mode-dependent), the arena borders contract, pushing coins and players inward.
5. **In-Game Menu**: Click **"☰ Menu"** to pause, resume, toggle colorblind mode, or quit. All actions broadcast notifications to all players.
6. **Game Over**: When the match timer reaches zero, the final score and winner announcement are displayed. The leader can click **"Play Again"** to return to the lobby.

---

## Requirements Compliance Summary

- **2–4 Players**: Equal starting conditions with optional class differentiation.
- **Real-Time Gameplay**: Simultaneous player movement, coin collection, power-up pickups, and collisions over WebSockets.
- **Power-ups**: Three types of temporary enhancements (Speed Boost, Shield, Magnet) that spawn dynamically on the arena.
- **Special Abilities**: Four distinct player classes with unique passive modifiers (Sprinter, Tank, Magnet, Thief).
- **Custom Game Modes**: Three selectable modes (Classic, Blitz, Chaos) with different match parameters.
- **Remote Access Requirements**:
  - Each player can join from their own computer/browser anywhere on the Internet via ngrok URL.
  - No domain or fixed IP needed; works over temporary ngrok URLs on any browser.
- **Performance**: 60 FPS DOM rendering using CSS `transform` without layout reflows.
- **Sound**: Full procedural sound effects for start, collect, hit, steal, star spawn, power-up spawn, power-up collect, loss, and match end.

---

## Running Tests

To verify JavaScript syntax across all client and server files:
```bash
npm test
```
