// Extension page state
const state = {
  colorAllActive: false,
  inspectActive: false,
  outlinesActive: false,
  mode: 'soft',
  palette: 'rainbow'
};

const STYLE_ID = 'colorr-injected-styles';
const OUTLINE_STYLE_ID = 'colorr-outline-styles';

// Tags that should never be colored or bordered
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT',
  'HEAD', 'HTML', 'BR', 'HR', 'WBR'
]);

// Tags where we only apply borders (outlines mode), never backgrounds
const BORDER_ONLY_TAGS = new Set([
  'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG',
  'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'IFRAME'
]);

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #colorr-inspect-overlay {
      position: absolute;
      pointer-events: none;
      background-color: rgba(99, 102, 241, 0.22);
      border: 2px solid #6366f1;
      border-radius: 4px;
      z-index: 2147483647;
      transition: all 0.08s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
      display: none;
    }
  `;
  document.head.appendChild(style);
}

// ─── Color Generation ───────────────────────────────────────────────

function getLayoutColor(mode, palette, index) {
  let h, s, l;

  if (mode === 'dark') {
    switch (palette) {
      case 'rainbow-dark':
        h = (index * 137.5 + 10) % 360;
        s = 70 + (index % 15);
        l = 38 + (index % 12);
        break;
      case 'cyberpunk': {
        const cyberHues = [310, 330, 185, 265, 290, 195, 50, 170];
        h = cyberHues[index % cyberHues.length] + (index % 5);
        s = 78 + (index % 12);
        l = 40 + (index % 10);
        break;
      }
      case 'sunset-dark': {
        const sunsetDarkHues = [0, 10, 20, 35, 50, 340, 355, 280];
        h = sunsetDarkHues[index % sunsetDarkHues.length] + (index % 6);
        s = 72 + (index % 10);
        l = 38 + (index % 10);
        break;
      }
      case 'lavender': {
        const lavHues = [260, 275, 290, 310, 240, 220, 330, 250];
        h = lavHues[index % lavHues.length] + (index % 8);
        s = 55 + (index % 15);
        l = 42 + (index % 10);
        break;
      }
      case 'coral': {
        const coralHues = [350, 5, 15, 25, 340, 330, 40, 355];
        h = coralHues[index % coralHues.length] + (index % 6);
        s = 72 + (index % 12);
        l = 45 + (index % 10);
        break;
      }
      case 'aurora': {
        const auroraHues = [120, 160, 200, 280, 310, 80, 140, 240];
        h = auroraHues[index % auroraHues.length] + (index % 10);
        s = 60 + (index % 15);
        l = 40 + (index % 12);
        break;
      }
      default:
        h = (index * 75) % 360;
        s = 65;
        l = 40;
    }
    return `hsl(${h}, ${s}%, ${l}%)`;

  } else {
    // Soft pastels — more distinctive, wider hue spread, higher saturation
    switch (palette) {
      case 'rainbow':
        h = (index * 137.5 + 15) % 360;
        s = 78 + (index % 15);
        l = 82 + (index % 8);
        break;
      case 'warm': {
        const warmHues = [0, 12, 24, 36, 48, 60, 330, 345, 355, 310];
        h = warmHues[index % warmHues.length] + (index % 8);
        s = 80 + (index % 12);
        l = 80 + (index % 8);
        break;
      }
      case 'cool': {
        const coolHues = [140, 160, 180, 200, 220, 240, 260, 280, 300, 120];
        h = coolHues[index % coolHues.length] + (index % 10);
        s = 65 + (index % 15);
        l = 82 + (index % 8);
        break;
      }
      case 'berry': {
        const berryHues = [310, 330, 350, 280, 290, 260, 340, 320, 300, 270];
        h = berryHues[index % berryHues.length] + (index % 6);
        s = 60 + (index % 18);
        l = 82 + (index % 8);
        break;
      }
      case 'tropical': {
        const tropHues = [30, 50, 70, 160, 180, 330, 10, 45, 170, 350];
        h = tropHues[index % tropHues.length] + (index % 8);
        s = 75 + (index % 15);
        l = 78 + (index % 10);
        break;
      }
      case 'sunset': {
        const softSunsetHues = [5, 15, 30, 45, 55, 345, 335, 20, 40, 350];
        h = softSunsetHues[index % softSunsetHues.length] + (index % 6);
        s = 82 + (index % 10);
        l = 80 + (index % 8);
        break;
      }
      default:
        h = (index * 55) % 360;
        s = 75;
        l = 84;
    }
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}

// Generate a solid border color (fully opaque, good contrast)
function getBorderColor(mode, palette, index) {
  let h, s, l;

  if (mode === 'dark') {
    h = (index * 137.5 + 20) % 360;
    s = 70 + (index % 15);
    l = 50 + (index % 10);
  } else {
    h = (index * 137.5 + 20) % 360;
    s = 65 + (index % 15);
    l = 55 + (index % 10);
  }
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// ─── Element Filtering ──────────────────────────────────────────────

function shouldSkip(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  if (SKIP_TAGS.has(node.tagName)) return true;
  if (node.id === 'colorr-inspect-overlay') return true;
  return false;
}

function isBorderOnly(node) {
  return BORDER_ONLY_TAGS.has(node.tagName);
}

// ─── Color All Mode ─────────────────────────────────────────────────

function applyColorAll() {
  injectStyles();
  let index = 0;

  function traverse(node) {
    if (shouldSkip(node)) return;

    // Save original styles
    if (!node.hasAttribute('data-colorr-bg')) {
      node.setAttribute('data-colorr-bg', node.style.backgroundColor || 'none');
      node.setAttribute('data-colorr-transition', node.style.transition || 'none');
    }

    // Skip background on media/form elements but still traverse children
    if (!isBorderOnly(node)) {
      node.style.transition = 'background-color 0.25s ease';
      node.style.backgroundColor = getLayoutColor(state.mode, state.palette, index);
    }
    index++;

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(document.body);
}

// ─── Outline Mode (colored borders, NO background) ──────────────────

function applyOutlines() {
  removeOutlines(); // Clear any existing
  let index = 0;

  function traverse(node) {
    if (shouldSkip(node)) return;

    // Save original border styles
    if (!node.hasAttribute('data-colorr-border')) {
      node.setAttribute('data-colorr-border', node.style.border || 'none');
      node.setAttribute('data-colorr-outline-transition', node.style.transition || 'none');
    }

    const color = getBorderColor(state.mode, state.palette, index++);
    node.style.transition = 'border 0.25s ease';
    node.style.border = `2px solid ${color}`;

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(document.body);
}

function removeOutlines() {
  const bordered = document.querySelectorAll('[data-colorr-border]');
  bordered.forEach(el => {
    const origBorder = el.getAttribute('data-colorr-border');
    const origTransition = el.getAttribute('data-colorr-outline-transition');

    el.style.border = origBorder === 'none' ? '' : origBorder;
    el.style.transition = origTransition === 'none' ? '' : origTransition;

    el.removeAttribute('data-colorr-border');
    el.removeAttribute('data-colorr-outline-transition');
  });
}

// ─── Inspect Mode (color element + children on click) ────────────────

function colorElementAndDescendants(element) {
  let index = 0;

  function colorNode(node) {
    if (shouldSkip(node)) return;

    if (!node.hasAttribute('data-colorr-bg')) {
      node.setAttribute('data-colorr-bg', node.style.backgroundColor || 'none');
      node.setAttribute('data-colorr-transition', node.style.transition || 'none');
    }

    if (!isBorderOnly(node)) {
      node.style.transition = 'background-color 0.25s ease';
      node.style.backgroundColor = getLayoutColor(state.mode, state.palette, index);
    }
    index++;

    for (const child of node.children) {
      colorNode(child);
    }
  }

  colorNode(element);
}

// ─── Clear / Reset ──────────────────────────────────────────────────

function clearAll() {
  // Restore backgrounds
  const coloredElements = document.querySelectorAll('[data-colorr-bg]');
  coloredElements.forEach(el => {
    const origBg = el.getAttribute('data-colorr-bg');
    const origTransition = el.getAttribute('data-colorr-transition');
    el.style.backgroundColor = origBg === 'none' ? '' : origBg;
    el.style.transition = origTransition === 'none' ? '' : origTransition;
    el.removeAttribute('data-colorr-bg');
    el.removeAttribute('data-colorr-transition');
  });

  // Restore borders
  removeOutlines();

  state.colorAllActive = false;
  state.outlinesActive = false;

  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();

  const outlineStyle = document.getElementById(OUTLINE_STYLE_ID);
  if (outlineStyle) outlineStyle.remove();

  const overlay = document.getElementById('colorr-inspect-overlay');
  if (overlay) overlay.remove();

  if (state.inspectActive) {
    toggleInspect(false);
  }
}

// ─── Toggle Functions ───────────────────────────────────────────────

function toggleColorAll(activate) {
  state.colorAllActive = activate;
  if (activate) {
    if (state.inspectActive) toggleInspect(false);
    applyColorAll();
  } else {
    // Clear only backgrounds, keep outlines if active
    const coloredElements = document.querySelectorAll('[data-colorr-bg]');
    coloredElements.forEach(el => {
      const origBg = el.getAttribute('data-colorr-bg');
      const origTransition = el.getAttribute('data-colorr-transition');
      el.style.backgroundColor = origBg === 'none' ? '' : origBg;
      el.style.transition = origTransition === 'none' ? '' : origTransition;
      el.removeAttribute('data-colorr-bg');
      el.removeAttribute('data-colorr-transition');
    });
  }
}

function toggleOutlines(activate) {
  state.outlinesActive = activate;
  if (activate) {
    applyOutlines();
  } else {
    removeOutlines();
  }
}

// ─── Inspector Mouse/Keyboard Handlers ──────────────────────────────

function handleMouseMove(e) {
  if (!state.inspectActive) return;

  const target = e.target;
  if (!target || shouldSkip(target) || target.tagName === 'HTML' || target.tagName === 'BODY') {
    const overlay = document.getElementById('colorr-inspect-overlay');
    if (overlay) overlay.style.display = 'none';
    return;
  }

  const rect = target.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  const overlay = document.getElementById('colorr-inspect-overlay');
  if (overlay) {
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.top = `${rect.top + scrollTop}px`;
    overlay.style.left = `${rect.left + scrollLeft}px`;
    overlay.style.display = 'block';
  }
}

function handleMouseClick(e) {
  if (!state.inspectActive) return;

  const target = e.target;
  if (!target || target.id === 'colorr-inspect-overlay') return;

  e.preventDefault();
  e.stopPropagation();

  colorElementAndDescendants(target);
  chrome.runtime.sendMessage({ action: 'stateUpdated', state }).catch(() => {});
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    toggleInspect(false);
    chrome.runtime.sendMessage({ action: 'stateUpdated', state }).catch(() => {});
  }
}

function toggleInspect(activate) {
  state.inspectActive = activate;
  let overlay = document.getElementById('colorr-inspect-overlay');

  if (activate) {
    injectStyles();
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'colorr-inspect-overlay';
      document.body.appendChild(overlay);
    }
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleMouseClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
  } else {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleMouseClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    if (overlay) overlay.style.display = 'none';
  }
}

// ─── Message Listener ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    sendResponse(state);
    return true;
  }

  if (request.action === 'toggle-all' || request.action === 'toggleColorAll') {
    if (request.palette) state.palette = request.palette;
    if (request.mode) state.mode = request.mode;
    toggleColorAll(!state.colorAllActive);
    sendResponse(state);
    return true;
  }

  if (request.action === 'toggle-inspect' || request.action === 'toggleInspect') {
    toggleInspect(!state.inspectActive);
    sendResponse(state);
    return true;
  }

  if (request.action === 'toggle-outlines' || request.action === 'toggleOutlines') {
    toggleOutlines(!state.outlinesActive);
    sendResponse(state);
    return true;
  }

  if (request.action === 'clear-all' || request.action === 'clearAll') {
    clearAll();
    sendResponse(state);
    return true;
  }

  if (request.action === 'setPalette') {
    state.palette = request.palette;
    state.mode = request.mode || state.mode;
    if (state.colorAllActive) applyColorAll();
    if (state.outlinesActive) applyOutlines();
    sendResponse(state);
    return true;
  }

  if (request.action === 'setMode') {
    state.mode = request.mode;
    state.palette = request.palette;
    if (state.colorAllActive) applyColorAll();
    if (state.outlinesActive) applyOutlines();
    sendResponse(state);
    return true;
  }
});
