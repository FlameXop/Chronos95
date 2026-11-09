import { eventBus } from './eventBus.js';
import { store, PowerState } from './store.js';
import { soundEngine } from './hardware/soundEngine.js';

// Grab DOM Elements
const powerBtn = document.getElementById('power-btn');
const powerLed = document.getElementById('power-led');
const crtScreen = document.getElementById('crt-screen');
const biosScreen = document.getElementById('bios-screen');
const splashScreen = document.getElementById('splash-screen');
const osDesktop = document.getElementById('os-desktop');

const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const menuShutdown = document.getElementById('menu-shutdown');

const retroMouse = document.getElementById('retro-mouse');
const mouseLeft = document.getElementById('mouse-left');
const mouseRight = document.getElementById('mouse-right');

let bootTimers = [];

function clearBootTimers() {
  bootTimers.forEach((t) => clearTimeout(t));
  bootTimers = [];
}

// 1. Physical Power Button Handler
powerBtn.addEventListener('click', () => {
  const currentPower = store.getState().power;
  clearBootTimers();

  if (currentPower === PowerState.OFF) {
    // Stage 1: BIOS POST + Motherboard Beep
    soundEngine.playBiosBeep();
    store.setPowerState(PowerState.BOOTING);

    // Stage 2: After 1.6s, switch from BIOS to Chronos 95 Cloud Splash
    bootTimers.push(setTimeout(() => {
      biosScreen.classList.add('hidden');
      splashScreen.classList.remove('hidden');
    }, 1600));

    // Stage 3: After 3.6s total, play Startup Chime & enter Desktop!
    bootTimers.push(setTimeout(() => {
      soundEngine.playStartupChime();
      store.setPowerState(PowerState.RUNNING);
    }, 3600));
  } else {
    store.setPowerState(PowerState.OFF);
  }
});

// 2. React to Power State Changes
eventBus.on('POWER_STATE_CHANGED', (newPowerState) => {
  crtScreen.className = 'crt-screen';
  biosScreen.classList.add('hidden');
  splashScreen.classList.add('hidden');
  osDesktop.classList.add('hidden');
  startMenu.classList.add('hidden');

  if (newPowerState === PowerState.OFF) {
    powerLed.className = 'led off';
    crtScreen.classList.add('state-off');
  } 
  else if (newPowerState === PowerState.BOOTING) {
    powerLed.className = 'led on';
    crtScreen.classList.add('state-booting', 'crt-boot-flash');
    biosScreen.classList.remove('hidden');
  } 
  else if (newPowerState === PowerState.RUNNING) {
    powerLed.className = 'led on';
    crtScreen.classList.add('state-running');
    osDesktop.classList.remove('hidden');
  }
});

// 3. Start Button & Shut Down Menu
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startMenu.classList.toggle('hidden');
});

menuShutdown.addEventListener('click', () => {
  clearBootTimers();
  store.setPowerState(PowerState.OFF);
});

// Close Start Menu when clicking elsewhere on the desktop
osDesktop.addEventListener('click', () => {
  startMenu.classList.add('hidden');
});

// 4. Real-Time Desk Mouse Movement & Button Clicks
window.addEventListener('mousemove', (e) => {
  const moveX = ((e.clientX / window.innerWidth) - 0.5) * 85;
  const moveY = ((e.clientY / window.innerHeight) - 0.5) * 45;
  retroMouse.style.transform = `translate(${moveX}px, ${moveY}px)`;
});

window.addEventListener('mousedown', (e) => {
  if (e.button === 2) mouseRight.classList.add('clicked');
  else mouseLeft.classList.add('clicked');
});

window.addEventListener('mouseup', () => {
  mouseLeft.classList.remove('clicked');
  mouseRight.classList.remove('clicked');
});

// 5. Full 104-Key Keyboard Highlight + Mechanical Click Sound
window.addEventListener('keydown', (e) => {
  if (!e.repeat) soundEngine.playKeyClick();
  const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
  if (keyEl) keyEl.classList.add('pressed');
});

window.addEventListener('keyup', (e) => {
  const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
  if (keyEl) keyEl.classList.remove('pressed');
});