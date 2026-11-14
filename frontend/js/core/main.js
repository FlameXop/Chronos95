import { eventBus } from './eventBus.js';
import { store, PowerState } from './store.js';
import { soundEngine } from './hardware/soundEngine.js';
import { windowManager, askNeuralBrain, askPaintVision, formatByteMarkdown } from './osApps.js';

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

const traySound = document.getElementById('tray-sound');
const volumePopup = document.getElementById('volume-popup');
const volSlider = document.getElementById('vol-slider');
const volLabel = document.getElementById('vol-label');
const volMute = document.getElementById('vol-mute');

const taskbarClock = document.getElementById('taskbar-clock');
const calendarPopup = document.getElementById('calendar-popup');

const byteBubble = document.getElementById('byte-bubble');
const byteClose = document.getElementById('byte-close');
const byteToggle = document.getElementById('byte-toggle');
const byteInput = document.getElementById('byte-input');
const byteSend = document.getElementById('byte-send');

const retroMouse = document.getElementById('retro-mouse');
const mouseLeft = document.getElementById('mouse-left');
const mouseRight = document.getElementById('mouse-right');
const ledNum = document.getElementById('led-num');
const ledCaps = document.getElementById('led-caps');
const ledScroll = document.getElementById('led-scroll');

windowManager.init();
let bootTimers = [];
let byteAutoHideTimer = null;

// Load permanent AI conversation memory from localStorage!
let byteChatContext = JSON.parse(localStorage.getItem('chronos_byte_context') || '[]');

function saveByteMemory(container) {
  if (container) {
    localStorage.setItem('chronos_byte_html', container.innerHTML);
  }
  localStorage.setItem('chronos_byte_context', JSON.stringify(byteChatContext.slice(-20)));
}

function getTimeGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return '☀️ Good morning!';
  if (hr < 18) return '👋 Good afternoon!';
  return '🌙 Good evening!';
}

function clearBootTimers() {
  bootTimers.forEach((t) => clearTimeout(t));
  bootTimers = [];
}

function hideAllPopups() {
  [startMenu, wifiPopup, volumePopup, calendarPopup].forEach((el) => {
    if (el) el.classList.add('hidden');
  });
}

// 1. Physical Power Button
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

// 2. Power State Transitions
eventBus.on('POWER_STATE_CHANGED', (newPowerState) => {
  crtScreen.className = 'crt-screen';
  [biosScreen, splashScreen, loginScreen, osDesktop, shutdownScreen].forEach((el) => {
    if (el) el.classList.add('hidden');
  });
  hideAllPopups();

  if (newPowerState === PowerState.OFF) {
    powerLed.className = 'led off';
    crtScreen.classList.add('state-off');
  } else if (newPowerState === PowerState.BOOTING) {
    powerLed.className = 'led on';
    crtScreen.classList.add('state-booting', 'crt-boot-flash');
    biosScreen.classList.remove('hidden');
  } else if (newPowerState === PowerState.RUNNING) {
    powerLed.className = 'led on';
    crtScreen.classList.add('state-running');
    osDesktop.classList.remove('hidden');
    // On boot: show ONLY the compact greeting (not the huge chat log!) and auto-hide after 5s
    showBootGreeting();
  } else if (newPowerState === PowerState.SHUTTING_DOWN) {
    powerLed.className = 'led on';
    shutdownScreen.classList.remove('hidden');
  }
});

// 3. Permanent Chat Container + Compact Boot Greeting
function getByteChatContainer() {
  let hist = document.getElementById('byte-history');
  if (!hist) {
    const oldText = document.getElementById('byte-text');
    if (oldText) {
      oldText.id = 'byte-history';
      oldText.className = 'byte-history';
      hist = oldText;
    }
  }
  if (hist && !hist.dataset.loaded) {
    const savedHTML = localStorage.getItem('chronos_byte_html');
    hist.innerHTML = savedHTML || `<div class="byte-msg bot">Hey! I'm <b>Byte</b>. I remember our chats across reboots! Ask me to open/close apps, save browser pages to NotePad, or inspect your drawings.</div>`;
    hist.dataset.loaded = 'true';
  }
  return hist;
}

