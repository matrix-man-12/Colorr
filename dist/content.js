// Extension page state
const state = {
  colorAllActive: false,
  inspectActive: false,
  outlinesActive: false,
  mode: 'soft', // 'soft' or 'dark'
  palette: 'rainbow' // current palette identifier
};

const STYLE_ID = 'colorr-injected-styles';

// Injects standard extension support styling
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #colorr-inspect-overlay {
      position: absolute;
      pointer-events: none;
      background-color: rgba(99, 102, 241, 0.25);
      border: 2px solid #6366f1;
      border-radius: 6px;
      z-index: 2147483647;
      transition: all 0.1s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.35);
      display: none;
    }
    body.colorr-show-outlines [data-colorr-bg] {
      outline: 1.5px dashed rgba(99, 102, 241, 0.45) !important;
      outline-offset: -1.5px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
}

// Generate premium layout colors with semi-transparency for legibility
function getLayoutColor(mode, palette, index) {
  let h, s, l, a;
  
  if (mode === 'dark') {
    a = 0.55; // Semi-transparent overlay to blend with original page backgrounds
    switch (palette) {
      case 'rainbow-dark':
        h = (index * 137.5) % 360;
        s = 65 + (index % 10);
        l = 25 + (index % 8);
        break;
      case 'cyberpunk': {
        const cyberHues = [320, 185, 275, 55, 300];
        h = cyberHues[index % cyberHues.length];
        s = 85;
        l = 30 + (index % 6);
        break;
      }
      case 'ocean':
        h = 195 + (index % 5) * 12;
        s = 62 + (index % 8);
        l = 22 + (index % 6);
        break;
      case 'forest-dark':
        h = 95 + (index % 4) * 15;
        s = 48 + (index % 10);
        l = 18 + (index % 6);
        break;
      case 'sunset-dark': {
        const sunsetHues = [340, 355, 12, 28, 42];
        h = sunsetHues[index % sunsetHues.length];
        s = 70 + (index % 8);
        l = 24 + (index % 6);
        break;
      }
      case 'monochrome-dark':
        h = 215;
        s = 12 + (index % 8);
        l = 16 + (index % 5);
        break;
      default:
        h = (index * 45) % 360;
        s = 60;
        l = 25;
    }
  } else {
    // Soft pastels mode
    a = 0.35; // Light tint blending for soft colors
    switch (palette) {
      case 'rainbow':
        h = (index * 137.5) % 360;
        s = 72 + (index % 8);
        l = 88 + (index % 6);
        break;
      case 'warm': {
        const warmHues = [0, 15, 30, 45, 60, 320, 335, 350];
        h = warmHues[index % warmHues.length];
        s = 74 + (index % 6);
        l = 87 + (index % 5);
        break;
      }
      case 'cool': {
        const coolHues = [100, 120, 150, 180, 200, 220, 240, 260, 280];
        h = coolHues[index % coolHues.length];
        s = 68 + (index % 6);
        l = 89 + (index % 5);
        break;
      }
      case 'monochrome':
        h = 210;
        s = 10 + (index % 10);
        l = 92 + (index % 4);
        break;
      case 'forest':
        h = 80 + (index % 5) * 15;
        s = 40 + (index % 8);
        l = 87 + (index % 5);
        break;
      case 'sunset': {
        const softSunsetHues = [15, 25, 35, 45, 55, 345];
        h = softSunsetHues[index % softSunsetHues.length];
        s = 68 + (index % 6);
        l = 89 + (index % 4);
        break;
      }
      default:
        h = (index * 45) % 360;
        s = 70;
        l = 90;
    }
  }
  
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

// Determines if an element should be excluded from coloring to prevent layout breakage
function shouldSkipElement(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  
  const tagName = node.tagName;
  const skipTags = [
    'SCRIPT', 'STYLE', 'SVG', 'PATH', 'IFRAME', 'NOSCRIPT', 
    'CANVAS', 'HTML', 'HEAD', 'IMG', 'INPUT', 'TEXTAREA', 
    'SELECT', 'OPTION', 'BUTTON', 'AUDIO', 'VIDEO'
  ];
  if (skipTags.includes(tagName)) return true;
  if (node.id === 'colorr-inspect-overlay') return true;
  
  // Skip absolute/fixed elements that do not contain visible text content (e.g. transparent overlays)
  const computed = window.getComputedStyle(node);
  const isAbsolute = computed.position === 'absolute' || computed.position === 'fixed';
  
  const hasDirectText = Array.from(node.childNodes).some(child => 
    child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== ''
  );
  
  if (isAbsolute && !hasDirectText && node.children.length === 0) {
    return true;
  }
  
  // Skip zero size elements
  const rect = node.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return true;
  }
  
  return false;
}

