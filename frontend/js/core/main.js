import { eventBus } from './core/eventBus.js';
import { store, PowerState } from './core/store.js';

// 1. Grab Hardware DOM Elements
const powerBtn = document.getElementById('power-btn');
const powerLed = document.getElementById('power-led');
const crtScreen = document.getElementById('crt-screen');
const bootScreen = document.getElementById('boot-screen');
const osDesktop = document.getElementById('os-desktop');
const retroMouse = document.getElementById('retro-mouse');
const mouseLeft = document.getElementById('mouse-left');

// 2. When User Clicks the Physical Power Button on the Tower
powerBtn.addEventListener('click', () => {
  const currentPower = store.getState().power;

  if (currentPower === PowerState.OFF) {
    // Transition State: OFF -> BOOTING
    store.setPowerState(PowerState.BOOTING);

    // After 2.2 seconds of BIOS boot text, transition to RUNNING!
    setTimeout(() => {
      store.setPowerState(PowerState.RUNNING);
    }, 2200);
  } else {
    // Turn PC Off
    store.setPowerState(PowerState.OFF);
  }
});

// 3. Listen to State Machine Changes (Decoupled!)
eventBus.on('POWER_STATE_CHANGED', (newPowerState) => {
  // Reset screen classes
  crtScreen.className = 'crt-screen';
  bootScreen.classList.add('hidden');
  osDesktop.classList.add('hidden');

  if (newPowerState === PowerState.OFF) {
    powerLed.className = 'led off';
    crtScreen.classList.add('state-off');
  } 
  else if (newPowerState === PowerState.BOOTING) {
    powerLed.className = 'led on';
    crtScreen.classList.add('state-booting');
    bootScreen.classList.remove('hidden');
  } 
  else if (newPowerState === PowerState.RUNNING) {
    powerLed.className = 'led on';
    crtScreen.classList.add('state-running');
    osDesktop.classList.remove('hidden');
  }
});

// 4. Real-Time Desk Mouse Movement (Tracks your real cursor!)
window.addEventListener('mousemove', (e) => {
  // Calculate offset from center of screen, scaled down so mouse stays on pad
  const moveX = ((e.clientX / window.innerWidth) - 0.5) * 80;
  const moveY = ((e.clientY / window.innerHeight) - 0.5) * 45;
  retroMouse.style.transform = `translate(${moveX}px, ${moveY}px)`;
});

// Flash left mouse button on the desk when user clicks!
window.addEventListener('mousedown', () => mouseLeft.classList.add('clicked'));
window.addEventListener('mouseup', () => mouseLeft.classList.remove('clicked'));

// 5. Real-Time Keyboard Key Press Lighting!
window.addEventListener('keydown', (e) => {
  const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
  if (keyEl) keyEl.classList.add('pressed');
});

window.addEventListener('keyup', (e) => {
  const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
  if (keyEl) keyEl.classList.remove('pressed');
});