function ensureGreetingBanner() {
  let banner = document.getElementById('byte-boot-greeting');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'byte-boot-greeting';
    banner.className = 'byte-greeting-only';
    const hist = getByteChatContainer();
    if (hist && hist.parentNode) {
      hist.parentNode.insertBefore(banner, hist);
    }
  }
  banner.innerHTML = `<b>${getTimeGreeting()}</b> I'm <b>Byte</b>. Click me or type below to view our saved chat history!`;
}

function showBootGreeting() {
  ensureGreetingBanner();
  byteBubble.classList.remove('hidden', 'expanded');
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  byteAutoHideTimer = setTimeout(() => {
    if (document.activeElement !== byteInput && !byteBubble.classList.contains('expanded')) {
      byteBubble.classList.add('hidden');
    }
  }, 5000);
}

function openFullChatLog() {
  ensureGreetingBanner();
  const container = getByteChatContainer();
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  byteBubble.classList.remove('hidden');
  byteBubble.classList.add('expanded');
  if (container) container.scrollTop = container.scrollHeight;
}

function closeByteBubble() {
  if (byteAutoHideTimer) clearTimeout(byteAutoHideTimer);
  byteBubble.classList.add('hidden');
  byteBubble.classList.remove('expanded');
}

if (byteToggle) {
  byteToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (byteBubble.classList.contains('hidden') || !byteBubble.classList.contains('expanded')) {
      openFullChatLog();
    } else {
      closeByteBubble();
    }
  });
}

if (byteClose) {
  byteClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeByteBubble();
  });
}

byteBubble.addEventListener('click', (e) => e.stopPropagation());
byteInput.addEventListener('focus', () => openFullChatLog());

