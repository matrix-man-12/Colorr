import { useState, useEffect } from 'react';
import './App.css';

const isExtension = typeof chrome !== 'undefined' && chrome.tabs !== undefined;

function App() {
  const [tabId, setTabId] = useState(null);
  const [state, setState] = useState({
    colorAllActive: false,
    inspectActive: false,
    outlinesActive: false,
    palette: 'rainbow'
  });
  const [unsupportedPage, setUnsupportedPage] = useState(!isExtension);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Initialize and get the current active tab's state
  useEffect(() => {
    if (!isExtension) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        setTabId(activeTab.id);

        // Check if we can inject and talk to the content script
        chrome.tabs.sendMessage(activeTab.id, { action: 'getState' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not responding (unsupported URL or page loading)
            setUnsupportedPage(true);
          } else if (response) {
            setState(response);
          }
        });
      } else {
        setUnsupportedPage(true);
      }
    });

    // Listen for state changes (e.g. Escape key in inspect mode)
    const handleMessage = (request) => {
      if (request.action === 'stateUpdated' && request.state) {
        setState(request.state);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Send control commands to content script
  const sendCommand = (action, payload = {}) => {
    if (!tabId || typeof chrome === 'undefined') return;

    chrome.tabs.sendMessage(tabId, { action, ...payload }, (response) => {
      if (!chrome.runtime.lastError && response) {
        setState(response);
      }
    });
  };

  const handleToggleColorAll = () => {
    sendCommand('toggleColorAll', { palette: state.palette });
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
    sendCommand('setPalette', { palette });
  };

  if (unsupportedPage) {
    return (
      <div className="colorr-container fallback-mode">
        <header className="colorr-header">
          <div className="logo-badge">C</div>
          <h1>Colorr</h1>
          <p className="subtitle">Pastel Layout Visualizer</p>
        </header>
        <div className="fallback-card">
          <svg className="fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Unsupported Page</h3>
          <p>Colorr cannot run on internal browser pages, settings, or Chrome Web Store pages.</p>
          <p className="hint">Please navigate to any regular website (e.g., wikipedia.org or your local developer page) and open the extension again.</p>
        </div>
        <footer className="colorr-footer">
          <span>Colorr Extension v1.0</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="colorr-container">
      <header className="colorr-header">
        <div className="logo-badge">C</div>
        <div>
          <h1>Colorr</h1>
          <p className="subtitle">Pastel Layout Visualizer</p>
        </div>
      </header>

      <main className="colorr-main">
        {/* Toggle Switches */}
        <section className="control-section">
          <div className="control-row">
            <div className="control-info">
              <span className="control-title">Color All Elements</span>
              <span className="control-desc">Applies pastels to all backgrounds</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={state.colorAllActive} 
                onChange={handleToggleColorAll} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="control-row">
            <div className="control-info">
              <span className="control-title">Inspect & Color</span>
              <span className="control-desc">Hover to select, click to color</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={state.inspectActive} 
                onChange={handleToggleInspect} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="control-row">
            <div className="control-info">
              <span className="control-title">Outline Mode</span>
              <span className="control-desc">Dashed boundaries on layouts</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={state.outlinesActive} 
                onChange={handleToggleOutlines} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

        {/* Palette Selector */}
        <section className="palette-section">
          <h3>Pastel Mood Palette</h3>
          <div className="palette-grid">
            <button 
              className={`palette-card rainbow ${state.palette === 'rainbow' ? 'active' : ''}`}
              onClick={() => handleSelectPalette('rainbow')}
            >
              <div className="palette-preview">
                <span style={{ backgroundColor: '#ffb3ba' }}></span>
                <span style={{ backgroundColor: '#baffc9' }}></span>
                <span style={{ backgroundColor: '#bae1ff' }}></span>
              </div>
              <span>Soft Rainbow</span>
            </button>

            <button 
              className={`palette-card warm ${state.palette === 'warm' ? 'active' : ''}`}
              onClick={() => handleSelectPalette('warm')}
            >
              <div className="palette-preview">
                <span style={{ backgroundColor: '#ffb3ba' }}></span>
                <span style={{ backgroundColor: '#ffdfba' }}></span>
                <span style={{ backgroundColor: '#ffffba' }}></span>
              </div>
              <span>Warm Pastels</span>
            </button>

            <button 
              className={`palette-card cool ${state.palette === 'cool' ? 'active' : ''}`}
              onClick={() => handleSelectPalette('cool')}
            >
              <div className="palette-preview">
                <span style={{ backgroundColor: '#baffc9' }}></span>
                <span style={{ backgroundColor: '#bae1ff' }}></span>
                <span style={{ backgroundColor: '#e8c4ff' }}></span>
              </div>
              <span>Cool Pastels</span>
            </button>

            <button 
              className={`palette-card monochrome ${state.palette === 'monochrome' ? 'active' : ''}`}
              onClick={() => handleSelectPalette('monochrome')}
            >
              <div className="palette-preview">
                <span style={{ backgroundColor: '#cfd8dc' }}></span>
                <span style={{ backgroundColor: '#eceff1' }}></span>
                <span style={{ backgroundColor: '#f5f7f8' }}></span>
              </div>
              <span>Monochrome</span>
            </button>
          </div>
        </section>

        {/* Shortcuts Collapsible */}
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
                <kbd>Alt + Shift + A</kbd>
              </div>
              <div className="shortcut-item">
                <span>Inspect & Color</span>
                <kbd>Alt + Shift + I</kbd>
              </div>
              <div className="shortcut-item">
                <span>Outline Mode</span>
                <kbd>Alt + Shift + O</kbd>
              </div>
              <div className="shortcut-item">
                <span>Clear & Reset Page</span>
                <kbd>Alt + Shift + C</kbd>
              </div>
              <div className="shortcut-item">
                <span>Cancel Inspect (On Page)</span>
                <kbd>Esc</kbd>
              </div>
            </div>
          )}
        </section>

        {/* Clear Button */}
        <button className="reset-button" onClick={handleClearAll}>
          <svg className="reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <polyline points="3 3 3 8 8 8" />
          </svg>
          Reset Layout Styles
        </button>
      </main>

      <footer className="colorr-footer">
        <span>Colorr Extension v1.0</span>
      </footer>
    </div>
  );
}

export default App;
