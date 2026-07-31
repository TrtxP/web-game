(function (namespace) {
  namespace.createAudioPlayer = function createAudioPlayer() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    function beep(frequency, duration, type = 'sine', volume = 0.15) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.stop(audioContext.currentTime + duration);
    }

    return function playSfx(name) {
      if (audioContext.state === 'suspended') audioContext.resume();
      if (name === 'collect') beep(880, 0.12, 'triangle', 0.12);
      else if (name === 'start') beep(440, 0.25, 'sawtooth', 0.15);
      else if (name === 'end') beep(220, 0.4, 'square', 0.15);
      else if (name === 'loss') {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(160, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.35);
      } else if (name === 'steal') {
        const now = audioContext.currentTime;
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(650, now);
        osc1.frequency.exponentialRampToValueAtTime(150, now + 0.25);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(900, now + 0.25);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioContext.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } else if (name === 'hit' || name === 'player_hit') {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (name === 'star_spawn' || name === 'star_coin' || name === 'star_warning') {
        const now = audioContext.currentTime;
        const freqs = name === 'star_warning' ? [523.25, 659.25] : [523.25, 659.25, 783.99, 1046.50, 1318.51];
        const noteDuration = name === 'star_warning' ? 0.1 : 0.07;

        freqs.forEach((freq, idx) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const startTime = now + idx * noteDuration;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

          osc.connect(gain).connect(audioContext.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.2);
        });
      }
    };
  };
})(window.ArenaClient = window.ArenaClient || {});