// 4. Smart OS Workflow & Cross-App Manager (Appends to NotePad & Closes Windows!)
async function executeSmartOSWorkflow(rawText) {
  const cmd = rawText.toLowerCase().trim();

  // 1. Clear chat memory if requested
  if (cmd === 'clear chat' || cmd === 'clear history') {
    byteChatContext = [];
    localStorage.removeItem('chronos_byte_html');
    localStorage.removeItem('chronos_byte_context');
    const c = getByteChatContainer();
    if (c) c.innerHTML = `<div class="byte-msg bot">🧹 Cleared our chat history!</div>`;
    return '🧹 Chat history cleared!';
  }

  // 2. Check if user is asking to WRITE / ADD / SAVE / APPEND to NotePad
  const notepadIsOpen = Boolean(windowManager.openWindows['notepad']);
  const mentionsNotepad = /\b(notepad|note pad|notes|editor)\b/.test(cmd);
  const hasWriteAction = /\b(add|append|save|store|write|put|copy|insert|summarize|summarise|give me|make a|list)\b/.test(cmd);
  const asksForFormat = /\b(pointer|pointers|bullet|bullets|essay|paragraph|recipe|recipie|summary|steps|code)\b/.test(cmd);

  // Triggers if they mention notepad OR if NotePad is already open and they give a write/add command!
  const isNotepadTask =
    (mentionsNotepad && (hasWriteAction || asksForFormat)) ||
    (notepadIsOpen && hasWriteAction && asksForFormat) ||
    cmd.startsWith('append ') ||
    cmd.startsWith('add to note') ||
    cmd.startsWith('save to note');

  // 3. Window Open / Close / Minimize / Maximize (Only when NOT writing to NotePad!)
  if (!isNotepadTask) {
    if (cmd.includes('close all') || cmd === 'reset desktop') {
      windowManager.closeAll();
      return '🧹 Closed all open windows!';
    }

    const mentionsClose = /\b(close|exit|quit|kill)\b/.test(cmd);
    const mentionsMin = /\b(minimize|minimise|hide)\b/.test(cmd);
    const mentionsMax = /\b(maximize|maximise|fullscreen|full screen)\b/.test(cmd);
    const mentionsOpen = /\b(open|launch|start|run|show)\b/.test(cmd);

    const appMatchers = [
      { id: 'paint', name: 'PixelPaint.exe', words: ['paint', 'pixelpaint', 'drawing app'] },
      { id: 'explorer', name: 'Chronos Explorer', words: ['explorer', 'browser', 'chronos', 'web'] },
      { id: 'notepad', name: 'NotePad.exe', words: ['notepad', 'note pad', 'notes', 'editor'] },
      { id: 'settings', name: 'Personalization Settings', words: ['settings', 'setting', 'personalize', 'theme'] }
    ];

    for (const app of appMatchers) {
      if (app.words.some((w) => cmd.includes(w))) {
        if (mentionsClose) {
          const closed = windowManager.closeApp(app.id);
          return closed ? `✅ Closed <b>${app.name}</b>.` : `<b>${app.name}</b> is already closed!`;
        }
        if (mentionsMin) {
          windowManager.minimizeApp(app.id);
          return `🗕 Minimized <b>${app.name}</b> to the taskbar.`;
        }
        if (mentionsMax) {
          windowManager.openApp(app.id);
          windowManager.toggleMaximize(app.id);
          return `🔲 Toggled full-screen maximize on <b>${app.name}</b>!`;
        }
        if (mentionsOpen) {
          windowManager.openApp(app.id);
          return `🚀 Opened <b>${app.name}</b>!`;
        }
      }
    }
  }

  // 4. EXECUTE NOTEPAD APPEND (Identical clean pipeline for 1st, 2nd, 3rd, Nth query!)
  if (isNotepadTask) {
    // Strip meta-words ("to notepad", "in notepad", "and save") so the LLM only sees the pure writing task!
    const cleanTask = rawText
      .replace(/\b(in|to|into|inside)\s+(the\s+)?(notepad|note pad|notes|editor)\b/gi, '')
      .replace(/\b(and\s+)?(save|store|append)\s+(it|this)?\b/gi, '')
      .trim();

    // ONLY include browser text if the user explicitly references the browser/page/this!
    const explicitlyWantsBrowser = /\b(browser|borsser|explorer|page|website|this)\b/.test(cmd);
    const browserContent = explicitlyWantsBrowser ? windowManager.getBrowserText() : '';

    const promptForBrain = browserContent
      ? `Task: ${cleanTask || rawText}\n\nUse this reference text to fulfill the task:\n${browserContent.slice(0, 2500)}`
      : (cleanTask || rawText);

    const generatedText = await askNeuralBrain(promptForBrain, 'notepad');

    // Type it right below whatever is already written in NotePad!
    windowManager.writeToNotepad(generatedText, true);
    return `📝 Appended right below your existing text in <b>NotePad.exe</b>!`;
  }

  // 5. PixelPaint Vision Questions
  if (cmd.includes('draw') || cmd.includes('canvas') || cmd.includes('colour') || cmd.includes('color') || cmd.includes('sketch')) {
    const canvasData = windowManager.getCanvasDataUrl();
    if (canvasData) {
      return await askPaintVision(canvasData, rawText);
    }
  }

  // 6. Web Search via Byte ("search <query>")
  if (cmd.startsWith('search ') || cmd.startsWith('browse ')) {
    const query = rawText.replace(/^(search|browse)\s+(for\s+)?/i, '').trim();
    const win = windowManager.openApp('explorer');
    if (win && win.runExplorerSearch) win.runExplorerSearch(query);
    return `🌍 Opened <b>Chronos Explorer</b> and searched for <b>"${query}"</b>!`;
  }

  // 7. Theme / Volume / Power Controls
  if (cmd.includes('matrix')) { windowManager.applyTheme('theme-matrix'); return '📟 Switched to <b>Cyber Matrix</b> theme!'; }
  if (cmd.includes('sunset')) { windowManager.applyTheme('theme-sunset'); return '🌆 Switched to <b>Synthwave Sunset</b> theme!'; }
  if (cmd.includes('space')) { windowManager.applyTheme('theme-space'); return '🌌 Switched to <b>Deep Space</b> theme!'; }
  if (cmd.includes('teal')) { windowManager.applyTheme('theme-teal'); return '🟩 Switched to <b>Classic Teal</b> theme!'; }

  if (cmd === 'mute' || cmd === 'mute sound') {
    volMute.checked = true;
    store.setVolume(Number(volSlider.value) / 100, true);
    return '🔇 Muted system audio.';
  }
  if (cmd === 'unmute') {
    volMute.checked = false;
    store.setVolume(Number(volSlider.value) / 100, false);
    return '🔊 Unmuted system audio!';
  }
  if (cmd === 'shut down' || cmd === 'shutdown' || cmd === 'turn off') {
    setTimeout(() => triggerGracefulShutdown(), 600);
    return '🔌 Shutting down Chronos 95...';
  }

  return null;
}

