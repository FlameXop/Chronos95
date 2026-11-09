import { eventBus } from './eventBus.js';

// Enum-style constants (just like C++ enum) so we never make typos
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
      startMenuOpen: false,
      activeWindow: null, // 'notepad' | 'paint' | null
      windows: {
        notepad: { isOpen: false },
        paint: { isOpen: false }
      }
    };
  }

  getState() {
    return this.state;
  }

  // Transition the computer's power state safely
  setPowerState(newPowerState) {
    this.state.power = newPowerState;
    // Tell the whole app that the power state changed!
    eventBus.emit('POWER_STATE_CHANGED', this.state.power);
  }
}

export const store = new Store();