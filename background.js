// Runs in page context — applies dark mode if not already active
function applyDarkMode() {
  if (document.getElementById('dark-reader-style')) return;
  const isGoogleDocs = window.location.hostname === 'docs.google.com';
  const mediaSelector = isGoogleDocs
    ? 'img, video, iframe, picture, svg image'
    : 'img, video, iframe, canvas, picture, svg image';
  const el = document.createElement('style');
  el.id = 'dark-reader-style';
  el.textContent = `
    html { filter: invert(1) hue-rotate(180deg) !important; }
    ${mediaSelector} {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
  document.head.appendChild(el);
}

function getUrlKey(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname.replace(/\/$/, '');
    return path ? hostname + path : hostname;
  } catch {
    return null;
  }
}

async function getStoredSetting(urlKey) {
  const { urlSettings = {} } = await chrome.storage.local.get('urlSettings');
  const segments = urlKey.split('/');
  for (let i = segments.length; i >= 1; i--) {
    const key = segments.slice(0, i).join('/');
    if (key in urlSettings) return urlSettings[key];
  }
  return null;
}

chrome.webNavigation.onCompleted.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return; // main frame only
  const urlKey = getUrlKey(url);
  if (!urlKey) return;
  const storedSetting = await getStoredSetting(urlKey);
  if (storedSetting === true) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, func: applyDarkMode });
      await chrome.action.setIcon({ tabId, path: 'icons/bulb-dark.svg' });
    } catch {
      // chrome:// pages and other restricted URLs — ignore
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setIcon({ path: 'icons/bulb-lit.svg' });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.action.setIcon({ path: 'icons/bulb-lit.svg' });
});