async function sendByteMessage() {
  const q = byteInput.value.trim();
  if (!q) return;
  openFullChatLog();

  const container = getByteChatContainer();
  if (!container) return;

  container.innerHTML += `<div class="byte-msg user"><b>You:</b> ${q}</div>`;
  byteInput.value = '';

  const loadingId = `load-${Date.now()}`;
  container.innerHTML += `<div id="${loadingId}" class="byte-msg bot"><i>🤖 Byte is working...</i></div>`;
  container.scrollTop = container.scrollHeight;

  const workflowReply = await executeSmartOSWorkflow(q);
  const loadEl = document.getElementById(loadingId);

  if (workflowReply) {
    if (loadEl) loadEl.innerHTML = `<b>Byte:</b> ${formatByteMarkdown(workflowReply)}`;
    byteChatContext.push(`User: ${q}`, `Byte: ${workflowReply}`);
    saveByteMemory(container);
    container.scrollTop = container.scrollHeight;
    return;
  }

  // Conversational Generative AI with persistent memory across reloads!
  byteChatContext.push(`User: ${q}`);
  const contextPrompt = byteChatContext.slice(-10).join('\n');
  const reply = await askNeuralBrain(contextPrompt, 'assistant');
  byteChatContext.push(`Byte: ${reply}`);

  if (loadEl) {
    loadEl.innerHTML = `<b>Byte:</b> ${formatByteMarkdown(reply)}`;
  }
  saveByteMemory(container);
  container.scrollTop = container.scrollHeight;
}

byteSend.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  sendByteMessage();
});

byteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    sendByteMessage();
  }
});

// 5. Desktop Icons, Start Menu & Tray Popups
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

if (traySound) {
  traySound.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = volumePopup.classList.contains('hidden');
    hideAllPopups();
    if (isHidden) volumePopup.classList.remove('hidden');
  });
}

if (volSlider) {
  volSlider.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    store.setVolume(val / 100, volMute.checked);
    soundEngine.playKeyClick();
  });
}

if (volMute) {
  volMute.addEventListener('change', (e) => {
    store.setVolume(Number(volSlider.value) / 100, e.target.checked);
  });
}

eventBus.on('AUDIO_STATE_CHANGED', ({ volume, muted }) => {
  const pct = Math.round(volume * 100);
  if (volLabel) volLabel.textContent = muted ? 'MUTED' : `${pct}%`;
  if (traySound) {
    if (muted || pct === 0) traySound.textContent = '🔇';
    else if (pct < 50) traySound.textContent = '🔉';
    else traySound.textContent = '🔊';
  }
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

// 6. Real-Time Desk Mouse & Keyboard Lock LEDs
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