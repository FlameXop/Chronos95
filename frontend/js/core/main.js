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

// Tray Elements (Wi-Fi, Volume, Calendar)
const trayWifi = document.getElementById('tray-wifi');
const wifiPopup = document.getElementById('wifi-popup');
const wifiToggleBtn = document.getElementById('wifi-toggle-btn');
const wifiStatusText = document.getElementById('wifi-status-text');

const traySound = document.getElementById('tray-sound');
const volumePopup = document.getElementById('volume-popup');
const volSlider = document.getElementById('vol-slider');
const volLabel = document.getElementById('vol-label');
const volMute = document.getElementById('vol-mute');

const taskbarClock = document.getElementById('taskbar-clock');
const calendarPopup = document.getElementById('calendar-popup');

// Byte Chat Elements
const byteBubble = document.getElementById('byte-bubble');
const byteClose = document.getElementById('byte-close');
const byteToggle = document.getElementById('byte-toggle');
const byteHistory = document.getElementById('byte-history');
const byteInput = document.getElementById('byte-input');
const byteSend = document.getElementById('byte-send');

// Hardware Rig Elements
const retroMouse = document.getElementById('retro-mouse');
const mouseLeft = document.getElementById('mouse-left');
const mouseRight = document.getElementById('mouse-right');
const ledNum = document.getElementById('led-num');
const ledCaps = document.getElementById('led-caps');
const ledScroll = document.getElementById('led-scroll');

windowManager.init();
let bootTimers = [];
let byteAutoHideTimer = null;

function clearBootTimers() {
  bootTimers.forEach((t) => clearTimeout(t));
  bootTimers = [];
}

function hideAllPopups() {
  startMenu.classList.add('hidden');
  wifiPopup.classList.add('hidden');
  volumePopup.classList.add('hidden');
  calendarPopup.classList.add('hidden');
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

function triggerGracefulShutdown() {
  clearBootTimers();
  windowManager.closeAll();
  store.setPowerState(PowerState.SHUTTING_DOWN);

  bootTimers.push(setTimeout(() => {
    store.setPowerState(PowerState.OFF);
  }, 2200));
}

// 2. React to Power State Changes (Does NOT auto-open Browser on boot!)
eventBus.on('POWER_STATE_CHANGED', (newPowerState) => {
  crtScreen.className = 'crt-screen';
  [biosScreen, splashScreen, loginScreen, osDesktop, shutdownScreen].forEach((el) => el.classList.add('hidden'));
  hideAllPopups();

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

    // Show Byte greeting on boot, then auto-hide after 5 seconds!
    showByteBubble(true);
  }
  else if (newPowerState === PowerState.SHUTTING_DOWN) {
    powerLed.className = 'led on';
    shutdownScreen.classList.remove('hidden');
  }
});

// 3. Byte Assistant: 5s Auto-Hide, 'X' Close, Expand on Type/Send, Click Desktop to Close
function showByteBubble(autoHide = false) {
  byteBubble.classList.remove('hidden');
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  if (autoHide) {
    byteAutoHideTimer = setTimeout(() => {
      // Only auto-hide if user isn't actively typing
      if (document.activeElement !== byteInput && !byteBubble.classList.contains('expanded')) {
        byteBubble.classList.add('hidden');
      }
    }, 5000);
  }
}

function closeByteBubble() {
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  byteBubble.classList.add('hidden');
  byteBubble.classList.remove('expanded');
}

byteToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (byteBubble.classList.contains('hidden')) {
    showByteBubble(false);
  } else {
    closeByteBubble();
  }
});

byteClose.addEventListener('click', (e) => {
  e.stopPropagation();
  closeByteBubble();
});

byteBubble.addEventListener('click', (e) => e.stopPropagation());

// Expand dynamically like Android message bubble when typing or sending!
byteInput.addEventListener('focus', () => {
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  byteBubble.classList.add('expanded');
});

