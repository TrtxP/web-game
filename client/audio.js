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
      }
    };
  };
})(window.ArenaClient = window.ArenaClient || {});
