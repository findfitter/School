// Мягкие звуки, синтезируемые на лету (WebAudio). Грустных и резких звуков нет.

// [частота Гц, начало с, длительность с]
const PATTERNS = {
  tap: [[660, 0, 0.07]],
  correct: [[523, 0, 0.14], [659, 0.1, 0.14], [784, 0.2, 0.3]],
  hint: [[392, 0, 0.18], [494, 0.16, 0.3]],
  star: [[880, 0, 0.15], [1175, 0.12, 0.15], [1568, 0.24, 0.35]],
  done: [[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.5]],
};

export function createSounds(getSettings) {
  let ac = null;

  function context() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  return function sound(name) {
    const pattern = PATTERNS[name];
    const audioCtx = context();
    if (!pattern || !audioCtx) return;
    const peak = 0.3 * getSettings().volume;
    if (peak <= 0) return;
    const now = audioCtx.currentTime;
    for (const [freq, at, dur] of pattern) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(peak, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.05);
    }
  };
}
