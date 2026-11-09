// Pure Web Audio API Synthesizer (Zero copyrighted audio files!)
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. Classic 1995 MotherBoard POST single beep
  playBiosBeep() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  // 2. Warm 90s Ambient OS Startup Chord (Plays when Desktop appears)
  playStartupChime() {
    this.init();
    const notes = [261.63, 329.63, 392.00, 493.88, 587.33]; // Cmaj9 dreamy chord
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + index * 0.08 + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 2.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + index * 0.08);
      osc.stop(this.ctx.currentTime + 2.9);
    });
  }

  // 3. Subtle Mechanical Keyboard Clack
  playKeyClick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.025);
  }
}

export const soundEngine = new SoundEngine();