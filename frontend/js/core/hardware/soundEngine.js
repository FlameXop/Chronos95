import { store } from '../store.js';

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

  getEffectiveGain(baseGain) {
    const { volume, muted } = store.getState();
    if (muted || volume <= 0) return 0;
    return baseGain * volume;
  }

  playBiosBeep() {
    const level = this.getEffectiveGain(0.1);
    if (level <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);

    gain.gain.setValueAtTime(level, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playStartupChime() {
    const level = this.getEffectiveGain(0.07);
    if (level <= 0) return;
    this.init();

    const notes = [261.63, 329.63, 392.00, 493.88, 587.33];
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(level, this.ctx.currentTime + index * 0.08 + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 2.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + index * 0.08);
      osc.stop(this.ctx.currentTime + 2.9);
    });
  }

  playKeyClick() {
    const level = this.getEffectiveGain(0.045);
    if (!this.ctx || level <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(level, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.025);
  }
}

export const soundEngine = new SoundEngine();