// Traverse DOM and color layout
function applyColorAll() {
  injectStyles();
  let index = 0;
  
  function traverse(node) {
    if (shouldSkipElement(node)) return;
    
    // Save original styles if not done already
    if (!node.hasAttribute('data-colorr-bg')) {
      const currentBg = node.style.backgroundColor;
      const currentTransition = node.style.transition;
      node.setAttribute('data-colorr-bg', currentBg || 'none');
      node.setAttribute('data-colorr-transition', currentTransition || 'none');
    }
    
    node.style.transition = 'background-color 0.3s ease';
    node.style.backgroundColor = getLayoutColor(state.mode, state.palette, index++);
    
    for (const child of node.children) {
      traverse(child);
    }
  }
  
  traverse(document.body);
}

// Color specific element and descendants
function colorElementAndDescendants(element) {
  let index = 0;
  
  function colorNode(node) {
    if (shouldSkipElement(node)) return;
    
    if (!node.hasAttribute('data-colorr-bg')) {
      const currentBg = node.style.backgroundColor;
      const currentTransition = node.style.transition;
      node.setAttribute('data-colorr-bg', currentBg || 'none');
      node.setAttribute('data-colorr-transition', currentTransition || 'none');
    }
    
    node.style.transition = 'background-color 0.3s ease';
    node.style.backgroundColor = getLayoutColor(state.mode, state.palette, index++);
    
    for (const child of node.children) {
      colorNode(child);
    }
  }
  
  colorNode(element);
}

// Reset page elements back to their original styles
function clearAll() {
  const coloredElements = document.querySelectorAll('[data-colorr-bg]');
  coloredElements.forEach(element => {
    const originalBg = element.getAttribute('data-colorr-bg');
    const originalTransition = element.getAttribute('data-colorr-transition');
    
    if (originalBg === 'none') {
      element.style.backgroundColor = '';
    } else {
      element.style.backgroundColor = originalBg;
    }
    
    if (originalTransition === 'none') {
      element.style.transition = '';
    } else {
      element.style.transition = originalTransition;
    }
    
    element.removeAttribute('data-colorr-bg');
    element.removeAttribute('data-colorr-transition');
  });
  
  state.colorAllActive = false;
  document.body.classList.remove('colorr-show-outlines');
  
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
  
  const overlay = document.getElementById('colorr-inspect-overlay');
  if (overlay) overlay.remove();
  
  if (state.inspectActive) {
    toggleInspect(false);
  }
}

// Toggle features
function toggleColorAll(activate) {
  state.colorAllActive = activate;
  if (activate) {
    if (state.inspectActive) {
      toggleInspect(false);
    }
    applyColorAll();
  } else {
    clearAll();
  }
}

function toggleOutlines(activate) {
  state.outlinesActive = activate;
  injectStyles();
  document.body.classList.toggle('colorr-show-outlines', activate);
}

// Mouse and keyboard event handlers for Inspector Mode
function handleMouseMove(e) {
  if (!state.inspectActive) return;
  
  const target = e.target;
  if (!target || shouldSkipElement(target) || ['HTML', 'BODY'].includes(target.tagName)) {
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

// Listen to incoming messages from extension popup or background shortcuts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    sendResponse(state);
    return true;
  }
  
  if (request.action === 'toggle-all' || request.action === 'toggleColorAll') {
    if (request.palette) {
      state.palette = request.palette;
    }
    if (request.mode) {
      state.mode = request.mode;
    }
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
    if (state.colorAllActive) {
      applyColorAll();
    }
    sendResponse(state);
    return true;
  }

  if (request.action === 'setMode') {
    state.mode = request.mode;
    state.palette = request.palette;
    if (state.colorAllActive) {
      applyColorAll();
    }
    sendResponse(state);
    return true;
  }
});
