// Store the active tab's state
let state = {
    isHighlightMode: false,
    selectedText: ''
};

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'textSelected':
            state.selectedText = request.text;
            // Notify popup about new selection
            chrome.runtime.sendMessage({
                action: 'updateSelection',
                text: request.text
            });
            break;
        case 'getState':
            sendResponse(state);
            break;
        case 'setState':
            state = { ...state, ...request.state };
            break;
    }
    return true;
});

// Handle tab updates
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url.startsWith('chrome://')) return;
    
    // Reset highlight mode for new tab
    state.isHighlightMode = false;
    chrome.tabs.sendMessage(tab.id, {
        action: 'toggleHighlight',
        enable: false
    }).catch(() => {
        // Ignore errors for tabs that don't have our content script
    });
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Text Scanner & Definition Lookup extension installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'wordSelected') {
    // Forward the word to the popup if it's open
    chrome.runtime.sendMessage(message);
  }
}); 