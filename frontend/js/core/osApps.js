// Modular Window Manager + All 4 OS Apps (Explorer, NotePad, PixelPaint, Settings)
class OSWindowManager {
  constructor() {
    this.zIndexCounter = 10;
    this.openWindows = {};
  }

  init() {
    this.windowLayer = document.getElementById('window-layer');
    this.taskbarTabs = document.getElementById('taskbar-tabs');

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('chronos_theme') || 'theme-teal';
    this.applyTheme(savedTheme);
  }

  applyTheme(themeClass) {
    const desktop = document.getElementById('os-desktop');
    desktop.classList.remove('theme-teal', 'theme-matrix', 'theme-sunset', 'theme-space');
    desktop.classList.add(themeClass);
    localStorage.setItem('chronos_theme', themeClass);
  }

  openApp(appId) {
    // If already open, bring to front
    if (this.openWindows[appId]) {
      this.focusWindow(appId);
      return;
    }

    const config = this.getAppConfig(appId);
    if (!config) return;

    const winEl = document.createElement('div');
    winEl.className = 'os-window';
    winEl.style.width = config.width;
    winEl.style.height = config.height;
    winEl.style.left = config.left;
    winEl.style.top = config.top;
    winEl.style.zIndex = ++this.zIndexCounter;

    winEl.innerHTML = `
      <div class="win-titlebar" id="title-${appId}">
        <span>${config.title}</span>
        <div class="win-controls">
          <button class="win-ctrl-btn" data-close="${appId}">✕</button>
        </div>
      </div>
      <div class="win-body">${config.html}</div>
    `;

    this.windowLayer.appendChild(winEl);
    this.openWindows[appId] = winEl;

    // Make Window Draggable & Focusable
    this.makeDraggable(winEl, winEl.querySelector('.win-titlebar'), appId);
    winEl.addEventListener('mousedown', () => this.focusWindow(appId));

    // Close Button
    winEl.querySelector(`[data-close="${appId}"]`).addEventListener('click', () => {
      this.closeApp(appId);
    });

    // Mount App-Specific Logic
    config.onMount(winEl);
    this.renderTaskbarTabs();
  }

  focusWindow(appId) {
    const winEl = this.openWindows[appId];
    if (winEl) winEl.style.zIndex = ++this.zIndexCounter;
  }

  closeApp(appId) {
    const winEl = this.openWindows[appId];
    if (winEl) {
      winEl.remove();
      delete this.openWindows[appId];
      this.renderTaskbarTabs();
    }
  }

  closeAll() {
    Object.keys(this.openWindows).forEach((id) => this.closeApp(id));
  }

  renderTaskbarTabs() {
    this.taskbarTabs.innerHTML = '';
    Object.keys(this.openWindows).forEach((appId) => {
      const tab = document.createElement('div');
      tab.className = 'task-tab';
      tab.textContent = this.getAppConfig(appId).title;
      tab.addEventListener('click', () => this.focusWindow(appId));
      this.taskbarTabs.appendChild(tab);
    });
  }

