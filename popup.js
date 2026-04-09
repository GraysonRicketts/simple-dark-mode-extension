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

// ─── URL storage helpers ──────────────────────────────────────────────────────

// Returns "hostname" or "hostname/path" (no scheme, no trailing slash, no query/hash)
function getUrlKey(tabUrl) {
  try {
    const { hostname, pathname } = new URL(tabUrl);
    const path = pathname.replace(/\/$/, '');
    return path ? hostname + path : hostname;
  } catch {
    return null;
  }
}

function getHostname(tabUrl) {
  try {
    return new URL(tabUrl).hostname;
  } catch {
    return null;
  }
}

// Hierarchical lookup: tries exact key, then progressively shorter parent paths.
// Returns true/false if found, null if no entry covers this URL.
async function getStoredSetting(urlKey) {
  const { urlSettings = {} } = await chrome.storage.local.get('urlSettings');
  const segments = urlKey.split('/');
  for (let i = segments.length; i >= 1; i--) {
    const key = segments.slice(0, i).join('/');
    if (key in urlSettings) return urlSettings[key];
  }
  return null;
}

async function saveSetting(urlKey, isOn) {
  const { urlSettings = {} } = await chrome.storage.local.get('urlSettings');
  urlSettings[urlKey] = isOn;
  await chrome.storage.local.set({ urlSettings });
}

async function removeSetting(urlKey) {
  const { urlSettings = {} } = await chrome.storage.local.get('urlSettings');
  delete urlSettings[urlKey];
  await chrome.storage.local.set({ urlSettings });
}

async function getDomainSettings(hostname) {
  const { urlSettings = {} } = await chrome.storage.local.get('urlSettings');
  return Object.entries(urlSettings)
    .filter(([key]) => key === hostname || key.startsWith(hostname + '/'))
    .sort(([a], [b]) => a.localeCompare(b));
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const btn = document.getElementById('toggle');
const slider = document.getElementById('intensity-slider');
const intensityDisplay = document.getElementById('intensity-display');
const intensityControl = document.getElementById('intensity-control');
const urlList = document.getElementById('url-list');

function updateUI(isActive, intensity) {
  btn.textContent = isActive ? `Dark Mode: ON (${intensity}%)` : 'Dark Mode: OFF';
  if (isActive) {
    intensityControl.classList.remove('hidden');
    chrome.action.setIcon({ path: 'icons/bulb-dark.svg' });
  } else {
    intensityControl.classList.add('hidden');
    chrome.action.setIcon({ path: 'icons/bulb-lit.svg' });
  }
}

async function renderUrlList(hostname) {
  const settings = await getDomainSettings(hostname);
  urlList.innerHTML = '';
  if (settings.length === 0) return;

  const header = document.createElement('p');
  header.className = 'url-list-header';
  header.textContent = 'Saved for this domain:';
  urlList.appendChild(header);

  for (const [key, isOn] of settings) {
    const row = document.createElement('div');
    row.className = 'url-item';

    const label = document.createElement('span');
    label.className = 'url-label';
    label.textContent = key;
    label.title = key;

    // Clicking the badge flips the stored ON/OFF state
    const badge = document.createElement('button');
    badge.className = isOn ? 'url-badge on' : 'url-badge off';
    badge.textContent = isOn ? 'ON' : 'OFF';
    badge.title = 'Click to toggle';
    badge.addEventListener('click', async () => {
      await saveSetting(key, !isOn);
      await renderUrlList(hostname);
    });

    // Pencil button: replaces the label with an inline input
    const editBtn = document.createElement('button');
    editBtn.className = 'url-edit';
    editBtn.textContent = '✎';
    editBtn.title = 'Edit URL';
    editBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'url-edit-input';
      input.value = key;
      row.replaceChild(input, label);
      input.focus();
      input.select();

      async function commitEdit() {
        const newKey = input.value.trim();
        if (newKey && newKey !== key) {
          await removeSetting(key);
          await saveSetting(newKey, isOn);
        }
        await renderUrlList(hostname);
      }

      input.addEventListener('blur', commitEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') renderUrlList(hostname);
      });
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'url-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove saved setting';
    removeBtn.addEventListener('click', async () => {
      await removeSetting(key);
      await renderUrlList(hostname);
    });

    row.appendChild(label);
    row.appendChild(badge);
    row.appendChild(editBtn);
    row.appendChild(removeBtn);
    urlList.appendChild(row);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const urlKey = getUrlKey(tab.url);
  const hostname = getHostname(tab.url);

  if (!urlKey) return; // chrome:// pages, etc.

  const currentIntensity = parseInt(slider.value);

  const [{ result: isAlreadyActive }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => !!document.getElementById('dark-reader-style'),
  });

  if (isAlreadyActive) {
    updateUI(true, currentIntensity);
  } else {
    const storedSetting = await getStoredSetting(urlKey);
    if (storedSetting === false) {
      // Explicitly stored as OFF — respect it
      updateUI(false, currentIntensity);
    } else {
      // Stored as ON, inherited as ON, or no entry — auto-enable
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: toggleDarkMode,
        args: [currentIntensity],
      });
      updateUI(result, currentIntensity);
      // Only create a new entry if nothing already covers this URL
      if (storedSetting === null) {
        await saveSetting(urlKey, true);
      }
    }
  }

  await renderUrlList(hostname);

  btn.addEventListener('click', async () => {
    const intensity = parseInt(slider.value);
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleDarkMode,
      args: [intensity],
    });
    updateUI(result, intensity);
    await saveSetting(urlKey, result);
    await renderUrlList(hostname);
  });

  slider.addEventListener('input', async (e) => {
    const intensity = parseInt(e.target.value);
    intensityDisplay.textContent = `${intensity}%`;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: setDarkModeIntensity,
      args: [intensity],
    });
    if (result) btn.textContent = `Dark Mode: ON (${intensity}%)`;
  });
})();
