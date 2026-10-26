# 🎵 JuiceVault Enhancer & Audio Visualizer Suite

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue.svg?logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Target Site](https://img.shields.io/badge/Target-juicevault.xyz-8b5cf6.svg)](https://juicevault.xyz)
[![Privacy First](https://img.shields.io/badge/Privacy-Zero_Data_Collection-success.svg)](#-privacy--security-guarantee)
[![Version](https://img.shields.io/badge/Version-3.1-c084fc.svg)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A high-performance, developer-grade browser extension engineered specifically for **[JuiceVault](https://juicevault.xyz)**. It seamlessly integrates a real-time hardware-accelerated Web Audio visualizer, an intelligent volume wheel controller with persistent memory, a floating Document Picture-in-Picture miniplayer, and instant Genius lyrics search.

---

## ✨ Key Features

### 1. 🎛️ Real-Time Audio Visualizer
* **4 Distinct Visualizer Modes:**
  * **Bars (Bottom Baseline):** Responsive frequency bars seated directly on the player baseline line with no clipping or gaps.
  * **Mirror Bars:** Vertical 4-way symmetrical bars radiating upwards and downwards.
  * **Waveform:** Organic, flowing Bezier curve wave.
  * **Circular Album Halo:** Concentric halo that dynamically fits square and rounded album art, pulsing outward with bass and rhythm.
* **Symmetrical Center-Mirroring:** Optional "Mirror from center" toggle (for *Bars* and *Mirror Bars*) that anchors 808 sub-bass in the exact horizontal middle of the screen and mirrors outward symmetrically.
* **Logarithmic Octave Binning & Pink-Noise Equalization:** Balances 808 trap sub-bass with crisp mid-vocals and hi-hats across the full spectrum.
* **Dynamic Headroom Compression:** Never clips or looks "full/stuck at the top", even on loud mastered tracks.
* **5 Curated Color Themes:** *Purple Haze (Site Native)*, *Neon*, *Juice Green*, *Fire*, and *Ice*.

### 2. 🔊 Smart Volume Engine & Wheel Control
* **Hover & Scroll Volume:** Adjust track volume anywhere over the full player or bottom miniplayer using your mouse wheel.
* **Accelerated Fine-Tuning:** 1% precision step for delicate adjustment; automatically accelerates to 2% during continuous scrolling (>1s).
* **Cross-Track Memory Persistence:** Automatically remembers your chosen volume level in local storage across song changes, autoplay, and browser restarts.
* **Site HUD Integration:** Displays an unobtrusive, neon-glow JuiceVault volume toast HUD while hiding native redundant sliders.

### 3. 🖼️ Document Picture-in-Picture Floating Miniplayer
* Powered by the modern `documentPictureInPicture` API.
* Floats outside the browser on top of any game, IDE, or desktop app.
* Includes real-time progress seekbar, mini visualizer canvas, shuffle/repeat toggles, and volume slider.

### 4. 🎤 Quick Lyrics Lookup
* Press **`Alt + L`** anytime or click the lyrics badge to instantly open Genius search for the current track and artist in a secure, sandboxed tab.

---

## ⚡ Ultra-Lite Performance & Architecture

Designed from the ground up to consume **zero wasted CPU/GPU cycles**:
* **0% CPU Idle Mode:** The `requestAnimationFrame` render loop automatically halts when audio is paused or muted.
* **Tab Visibility Throttling:** Pauses GPU rendering when the tab is hidden or minimized (`document.visibilityState === 'hidden'`).
* **Zero-DOM Rendering Loop:** Audio element references and bounding dimensions are cached to eliminate 60 FPS layout thrashing.
* **Clean Isolation:** Executes purely within standard DOM lifecycle hooks without prototype pollution or runtime dependencies.

---

## 🔒 Privacy & Security Guarantee

* **100% Offline-First:** Zero telemetry, zero analytics, zero external network requests (`fetch`/`XHR`).
* **No User Data Collected:** The extension does not store, transmit, or process any personal data, accounts, credentials, browsing history, or cookies.
* **Strict Domain Sandboxing:**
  * Content scripts and service workers execute strictly on `https://juicevault.xyz/*`.
  * External tab links (`Genius`) are strictly isolated with `noopener,noreferrer`.
  * Local storage is strictly scoped to local UI settings (`bars`, `style`, `theme`) and volume level.

---

## 🚀 Installation Guide

### Chrome / Brave / Edge / Opera (Chromium-based):

1. **Download or Clone the Repository:**
   ```bash
   git clone https://github.com/Spinti1/juicevault-lyrics-extension.git
   ```
2. Open your browser's extension management page:
   * **Chrome / Brave:** `chrome://extensions/`
   * **Microsoft Edge:** `edge://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (Încarcă despachetat).
5. Select the `juice-lyrics-extension` directory.
6. Navigate to **[juicevault.xyz](https://juicevault.xyz)** and enjoy!

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut / Action | Function | Scope |
| :--- | :--- | :--- |
| **`Alt + L`** | Open Genius lyrics for current playing track | Global |
| **Mouse Wheel (Scroll)** | Increase / Decrease Volume (1% - 2%) | Hover over Player / MiniPlayer |
| **Visualizer Icon** | Open / Close Purple Visualizer Settings Panel | Top Right of Song Player |
| **PiP Icon** | Open floating desktop Picture-in-Picture miniplayer | Player Top Right / MiniPlayer |
| **Extension Icon** | Toggle quick help overlay panel | Browser Action |

---

## 📁 Project Structure

```
juicevault-lyrics-extension/
├── manifest.json       # Chrome Manifest V3 configuration & permissions
├── content.js          # Core audio graph, visualizer renderer & volume controller
├── content.css         # UI styles, purple theme variables & volume HUD
├── background.js       # Service worker handling commands & tab messaging
├── icon16.png          # 16x16 extension toolbar icon
├── icon48.png          # 48x48 extension management icon
├── icon128.png         # 128x128 high-res Web Store icon
├── LICENSE             # MIT License
└── README.md           # Documentation
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE). Built with ❤️ for Juice WRLD fans and the JuiceVault community.
