import { eventBus } from './eventBus.js';

export const PowerState = {
  OFF: 'OFF',
  BOOTING: 'BOOTING',
  RUNNING: 'RUNNING',
  SHUTTING_DOWN: 'SHUTTING_DOWN'
};

class Store {
  constructor() {
    this.state = {
      power: PowerState.OFF,
      volume: 0.8,       // 0.0 to 1.0 (80% default)
      muted: false,
      locks: {
        num: true,
        caps: false,
        scroll: false
      }
    };
  }

  getState() {
    return this.state;
  }

  setPowerState(newPowerState) {
    this.state.power = newPowerState;
    eventBus.emit('POWER_STATE_CHANGED', this.state.power);
  }

  setVolume(vol, muted = this.state.muted) {
    this.state.volume = Math.max(0, Math.min(1, vol));
    this.state.muted = muted;
    eventBus.emit('AUDIO_STATE_CHANGED', {
      volume: this.state.volume,
      muted: this.state.muted,
      effectiveVolume: this.state.muted ? 0 : this.state.volume
    });
  }

  setLocks(locksObj) {
    this.state.locks = { ...this.state.locks, ...locksObj };
    eventBus.emit('LOCKS_CHANGED', this.state.locks);
  }
}

export const store = new Store();