  makeDraggable(winEl, handleEl, appId) {
    let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

    handleEl.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      this.focusWindow(appId);
      startX = e.clientX;
      startY = e.clientY;
      origX = winEl.offsetLeft;
      origY = winEl.offsetTop;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      winEl.style.left = `${Math.max(0, origX + (e.clientX - startX))}px`;
      winEl.style.top = `${Math.max(0, origY + (e.clientY - startY))}px`;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  // DEFINITIONS FOR OUR 4 DESKTOP APPS
  getAppConfig(appId) {
    const apps = {
     // 1. MULTI-TAB CHRONOS EXPLORER (Starts at http://welcome.com)
      explorer: {
        title: '🌍 Chronos Explorer - [Multi-Tab AI Web]',
        width: '505px', height: '345px', left: '70px', top: '16px',
        html: `
          <div class="browser-tabs-bar" id="exp-tabs-bar"></div>
          <div class="browser-bar">
            <span>URL:</span>
            <input type="text" id="exp-query" value="http://welcome.com" placeholder="Type URL or ask AI anything..." />
            <button id="exp-go" class="win95-btn">Go</button>
          </div>
          <div id="exp-viewport" class="browser-viewport"></div>
        `,
        onMount: (win) => {
          const tabsBar = win.querySelector('#exp-tabs-bar');
          const input = win.querySelector('#exp-query');
          const goBtn = win.querySelector('#exp-go');
          const view = win.querySelector('#exp-viewport');

          const defaultWelcomeHTML = `
            <h2 class="retro-page-title">Welcome to http://welcome.com</h2>
            <p>You are browsing on <b>Chronos Explorer 1.0</b> with Multi-Tab Neural Rendering.</p>
            <hr style="margin:6px 0;" />
            <p>✨ <b>How to use:</b> Type any topic, question, or fake URL in the address bar and hit <b>Go</b>, or click <b>[+]</b> above to open a new tab!</p>
          `;
            const newTabHTML = `
            <h2 class="retro-page-title">Type in address bar to search </h2>
             
          `;

          let tabs = [
            { id: 1, title: 'welcome.com', url: 'http://welcome.com', content: defaultWelcomeHTML }
          ];
          let activeTabId = 1;
          let nextTabId = 2;

          const renderTabs = () => {
            tabsBar.innerHTML = '';
            tabs.forEach((t) => {
              const tabEl = document.createElement('div');
              tabEl.className = `browser-tab ${t.id === activeTabId ? 'active' : ''}`;
              tabEl.innerHTML = `
                <span>${t.title.slice(0, 12)}</span>
                ${tabs.length > 1 ? `<b class="tab-close" data-close-tab="${t.id}">×</b>` : ''}
              `;
              tabEl.addEventListener('click', (e) => {
                if (e.target.dataset.closeTab) {
                  const closeId = Number(e.target.dataset.closeTab);
                  tabs = tabs.filter((item) => item.id !== closeId);
                  if (activeTabId === closeId) activeTabId = tabs[tabs.length - 1].id;
                  renderTabs();
                  return;
                }
                activeTabId = t.id;
                renderTabs();
              });
              tabsBar.appendChild(tabEl);
            });

            // '+' Add New Tab Button
            const addBtn = document.createElement('button');
            addBtn.className = 'win95-btn tab-add-btn';
            addBtn.textContent = '+';
            addBtn.title = 'New Tab';
            addBtn.addEventListener('click', () => {
            const newTab = {
              id: nextTabId++,
              title: 'New Tab',   // <-- Changed from 'welcome.com' to 'New Tab'!
              url: '',
              content: newTabHTML
            };
              tabs.push(newTab);
              activeTabId = newTab.id;
              renderTabs();
            });
            tabsBar.appendChild(addBtn);

            // Sync active tab URL & Viewport
            const current = tabs.find((item) => item.id === activeTabId);
            if (current) {
              input.value = current.url;
              view.innerHTML = current.content;
            }
          };

          const runSearch = async () => {
            const current = tabs.find((item) => item.id === activeTabId);
            if (!current) return;
            const q = input.value.trim();
            if (!q) return;

            current.url = q;
            current.title = q.replace(/^https?:\/\//, '');
            if (q.toLowerCase() === 'http://welcome.com' || q.toLowerCase() === 'welcome.com') {
              current.content = defaultWelcomeHTML;
              renderTabs();
              return;
            }

            current.content = `<p><i>⌛ Dialing Neural Web for "${q}"...</i></p>`;
            renderTabs();

            const reply = await askNeuralBrain(q, 'browser');
            current.content = reply;
            renderTabs();
          };

          goBtn.addEventListener('click', runSearch);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
          renderTabs();
        }
      },
      // 2. PERSISTENT NOTEPAD.EXE
      notepad: {
        title: '📝 NotePad.exe',
        width: '420px', height: '290px', left: '110px', top: '40px',
        html: `
          <div class="win-menubar">
            <span id="np-save" style="cursor:pointer;font-weight:bold;">💾 Save</span>
            <span id="np-clear" style="cursor:pointer;">🗑️ Clear</span>
            <span id="np-ai" style="cursor:pointer;color:#000080;font-weight:bold;">🤖 Ask Byte to Enhance</span>
            <span id="np-status" style="margin-left:auto;color:green;font-size:10px;">Auto-Saved</span>
          </div>
          <textarea id="np-text" class="notepad-area" placeholder="Type notes or code here... (Automatically saved in browser storage!)"></textarea>
        `,
        onMount: (win) => {
          const area = win.querySelector('#np-text');
          const status = win.querySelector('#np-status');
          area.value = localStorage.getItem('chronos_notepad') || '=== CHRONOS 95 NOTES ===\n- Everything you type here stays saved even after rebooting!\n- Click "Ask Byte to Enhance" to summarize or generate code.';

          area.addEventListener('input', () => {
            localStorage.setItem('chronos_notepad', area.value);
            status.textContent = 'Saved ✓';
          });

          win.querySelector('#np-clear').addEventListener('click', () => {
            area.value = '';
            localStorage.setItem('chronos_notepad', '');
          });

          win.querySelector('#np-ai').addEventListener('click', async () => {
            status.textContent = 'Byte thinking...';
            const res = await askNeuralBrain(area.value, 'notepad');
            area.value += `\n\n--- [BYTE AI OUTPUT] ---\n${res}`;
            localStorage.setItem('chronos_notepad', area.value);
            status.textContent = 'Enhanced ✓';
          });
        }
      },

      // 3. FULL PIXELPAINT.EXE (BRUSH, SHAPES, FILL, STROKE SLIDER, HEX PICKER)
      paint: {
        title: '🎨 PixelPaint.exe',
        width: '510px', height: '350px', left: '85px', top: '12px',
        html: `
          <div class="paint-layout">
            <div class="paint-sidebar">
              <div class="paint-tools-grid">
                <button class="paint-tool-btn active" data-tool="brush" title="Brush">🖌️</button>
                <button class="paint-tool-btn" data-tool="eraser" title="Eraser">🧽</button>
                <button class="paint-tool-btn" data-tool="line" title="Line">📏</button>
                <button class="paint-tool-btn" data-tool="rect" title="Rectangle">▭</button>
                <button class="paint-tool-btn" data-tool="circle" title="Circle">◯</button>
                <button class="paint-tool-btn" data-tool="fill" title="Fill Canvas">🪣</button>
              </div>
              <button id="pt-clear" class="win95-btn" style="font-size:10px;margin-top:4px;">Clear</button>
              <button id="pt-ai" class="win95-btn" style="font-size:10px;margin-top:4px;color:#000080;">🤖 Inspect</button>
            </div>
            <div class="paint-canvas-wrap">
              <canvas id="paint-canvas" width="405" height="255"></canvas>
            </div>
          </div>
          <div class="paint-bottombar">
            <span>Size:</span>
            <input type="range" id="pt-size" min="1" max="28" value="4" style="width:65px;" />
            <span id="pt-size-val">4px</span>
            <input type="color" id="pt-color" value="#000080" style="width:22px;height:18px;border:none;" />
            <input type="text" id="pt-hex" value="#000080" style="width:56px;font-size:10px;padding:1px 3px;" />
            <div class="swatch-row" id="pt-swatches"></div>
          </div>
        `,
        onMount: (win) => this.mountPaintLogic(win)
      },

      // 4. PERSONALIZATION SETTINGS
      settings: {
        title: '⚙️ Display & Personalization',
        width: '320px', height: '220px', left: '140px', top: '65px',
        html: `
          <p style="font-size:11px;margin-bottom:8px;">Select a desktop wallpaper theme for Chronos 95:</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="win95-btn" data-theme="theme-teal">🟩 Classic 1995 Teal (Default)</button>
            <button class="win95-btn" data-theme="theme-matrix">📟 Cyber Matrix Phosphor</button>
            <button class="win95-btn" data-theme="theme-sunset">🌆 Synthwave Sunset Gradient</button>
            <button class="win95-btn" data-theme="theme-space">🌌 Deep Space Nebula</button>
          </div>
        `,
        onMount: (win) => {
          win.querySelectorAll('[data-theme]').forEach((btn) => {
            btn.addEventListener('click', () => this.applyTheme(btn.dataset.theme));
          });
        }
      }
    };
    return apps[appId];
  }

  // FULL HTML5 CANVAS PAINT ENGINE
  mountPaintLogic(win) {
    const canvas = win.querySelector('#paint-canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let tool = 'brush', color = '#000080', size = 4;
    let drawing = false, startX = 0, startY = 0, snapshot = null;

    const colorInput = win.querySelector('#pt-color');
    const hexInput = win.querySelector('#pt-hex');
    const sizeInput = win.querySelector('#pt-size');
    const sizeVal = win.querySelector('#pt-size-val');

    // Populate 8 Classic Color Swatches
    const colors = ['#000000', '#ffffff', '#ff0000', '#00aa00', '#000080', '#ffff00', '#ff00ff', '#00ffff'];
    const swatchRow = win.querySelector('#pt-swatches');
    colors.forEach((c) => {
      const s = document.createElement('div');
      s.className = 'swatch';
      s.style.background = c;
      s.addEventListener('click', () => {
        color = c;
        colorInput.value = c;
        hexInput.value = c;
      });
      swatchRow.appendChild(s);
    });

    colorInput.addEventListener('input', (e) => { color = e.target.value; hexInput.value = color; });
    hexInput.addEventListener('change', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        color = e.target.value;
        colorInput.value = color;
      }
    });
    sizeInput.addEventListener('input', (e) => {
      size = parseInt(e.target.value, 10);
      sizeVal.textContent = `${size}px`;
    });

    win.querySelectorAll('.paint-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        win.querySelectorAll('.paint-tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        tool = btn.dataset.tool;
      });
    });

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;

      if (tool === 'fill') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }
      drawing = true;
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineWidth = size;
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;

      if (tool === 'brush' || tool === 'eraser') {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath();
        if (tool === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (tool === 'rect') {
          ctx.strokeRect(startX, startY, x - startX, y - startY);
        } else if (tool === 'circle') {
          const r = Math.hypot(x - startX, y - startY);
          ctx.arc(startX, startY, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    window.addEventListener('mouseup', () => { drawing = false; });

    win.querySelector('#pt-clear').addEventListener('click', () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    win.querySelector('#pt-ai').addEventListener('click', () => {
      document.getElementById('byte-text').innerHTML = `🎨 <b>Byte Vision:</b> Awesome canvas! Once our FastAPI backend is running on port 8000, I'll convert your PixelPaint drawings into live HTML/CSS!`;
    });
  }
}

// Smart AI Bridge (Tries Local FastAPI Backend first, falls back to built-in synthesizer so UI always works!)
export async function askNeuralBrain(prompt, mode = 'chat') {
  try {
    const res = await fetch('http://localhost:8000/api/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode })
    });
    if (res.ok) {
      const data = await res.json();
      return data.reply;
    }
  } catch (_) {
    // Fallback response while backend is offline
  }

  await new Promise((r) => setTimeout(r, 450));
  if (mode === 'browser') {
    return `
      <h2 class="retro-page-title">🌐 NeuralNet Result: ${prompt}</h2>
      <p><b>Summary:</b> Chronos Explorer synthesized this live page for <i>"${prompt}"</i>.</p>
      <ul style="margin:6px 0 6px 18px;">
        <li><b>Architecture:</b> Decoupled State-Driven OS running inside a 1995 CRT rig.</li>
        <li><b>AI Status:</b> Ready to connect to FastAPI Python Backend on <code>localhost:8000/api/brain</code>.</li>
      </ul>
      <p style="background:#eee;padding:6px;border:1px solid #999;">💡 <i>Tip: Start the Python FastAPI server to stream live LLM responses directly into Chronos Explorer!</i></p>
    `;
  }
  return `Processed "${prompt.slice(0, 40)}..." — Ready for live FastAPI LLM connection!`;
}

export const windowManager = new OSWindowManager();