(function () {
  'use strict';

  // Security guard: Ensure extension executes strictly on juicevault.xyz
  if (window.location.hostname !== 'juicevault.xyz' && !window.location.hostname.endsWith('.juicevault.xyz')) {
    return;
  }

  const BTN_FULL = 'jv-lyrics-btn';
  const BTN_MINI = 'jv-lyrics-btn-mini';
  const BTN_PIP = 'jv-pip-btn';
  const HELP_ID = 'jv-help-panel';
  const VIZ_ID = 'jv-viz-canvas';
  const SETTINGS_ID = 'jv-viz-settings';

  // ========== SETTINGS ==========
  const DEFAULTS = {
    enabled: true,
    style: 'bars',
    bars: 64,
    intensity: 1.0,
    smoothing: 0.75,
    colorTheme: 'purple',
    centerMirror: false,
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem('jv-viz-settings');
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULTS };
  }

  function saveSettings(s) {
    try { localStorage.setItem('jv-viz-settings', JSON.stringify(s)); } catch (e) {}
  }

  let settings = loadSettings();

  // ========== DYNAMIC THEME SYSTEM ==========
  const THEME_PALETTES = {
    purple: {
      primary: '#8b5cf6',
      secondary: '#c084fc',
      glow: 'rgba(139, 92, 246, 0.45)',
      border: 'rgba(139, 92, 246, 0.35)',
      line: 'rgba(139, 92, 246, 0.85)',
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    },
    green: {
      primary: '#10b981',
      secondary: '#34d399',
      glow: 'rgba(16, 185, 129, 0.45)',
      border: 'rgba(16, 185, 129, 0.35)',
      line: 'rgba(16, 185, 129, 0.85)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)'
    },
    fire: {
      primary: '#ef4444',
      secondary: '#fbbf24',
      glow: 'rgba(239, 68, 68, 0.45)',
      border: 'rgba(239, 68, 68, 0.35)',
      line: 'rgba(239, 68, 68, 0.85)',
      gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)'
    },
    ice: {
      primary: '#06b6d4',
      secondary: '#38bdf8',
      glow: 'rgba(6, 182, 212, 0.45)',
      border: 'rgba(6, 182, 212, 0.35)',
      line: 'rgba(6, 182, 212, 0.85)',
      gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)'
    },
    neon: {
      primary: '#ec4899',
      secondary: '#a855f7',
      glow: 'rgba(236, 72, 153, 0.45)',
      border: 'rgba(236, 72, 153, 0.35)',
      line: 'rgba(236, 72, 153, 0.85)',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #10b981 100%)'
    }
  };

  function applyThemeCSS(themeName) {
    const t = THEME_PALETTES[themeName] || THEME_PALETTES.purple;
    const root = document.documentElement;
    root.style.setProperty('--jv-theme-primary', t.primary);
    root.style.setProperty('--jv-theme-secondary', t.secondary);
    root.style.setProperty('--jv-theme-glow', t.glow);
    root.style.setProperty('--jv-theme-border', t.border);
    root.style.setProperty('--jv-theme-line', t.line);
    root.style.setProperty('--jv-theme-gradient', t.gradient);
  }

  // Initialize theme CSS variables immediately
  applyThemeCSS(settings.colorTheme);

  // ========== HELPERS ==========
  let cachedAudio = null;
  let lastAudioCheck = 0;

  function getAudio(forceFresh = false) {
    const now = performance.now();
    if (!forceFresh && cachedAudio && cachedAudio.isConnected && (now - lastAudioCheck < 1500)) {
      return cachedAudio;
    }
    lastAudioCheck = now;
    const audios = Array.from(document.querySelectorAll('audio'));
    if (audios.length === 0) {
      cachedAudio = null;
      return null;
    }
    if (audios.length === 1) {
      cachedAudio = audios[0];
      return cachedAudio;
    }
    const playing = audios.find(a => !a.paused && a.currentTime > 0);
    if (playing) {
      cachedAudio = playing;
      return cachedAudio;
    }
    const withSrc = audios.find(a => a.src && a.src.length > 0 && !isNaN(a.duration) && a.duration > 0);
    if (withSrc) {
      cachedAudio = withSrc;
      return cachedAudio;
    }
    cachedAudio = audios[0];
    return cachedAudio;
  }

  function getCurrentTitle() {
    const titleEl = document.querySelector('h1[class*="SongPlayer_trackTitle"]') ||
                    document.querySelector('[class*="SongPlayer_trackTitle"]') ||
                    document.querySelector('span[class*="MiniPlayer_scrollInner"]') ||
                    document.querySelector('[class*="MiniPlayer"] span.font-semibold') ||
                    document.querySelector('[class*="MiniPlayer"] span.text-sm') ||
                    document.querySelector('[class*="trackTitle"]');
    if (titleEl && titleEl.textContent.trim()) {
      return titleEl.textContent.trim()
        .replace(/\(Unreleased\)/gi, '')
        .replace(/\[Unreleased\]/gi, '')
        .replace(/Unreleased/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return null;
  }

  function getCurrentArtist() {
    const el = document.querySelector('[class*="SongPlayer_trackArtist"]') ||
               document.querySelector('[class*="trackArtist"]') ||
               document.querySelector('[class*="MiniPlayer"] p, [class*="MiniPlayer"] span');
    if (el && el.textContent.toLowerCase().includes('juice')) return el.textContent.trim();
    return 'Juice WRLD';
  }

  function openLyrics() {
    const title = getCurrentTitle();
    if (!title) {
      alert('Could not find the current track title.');
      return;
    }
    window.open(`https://genius.com/search?q=${encodeURIComponent('Juice WRLD ' + title)}`, '_blank', 'noopener,noreferrer');
  }

  function clickSiteButton(titlePart) {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      const t = (b.getAttribute('title') || '').toLowerCase();
      if (t.includes(titlePart.toLowerCase())) {
        b.click();
        return true;
      }
    }
    return false;
  }

  function togglePlay() {
    const audio = getAudio();
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'open-lyrics') openLyrics();
    if (msg.action === 'toggle-help') toggleHelpPanel();
  });

  function makeIconButton(id, title, svgInner, size, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.title = title;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${svgInner}</svg>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  const LYRICS_SVG = `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`;
  const PIP_SVG = `<rect x="2" y="3" width="20" height="14" rx="2"/><rect x="10" y="12" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.35"/><path d="M10 16h6"/>`;

  // ========== HELP ==========
  function createHelpPanel() {
    const panel = document.createElement('div');
    panel.id = HELP_ID;
    panel.innerHTML = `
      <button class="jv-close" title="Close">×</button>
      <h3>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2.2">
          ${LYRICS_SVG}
        </svg>
        Lyrics Finder
      </h3>
      <div class="jv-row"><span class="jv-key">Alt + L</span><span>Open lyrics</span></div>
      <div class="jv-row"><span class="jv-key">Scroll</span><span>Volume control (1% - 2%)</span></div>
      <div class="jv-row"><span class="jv-key">Settings</span><span>Extension settings & themes</span></div>
      <div class="jv-row"><span class="jv-key">PiP</span><span>Floating miniplayer</span></div>
      <div class="jv-footer">
        <a href="https://buymeacoffee.com/spinti" target="_blank" rel="noopener noreferrer" class="jv-bmc-link">☕ buymeacoffee.com/spinti</a>
      </div>
    `;
    panel.querySelector('.jv-close').addEventListener('click', () => panel.remove());
    return panel;
  }

  function toggleHelpPanel() {
    const existing = document.getElementById(HELP_ID);
    if (existing) existing.remove();
    else document.body.appendChild(createHelpPanel());
  }

  // ========== INJECT BUTTONS ==========
  function injectFull() {
    const topRight = document.querySelector('[class*="SongPlayer_topRightBtns"]') ||
                     document.querySelector('[class*="topRightBtns"]');
    if (!topRight) {
      if (document.querySelector('[class*="SongPlayer"]')) {
        let box = document.getElementById('jv-full-container');
        if (!box || !box.isConnected) {
          if (box) box.remove();
          box = document.createElement('div');
          box.id = 'jv-full-container';
          box.style.cssText = 'position:fixed;top:16px;right:100px;z-index:99999;display:flex;gap:6px;';
          box.appendChild(makeIconButton(BTN_FULL, 'Search lyrics (Alt+L)', LYRICS_SVG, 22, openLyrics));
          box.appendChild(makeIconButton(BTN_PIP, 'Open floating miniplayer', PIP_SVG, 20, openPiP));
          document.body.appendChild(box);
        }
      }
      return;
    }

    const fullBtn = document.getElementById(BTN_FULL);
    if (!fullBtn || fullBtn.parentElement !== topRight) {
      if (fullBtn) fullBtn.remove();
      topRight.appendChild(makeIconButton(BTN_FULL, 'Search lyrics (Alt+L)', LYRICS_SVG, 22, openLyrics));
    }

    const pipBtn = document.getElementById(BTN_PIP);
    if (!pipBtn || pipBtn.parentElement !== topRight) {
      if (pipBtn) pipBtn.remove();
      topRight.appendChild(makeIconButton(BTN_PIP, 'Open floating miniplayer', PIP_SVG, 20, openPiP));
    }
  }

  function injectMini() {
    const mini = document.querySelector('[class*="MiniPlayer"]');
    if (!mini) return;

    let box = document.getElementById('jv-mini-container');
    if (!box || box.parentElement !== mini) {
      if (box) box.remove();
      box = document.createElement('div');
      box.id = 'jv-mini-container';
      box.style.cssText = 'display:flex;align-items:center;gap:4px;';
      if (getComputedStyle(mini).position === 'static') mini.style.position = 'relative';
      mini.appendChild(box);
      box.appendChild(makeIconButton(BTN_MINI, 'Search lyrics (Alt+L)', LYRICS_SVG, 15, openLyrics));
    } else {
      const miniBtn = document.getElementById(BTN_MINI);
      if (!miniBtn || miniBtn.parentElement !== box) {
        if (miniBtn) miniBtn.remove();
        box.appendChild(makeIconButton(BTN_MINI, 'Search lyrics (Alt+L)', LYRICS_SVG, 15, openLyrics));
      }
    }
  }

  // ========== SETTINGS PANEL ==========
  function toggleSettingsPanel() {
    const existing = document.getElementById(SETTINGS_ID);
    if (existing) {
      existing.remove();
      document.querySelectorAll('.jv-settings-active').forEach(el => el.classList.remove('jv-settings-active'));
      return;
    }
    document.body.appendChild(createSettingsPanel());
  }

  function createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = SETTINGS_ID;
    panel.innerHTML = `
      <h3><span>Extension Settings</span><button class="jv-close">×</button></h3>
      <div class="jv-row-inline"><span>Enable visualizer</span><button class="jv-toggle ${settings.enabled ? 'on' : ''}" data-key="enabled"></button></div>
      <div class="jv-field"><label>Style</label>
        <select data-key="style">
          <option value="bars" ${settings.style==='bars'?'selected':''}>Bars</option>
          <option value="mirror" ${settings.style==='mirror'?'selected':''}>Mirror Bars</option>
          <option value="wave" ${settings.style==='wave'?'selected':''}>Wave</option>
          <option value="circular" ${settings.style==='circular'?'selected':''}>Circular</option>
        </select>
      </div>
      <div class="jv-field"><label>Color theme</label>
        <select data-key="colorTheme">
          <option value="neon" ${settings.colorTheme==='neon'?'selected':''}>Neon</option>
          <option value="purple" ${settings.colorTheme==='purple'?'selected':''}>Purple Haze</option>
          <option value="green" ${settings.colorTheme==='green'?'selected':''}>Juice Green</option>
          <option value="fire" ${settings.colorTheme==='fire'?'selected':''}>Fire</option>
          <option value="ice" ${settings.colorTheme==='ice'?'selected':''}>Ice</option>
        </select>
      </div>
      <div class="jv-field"><label>Bars <span class="jv-val" id="jv-bars-val">${settings.bars}</span></label>
        <input type="range" min="16" max="128" step="8" value="${settings.bars}" data-key="bars"/></div>
      <div class="jv-field"><label>Intensity <span class="jv-val" id="jv-int-val">${settings.intensity.toFixed(1)}</span></label>
        <input type="range" min="0.4" max="2" step="0.1" value="${settings.intensity}" data-key="intensity"/></div>
      <div class="jv-field"><label>Smoothing <span class="jv-val" id="jv-smooth-val">${settings.smoothing.toFixed(2)}</span></label>
        <input type="range" min="0.3" max="0.95" step="0.05" value="${settings.smoothing}" data-key="smoothing"/></div>
      <div class="jv-row-inline" id="jv-row-center-mirror" style="display:${(settings.style==='bars'||settings.style==='mirror')?'flex':'none'};">
        <span>Mirror from center</span>
        <button class="jv-toggle ${settings.centerMirror ? 'on' : ''}" data-key="centerMirror"></button>
      </div>
      <div class="jv-footer">
        <div>Settings saved automatically</div>
        <a href="https://buymeacoffee.com/spinti" target="_blank" rel="noopener noreferrer" class="jv-bmc-link">☕ Support: buymeacoffee.com/spinti</a>
      </div>
    `;

    panel.querySelector('.jv-close').addEventListener('click', () => {
      panel.remove();
      document.querySelectorAll('.jv-settings-active').forEach(el => el.classList.remove('jv-settings-active'));
    });

    panel.querySelectorAll('.jv-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        settings[key] = !settings[key];
        btn.classList.toggle('on', settings[key]);
        saveSettings(settings);
        if (key === 'enabled') {
          if (settings.enabled) startVisualizer();
          else stopVisualizer();
        } else if (key === 'centerMirror') {
          startVisualizer();
        } else {
          applyAnalyserSettings();
        }
      });
    });

    panel.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => {
        settings[sel.dataset.key] = sel.value;
        saveSettings(settings);
        if (sel.dataset.key === 'colorTheme') {
          applyThemeCSS(settings.colorTheme);
        }
        if (sel.dataset.key === 'style') {
          const mirrorRow = panel.querySelector('#jv-row-center-mirror');
          if (mirrorRow) {
            const isBars = settings.style === 'bars' || settings.style === 'mirror';
            mirrorRow.style.display = isBars ? 'flex' : 'none';
          }
          if (cachedViz) {
            cachedViz.remove();
            cachedViz = null;
          }
          startVisualizer();
        }
      });
    });

    panel.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.key;
        const val = parseFloat(input.value);
        settings[key] = key === 'bars' ? parseInt(val, 10) : val;
        saveSettings(settings);
        if (key === 'bars') document.getElementById('jv-bars-val').textContent = settings.bars;
        if (key === 'intensity') document.getElementById('jv-int-val').textContent = settings.intensity.toFixed(1);
        if (key === 'smoothing') {
          document.getElementById('jv-smooth-val').textContent = settings.smoothing.toFixed(2);
          applyAnalyserSettings();
        }
      });
    });

    return panel;
  }

  function hookVisualizerButton() {
    const hook = (btn) => {
      if (btn.dataset.jvHooked) return;
      btn.dataset.jvHooked = '1';
      btn.title = 'Extension Settings';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        btn.classList.toggle('jv-settings-active');
        toggleSettingsPanel();
      }, true);
    };

    document.querySelectorAll('button[title="Hide Visualizer"], button[title="Show Visualizer"], button[title*="Visualizer"]').forEach(hook);
    document.querySelectorAll('[class*="SongPlayer_rightControls"] button, [class*="rightControls"] button').forEach(btn => {
      const path = btn.querySelector('path');
      if (path && (path.getAttribute('d') || '').includes('M4 10')) hook(btn);
    });
  }

  // ========== PICTURE-IN-PICTURE MINIPLAYER ==========
  let pipWindow = null;
  let pipSyncInterval = null;
  let pipRaf = null;

  function isPiPSupported() {
    return 'documentPictureInPicture' in window;
  }

  function isShuffleOn() {
    const btn = document.querySelector('button[title="Shuffle On"], button[title*="Shuffle"]');
    if (!btn) return false;
    const t = (btn.getAttribute('title') || '').toLowerCase();
    return t.includes('shuffle on') || btn.className.toLowerCase().includes('active') || btn.className.toLowerCase().includes('shuffleactive');
  }

  function isRepeatOn() {
    const btn = document.querySelector('button[title="Repeat On"], button[title="Repeat One"], button[title*="Repeat"]');
    if (!btn) return false;
    const t = (btn.getAttribute('title') || '').toLowerCase();
    return t.includes('repeat on') || t.includes('repeat one') || btn.className.toLowerCase().includes('active');
  }

  function closePiP() {
    if (pipSyncInterval) { clearInterval(pipSyncInterval); pipSyncInterval = null; }
    if (pipRaf) { cancelAnimationFrame(pipRaf); pipRaf = null; }
    if (pipWindow && !pipWindow.closed) {
      try { pipWindow.close(); } catch (e) {}
    }
    pipWindow = null;
  }

  async function openPiP() {
    if (!isPiPSupported()) {
      alert('Floating miniplayer needs Chrome / Edge 116+ (Document Picture-in-Picture).');
      return;
    }

    if (pipWindow && !pipWindow.closed) {
      closePiP();
      return;
    }

    try {
      pipWindow = await documentPictureInPicture.requestWindow({
        width: 400,
        height: 175,
      });
    } catch (e) {
      alert('Could not open floating player. Click the page once, then try again.');
      return;
    }

    // Ensure audio graph is initialized
    const initialAudio = getAudio();
    if (initialAudio) setupAudioGraph(initialAudio);

    const doc = pipWindow.document;
    doc.head.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: linear-gradient(145deg, #0d0d10 0%, #1a1028 55%, #0f1a14 100%);
          color: #fff;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 12px 14px 10px;
          user-select: none;
          overflow: hidden;
        }
        .top { display: flex; align-items: center; gap: 10px; }
        .meta { flex: 1; min-width: 0; }
        .title { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .artist { font-size: 11.5px; color: #aaa; margin-top: 2px; }
        .viz-wrap {
          height: 28px; margin: 8px 0 2px; border-radius: 6px;
          overflow: hidden; background: rgba(255,255,255,0.04);
        }
        #pip-viz { width: 100%; height: 100%; display: block; }
        .controls { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 6px; }
        button {
          width: 30px; height: 30px; border-radius: 50%;
          border: none; background: rgba(255,255,255,0.1);
          color: #fff; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        button:hover { background: rgba(29, 185, 84, 0.85); }
        button.play { width: 36px; height: 36px; background: #1DB954; }
        button.play:hover { background: #1ed760; }
        button.active { color: #1DB954; background: rgba(29,185,84,0.2); }
        .progress-wrap { margin-top: 8px; }
        .progress {
          width: 100%; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.12); cursor: pointer;
        }
        .progress-fill {
          height: 100%; border-radius: 2px; width: 0%;
          background: linear-gradient(90deg, #1DB954, #a855f7);
        }
        .bottom {
          display: flex; align-items: center; gap: 8px; margin-top: 6px;
        }
        .times { display: flex; gap: 6px; font-size: 10px; color: #888; min-width: 70px; }
        .vol {
          flex: 1; display: flex; align-items: center; gap: 6px;
        }
        .vol input[type=range] {
          flex: 1; height: 4px; accent-color: #1DB954; cursor: pointer;
        }
        .vol-icon { opacity: 0.7; display: flex; }
        svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
        .play svg { width: 17px; height: 17px; }
      </style>
    `;

    doc.body.innerHTML = `
      <div class="top">
        <div class="meta">
          <div class="title" id="pip-title">—</div>
          <div class="artist" id="pip-artist">Juice WRLD</div>
        </div>
        <button id="pip-lyrics" title="Lyrics">
          <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </button>
      </div>
      <div class="viz-wrap"><canvas id="pip-viz"></canvas></div>
      <div class="controls">
        <button id="pip-shuffle" title="Shuffle">
          <svg viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
        </button>
        <button id="pip-prev" title="Previous">
          <svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <button class="play" id="pip-play" title="Play/Pause">
          <svg viewBox="0 0 24 24" id="pip-play-icon"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>
        </button>
        <button id="pip-next" title="Next">
          <svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        </button>
        <button id="pip-repeat" title="Repeat">
          <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </button>
      </div>
      <div class="progress-wrap">
        <div class="progress" id="pip-progress"><div class="progress-fill" id="pip-fill"></div></div>
      </div>
      <div class="bottom">
        <div class="times"><span id="pip-cur">0:00</span><span>/</span><span id="pip-dur">0:00</span></div>
        <div class="vol">
          <span class="vol-icon">
            <svg viewBox="0 0 24 24" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </span>
          <input type="range" id="pip-volume" min="0" max="1" step="0.01" value="1" />
        </div>
      </div>
    `;

    // Controls
    doc.getElementById('pip-play').addEventListener('click', () => togglePlay());
    doc.getElementById('pip-prev').addEventListener('click', () => clickSiteButton('previous'));
    doc.getElementById('pip-next').addEventListener('click', () => clickSiteButton('next'));
    doc.getElementById('pip-lyrics').addEventListener('click', () => openLyrics());
    doc.getElementById('pip-shuffle').addEventListener('click', () => {
      clickSiteButton('shuffle');
      setTimeout(() => {
        const b = doc.getElementById('pip-shuffle');
        if (b) b.classList.toggle('active', isShuffleOn());
      }, 100);
    });
    doc.getElementById('pip-repeat').addEventListener('click', () => {
      clickSiteButton('repeat');
      setTimeout(() => {
        const b = doc.getElementById('pip-repeat');
        if (b) b.classList.toggle('active', isRepeatOn());
      }, 100);
    });

    doc.getElementById('pip-progress').addEventListener('click', (e) => {
      const audio = getAudio();
      if (!audio || !audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });

    const volSlider = doc.getElementById('pip-volume');
    const audio0 = getAudio();
    if (audio0) volSlider.value = audio0.volume;
    volSlider.addEventListener('input', () => {
      const audio = getAudio();
      if (audio) audio.volume = parseFloat(volSlider.value);
    });

    const volRow = volSlider.closest('.vol') || volSlider.parentElement;
    const onPipWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      adjustVolume(e.deltaY);
    };
    volSlider.addEventListener('wheel', onPipWheel, { passive: false });
    if (volRow) volRow.addEventListener('wheel', onPipWheel, { passive: false });

    const fmt = (s) => {
      if (!isFinite(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + String(sec).padStart(2, '0');
    };

    // Mini waveform in PiP
    const vizCanvas = doc.getElementById('pip-viz');
    function resizePipViz() {
      if (!pipWindow || pipWindow.closed) return;
      const wrap = vizCanvas.parentElement;
      if (!wrap) return;
      const dpr = pipWindow.devicePixelRatio || 1;
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      vizCanvas.width = w * dpr;
      vizCanvas.height = h * dpr;
      vizCanvas.style.width = w + 'px';
      vizCanvas.style.height = h + 'px';
    }
    resizePipViz();
    pipWindow.addEventListener('resize', resizePipViz);

    function drawPipViz() {
      if (!pipWindow || pipWindow.closed) {
        closePiP();
        return;
      }
      const ctx = vizCanvas.getContext('2d');
      const dpr = pipWindow.devicePixelRatio || 1;
      const W = vizCanvas.width;
      const H = vizCanvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, W, H);

      const audio = getAudio();
      if (audio && (!analyser || connectedAudio !== audio)) {
        setupAudioGraph(audio);
      }

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const bars = 32;
        const step = Math.floor(dataArray.length / bars) || 1;
        const barW = W / bars;
        const gap = Math.max(1 * dpr, barW * 0.3);
        for (let i = 0; i < bars; i++) {
          let v = 0;
          for (let j = 0; j < step; j++) v += dataArray[i * step + j] || 0;
          v = Math.min(1, (v / step / 255) * 1.15);
          const bh = Math.max(2 * dpr, v * H * 0.9);
          const x = i * barW + gap / 2;
          const y = H - bh;
          const g = ctx.createLinearGradient(x, H, x, y);
          g.addColorStop(0, 'rgba(29,185,84,0.25)');
          g.addColorStop(1, 'rgba(168,85,247,0.95)');
          ctx.fillStyle = g;
          ctx.fillRect(x, y, barW - gap, bh);
        }
      } else {
        const t = Date.now() / 400;
        for (let i = 0; i < 24; i++) {
          const v = 0.15 + 0.1 * Math.sin(t + i * 0.4);
          const barW = W / 24;
          ctx.fillStyle = 'rgba(29,185,84,0.35)';
          ctx.fillRect(i * barW + 1, H - v * H, barW - 2, v * H);
        }
      }
      pipRaf = requestAnimationFrame(drawPipViz);
    }
    drawPipViz();

    function syncPiP() {
      if (!pipWindow || pipWindow.closed) {
        closePiP();
        return;
      }
      const audio = getAudio();
      const titleEl = doc.getElementById('pip-title');
      const artistEl = doc.getElementById('pip-artist');
      const fill = doc.getElementById('pip-fill');
      const cur = doc.getElementById('pip-cur');
      const dur = doc.getElementById('pip-dur');
      const playIcon = doc.getElementById('pip-play-icon');
      const sh = doc.getElementById('pip-shuffle');
      const rp = doc.getElementById('pip-repeat');

      if (titleEl) titleEl.textContent = getCurrentTitle() || 'Unknown';
      if (artistEl) artistEl.textContent = getCurrentArtist();
      if (sh) sh.classList.toggle('active', isShuffleOn());
      if (rp) rp.classList.toggle('active', isRepeatOn());

      if (audio) {
        const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        if (fill) fill.style.width = pct + '%';
        if (cur) cur.textContent = fmt(audio.currentTime);
        if (dur) dur.textContent = fmt(audio.duration);
        if (volSlider && doc.activeElement !== volSlider) {
          volSlider.value = audio.volume;
        }
        if (playIcon) {
          playIcon.innerHTML = audio.paused
            ? '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>'
            : '<rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none"/>';
        }
      }
    }

    syncPiP();
    pipSyncInterval = setInterval(syncPiP, 250);

    pipWindow.addEventListener('pagehide', closePiP);
    pipWindow.addEventListener('beforeunload', closePiP);
  }

  // ========== VISUALIZER ==========
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let rafId = null;
  let connectedAudio = null;
  const audioSourceMap = new WeakMap();

  function resumeAudioContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  // Keep persistent passive listeners to unlock AudioContext on user gestures
  ['click', 'keydown', 'pointerdown', 'touchstart', 'wheel'].forEach(type => {
    window.addEventListener(type, resumeAudioContext, { passive: true, capture: true });
  });

  function applyAnalyserSettings() {
    if (analyser) {
      analyser.smoothingTimeConstant = settings.smoothing;
    }
  }

  function setupAudioGraph(audio) {
    if (!audio) return false;

    try {
      if (audio.crossOrigin !== 'anonymous') {
        try { audio.crossOrigin = 'anonymous'; } catch (err) {}
      }

      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        audioCtx = new AudioContextClass();
      }

      resumeAudioContext();

      if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = settings.smoothing;
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      }

      if (connectedAudio !== audio) {
        let sourceNode = audioSourceMap.get(audio);
        if (!sourceNode) {
          try {
            sourceNode = audioCtx.createMediaElementSource(audio);
            audioSourceMap.set(audio, sourceNode);
          } catch (e) {
            console.debug('[JuiceVault Extension] MediaElementSource notice:', e);
          }
        }
        if (sourceNode) {
          try { sourceNode.disconnect(); } catch (e) {}
          try { sourceNode.connect(analyser); } catch (e) {}
        }
        connectedAudio = audio;

        // Auto-resume & start visualizer on playback; stop loop when paused to save CPU/battery
        audio.addEventListener('play', () => {
          resumeAudioContext();
          startVisualizer();
        });
        audio.addEventListener('playing', () => {
          resumeAudioContext();
          startVisualizer();
        });
        audio.addEventListener('pause', () => {
          drawVisualizer();
        });
        audio.addEventListener('canplay', resumeAudioContext);
      }

      return true;
    } catch (e) {
      return !!analyser;
    }
  }

  let cachedViz = null;
  let vizResizeObserver = null;

  function findCoverElement() {
    const selectors = [
      '[class*="SongPlayer"] img[src*="cover"]',
      '[class*="SongPlayer"] img[src*="/music/covers/"]',
      'img[src*="/music/covers/"]',
      'img[alt*="album cover" i]',
      'img[alt*="cover" i]',
      '[class*="SongPlayer"] img',
      '[class*="coverWrapper"] img'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function findWaveformParent() {
    if (settings.style === 'circular') {
      const player = document.querySelector('[class*="SongPlayer"]');
      if (player) return player;
    }
    const canvas = document.querySelector('canvas[class*="waveformCanvas"], canvas[class*="SongPlayer_waveform"], [class*="SongPlayer_waveform"] canvas');
    if (canvas && canvas.parentElement) return canvas.parentElement;
    return document.querySelector('[class*="SongPlayer_waveform"], [class*="waveformWrapper"], [class*="waveformContainer"]');
  }

  function resizeCanvas(viz, parent) {
    if (!viz || !parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (viz.width !== w * dpr || viz.height !== h * dpr) {
      viz.width = w * dpr;
      viz.height = h * dpr;
      viz.style.width = w + 'px';
      viz.style.height = h + 'px';
    }
  }

  function ensureVizCanvas() {
    const parent = findWaveformParent();
    if (!parent) {
      cachedViz = null;
      return null;
    }

    let viz = document.getElementById(VIZ_ID);
    if (!viz || viz.parentElement !== parent || !viz.isConnected) {
      if (viz) viz.remove();
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      viz = document.createElement('canvas');
      viz.id = VIZ_ID;
      parent.appendChild(viz);

      if (vizResizeObserver) {
        vizResizeObserver.disconnect();
      }
      vizResizeObserver = new ResizeObserver(() => {
        resizeCanvas(viz, parent);
      });
      vizResizeObserver.observe(parent);
      resizeCanvas(viz, parent);
    }

    cachedViz = viz;
    return viz;
  }

  function themeColors(theme, t) {
    switch (theme) {
      case 'purple': return ['rgba(124,58,237,0.25)', 'rgba(168,85,247,0.85)', 'rgba(236,72,153,0.95)'];
      case 'green': return ['rgba(6,78,59,0.2)', 'rgba(16,185,129,0.75)', 'rgba(52,211,153,0.95)'];
      case 'fire': return ['rgba(127,29,29,0.2)', 'rgba(239,68,68,0.75)', 'rgba(251,191,36,0.95)'];
      case 'ice': return ['rgba(30,58,138,0.2)', 'rgba(59,130,246,0.75)', 'rgba(186,230,253,0.95)'];
      default:
        if (t < 0.35) return ['rgba(139,92,246,0.15)', 'rgba(168,85,247,0.7)', 'rgba(236,72,153,0.95)'];
        if (t < 0.7) return ['rgba(236,72,153,0.15)', 'rgba(244,114,182,0.7)', 'rgba(52,211,153,0.95)'];
        return ['rgba(16,185,129,0.15)', 'rgba(52,211,153,0.7)', 'rgba(29,185,84,0.95)'];
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function getBarValues(bars) {
    const values = [];
    if (!dataArray || dataArray.length === 0) return values;

    const isCentered = settings.centerMirror && (settings.style === 'bars' || settings.style === 'mirror');
    const effectiveBars = isCentered ? Math.floor(bars / 2) : bars;

    const totalBins = dataArray.length;
    const minBin = 1;
    const maxBin = Math.min(totalBins - 1, Math.floor(totalBins * 0.72));

    const half = [];
    for (let i = 0; i < effectiveBars; i++) {
      const t0 = i / effectiveBars;
      const t1 = (i + 1) / effectiveBars;
      const startBin = Math.max(0, Math.floor(minBin * Math.pow(maxBin / minBin, t0)));
      const endBin = Math.min(totalBins - 1, Math.max(startBin + 1, Math.floor(minBin * Math.pow(maxBin / minBin, t1))));

      let sum = 0;
      let count = 0;
      for (let b = startBin; b <= endBin; b++) {
        sum += dataArray[b] || 0;
        count++;
      }
      const rawAvg = count > 0 ? (sum / count) / 255 : 0;

      // Frequency tilt compensation (pink noise falloff): boosts treble so all bars dance
      const tilt = 1.0 + Math.pow(t0, 0.75) * 0.45;

      // Soft non-linear compression with ceiling headroom (never clips or stays "full")
      const compressed = Math.pow(rawAvg, 1.1) * tilt;
      const finalVal = Math.min(0.88, compressed * 0.75 * settings.intensity);

      half.push(finalVal);
    }

    if (isCentered) {
      for (let i = half.length - 1; i >= 0; i--) values.push(half[i]);
      for (let i = 0; i < half.length; i++) values.push(half[i]);
    } else {
      return half;
    }
    return values;
  }

  function drawBars(ctx, W, H, dpr, mirrored) {
    const bars = settings.bars;
    const values = getBarValues(bars);
    const barWidth = W / bars;
    const gap = Math.max(2 * dpr, barWidth * 0.22);
    const usable = barWidth - gap;
    const isCentered = settings.centerMirror;

    ctx.save();
    if (mirrored) {
      const midY = H / 2;
      const maxH = midY - 6 * dpr;

      for (let i = 0; i < bars; i++) {
        const value = values[i];
        const barH = Math.max(2.5 * dpr, value * maxH);
        const x = i * barWidth + gap / 2;

        const normT = isCentered ? (1 - Math.abs(i - bars / 2) / (bars / 2)) : (i / bars);
        const colors = themeColors(settings.colorTheme, normT);

        const gradUp = ctx.createLinearGradient(x, midY, x, midY - barH);
        gradUp.addColorStop(0, colors[0]);
        gradUp.addColorStop(0.5, colors[1]);
        gradUp.addColorStop(1, colors[2]);
        ctx.beginPath();
        roundRect(ctx, x, midY - barH, usable, barH, Math.min(usable / 2, 4 * dpr));
        ctx.fillStyle = gradUp;
        ctx.fill();

        const gradDown = ctx.createLinearGradient(x, midY, x, midY + barH);
        gradDown.addColorStop(0, colors[0]);
        gradDown.addColorStop(0.5, colors[1]);
        gradDown.addColorStop(1, colors[2]);
        ctx.beginPath();
        roundRect(ctx, x, midY, usable, barH, Math.min(usable / 2, 4 * dpr));
        ctx.fillStyle = gradDown;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    } else {
      // Baseline is flush on top of the purple line at the bottom of the canvas
      const baseY = Math.floor(H - 2 * dpr);
      const maxH = baseY - 8 * dpr;

      for (let i = 0; i < bars; i++) {
        const value = values[i];
        const barH = Math.max(2.5 * dpr, value * maxH);
        const x = i * barWidth + gap / 2;
        const y = baseY - barH;

        const normT = isCentered ? (1 - Math.abs(i - bars / 2) / (bars / 2)) : (i / bars);
        const colors = themeColors(settings.colorTheme, normT);
        const grad = ctx.createLinearGradient(x, baseY, x, y);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.5, colors[1]);
        grad.addColorStop(1, colors[2]);

        ctx.beginPath();
        roundRect(ctx, x, y, usable, barH, Math.min(usable / 2, 4 * dpr));
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawWave(ctx, W, H, dpr) {
    const bars = settings.bars;
    const values = getBarValues(bars);
    const baseY = Math.floor(H - 3 * dpr);
    const maxH = baseY - 8 * dpr;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let i = 0; i < bars; i++) {
      const x = (i / (bars - 1)) * W;
      const y = baseY - values[i] * maxH - 2 * dpr;
      if (i === 0) ctx.lineTo(x, y);
      else {
        const prevX = ((i - 1) / (bars - 1)) * W;
        ctx.quadraticCurveTo(prevX, baseY - values[i - 1] * maxH, (prevX + x) / 2, (baseY - values[i - 1] * maxH + y) / 2);
      }
    }
    ctx.lineTo(W, baseY);
    ctx.closePath();
    const c = themeColors(settings.colorTheme, 0.5);
    const grad = ctx.createLinearGradient(0, baseY, 0, 0);
    grad.addColorStop(0, c[0]);
    grad.addColorStop(0.6, c[1]);
    grad.addColorStop(1, c[2]);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  let cachedCoverEl = null;
  let cachedCoverRect = null;
  let lastCoverCheck = 0;

  function getCoverRect(viz) {
    const now = performance.now();
    if (cachedCoverEl && cachedCoverEl.isConnected && (now - lastCoverCheck < 1000) && cachedCoverRect) {
      return cachedCoverRect;
    }
    lastCoverCheck = now;
    cachedCoverEl = findCoverElement();
    if (cachedCoverEl && viz) {
      const cRect = cachedCoverEl.getBoundingClientRect();
      const vRect = viz.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cachedCoverRect = {
        cx: (cRect.left + cRect.width / 2 - vRect.left) * dpr,
        cy: (cRect.top + cRect.height / 2 - vRect.top) * dpr,
        baseHalf: (Math.max(cRect.width, cRect.height) / 2) * dpr
      };
      return cachedCoverRect;
    }
    cachedCoverRect = null;
    return null;
  }

  function drawCircular(ctx, W, H, dpr) {
    const bars = settings.bars;
    const values = getBarValues(bars);
    const coverInfo = getCoverRect(cachedViz);

    let cx = W / 2;
    let cy = H / 2;
    let baseHalf = Math.min(W, H) * 0.22;
    let isSquareCover = false;

    if (coverInfo) {
      cx = coverInfo.cx;
      cy = coverInfo.cy;
      baseHalf = coverInfo.baseHalf;
      isSquareCover = true;
    }

    const maxRayLen = Math.min(W, H) * 0.22;
    const strokeW = Math.max(2.5 * dpr, ((Math.PI * 2 * baseHalf) / bars) * 0.5);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeW;

    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      let startR;
      if (isSquareCover) {
        const denom = Math.max(0.72, Math.max(Math.abs(cosA), Math.abs(sinA)));
        startR = (baseHalf / denom) + 6 * dpr;
      } else {
        startR = baseHalf + 6 * dpr;
      }

      const rayLen = Math.max(4 * dpr, values[i] * maxRayLen);
      const endR = startR + rayLen;

      ctx.strokeStyle = themeColors(settings.colorTheme, i / bars)[2];
      ctx.beginPath();
      ctx.moveTo(cx + cosA * startR, cy + sinA * startR);
      ctx.lineTo(cx + cosA * endR, cy + sinA * endR);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVisualizer() {
    if (!settings.enabled || document.hidden) {
      rafId = null;
      return;
    }

    const audio = getAudio();
    if (audio) {
      setupAudioGraph(audio);
      if (!audio.paused && audioCtx && audioCtx.state === 'suspended') {
        resumeAudioContext();
      }
    }

    const viz = (cachedViz && cachedViz.isConnected) ? cachedViz : ensureVizCanvas();
    if (!viz) {
      rafId = requestAnimationFrame(drawVisualizer);
      return;
    }

    const ctx = viz.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let W = viz.width;
    let H = viz.height;
    if (W === 0 || H === 0) {
      if (viz.parentElement) resizeCanvas(viz, viz.parentElement);
      W = viz.width;
      H = viz.height;
      if (W === 0 || H === 0) {
        rafId = requestAnimationFrame(drawVisualizer);
        return;
      }
    }

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(8,4,20,0.2)');
    bg.addColorStop(1, 'rgba(4,0,12,0.4)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      if (settings.style === 'wave') drawWave(ctx, W, H, dpr);
      else if (settings.style === 'circular') drawCircular(ctx, W, H, dpr);
      else if (settings.style === 'mirror') drawBars(ctx, W, H, dpr, true);
      else drawBars(ctx, W, H, dpr, false);
    }

    // Performance optimization: when audio is paused, do not keep looping RAF at 60 FPS
    if (audio && audio.paused) {
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(drawVisualizer);
  }

  function startVisualizer() {
    if (!settings.enabled || document.hidden) return;
    resumeAudioContext();
    if (rafId) return;
    drawVisualizer();
  }

  function stopVisualizer() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (cachedViz) {
      const ctx = cachedViz.getContext('2d');
      ctx.clearRect(0, 0, cachedViz.width, cachedViz.height);
    }
  }

  // Stop RAF when tab is hidden, resume when tab is active
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      if (settings.enabled) startVisualizer();
    }
  });

  // ========== VOLUME SCROLL & PERSISTENCE ==========
  let savedVolume = null;
  try {
    const v = localStorage.getItem('jv-user-volume');
    if (v !== null && !isNaN(parseFloat(v))) {
      savedVolume = Math.min(1, Math.max(0, parseFloat(v)));
    }
  } catch (e) {}

  let isSelfVolumeChange = false;
  let volumeToastTimer = null;
  let scrollStartTime = 0;
  let lastScrollTime = 0;
  let lastScrollDir = 0;

  function showVolumeToast(vol) {
    let toast = document.getElementById('jv-volume-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'jv-volume-toast';
      document.body.appendChild(toast);
    }
    const pct = Math.round(vol * 100);
    const speakerSvg = pct === 0
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
      : pct < 50
        ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
        : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';

    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${speakerSvg}</svg>
      <div class="jv-vol-bar"><div class="jv-vol-fill" style="width:${pct}%;"></div></div>
      <span>${pct}%</span>
    `;
    toast.classList.add('show');
    if (volumeToastTimer) clearTimeout(volumeToastTimer);
    volumeToastTimer = setTimeout(() => {
      if (toast) toast.classList.remove('show');
    }, 1200);
  }

  function applyVolume(vol, fromUser = false) {
    if (typeof vol !== 'number' || isNaN(vol)) return;
    vol = Math.min(1, Math.max(0, Math.round(vol * 100) / 100));
    savedVolume = vol;

    if (fromUser) {
      try { localStorage.setItem('jv-user-volume', String(savedVolume)); } catch (e) {}
    }

    isSelfVolumeChange = true;
    try {
      // 1. Directly update ALL audio elements on the page
      const audios = Array.from(document.querySelectorAll('audio'));
      audios.forEach(a => {
        try {
          if (Math.abs(a.volume - vol) > 0.005) {
            a.volume = vol;
          }
          if (vol > 0 && a.muted) a.muted = false;
        } catch (e) {}
      });

      // 2. Sync React range inputs using native value setter & tracker reset (ONLY volume inputs)
      document.querySelectorAll('input[type="range"]').forEach(inp => {
        try {
          const cls = ((inp.className || '') + ' ' + ((inp.parentElement && inp.parentElement.className) || '')).toLowerCase();
          const isVol = cls.includes('volume') || (inp.id || '').toLowerCase().includes('volume') || (inp.getAttribute('aria-label') || '').toLowerCase().includes('volume');
          if (!isVol) return;

          const max = parseFloat(inp.max || '100');
          const val = String(max === 1 ? vol : Math.round(vol * max));
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeSetter) {
            nativeSetter.call(inp, val);
          } else {
            inp.value = val;
          }
          if (inp._valueTracker) {
            inp._valueTracker.setValue('');
          }
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
      });

      // 3. Sync Radix UI Volume Slider attribute (strictly volume only, NEVER dispatch arrow keys)
      document.querySelectorAll('[aria-label="Volume"] [role="slider"], [role="slider"][aria-label*="Volume" i]').forEach(slider => {
        try {
          slider.setAttribute('aria-valuenow', String(Math.round(vol * 100)));
        } catch (e) {}
      });

      // 4. Sync PiP window slider if open
      if (pipWindow && !pipWindow.closed) {
        const pipSlider = pipWindow.document.getElementById('pip-volume');
        if (pipSlider) pipSlider.value = vol;
      }

      if (fromUser) {
        showVolumeToast(vol);
      }
    } finally {
      setTimeout(() => { isSelfVolumeChange = false; }, 35);
    }
  }

  function adjustVolume(deltaY) {
    const audios = Array.from(document.querySelectorAll('audio'));
    const activeAudio = getAudio() || audios[0];
    if (!activeAudio && audios.length === 0) return;

    const now = performance.now();
    const dir = deltaY > 0 ? -1 : 1;

    // Reset continuous scroll timer if paused/slowed down (>280ms) or reversed direction
    if (now - lastScrollTime > 280 || dir !== lastScrollDir) {
      scrollStartTime = now;
    }
    lastScrollTime = now;
    lastScrollDir = dir;

    // Smoothing & acceleration: 1% base step; accelerates to 2% if scrolled continuously for > 1 second
    const isAccelerated = (now - scrollStartTime) >= 1000;
    const step = isAccelerated ? 0.02 : 0.01;

    const current = (savedVolume !== null)
      ? savedVolume
      : ((activeAudio && !isNaN(activeAudio.volume)) ? activeAudio.volume : 0.5);

    const newVol = Math.min(1, Math.max(0, Math.round((current + dir * step) * 100) / 100));
    applyVolume(newVol, true);
  }

  function prepareAudioElement(audio) {
    if (!audio) return;
    if (audio.crossOrigin !== 'anonymous') {
      try { audio.crossOrigin = 'anonymous'; } catch (e) {}
    }
    if (savedVolume !== null && Math.abs(audio.volume - savedVolume) > 0.005) {
      applyVolume(savedVolume, false);
    }
  }

  // Intercept volume resets by JuiceVault / React (e.g. Next Track resetting volume to default)
  window.addEventListener('volumechange', (e) => {
    if (isSelfVolumeChange) return;
    const audio = e.target;
    if (audio && audio.tagName === 'AUDIO' && savedVolume !== null) {
      if (Math.abs(audio.volume - savedVolume) > 0.005) {
        applyVolume(savedVolume, false);
      }
    }
  }, true);

  // Track change / song loading hooks: enforce saved volume & audio graph resumption
  ['loadstart', 'loadedmetadata', 'canplay', 'play', 'playing'].forEach(evt => {
    window.addEventListener(evt, (e) => {
      const audio = e.target;
      if (audio && audio.tagName === 'AUDIO') {
        prepareAudioElement(audio);
        if (savedVolume !== null) {
          applyVolume(savedVolume, false);
          setTimeout(() => applyVolume(savedVolume, false), 50);
          setTimeout(() => applyVolume(savedVolume, false), 200);
        }
        resumeAudioContext();
        setupAudioGraph(audio);
      }
    }, true);
  });

  // Window-level wheel delegation for guaranteed volume scroll on bottom miniplayer bar & player
  window.addEventListener('wheel', (e) => {
    const target = e.target;
    if (!target) return;

    const inPlayer = target.closest(
      '[class*="MiniPlayer"], [class*="miniPlayer"], [class*="mini-player"], ' +
      '[class*="SongPlayer"], [class*="songPlayer"], [class*="bottomPlayer"], ' +
      '#jv-mini-container, #jv-full-container, footer'
    );
    const isAtBottom = (window.innerHeight - e.clientY) <= 100;

    if (inPlayer || isAtBottom) {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      e.stopPropagation();
      adjustVolume(e.deltaY);
    }
  }, { passive: false });

  function hookVolumeScrollAreas() {
    // Volume scrolling is now cleanly handled via global window delegation
  }

  // ========== MAIN ==========
  function tryAll() {
    document.querySelectorAll('audio').forEach(prepareAudioElement);

    if (document.querySelector('[class*="SongPlayer"]')) {
      injectFull();
      hookVisualizerButton();
      startVisualizer();
    }
    if (document.querySelector('[class*="MiniPlayer"]')) {
      injectMini();
    }
    hookVolumeScrollAreas();
  }

  // Throttled mutation observer to prevent layout thrashing and excessive DOM queries
  let tryAllTimer = null;
  function scheduleTryAll() {
    if (tryAllTimer) return;
    tryAllTimer = setTimeout(() => {
      tryAllTimer = null;
      cachedAudio = null;
      cachedCoverEl = null;
      cachedCoverRect = null;
      tryAll();
    }, 200);
  }

  const observer = new MutationObserver(scheduleTryAll);
  observer.observe(document.body, { childList: true, subtree: true });

  tryAll();
  [300, 800, 1800, 3000].forEach(t => setTimeout(tryAll, t));
})();
