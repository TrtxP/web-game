/**
 * Power-up system for Arena Collector.
 * Handles spawning, collection, and per-tick effect processing.
 */

const POWERUP_KINDS = ['speed', 'shield', 'magnet'];

const POWERUP_DEFS = {
  speed:  { icon: '⚡', label: 'Speed Boost', duration: 5000, color: '#facc15' },
  shield: { icon: '🛡️', label: 'Shield',      duration: 6000, color: '#4fc3f7' },
  magnet: { icon: '🧲', label: 'Magnet',      duration: 5000, color: '#e879f9' },
};

const POWERUP_SIZE = 22;
const MAGNET_PULL_RADIUS = 80;
const MAGNET_PULL_SPEED = 180;

let powerupIdCounter = 0;

function spawnPowerup(room) {
  const margin = 40;
  const kind = POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];
  const def = POWERUP_DEFS[kind];
  const powerup = {
    id: `pu_${++powerupIdCounter}`,
    kind,
    icon: def.icon,
    color: def.color,
    x: margin + Math.random() * (room.arenaW - margin * 2),
    y: margin + Math.random() * (room.arenaH - margin * 2),
  };
  room.powerups.push(powerup);
  return powerup;
}

function collectPowerup(player, powerup) {
  const def = POWERUP_DEFS[powerup.kind];
  player.activePowerup = {
    kind: powerup.kind,
    expiresAt: Date.now() + def.duration,
  };
}

/**
 * Per-tick processing of active powerup effects.
 * - Expires finished powerups.
 * - Magnet: pulls nearby coins toward the player.
 */
function tickPowerups(room, dt, playerSize, coinSize) {
  const now = Date.now();

  for (const player of room.players.values()) {
    if (!player.activePowerup) continue;

    if (now >= player.activePowerup.expiresAt) {
      player.activePowerup = null;
      continue;
    }

    // Magnet effect: pull coins toward player
    if (player.activePowerup.kind === 'magnet') {
      const px = player.x + playerSize / 2;
      const py = player.y + playerSize / 2;

      for (const coin of room.coins) {
        const dx = px - coin.x;
        const dy = py - coin.y;
        const dist = Math.hypot(dx, dy);

        if (dist < MAGNET_PULL_RADIUS && dist > 1) {
          const pullStrength = MAGNET_PULL_SPEED * dt;
          coin.x += (dx / dist) * Math.min(pullStrength, dist);
          coin.y += (dy / dist) * Math.min(pullStrength, dist);
        }
      }
    }
  }
}

/**
 * Schedule recurring powerup spawns using the mode's interval range.
 */
function startPowerupTimer(room, broadcast, modeConfig) {
  stopPowerupTimer(room);

  const minMs = modeConfig.powerupIntervalMin || 8000;
  const maxMs = modeConfig.powerupIntervalMax || 15000;

  function schedule() {
    if (room.status !== 'playing') return;
    const delay = minMs + Math.random() * (maxMs - minMs);

    room.powerupTimer = setTimeout(() => {
      if (room.status !== 'playing') return;

      const pu = spawnPowerup(room);
      room.pendingSfx.push('powerup_spawn');
      broadcast({ type: 'powerupSpawned', powerup: pu });
      schedule();
    }, delay);
  }

  schedule();
}

function stopPowerupTimer(room) {
  clearTimeout(room.powerupTimer);
  room.powerupTimer = null;
}

module.exports = {
  POWERUP_DEFS,
  POWERUP_SIZE,
  MAGNET_PULL_RADIUS,
  spawnPowerup,
  collectPowerup,
  tickPowerups,
  startPowerupTimer,
  stopPowerupTimer,
};
