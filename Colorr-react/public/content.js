// State of the extension on the current page
const state = {
  colorAllActive: false,
  inspectActive: false,
  outlinesActive: false,
  palette: 'rainbow'
};

const STYLE_ID = 'colorr-injected-styles';

// Injects styles for the inspection overlay and outlines
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #colorr-inspect-overlay {
      position: absolute;
      pointer-events: none;
      background-color: rgba(186, 230, 253, 0.35);
      border: 2px solid #0ea5e9;
      border-radius: 4px;
      z-index: 2147483647;
      transition: all 0.1s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
      display: none;
    }
    body.colorr-show-outlines [data-colorr-bg] {
      outline: 1.5px dashed rgba(0, 0, 0, 0.35) !important;
      outline-offset: -1.5px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4) !important;
    }
  `;
  document.head.appendChild(style);
}

// Generate premium pastel HSL colors dynamically
function getPastelColor(palette, index) {
  let h, s, l;
  
  if (palette === 'rainbow') {
    h = (index * 137.5) % 360; // Golden angle distribution
    s = 70 + (index % 10);     // 70% - 80%
    l = 88 + (index % 6);      // 88% - 94%
  } else if (palette === 'warm') {
    const warmHues = [0, 15, 30, 45, 60, 320, 335, 350];
    h = warmHues[index % warmHues.length];
    s = 75 + (index % 6);
    l = 86 + (index % 6);
  } else if (palette === 'cool') {
    const coolHues = [100, 120, 150, 180, 200, 220, 240, 260, 280];
    h = coolHues[index % coolHues.length];
    s = 70 + (index % 6);
    l = 88 + (index % 6);
  } else if (palette === 'monochrome') {
    h = 210; // Soft steel blue hue
    s = 10 + (index % 10);     // 10% - 20%
    l = 92 + (index % 5);      // 92% - 97%
  } else {
    h = (index * 45) % 360;
    s = 70;
    l = 90;
  }
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// Traverse DOM and color all HTML elements
function applyColorAll() {
  injectStyles();
  let index = 0;
  
  function traverse(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tagName = node.tagName;
    
    // Ignore script, styling, embeds and overlay tags
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'IFRAME', 'NOSCRIPT', 'CANVAS', 'HTML', 'HEAD'].includes(tagName)) return;
    if (node.id === 'colorr-inspect-overlay') return;
    
    // Save original values if not already saved
    if (!node.hasAttribute('data-colorr-bg')) {
      const currentBg = node.style.backgroundColor;
      const currentTransition = node.style.transition;
      node.setAttribute('data-colorr-bg', currentBg || 'none');
      node.setAttribute('data-colorr-transition', currentTransition || 'none');
    }
    
    node.style.transition = 'background-color 0.3s ease';
    node.style.backgroundColor = getPastelColor(state.palette, index++);
    
    for (const child of node.children) {
      traverse(child);
    }
  }
  
  traverse(document.body);
}

// Color specific element and all its descendants recursively
function colorElementAndDescendants(element) {
  let index = 0;
  
  function colorNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tagName = node.tagName;
    
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'IFRAME', 'NOSCRIPT', 'CANVAS'].includes(tagName)) return;
    
    if (!node.hasAttribute('data-colorr-bg')) {
      const currentBg = node.style.backgroundColor;
      const currentTransition = node.style.transition;
      node.setAttribute('data-colorr-bg', currentBg || 'none');
      node.setAttribute('data-colorr-transition', currentTransition || 'none');
    }
    
    node.style.transition = 'background-color 0.3s ease';
    node.style.backgroundColor = getPastelColor(state.palette, index++);
    
    for (const child of node.children) {
      colorNode(child);
    }
  }
  
  colorNode(element);
}

// Reset page elements back to their original inline styles
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
  if (!target || 
      target.id === 'colorr-inspect-overlay' || 
      ['HTML', 'BODY', 'SCRIPT', 'STYLE', 'HEAD'].includes(target.tagName)) {
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
  
  // Notify extension runtime (popup) of state change
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
    if (state.colorAllActive) {
      applyColorAll();
    }
    sendResponse(state);
    return true;
  }
});