async function sendByteMessage() {
  const q = byteInput.value.trim();
  if (!q) return;
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  byteBubble.classList.add('expanded');

  // Append User Message
  byteHistory.innerHTML += `<div class="byte-msg user"><b>You:</b> ${q}</div>`;
  byteInput.value = '';

  // Append temporary generating indicator
  const loadingId = `load-${Date.now()}`;
  byteHistory.innerHTML += `<div id="${loadingId}" class="byte-msg bot"><i>⏳ Byte is generating...</i></div>`;
  byteHistory.scrollTop = byteHistory.scrollHeight;

  const reply = await askNeuralBrain(q, 'assistant');
  const loadEl = document.getElementById(loadingId);
  if (loadEl) loadEl.innerHTML = `<b>Byte:</b> ${reply}`;
  byteHistory.scrollTop = byteHistory.scrollHeight;
}

byteSend.addEventListener('click', sendByteMessage);
byteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendByteMessage();
});

// 4. App Launchers & Start Menu
document.querySelectorAll('[data-open]').forEach((el) => {
  el.addEventListener('click', () => {
    windowManager.openApp(el.dataset.open);
    hideAllPopups();
  });
});

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = startMenu.classList.contains('hidden');
  hideAllPopups();
  if (isHidden) startMenu.classList.remove('hidden');
});

menuSignout.addEventListener('click', () => {
  hideAllPopups();
  windowManager.closeAll();
  osDesktop.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

loginBtn.addEventListener('click', () => {
  soundEngine.playStartupChime();
  loginScreen.classList.add('hidden');
  osDesktop.classList.remove('hidden');
});

menuShutdown.addEventListener('click', () => triggerGracefulShutdown());

// 5. System Tray: Master Volume Control, Wi-Fi & Calendar
traySound.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = volumePopup.classList.contains('hidden');
  hideAllPopups();
  if (isHidden) volumePopup.classList.remove('hidden');
});

volSlider.addEventListener('input', (e) => {
  const val = Number(e.target.value);
  store.setVolume(val / 100, volMute.checked);
  soundEngine.playKeyClick(); // Audible feedback at the new volume!
});

volMute.addEventListener('change', (e) => {
  store.setVolume(Number(volSlider.value) / 100, e.target.checked);
});

eventBus.on('AUDIO_STATE_CHANGED', ({ volume, muted }) => {
  const pct = Math.round(volume * 100);
  volLabel.textContent = muted ? 'MUTED' : `${pct}%`;
  if (muted || pct === 0) traySound.textContent = '🔇';
  else if (pct < 50) traySound.textContent = '🔉';
  else traySound.textContent = '🔊';
});

let wifiConnected = true;
trayWifi.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = wifiPopup.classList.contains('hidden');
  hideAllPopups();
  if (isHidden) wifiPopup.classList.remove('hidden');
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
  const isHidden = calendarPopup.classList.contains('hidden');
  hideAllPopups();
  if (isHidden) {
    renderCalendar();
    calendarPopup.classList.remove('hidden');
  }
});

// Clicking anywhere on Desktop closes Popups AND collapses Byte bubble!
osDesktop.addEventListener('click', (e) => {
  if (e.target === osDesktop || e.target.id === 'window-layer') {
    hideAllPopups();
    closeByteBubble();
  }
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

// 6. Real-Time Desk Mouse + Keyboard Lock LEDs (NumLock, CapsLock, ScrollLock)
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

function syncLockLeds(e) {
  const currentLocks = store.getState().locks;
  // Read real hardware modifier states from the keyboard event
  const num = e.getModifierState ? e.getModifierState('NumLock') : currentLocks.num;
  const caps = e.getModifierState ? e.getModifierState('CapsLock') : currentLocks.caps;
  const scroll = e.getModifierState ? e.getModifierState('ScrollLock') : currentLocks.scroll;
  store.setLocks({ num, caps, scroll });
}

eventBus.on('LOCKS_CHANGED', ({ num, caps, scroll }) => {
  if (ledNum) ledNum.classList.toggle('on', num);
  if (ledCaps) ledCaps.classList.toggle('on', caps);
  if (ledScroll) ledScroll.classList.toggle('on', scroll);
});

window.addEventListener('keydown', (e) => {
  if (!e.repeat) soundEngine.playKeyClick();
  syncLockLeds(e);
  const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
  if (keyEl) keyEl.classList.add('pressed');
});

window.addEventListener('keyup', (e) => {
  syncLockLeds(e);
  const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
  if (keyEl) keyEl.classList.remove('pressed');
});