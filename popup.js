// Function to set dark mode with specific intensity (0-100)
function setDarkModeIntensity(intensity) {
  const invertValue = intensity / 100;
  const style = document.getElementById('dark-reader-style');

  if (style) {
    style.textContent = `
      html { filter: invert(${invertValue}) hue-rotate(180deg) !important; }
      img, video, iframe, canvas, picture, svg image {
        filter: invert(${invertValue}) hue-rotate(180deg) !important;
      }
    `;
  } else {
    const el = document.createElement('style');
    el.id = 'dark-reader-style';
    el.textContent = `
      html { filter: invert(${invertValue}) hue-rotate(180deg) !important; }
      img, video, iframe, canvas, picture, svg image {
        filter: invert(${invertValue}) hue-rotate(180deg) !important;
      }
    `;
    document.head.appendChild(el);
  }
  return true;
}

// Modified toggle function that accepts intensity parameter
function toggleDarkMode(intensity = 100) {
  const style = document.getElementById('dark-reader-style');
  if (style) {
    style.remove();
    return false;
  }
  const invertValue = intensity / 100;
  const el = document.createElement('style');
  el.id = 'dark-reader-style';
  el.textContent = `
    html { filter: invert(${invertValue}) hue-rotate(180deg) !important; }
    img, video, iframe, canvas, picture, svg image {
      filter: invert(${invertValue}) hue-rotate(180deg) !important;
    }
  `;
  document.head.appendChild(el);
  return true;
}

// Get DOM elements
const btn = document.getElementById('toggle');
const slider = document.getElementById('intensity-slider');
const intensityDisplay = document.getElementById('intensity-display');
const intensityControl = document.getElementById('intensity-control');

// Check initial state and update UI
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.scripting.executeScript(
    { target: { tabId: tab.id }, func: () => !!document.getElementById('dark-reader-style') },
    ([{ result }]) => {
      const isActive = result;
      const currentIntensity = slider.value;
      btn.textContent = isActive ? `Dark Mode: ON (${currentIntensity}%)` : 'Dark Mode: OFF';

      // Show/hide intensity controls based on dark mode state
      if (isActive) {
        intensityControl.classList.remove('hidden');
      } else {
        intensityControl.classList.add('hidden');
      }
    }
  );
});

// Button click handler
btn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const currentIntensity = parseInt(slider.value);
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, func: toggleDarkMode, args: [currentIntensity] },
      ([{ result }]) => {
        const isActive = result;
        btn.textContent = isActive ? `Dark Mode: ON (${currentIntensity}%)` : 'Dark Mode: OFF';

        // Toggle visibility of intensity controls
        if (isActive) {
          intensityControl.classList.remove('hidden');
        } else {
          intensityControl.classList.add('hidden');
        }
      }
    );
  });
});

// Slider input handler - fires while dragging
slider.addEventListener('input', (e) => {
  const intensity = parseInt(e.target.value);
  intensityDisplay.textContent = `${intensity}%`;

  // Update dark mode intensity in real-time on active tab
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, func: setDarkModeIntensity, args: [intensity] },
      ([{ result }]) => {
        // Update button text to show current intensity
        if (result) {
          btn.textContent = `Dark Mode: ON (${intensity}%)`;
        }
      }
    );
  });
});
