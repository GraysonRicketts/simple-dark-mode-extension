# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install   # install dev dependencies (Jest)
npm test      # run all tests
```

## Architecture

This is a Manifest V3 Chrome extension with no build step — all files are loaded directly by Chrome.

**Key files:**
- [manifest.json](manifest.json) — declares `activeTab` and `scripting` permissions; points to `popup.html` as the action popup
- [popup.js](popup.js) — all extension logic lives here; no separate content script
- [popup.html](popup.html) / [popup.css](popup.css) — popup UI with a toggle button and intensity slider

**How it works:**

Dark mode is applied by injecting a `<style id="dark-reader-style">` element into the active tab's `document.head` via `chrome.scripting.executeScript`. The CSS uses `filter: invert() hue-rotate(180deg)` on `html`, with a counter-invert on media elements (`img`, `video`, `iframe`, `canvas`, `picture`, `svg image`) to preserve their original appearance.

The two injected functions — `toggleDarkMode` and `setDarkModeIntensity` — are defined in `popup.js` and passed as `func` to `executeScript` (they run in the page context, not the popup context). Because of this, they are also duplicated verbatim in [tests/content.test.js](tests/content.test.js) so Jest/jsdom can test them without a browser.

**Important constraint:** If you modify `toggleDarkMode` or `setDarkModeIntensity` in `popup.js`, you must update the copies in `tests/content.test.js` as well.

The popup auto-enables dark mode when opened (if not already active) and updates the toolbar icon (`icons/bulb-lit.svg` ↔ `icons/bulb-dark.svg`) to reflect state.

Does not work on `chrome://` pages or the Chrome Web Store.
