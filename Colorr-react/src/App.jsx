import { useState, useEffect } from 'react';
import './App.css';

const isExtension = typeof chrome !== 'undefined' && chrome.tabs !== undefined;

function App() {
  const [tabId, setTabId] = useState(null);
  const [state, setState] = useState({
    colorAllActive: false,
    inspectActive: false,
    outlinesActive: false,
    mode: 'soft',
    palette: 'rainbow'
  });
  const [unsupportedPage, setUnsupportedPage] = useState(!isExtension);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Initialize state and communicate with tab
  useEffect(() => {
    if (!isExtension) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        setTabId(activeTab.id);

        chrome.tabs.sendMessage(activeTab.id, { action: 'getState' }, (response) => {
          if (chrome.runtime.lastError) {
            setUnsupportedPage(true);
          } else if (response) {
            setState(response);
          }
        });
      } else {
        setUnsupportedPage(true);
      }
    });

    // Listen for events sent from content script (e.g. inspector cancel via Esc)
    const handleMessage = (request) => {
      if (request.action === 'stateUpdated' && request.state) {
        setState(request.state);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const sendCommand = (action, payload = {}) => {
    if (!tabId || typeof chrome === 'undefined') return;

    chrome.tabs.sendMessage(tabId, { action, ...payload }, (response) => {
      if (!chrome.runtime.lastError && response) {
        setState(response);
      }
    });
  };

  const handleToggleColorAll = () => {
    sendCommand('toggleColorAll', { palette: state.palette, mode: state.mode });
  };

  const handleToggleInspect = () => {
    sendCommand('toggleInspect');
  };

  const handleToggleOutlines = () => {
    sendCommand('toggleOutlines');
  };

  const handleClearAll = () => {
    sendCommand('clearAll');
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
          <p className="hint">Please navigate to any regular website (e.g. wikipedia.org or your local developer page) and open the extension again.</p>
        </div>
      </div>
    );
  }

  // Define Soft and Dark palettes
  const softPalettes = [
    { id: 'rainbow', name: 'Soft Rainbow', colors: ['#ffb3ba', '#baffc9', '#bae1ff'] },
    { id: 'warm', name: 'Warm Pastels', colors: ['#ffb3ba', '#ffdfba', '#ffffba'] },
    { id: 'cool', name: 'Cool Pastels', colors: ['#baffc9', '#bae1ff', '#e8c4ff'] },
    { id: 'forest', name: 'Forest Sage', colors: ['#c2f0c2', '#d9f2d9', '#e6f7e6'] },
    { id: 'sunset', name: 'Sunset Peach', colors: ['#ffc3a0', '#ffafbd', '#ffc0cb'] },
    { id: 'monochrome', name: 'Monochrome', colors: ['#cfd8dc', '#eceff1', '#f5f7f8'] }
  ];

  const darkPalettes = [
    { id: 'rainbow-dark', name: 'Neon Rainbow', colors: ['#818cf8', '#f472b6', '#2dd4bf'] },
    { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#ec4899', '#4f46e5', '#06b6d4'] },
    { id: 'ocean', name: 'Deep Ocean', colors: ['#1e3a8a', '#1d4ed8', '#0d9488'] },
    { id: 'forest-dark', name: 'Forest Canopy', colors: ['#064e3b', '#047857', '#14532d'] },
    { id: 'sunset-dark', name: 'Vibrant Sunset', colors: ['#7c2d12', '#9a3412', '#581c87'] },
    { id: 'monochrome-dark', name: 'Midnight Slate', colors: ['#0f172a', '#1e293b', '#334155'] }
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
            title="Color All Elements (Ctrl+Shift+Period)"
          >
            <svg className="control-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-4-4-4-4-2 2.4-4 4-3 3.5-3 5.5a7 7 0 0 0 7 7z"/>
            </svg>
            <span>Color All</span>
          </button>

          <button 
            className={`control-btn ${state.inspectActive ? 'active' : ''}`}
            onClick={handleToggleInspect}
            title="Inspect & Color (Ctrl+Shift+Comma)"
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
            title="Outline Mode (Ctrl+Shift+Space)"
          >
            <svg className="control-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3"/>
              <line x1="9" y1="3" x2="9" y2="21" strokeDasharray="3 3"/>
              <line x1="15" y1="3" x2="15" y2="21" strokeDasharray="3 3"/>
              <line x1="3" y1="9" x2="21" y2="9" strokeDasharray="3 3"/>
              <line x1="3" y1="15" x2="21" y2="15" strokeDasharray="3 3"/>
            </svg>
            <span>Outlines</span>
          </button>
        </section>

        {/* Sliding Segmented Mode Selector */}
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

        {/* Dynamic Palette Grid */}
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
                <span>Outline Mode</span>
                <kbd>Ctrl+Shift+Space</kbd>
              </div>
              <div className="shortcut-item">
                <span>Clear Layout</span>
                <kbd>Ctrl+Shift+K</kbd>
              </div>
              <div className="shortcut-item">
                <span>Cancel Inspect (On Page)</span>
                <kbd>Esc</kbd>
              </div>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <button className="reset-button" onClick={handleClearAll}>
          <svg className="reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <polyline points="3 3 3 8 8 8" />
          </svg>
          Reset Layout Styles
        </button>
      </main>
    </div>
  );
}

export default App;
