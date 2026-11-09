
class EventBus {
  constructor() {
    this.listeners = {}; // Stores arrays of functions for each event name
  }

  // Subscribe to an event (e.g., eventBus.on('POWER_TOGGLE', callback))
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  // Broadcast an event to everyone listening (e.g., eventBus.emit('POWER_TOGGLE', data))
  emit(eventName, data) {
    if (!this.listeners[eventName]) return;
    for (const callback of this.listeners[eventName]) {
      callback(data);
    }
  }
}

// Export a single shared instance for the whole app
export const eventBus = new EventBus();