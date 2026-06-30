import { useState, useEffect, useCallback } from 'react';
import './App.css';

const isExtension = typeof chrome !== 'undefined' && chrome.tabs !== undefined;

function App() {
  const [tabId, setTabId] = useState(null);
  const [state, setState] = useState({
    colorAllActive: true,
    inspectActive: false,
    outlinesActive: false,
    hideModeActive: false,
    mode: 'soft',
    palette: 'rainbow'
  });
  const [unsupportedPage, setUnsupportedPage] = useState(!isExtension);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const sendCommand = useCallback((action, payload = {}) => {
    if (!tabId || typeof chrome === 'undefined') return;
    chrome.tabs.sendMessage(tabId, { action, ...payload }, (response) => {
      if (!chrome.runtime.lastError && response) {
        setState(response);
      }
    });
  }, [tabId]);

  // Checks connection to the content script, dynamically injects it if disconnected on valid web pages
  const checkConnection = useCallback(() => {
    if (!isExtension) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        setTabId(activeTab.id);

        // Attempt to message the active tab content script
        chrome.tabs.sendMessage(activeTab.id, { action: 'getState' }, (response) => {
          if (chrome.runtime.lastError) {
            // Connection failed. Check if we can inject script dynamically
            const url = activeTab.url || '';
            const isInjectable = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://');

            if (isInjectable) {
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content.js']
              }, () => {
                if (chrome.runtime.lastError) {
                  setUnsupportedPage(true);
                } else {
                  // Script injected successfully. Fetch its state.
                  chrome.tabs.sendMessage(activeTab.id, { action: 'getState' }, (newResponse) => {
                    if (!chrome.runtime.lastError && newResponse) {
                      setState(newResponse);
                      setUnsupportedPage(false);
                    } else {
                      setUnsupportedPage(true);
                    }
                  });
                }
              });
            } else {
              setUnsupportedPage(true);
            }
          } else if (response) {
            setState(response);
            setUnsupportedPage(false);
          }
        });
      } else {
        setUnsupportedPage(true);
      }
    });
  }, []);

  // Initialize state and check connection on mount
  useEffect(() => {
    if (!isExtension) return;

    checkConnection();

    const handleMessage = (request) => {
      if (request.action === 'stateUpdated' && request.state) {
        setState(request.state);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [checkConnection]);

  const handleToggleColorAll = () => {
    sendCommand('toggleColorAll', { palette: state.palette, mode: state.mode });
  };

  const handleToggleInspect = () => {
    sendCommand('toggleInspect');
  };

  const handleToggleOutlines = () => {
    sendCommand('toggleOutlines');
  };

  const handleToggleHideMode = () => {
    sendCommand('toggleHideMode');
  };

  const handleClearAll = () => {
    sendCommand('clearAll');
  };

  const handleClearHidden = () => {
    sendCommand('clearHidden');
  };

  const handleSelectPalette = (palette) => {
    sendCommand('setPalette', { palette, mode: state.mode });
  };

  const handleToggleMode = (mode) => {
    const defaultPalette = mode === 'dark' ? 'rainbow-dark' : 'rainbow';
    sendCommand('setMode', { mode, palette: defaultPalette });
  };

  if (unsupportedPage) {
    return (
      <div className="colorr-container fallback-mode">
        <header className="colorr-header">
          <div className="logo-badge">C</div>
          <h1>Colorr</h1>
          <p className="subtitle">Layout Visualizer</p>
        </header>
        <div className="fallback-card">
          <svg className="fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Unsupported Page</h3>
          <p>Colorr cannot run on internal browser settings or store pages.</p>
          <p className="hint">If this is a normal webpage, please click below to refresh the connection.</p>
          <button className="refresh-conn-btn" onClick={checkConnection}>
            <svg className="reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh Connection
          </button>
        </div>
      </div>
    );
  }

  // Soft Pastels
  const softPalettes = [
    { id: 'rainbow', name: 'Soft Rainbow', colors: ['#ffb3ba', '#ffffba', '#baffc9', '#bae1ff', '#e8c4ff'] },
    { id: 'warm', name: 'Warm Pastels', colors: ['#ff9a9e', '#fecfef', '#ffd1a4', '#ffe8a1', '#ffc3a0'] },
    { id: 'cool', name: 'Cool Pastels', colors: ['#a1c4fd', '#c2e9fb', '#b5ead7', '#d4bbff', '#e0c3fc'] },
    { id: 'berry', name: 'Berry Blush', colors: ['#f5b7c5', '#d4a5e5', '#c3b1e1', '#f0b6d6', '#e8a7d0'] },
    { id: 'tropical', name: 'Tropical Punch', colors: ['#ffd89b', '#f7a5a5', '#a8e6cf', '#81d4fa', '#ffab91'] },
    { id: 'sunset', name: 'Sunset Peach', colors: ['#ff9a76', '#ffbf87', '#ffc3a0', '#ffafbd', '#ffd1a4'] }
  ];

  // Vibrant & Dark
  const darkPalettes = [
    { id: 'rainbow-dark', name: 'Neon Rainbow', colors: ['#818cf8', '#f472b6', '#2dd4bf', '#fbbf24', '#a78bfa'] },
    { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#ec4899', '#8b5cf6', '#06b6d4', '#fbbf24', '#14b8a6'] },
    { id: 'sunset-dark', name: 'Vibrant Sunset', colors: ['#f97316', '#ef4444', '#ec4899', '#f59e0b', '#e11d48'] },
    { id: 'lavender', name: 'Lavender Storm', colors: ['#a78bfa', '#c084fc', '#818cf8', '#e879f9', '#7c3aed'] },
    { id: 'coral', name: 'Electric Coral', colors: ['#fb7185', '#f43f5e', '#e11d48', '#ff6b6b', '#f97316'] },
    { id: 'aurora', name: 'Aurora Borealis', colors: ['#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf'] }
  ];

  const activePalettes = state.mode === 'dark' ? darkPalettes : softPalettes;

  return (
    <div className="colorr-container">
      <header className="colorr-header">
        <div className="logo-badge">C</div>
        <div>
          <h1>Colorr</h1>
          <p className="subtitle">Layout Visualizer</p>
        </div>
      </header>

      <main className="colorr-main">
        {/* Compact Toggle Button Group */}
        <section className="compact-controls-section">
          <button 
            className={`control-btn ${state.colorAllActive ? 'active' : ''}`}
            onClick={handleToggleColorAll}
            title="Color All Elements (Ctrl+Shift+.)"
          >
            <svg className="control-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-4-4-4-4-2 2.4-4 4-3 3.5-3 5.5a7 7 0 0 0 7 7z"/>
            </svg>
            <span>Color All</span>
          </button>

          <button 
            className={`control-btn ${state.inspectActive ? 'active' : ''}`}
            onClick={handleToggleInspect}
            title="Inspect & Color (Ctrl+Shift+,)"
          >
            <svg className="control-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
            <span>Inspect</span>
          </button>

          <button 
            className={`control-btn ${state.outlinesActive ? 'active' : ''}`}
            onClick={handleToggleOutlines}
            title="Colored Borders (Ctrl+Shift+Space)"
          >
            <svg className="control-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
            <span>Borders</span>
          </button>

          <button 
            className={`control-btn ${state.hideModeActive ? 'active-danger' : ''}`}
            onClick={handleToggleHideMode}
            title="Hide Selected Element (Click to Hide)"
          >
            <svg className="control-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <span>Hide</span>
          </button>
        </section>

        {/* Segmented Mode Selector */}
        <section className="mode-toggle-section">
          <div className="mode-segmented-control">
            <button 
              className={`mode-tab-btn ${state.mode === 'soft' ? 'active' : ''}`}
              onClick={() => handleToggleMode('soft')}
            >
              Soft Pastels
            </button>
            <button 
              className={`mode-tab-btn ${state.mode === 'dark' ? 'active' : ''}`}
              onClick={() => handleToggleMode('dark')}
            >
              Vibrant & Dark
            </button>
          </div>
        </section>

        {/* Palette Grid */}
        <section className="palette-section">
          <div className="palette-grid">
            {activePalettes.map((p) => (
              <button 
                key={p.id}
                className={`palette-card ${state.palette === p.id ? 'active' : ''}`}
                onClick={() => handleSelectPalette(p.id)}
              >
                <div className="palette-preview">
                  {p.colors.map((c, i) => (
                    <span key={i} style={{ backgroundColor: c }}></span>
                  ))}
                </div>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Shortcuts Accordion */}
        <section className="shortcuts-section">
          <button 
            className="shortcuts-toggle"
            onClick={() => setShortcutsOpen(!shortcutsOpen)}
          >
            <span>Keyboard Shortcuts</span>
            <svg 
              className={`arrow-icon ${shortcutsOpen ? 'open' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          
          {shortcutsOpen && (
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <span>Color All Elements</span>
                <kbd>Ctrl+Shift+.</kbd>
              </div>
              <div className="shortcut-item">
                <span>Inspect & Color</span>
                <kbd>Ctrl+Shift+,</kbd>
              </div>
              <div className="shortcut-item">
                <span>Colored Borders</span>
                <kbd>Ctrl+Shift+Space</kbd>
              </div>
              <div className="shortcut-item">
                <span>Clear Layout Colors</span>
                <kbd>Ctrl+Shift+K</kbd>
              </div>
              <div className="shortcut-item">
                <span>Cancel Inspect/Hide</span>
                <kbd>Esc</kbd>
              </div>
            </div>
          )}
        </section>

        {/* Action Buttons Footer */}
        <section className="actions-footer-section">
          <button className="reset-button flex-1" onClick={handleClearAll}>
            <svg className="reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
            Reset Colors
          </button>
          <button className="unhide-button flex-1" onClick={handleClearHidden}>
            <svg className="reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Unhide All
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
