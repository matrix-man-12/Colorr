chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: command }, () => {
        // Suppress errors when content script isn't loaded (e.g., chrome:// pages)
        if (chrome.runtime.lastError) {
          console.log("Colorr shortcut pressed on unsupported page or tab is not ready.");
        }
      });
    }
  });
});
