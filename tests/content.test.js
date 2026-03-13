/**
 * Tests for the functions injected into page context via chrome.scripting.executeScript.
 * These run against jsdom which provides a real DOM environment without needing Chrome.
 */

// ─── Functions under test (copied verbatim from popup.js) ────────────────────

function setDarkModeIntensity(intensity) {
  const invertValue = intensity / 100;
  const isGoogleDocs = window.location.hostname === 'docs.google.com';
  const mediaSelector = isGoogleDocs
    ? 'img, video, iframe, picture, svg image'
    : 'img, video, iframe, canvas, picture, svg image';
  const style = document.getElementById('dark-reader-style');
  if (style) {
    style.textContent = `
      html { filter: invert(${invertValue}) hue-rotate(180deg) !important; }
      ${mediaSelector} {
        filter: invert(${invertValue}) hue-rotate(180deg) !important;
      }
    `;
  } else {
    const el = document.createElement('style');
    el.id = 'dark-reader-style';
    el.textContent = `
      html { filter: invert(${invertValue}) hue-rotate(180deg) !important; }
      ${mediaSelector} {
        filter: invert(${invertValue}) hue-rotate(180deg) !important;
      }
    `;
    document.head.appendChild(el);
  }
  return true;
}

function toggleDarkMode(intensity = 100) {
  const style = document.getElementById('dark-reader-style');
  if (style) {
    style.remove();
    return false;
  }
  const invertValue = intensity / 100;
  const isGoogleDocs = window.location.hostname === 'docs.google.com';
  const mediaSelector = isGoogleDocs
    ? 'img, video, iframe, picture, svg image'
    : 'img, video, iframe, canvas, picture, svg image';
  const el = document.createElement('style');
  el.id = 'dark-reader-style';
  el.textContent = `
    html { filter: invert(${invertValue}) hue-rotate(180deg) !important; }
    ${mediaSelector} {
      filter: invert(${invertValue}) hue-rotate(180deg) !important;
    }
  `;
  document.head.appendChild(el);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('toggleDarkMode', () => {
  test('enables dark mode when off and returns true', () => {
    const result = toggleDarkMode(100);
    expect(result).toBe(true);
    expect(document.getElementById('dark-reader-style')).not.toBeNull();
  });

  test('disables dark mode when on and returns false', () => {
    toggleDarkMode(100);
    const result = toggleDarkMode(100);
    expect(result).toBe(false);
    expect(document.getElementById('dark-reader-style')).toBeNull();
  });

  test('toggling twice leaves no style element', () => {
    toggleDarkMode();
    toggleDarkMode();
    expect(document.querySelectorAll('#dark-reader-style')).toHaveLength(0);
  });

  test('sets correct invert value for intensity 50', () => {
    toggleDarkMode(50);
    const style = document.getElementById('dark-reader-style');
    expect(style.textContent).toContain('invert(0.5)');
  });

  test('sets correct invert value for intensity 100', () => {
    toggleDarkMode(100);
    const style = document.getElementById('dark-reader-style');
    expect(style.textContent).toContain('invert(1)');
  });

  test('applies hue-rotate(180deg) to html element', () => {
    toggleDarkMode();
    const style = document.getElementById('dark-reader-style');
    expect(style.textContent).toMatch(/html\s*\{[^}]*hue-rotate\(180deg\)/);
  });

  test('applies counter-invert filter to images and media', () => {
    toggleDarkMode();
    const style = document.getElementById('dark-reader-style');
    expect(style.textContent).toContain('img, video, iframe, canvas, picture, svg image');
  });

  test('does not create duplicate style elements', () => {
    toggleDarkMode();
    // second call removes it, third re-adds — still only one element
    toggleDarkMode();
    toggleDarkMode();
    expect(document.querySelectorAll('#dark-reader-style')).toHaveLength(1);
  });
});

describe('setDarkModeIntensity', () => {
  test('creates a style element when none exists', () => {
    setDarkModeIntensity(80);
    expect(document.getElementById('dark-reader-style')).not.toBeNull();
  });

  test('returns true', () => {
    expect(setDarkModeIntensity(100)).toBe(true);
  });

  test('updates existing style element instead of creating a new one', () => {
    setDarkModeIntensity(100);
    setDarkModeIntensity(50);
    expect(document.querySelectorAll('#dark-reader-style')).toHaveLength(1);
    expect(document.getElementById('dark-reader-style').textContent).toContain('invert(0.5)');
  });

  test('sets correct invert value for intensity 0', () => {
    setDarkModeIntensity(0);
    expect(document.getElementById('dark-reader-style').textContent).toContain('invert(0)');
  });

  test('applies hue-rotate(180deg)', () => {
    setDarkModeIntensity(100);
    expect(document.getElementById('dark-reader-style').textContent).toContain('hue-rotate(180deg)');
  });

  test('counter-inverts images and media', () => {
    setDarkModeIntensity(75);
    const css = document.getElementById('dark-reader-style').textContent;
    expect(css).toContain('img, video, iframe, canvas, picture, svg image');
    expect(css).toContain('invert(0.75)');
  });
});

describe('on Google Docs', () => {
  beforeEach(() => {
    delete window.location;
    window.location = new URL('https://docs.google.com/document/d/abc');
    document.head.innerHTML = '';
  });

  afterEach(() => {
    delete window.location;
    window.location = new URL('about:blank');
  });

  test('toggleDarkMode does not counter-invert canvas', () => {
    toggleDarkMode();
    const css = document.getElementById('dark-reader-style').textContent;
    expect(css).not.toContain('canvas');
  });

  test('setDarkModeIntensity does not counter-invert canvas', () => {
    setDarkModeIntensity(100);
    const css = document.getElementById('dark-reader-style').textContent;
    expect(css).not.toContain('canvas');
  });
});
