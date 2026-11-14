// Automatically works on localhost:5500 -> localhost:8000 AND on a single deployed cloud URL!
const API_BASE =
  window.location.port === '8000' ||
  (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? ''
    : 'http://localhost:8000';

class OSWindowManager {
  constructor() {
    this.zIndexCounter = 10;
    this.openWindows = {};
    this.lastBrowserText = '';
    this.lastBrowserTitle = '';
  }

  init() {
    this.windowLayer = document.getElementById('window-layer');
    this.taskbarTabs = document.getElementById('taskbar-tabs');

    const savedTheme = localStorage.getItem('chronos_theme') || 'theme-teal';
    this.applyTheme(savedTheme);
  }

  applyTheme(themeClass) {
    const desktop = document.getElementById('os-desktop');
    if (!desktop) return;
    desktop.classList.remove('theme-teal', 'theme-matrix', 'theme-sunset', 'theme-space');
    desktop.classList.add(themeClass);
    localStorage.setItem('chronos_theme', themeClass);
  }

  openApp(appId) {
    if (this.openWindows[appId]) {
      const winEl = this.openWindows[appId];
      winEl.classList.remove('minimized');
      this.focusWindow(appId);
      this.renderTaskbarTabs();
      return winEl;
    }

    const config = this.getAppConfig(appId);
    if (!config) return null;

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
          <button class="win-ctrl-btn" data-min="${appId}" title="Minimize">_</button>
          <button class="win-ctrl-btn" data-max="${appId}" title="Maximize / Restore">□</button>
          <button class="win-ctrl-btn" data-close="${appId}" title="Close">✕</button>
        </div>
      </div>
      <div class="win-body">${config.html}</div>
      <!-- 8-Way Resize Handles (Top, Bottom, Left, Right + 4 Corners) -->
      <div class="rz-handle rz-n" data-dir="n"></div>
      <div class="rz-handle rz-s" data-dir="s"></div>
      <div class="rz-handle rz-e" data-dir="e"></div>
      <div class="rz-handle rz-w" data-dir="w"></div>
      <div class="rz-handle rz-nw" data-dir="nw"></div>
      <div class="rz-handle rz-ne" data-dir="ne"></div>
      <div class="rz-handle rz-sw" data-dir="sw"></div>
      <div class="rz-handle rz-se" data-dir="se" title="Drag any edge or corner to resize">◢</div>
    `;

    this.windowLayer.appendChild(winEl);
    this.openWindows[appId] = winEl;

    const titlebar = winEl.querySelector('.win-titlebar');
    this.makeDraggable(winEl, titlebar, appId);
    this.makeResizable(winEl, appId);
    titlebar.addEventListener('dblclick', () => this.toggleMaximize(appId));
    winEl.addEventListener('mousedown', () => this.focusWindow(appId));

    winEl.querySelector(`[data-min="${appId}"]`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeApp(appId);
    });
    winEl.querySelector(`[data-max="${appId}"]`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize(appId);
    });
    winEl.querySelector(`[data-close="${appId}"]`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeApp(appId);
    });

    config.onMount(winEl);
    this.renderTaskbarTabs();
    return winEl;
  }

  focusWindow(appId) {
    const winEl = this.openWindows[appId];
    if (winEl) {
      winEl.classList.remove('minimized');
      winEl.style.zIndex = ++this.zIndexCounter;
      this.renderTaskbarTabs();
    }
  }

  minimizeApp(appId) {
    const winEl = this.openWindows[appId];
    if (winEl) {
      winEl.classList.add('minimized');
      this.renderTaskbarTabs();
    }
  }

  toggleMaximize(appId) {
    const winEl = this.openWindows[appId];
    if (!winEl) return;
    winEl.classList.remove('minimized');
    winEl.classList.toggle('maximized');
    this.focusWindow(appId);
  }

  closeApp(appId) {
    const winEl = this.openWindows[appId];
    if (winEl) {
      winEl.remove();
      delete this.openWindows[appId];
      this.renderTaskbarTabs();
      return true;
    }
    return false;
  }

  closeAll() {
    Object.keys(this.openWindows).forEach((id) => this.closeApp(id));
  }

  getBrowserText() {
    const expWin = this.openWindows['explorer'];
    if (expWin) {
      const view = expWin.querySelector('#exp-viewport');
      if (view && view.innerText.trim()) {
        return view.innerText.trim();
      }
    }
    return this.lastBrowserText || '';
  }

  // BULLETPROOF APPEND: Always keeps existing text and types the new text right below it!
  writeToNotepad(newContent, append = true) {
    const cleanNew = (newContent || '').trim();
    if (!cleanNew) return;

    // 1. Make sure NotePad window is open and visible
    const npWin = this.openApp('notepad');
    const area = npWin ? npWin.querySelector('#np-text') : null;
    const status = npWin ? npWin.querySelector('#np-status') : null;

    // 2. Always grab the real existing text (from textarea OR localStorage)
    const existingText = (area ? area.value : localStorage.getItem('chronos_notepad') || '').trim();

    // 3. If appending and there is already text, just add a blank line and type ahead!
    const finalText = append && existingText ? `${existingText}\n\n${cleanNew}` : cleanNew;

    if (area) {
      area.value = finalText;
      area.scrollTop = area.scrollHeight;
    }
    localStorage.setItem('chronos_notepad', finalText);
    if (status) status.textContent = 'Appended & Saved ✓';
  }

  getCanvasDataUrl() {
    const ptWin = this.openWindows['paint'];
    if (ptWin) {
      const canvas = ptWin.querySelector('#paint-canvas');
      if (canvas) return canvas.toDataURL('image/png');
    }
    return null;
  }

  renderTaskbarTabs() {
    if (!this.taskbarTabs) return;
    this.taskbarTabs.innerHTML = '';
    Object.keys(this.openWindows).forEach((appId) => {
      const winEl = this.openWindows[appId];
      const isMin = winEl.classList.contains('minimized');
      const tab = document.createElement('div');
      tab.className = `task-tab ${!isMin ? 'active-tab' : ''}`;
      tab.textContent = this.getAppConfig(appId).title;
      tab.addEventListener('click', () => {
        if (isMin) {
          winEl.classList.remove('minimized');
          this.focusWindow(appId);
        } else if (Number(winEl.style.zIndex) === this.zIndexCounter) {
          this.minimizeApp(appId);
        } else {
          this.focusWindow(appId);
        }
      });
      this.taskbarTabs.appendChild(tab);
    });
  }

  makeDraggable(winEl, handleEl, appId) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    handleEl.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || winEl.classList.contains('maximized')) return;
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

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // FULL 8-DIRECTION RESIZE (TOP, BOTTOM, LEFT, RIGHT & CORNERS)
  makeResizable(winEl, appId) {
    let isResizing = false;
    let dir = '';
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startL = 0;
    let startT = 0;
    const minW = 260;
    const minH = 170;

    winEl.querySelectorAll('.rz-handle').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (winEl.classList.contains('maximized')) return;
        isResizing = true;
        dir = handle.dataset.dir;
        this.focusWindow(appId);
        startX = e.clientX;
        startY = e.clientY;
        startW = winEl.offsetWidth;
        startH = winEl.offsetHeight;
        startL = winEl.offsetLeft;
        startT = winEl.offsetTop;
      });
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (dir.includes('e')) {
        winEl.style.width = `${Math.max(minW, startW + dx)}px`;
      }
      if (dir.includes('s')) {
        winEl.style.height = `${Math.max(minH, startH + dy)}px`;
      }
      if (dir.includes('w')) {
        const possibleW = startW - dx;
        if (possibleW >= minW) {
          winEl.style.width = `${possibleW}px`;
          winEl.style.left = `${Math.max(0, startL + dx)}px`;
        }
      }
      if (dir.includes('n')) {
        const possibleH = startH - dy;
        if (possibleH >= minH) {
          winEl.style.height = `${possibleH}px`;
          winEl.style.top = `${Math.max(0, startT + dy)}px`;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  getAppConfig(appId) {
    const apps = {
      explorer: {
        title: '🌍 Chronos Explorer',
        width: '510px',
        height: '340px',
        left: '45px',
        top: '12px',
        html: `
          <div class="browser-tabs-bar" id="exp-tabs-bar"></div>
          <div class="browser-bar">
            <button id="exp-home" class="win95-btn" title="Home">🏠</button>
            <span>URL:</span>
            <input type="text" id="exp-query" value="http://welcome.com" placeholder="Search any topic or URL..." />
            <button id="exp-go" class="win95-btn">Go</button>
            <button id="exp-save-np" class="win95-btn" title="Append page to NotePad">📝 +NotePad</button>
          </div>
          <div id="exp-viewport" class="browser-viewport"></div>
        `,
        onMount: (win) => {
          const tabsBar = win.querySelector('#exp-tabs-bar');
          const input = win.querySelector('#exp-query');
          const goBtn = win.querySelector('#exp-go');
          const homeBtn = win.querySelector('#exp-home');
          const saveNpBtn = win.querySelector('#exp-save-np');
          const view = win.querySelector('#exp-viewport');

          const defaultWelcomeHTML = `
            <div class="web-article">
              <div class="web-hero">
                <h1>🌐 Chronos Net Portal 1995</h1>
                <p>The AI-Synthesized World Wide Web</p>
              </div>
              <div class="web-grid">
                <div class="web-card">
                  <h3>🚀 Trending Portals</h3>
                  <ul style="margin-left:14px;">
                    <li><a href="#" data-search="How Quantum Computers Work">Quantum Computing Guide</a></li>
                    <li><a href="#" data-search="History of 90s Video Games">90s Video Game Encyclopedia</a></li>
                    <li><a href="#" data-search="Artificial Intelligence in 2026">AI Revolution Portal</a></li>
                  </ul>
                </div>
                <div class="web-card">
                  <h3>📚 Science & Tech</h3>
                  <ul style="margin-left:14px;">
                    <li><a href="#" data-search="Inside a Black Hole">Inside a Black Hole</a></li>
                    <li><a href="#" data-search="Linux vs Windows 95 Architecture">OS Architecture Comparison</a></li>
                  </ul>
                </div>
              </div>
            </div>
          `;

          const newTabHTML = `
            <div style="text-align:center;margin-top:40px;font-family:Tahoma,sans-serif;">
              <h2 style="color:#000080;margin-bottom:6px;">✨ New Neural Tab</h2>
              <p style="color:#444;">Type any topic, question, or URL above and press <b>Enter</b>.</p>
            </div>
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

            const addBtn = document.createElement('button');
            addBtn.className = 'win95-btn tab-add-btn';
            addBtn.textContent = '+';
            addBtn.addEventListener('click', () => {
              const newTab = { id: nextTabId++, title: 'New Tab', url: '', content: newTabHTML };
              tabs.push(newTab);
              activeTabId = newTab.id;
              renderTabs();
              input.focus();
            });
            tabsBar.appendChild(addBtn);

            const current = tabs.find((item) => item.id === activeTabId);
            if (current) {
              input.value = current.url;
              view.innerHTML = current.content;
              this.lastBrowserText = view.innerText.trim();
              this.lastBrowserTitle = current.title;
            }
          };

          const runSearch = async (overrideQuery = null) => {
            const current = tabs.find((item) => item.id === activeTabId);
            if (!current) return;
            const q = (overrideQuery !== null ? overrideQuery : input.value).trim();
            if (!q) return;

            input.value = q;
            current.url = q.startsWith('http')
              ? q
              : `http://chronos.net/${q.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            current.title = q.replace(/^https?:\/\//, '');

            if (q.toLowerCase() === 'http://welcome.com' || q.toLowerCase() === 'welcome.com') {
              current.content = defaultWelcomeHTML;
              renderTabs();
              return;
            }

            current.content = `<p style="padding:20px;"><i>⌛ Loading webpage for "<b>${q}</b>"...</i></p>`;
            renderTabs();

            const reply = await askNeuralBrain(q, 'browser');
            current.content = reply;
            renderTabs();
          };

          win.runExplorerSearch = runSearch;

          saveNpBtn.addEventListener('click', () => {
            const text = view.innerText.trim();
            this.writeToNotepad(`[Saved from Explorer: ${input.value}]\n${text}`, true);
          });

          view.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
              e.preventDefault();
              const target = link.dataset.search || link.textContent;
              if (target) runSearch(target);
            }
          });

          homeBtn.addEventListener('click', () => runSearch('http://welcome.com'));
          goBtn.addEventListener('click', () => runSearch());
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearch();
          });
          renderTabs();
        }
      },

      notepad: {
        title: '📝 NotePad.exe',
        width: '435px',
        height: '305px',
        left: '95px',
        top: '26px',
        html: `
          <div class="win-menubar">
            <span id="np-ai" style="cursor:pointer;color:#000080;font-weight:bold;">✨ Write / Enhance with Byte</span>
            <span id="np-undo" style="cursor:pointer;">↩️ Undo</span>
            <span id="np-clear" style="cursor:pointer;">🗑️ Clear</span>
            <span id="np-status" style="margin-left:auto;color:green;font-size:10px;">Saved in Memory ✓</span>
          </div>
          <textarea id="np-text" class="notepad-area" placeholder="Type notes or a prompt... (Everything here persists in localStorage across reloads!)"></textarea>
        `,
        onMount: (win) => {
          const area = win.querySelector('#np-text');
          const status = win.querySelector('#np-status');
          let previousText = '';

          area.value = localStorage.getItem('chronos_notepad') || '';
          previousText = area.value;

          area.addEventListener('input', () => {
            localStorage.setItem('chronos_notepad', area.value);
            status.textContent = 'Saved ✓';
          });

          win.querySelector('#np-undo').addEventListener('click', () => {
            if (previousText !== undefined) {
              area.value = previousText;
              localStorage.setItem('chronos_notepad', area.value);
              status.textContent = 'Undone ↩️';
            }
          });

          win.querySelector('#np-clear').addEventListener('click', () => {
            previousText = area.value;
            area.value = '';
            localStorage.setItem('chronos_notepad', '');
            status.textContent = 'Cleared';
          });

          win.querySelector('#np-ai').addEventListener('click', async () => {
            const fullText = area.value;
            if (!fullText.trim()) return;

            previousText = fullText;
            const start = area.selectionStart;
            const end = area.selectionEnd;
            const hasSelection = start !== end;

            const lines = fullText.trim().split('\n');
            const lastLinePrompt = lines[lines.length - 1].trim();
            const targetPrompt = hasSelection ? fullText.slice(start, end).trim() : lastLinePrompt;

            status.textContent = '⏳ Byte writing...';
            const res = await askNeuralBrain(targetPrompt, 'notepad');

            if (hasSelection) {
              area.value = fullText.slice(0, start) + res.trim() + fullText.slice(end);
            } else {
              area.value = `${fullText.trim()}\n\n${res.trim()}`;
            }
            area.scrollTop = area.scrollHeight;
            localStorage.setItem('chronos_notepad', area.value);
            status.textContent = 'Appended ✨';
          });
        }
      },

      paint: {
        title: '🎨 PixelPaint.exe',
        width: '515px',
        height: '355px',
        left: '75px',
        top: '12px',
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
              <button id="pt-ai" class="win95-btn" style="font-size:10px;margin-top:4px;color:#000080;font-weight:bold;">👁️ Ask Byte</button>
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

      settings: {
        title: '⚙️ Display & Personalization',
        width: '320px',
        height: '220px',
        left: '140px',
        top: '65px',
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

  mountPaintLogic(win) {
    const canvas = win.querySelector('#paint-canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let tool = 'brush';
    let color = '#000080';
    let size = 4;
    let drawing = false;
    let startX = 0;
    let startY = 0;
    let snapshot = null;

    const colorInput = win.querySelector('#pt-color');
    const hexInput = win.querySelector('#pt-hex');
    const sizeInput = win.querySelector('#pt-size');
    const sizeVal = win.querySelector('#pt-size-val');

    const colors = [
      '#000000',
      '#ffffff',
      '#ff0000',
      '#00aa00',
      '#000080',
      '#ffff00',
      '#ff00ff',
      '#00ffff'
    ];
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

    colorInput.addEventListener('input', (e) => {
      color = e.target.value;
      hexInput.value = color;
    });
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

    window.addEventListener('mouseup', () => {
      drawing = false;
    });

    win.querySelector('#pt-clear').addEventListener('click', () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    win.querySelector('#pt-ai').addEventListener('click', async () => {
      const byteBubble = document.getElementById('byte-bubble');
      const byteHistory =
        document.getElementById('byte-history') || document.getElementById('byte-text');
      if (!byteBubble || !byteHistory) return;

      byteBubble.classList.remove('hidden');
      byteBubble.classList.add('expanded');

      const dataUrl = canvas.toDataURL('image/png');
      const loadId = `paint-${Date.now()}`;
      byteHistory.innerHTML += `
        <div class="byte-msg user">
          <b>🎨 Check out my drawing:</b><br/>
          <img src="${dataUrl}" style="width:90px;border:1px solid #333;margin-top:3px;background:#fff;" />
        </div>
        <div id="${loadId}" class="byte-msg bot"><i>👁️ Byte is looking at your canvas...</i></div>
      `;
      byteHistory.scrollTop = byteHistory.scrollHeight;

      const reply = await askPaintVision(
        dataUrl,
        `I am currently drawing with color ${color}. What do you see on my canvas, what colors should I use next, and how can I improve it?`
      );

      const loadEl = document.getElementById(loadId);
      if (loadEl) {
        loadEl.innerHTML = `<b>🎨 Byte:</b> ${formatByteMarkdown(reply)}`;
      }
      byteHistory.scrollTop = byteHistory.scrollHeight;
      localStorage.setItem('chronos_byte_html', byteHistory.innerHTML);
    });
  }
}

export function formatByteMarkdown(text) {
  return (text || '')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

export async function askPaintVision(imageBase64, prompt) {
  try {
    const res = await fetch(`${API_BASE}/api/paint-vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64, prompt })
    });
    if (res.ok) {
      const data = await res.json();
      return data.reply;
    }
  } catch (_) {}
  return askNeuralBrain(prompt, 'assistant');
}

export async function askNeuralBrain(prompt, mode = 'assistant') {
  try {
    const res = await fetch(`${API_BASE}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode })
    });
    if (res.ok) {
      const data = await res.json();
      return data.reply;
    }
  } catch (_) {}
  return `[FastAPI Offline] Make sure uvicorn is running on port 8000!`;
}

export const windowManager = new OSWindowManager();