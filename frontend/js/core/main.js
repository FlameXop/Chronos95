import { eventBus } from './eventBus.js';
import { store, PowerState } from './store.js';
import { soundEngine } from './hardware/soundEngine.js';
import { windowManager, askNeuralBrain } from './osApps.js';

// Grab DOM Elements
const powerBtn = document.getElementById('power-btn');
const powerLed = document.getElementById('power-led');
const crtScreen = document.getElementById('crt-screen');
const biosScreen = document.getElementById('bios-screen');
const splashScreen = document.getElementById('splash-screen');
const loginScreen = document.getElementById('login-screen');
const osDesktop = document.getElementById('os-desktop');
const shutdownScreen = document.getElementById('shutdown-screen');

const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const menuSignout = document.getElementById('menu-signout');
const menuShutdown = document.getElementById('menu-shutdown');
const loginBtn = document.getElementById('login-btn');

const trayWifi = document.getElementById('tray-wifi');
const wifiPopup = document.getElementById('wifi-popup');
const wifiToggleBtn = document.getElementById('wifi-toggle-btn');
const wifiStatusText = document.getElementById('wifi-status-text');

const taskbarClock = document.getElementById('taskbar-clock');
const calendarPopup = document.getElementById('calendar-popup');

const retroMouse = document.getElementById('retro-mouse');
const mouseLeft = document.getElementById('mouse-left');
const mouseRight = document.getElementById('mouse-right');

windowManager.init();
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
    soundEngine.playBiosBeep();
    store.setPowerState(PowerState.BOOTING);

    bootTimers.push(setTimeout(() => {
      biosScreen.classList.add('hidden');
      splashScreen.classList.remove('hidden');
    }, 1500));

    bootTimers.push(setTimeout(() => {
      soundEngine.playStartupChime();
      store.setPowerState(PowerState.RUNNING);
    }, 3400));
  } else {
    triggerGracefulShutdown();
  }
});

// True Shut Down Sequence (Shows "Safe to turn off" before powering down)
function triggerGracefulShutdown() {
  clearBootTimers();
  windowManager.closeAll();
  store.setPowerState(PowerState.SHUTTING_DOWN);

  bootTimers.push(setTimeout(() => {
    store.setPowerState(PowerState.OFF);
  }, 2200));
}

// 2. React to Power State Changes
eventBus.on('POWER_STATE_CHANGED', (newPowerState) => {
  crtScreen.className = 'crt-screen';
  [biosScreen, splashScreen, loginScreen, osDesktop, shutdownScreen, startMenu, wifiPopup, calendarPopup]
    .forEach((el) => el.classList.add('hidden'));

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
    windowManager.openApp('explorer'); // Auto-launch Explorer on boot!
  }
  else if (newPowerState === PowerState.SHUTTING_DOWN) {
    powerLed.className = 'led on';
    shutdownScreen.classList.remove('hidden');
  }
});

// 3. App Launchers (Desktop Icons & Start Menu Items)
document.querySelectorAll('[data-open]').forEach((el) => {
  el.addEventListener('click', () => {
    windowManager.openApp(el.dataset.open);
    startMenu.classList.add('hidden');
  });
});

// 4. Start Button, Sign Out & Shut Down
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startMenu.classList.toggle('hidden');
  wifiPopup.classList.add('hidden');
  calendarPopup.classList.add('hidden');
});

menuSignout.addEventListener('click', () => {
  startMenu.classList.add('hidden');
  windowManager.closeAll();
  osDesktop.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

loginBtn.addEventListener('click', () => {
  soundEngine.playStartupChime();
  loginScreen.classList.add('hidden');
  osDesktop.classList.remove('hidden');
});

menuShutdown.addEventListener('click', () => {
  triggerGracefulShutdown();
});

// 5. System Tray: Wi-Fi & Live Calendar Popups
let wifiConnected = true;
trayWifi.addEventListener('click', (e) => {
  e.stopPropagation();
  wifiPopup.classList.toggle('hidden');
  calendarPopup.classList.add('hidden');
  startMenu.classList.add('hidden');
});

wifiToggleBtn.addEventListener('click', () => {
  wifiConnected = !wifiConnected;
  wifiStatusText.textContent = wifiConnected ? 'Connected (56k Neural Link)' : 'Disconnected';
  wifiStatusText.style.color = wifiConnected ? 'green' : 'red';
  wifiToggleBtn.textContent = wifiConnected ? 'Disconnect' : 'Connect';
  trayWifi.textContent = wifiConnected ? '📶' : '❌';
});

taskbarClock.addEventListener('click', (e) => {
  e.stopPropagation();
  renderCalendar();
  calendarPopup.classList.toggle('hidden');
  wifiPopup.classList.add('hidden');
  startMenu.classList.add('hidden');
});

function updateLiveClock() {
  const now = new Date();
  taskbarClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-title').textContent = `${monthNames[month]} ${year}`;
  document.getElementById('cal-full-date').textContent = now.toDateString();

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach((d) => {
    grid.innerHTML += `<div class="cal-day-head">${d}</div>`;
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const cls = d === today ? 'cal-day today' : 'cal-day';
    grid.innerHTML += `<div class="${cls}">${d}</div>`;
  }
}

// 6. Byte Cyber-Assistant Widget
const byteInput = document.getElementById('byte-input');
const byteSend = document.getElementById('byte-send');
const byteText = document.getElementById('byte-text');
const byteBubble = document.getElementById('byte-bubble');

document.getElementById('byte-toggle').addEventListener('click', () => {
  byteBubble.classList.toggle('hidden');
});

byteSend.addEventListener('click', async () => {
  const q = byteInput.value.trim();
  if (!q) return;
  byteText.innerHTML = `<i>🤖 Byte is computing...</i>`;
  byteInput.value = '';
  const reply = await askNeuralBrain(q, 'assistant');
  byteText.innerHTML = `<b>Byte:</b> ${reply}`;
});

// Close popups when clicking desktop background
osDesktop.addEventListener('click', (e) => {
  if (e.target === osDesktop) {
    startMenu.classList.add('hidden');
    wifiPopup.classList.add('hidden');
    calendarPopup.classList.add('hidden');
  }
});

// 7. Real-Time Desk Mouse & 104-Key Keyboard Tracking
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

window.addEventListener('keydown', (e) => {
  if (!e.repeat) soundEngine.playKeyClick();
  const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
  if (keyEl) keyEl.classList.add('pressed');
});
window.addEventListener('keyup', (e) => {
  const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
  if (keyEl) keyEl.classList.remove('pressed');
});